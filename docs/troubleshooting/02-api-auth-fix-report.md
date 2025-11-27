# API 认证中间件修复报告

**初次修复日期**: 2025-11-25
**最后更新**: 2025-11-25
**分支**: fix/build-deployment-structure

---

## 一、问题描述

### 1.1 症状

多个 API 在测试时返回认证错误：
- `缺少 teamId`
- `Cannot destructure property 'teamId' of 'req.auth' as it is undefined`
- `未登录或登录已过期`

### 1.2 根本原因

1. **API 缺少认证中间件**：部分 API 文件 `beforeCallback` 为空数组
2. **测试与中间件不兼容**：测试代码直接设置 `req.auth`，但 TEST_MODE 会覆盖它

---

## 二、修复内容

### 2.1 authMiddleware 增强

修改文件: `src/packages/service/common/middle/authMiddleware.ts`

#### TEST_MODE 支持（含测试认证跳过机制）

```typescript
const TEST_AUTH: AuthContext = {
  userId: '507f1f77bcf86cd799439011',
  teamId: '507f1f77bcf86cd799439012',
  tmbId: '507f1f77bcf86cd799439013',
  isRoot: false
};

export const authMiddleware = async (req, _res) => {
  const apiReq = req as ApiRequestProps;

  // 测试模式：跳过认证，使用模拟数据
  // 但如果请求头包含 x-test-skip-auth-mock: true，则执行真实认证逻辑
  if (process.env.TEST_MODE === 'true' && req.headers['x-test-skip-auth-mock'] !== 'true') {
    // 如果测试代码已经设置了 req.auth，使用测试代码的认证信息
    if (apiReq.auth && apiReq.auth.teamId) {
      return;
    }
    // 否则使用默认的测试认证信息
    apiReq.auth = { ...TEST_AUTH };
    return;
  }

  // 正常认证逻辑...
};
```

**关键改进**:
1. 优先使用测试代码设置的 `req.auth`（支持数据隔离测试）
2. 支持 `x-test-skip-auth-mock` 请求头，用于测试认证失败场景

### 2.2 测试工具增强

修改文件: `test/utils/apiTestHelper.ts`

```typescript
export interface ApiTestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown>;
  query?: Record<string, string | string[]>;
  auth?: AuthHeaders;
  headers?: Record<string, string>;
  /**
   * 跳过 TEST_MODE 的自动认证模拟
   * 设为 true 时，即使在 TEST_MODE 下也会执行真实的认证逻辑
   * 用于测试"未登录用户被拒绝"等认证失败场景
   */
  skipAuthMock?: boolean;
}
```

### 2.3 测试用例修改

所有"应该拒绝未登录用户"的测试需要添加 `skipAuthMock: true`：

```typescript
// ❌ 修改前：TEST_MODE 下会自动通过认证
it('应该拒绝未登录用户', async () => {
  const response = await callApi(handler, {
    method: 'GET'
  });
  expectError(response);
});

// ✅ 修改后：真实测试认证逻辑
it('应该拒绝未登录用户', async () => {
  const response = await callApi(handler, {
    method: 'GET',
    skipAuthMock: true // 测试真实认证逻辑
  });
  expectError(response);
});
```

### 2.4 修改的测试文件

| 文件 | 修改内容 |
|------|---------|
| `test/api/phase1/audit.api.test.ts` | 添加 skipAuthMock |
| `test/api/phase2/appCollaborator.api.test.ts` | 添加 skipAuthMock |
| `test/api/phase2/group.api.test.ts` | 添加 skipAuthMock |
| `test/api/phase2/invoice.api.test.ts` | 添加 skipAuthMock |
| `test/api/phase3/chatSetting.api.test.ts` | 添加 skipAuthMock |
| `test/api/phase4/modelCollaborator.api.test.ts` | 添加 skipAuthMock |
| `test/api/phase4/promotion.api.test.ts` | 添加 skipAuthMock |
| `test/cases/bill/create.test.ts` | 修复 nanoid 正则匹配 |

### 2.5 vitest 配置

修改文件: `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    env: {
      TEST_MODE: 'true'  // 启用测试模式
    },
    // ...
  }
});
```

---

## 三、测试验证

### 3.1 最终测试结果

```bash
pnpm test

 Test Files  27 passed (27)
      Tests  511 passed (511)
   Duration  36.79s
```

### 3.2 测试场景覆盖

| 场景 | 处理方式 | 测试状态 |
|------|---------|---------|
| 正常认证请求 | TEST_MODE 使用测试 auth 或模拟 auth | ✅ 通过 |
| 数据隔离测试 | 测试代码设置 auth，中间件优先使用 | ✅ 通过 |
| 认证失败测试 | skipAuthMock=true，执行真实认证 | ✅ 通过 |

---

## 四、使用指南

### 4.1 编写需要认证的 API

```typescript
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(req: ApiRequestProps<Body>, _res: NextApiResponse) {
  const teamId = getTeamIdFromReq(req);
  // ...
}
```

### 4.2 编写测试用例

**普通测试（需要认证）**：
```typescript
const response = await callApi(handler, {
  method: 'GET',
  auth  // 使用测试创建的 auth
});
expectSuccess(response);
```

**测试认证失败**：
```typescript
const response = await callApi(handler, {
  method: 'GET',
  skipAuthMock: true  // 关闭 TEST_MODE 的自动认证
});
expectError(response);
```

### 4.3 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单个测试文件
npx vitest run test/api/phase1/audit.api.test.ts
```

---

## 五、注意事项

1. **TEST_MODE 仅用于测试**，生产环境不要启用
2. **新建 API 必须添加 authMiddleware**
3. **认证失败测试必须使用 skipAuthMock: true**
4. **测试代码可以设置自己的 auth**，中间件会优先使用

---

**文档维护者**: Claude Code
**最后验证**: 2025-11-25 (511 tests passed)

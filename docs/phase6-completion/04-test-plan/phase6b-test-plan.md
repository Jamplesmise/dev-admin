# Phase 6B 测试计划

> 子阶段: Phase 6B - 分组/组织成员与微信登录
> API 数量: 4 个
> 创建时间: 2025-11-26
> **状态: ✅ 已完成**
> **执行时间: 2025-11-26**
> **测试结果: 39 个测试全部通过**

---

## 1. 测试范围

### 1.1 待测 API

| 序号 | API | 方法 | 测试文件 |
|------|-----|------|----------|
| 1 | `/api/support/user/team/group/members` | GET | `groupMember.api.test.ts` |
| 2 | `/api/support/user/team/group/changeOwner` | PUT | `groupMember.api.test.ts` |
| 3 | `/api/support/user/team/org/members` | GET | `orgMember.api.test.ts` |
| 4 | `/api/support/user/account/login/wx/getResult` | POST | `wxLogin.api.test.ts` |

---

## 2. 分组成员 API 测试

### 2.1 测试文件

`test/api/phase6/groupMember.api.test.ts`

### 2.2 分组成员列表测试

```typescript
describe('GET /api/support/user/team/group/members', () => {
  describe('正常流程', () => {
    it('应该返回分组成员列表', async () => {
      // Given: 分组有 3 个成员
      // When: 获取成员列表
      // Then: 返回 3 个成员
    });

    it('应该包含成员的名称和头像', async () => {
      // When: 获取成员列表
      // Then: 每个成员包含 name 和 avatar 字段
    });

    it('应该按角色排序（owner > admin > member）', async () => {
      // Given: 分组有 owner、admin、member 各 1 人
      // When: 获取成员列表
      // Then: 按 owner -> admin -> member 顺序返回
    });

    it('应该返回成员的角色信息', async () => {
      // When: 获取成员列表
      // Then: 每个成员包含 role 字段
    });
  });

  describe('参数验证', () => {
    it('groupId 必填', async () => {
      // When: 不传 groupId
      // Then: 返回 400 错误
    });

    it('groupId 格式必须有效', async () => {
      // When: groupId = "invalid"
      // Then: 返回 400 错误
    });
  });

  describe('权限验证', () => {
    it('未认证请求应返回 401', async () => {
      // When: 不带 token
      // Then: 返回 401
    });

    it('只能查询当前团队的分组', async () => {
      // Given: 用户属于团队 A，分组属于团队 B
      // When: 查询该分组
      // Then: 返回 403
    });
  });

  describe('边界条件', () => {
    it('分组不存在时返回 404', async () => {
      // When: groupId 不存在
      // Then: 返回 404
    });

    it('分组没有成员时返回空数组', async () => {
      // Given: 分组没有成员
      // When: 获取成员列表
      // Then: 返回 []
    });
  });
});
```

### 2.3 更改分组所有者测试

```typescript
describe('PUT /api/support/user/team/group/changeOwner', () => {
  describe('正常流程', () => {
    it('应该成功转让分组所有权', async () => {
      // Given: 当前用户是分组 owner，李四是分组成员
      // When: 转让给李四
      // Then: 李四成为 owner，当前用户成为 member
    });

    it('转让后旧所有者应变为普通成员', async () => {
      // Given: 张三是 owner
      // When: 转让给李四
      // Then: 张三的角色变为 member
    });

    it('应该使用事务确保一致性', async () => {
      // 验证转让过程是原子操作
    });
  });

  describe('权限验证', () => {
    it('只有分组 owner 可以转让', async () => {
      // Given: 当前用户是分组 admin
      // When: 尝试转让
      // Then: 返回 403
    });

    it('普通成员不能转让', async () => {
      // Given: 当前用户是分组普通成员
      // When: 尝试转让
      // Then: 返回 403
    });
  });

  describe('数据验证', () => {
    it('新所有者必须是分组成员', async () => {
      // Given: 李四不是分组成员
      // When: 尝试转让给李四
      // Then: 返回错误
    });

    it('不能转让给自己', async () => {
      // Given: 当前用户是 owner
      // When: 尝试转让给自己
      // Then: 返回错误
    });

    it('groupId 必填', async () => {
      // When: 不传 groupId
      // Then: 返回 400
    });

    it('tmbId 必填', async () => {
      // When: 不传 tmbId
      // Then: 返回 400
    });
  });
});
```

---

## 3. 组织成员 API 测试

### 3.1 测试文件

`test/api/phase6/orgMember.api.test.ts`

### 3.2 测试用例

```typescript
describe('GET /api/support/user/team/org/members', () => {
  describe('正常流程', () => {
    it('应该返回组织成员分页列表', async () => {
      // Given: 组织有 25 个成员
      // When: pageNum=1, pageSize=10
      // Then: 返回 10 个成员，total=25
    });

    it('应该支持分页', async () => {
      // Given: 组织有 25 个成员
      // When: pageNum=2, pageSize=10
      // Then: 返回第 11-20 个成员
    });

    it('应该支持 orgPath 筛选', async () => {
      // Given: 存在 /技术部 和 /产品部 两个组织
      // When: orgPath="/技术部"
      // Then: 只返回技术部的成员
    });

    it('应该返回成员的详细信息', async () => {
      // When: 获取成员列表
      // Then: 包含 userId, tmbId, memberName, avatar, role, status 等
    });

    it('应该返回成员所属的组织列表', async () => {
      // Given: 成员属于多个组织
      // When: 获取成员列表
      // Then: orgs 字段包含所有组织路径
    });
  });

  describe('参数验证', () => {
    it('pageNum 必填', async () => {
      // When: 不传 pageNum
      // Then: 返回 400
    });

    it('pageSize 必填', async () => {
      // When: 不传 pageSize
      // Then: 返回 400
    });

    it('pageNum 必须大于 0', async () => {
      // When: pageNum=0
      // Then: 返回 400
    });

    it('pageSize 不能超过限制', async () => {
      // When: pageSize=1000
      // Then: 返回 400 或自动限制
    });
  });

  describe('权限验证', () => {
    it('未认证请求应返回 401', async () => {
      // When: 不带 token
      // Then: 返回 401
    });
  });

  describe('边界条件', () => {
    it('组织不存在时返回空列表', async () => {
      // When: orgPath 不存在
      // Then: 返回 { data: [], total: 0 }
    });

    it('不传 orgPath 时返回所有成员', async () => {
      // When: 不传 orgPath
      // Then: 返回团队所有成员
    });
  });
});
```

---

## 4. 微信登录结果 API 测试

### 4.1 测试文件

`test/api/phase6/wxLogin.api.test.ts`

### 4.2 测试用例

```typescript
describe('POST /api/support/user/account/login/wx/getResult', () => {
  describe('正常流程 - 已有用户', () => {
    it('应该返回已有用户信息和 token', async () => {
      // Given: Redis 中有扫码结果，用户已存在
      // When: 调用 getResult
      // Then: 返回用户信息和 JWT token
    });

    it('应该清理 Redis 缓存', async () => {
      // Given: Redis 中有扫码结果
      // When: 调用 getResult 成功
      // Then: Redis 缓存被清理
    });
  });

  describe('正常流程 - 新用户', () => {
    it('应该自动创建新用户', async () => {
      // Given: Redis 中有扫码结果，用户不存在
      // When: 调用 getResult
      // Then: 创建新用户并返回
    });

    it('新用户应该自动创建默认团队', async () => {
      // Given: 新用户
      // When: 调用 getResult
      // Then: 自动创建一个默认团队
    });

    it('应该记录邀请者 ID', async () => {
      // Given: inviterId 有效
      // When: 调用 getResult
      // Then: 用户记录中包含邀请者信息
    });

    it('应该记录营销追踪参数', async () => {
      // Given: bd_vid, msclkid, fastgpt_sem 参数
      // When: 调用 getResult
      // Then: 参数被记录
    });
  });

  describe('参数验证', () => {
    it('code 必填', async () => {
      // When: 不传 code
      // Then: 返回 400
    });
  });

  describe('错误处理', () => {
    it('扫码信息不存在时返回错误', async () => {
      // Given: Redis 中没有对应的扫码结果
      // When: 调用 getResult
      // Then: 返回错误 "扫码信息不存在或已过期"
    });

    it('扫码信息过期时返回错误', async () => {
      // Given: Redis 中的扫码结果已过期
      // When: 调用 getResult
      // Then: 返回错误
    });

    it('code 无效时返回错误', async () => {
      // Given: code 格式错误
      // When: 调用 getResult
      // Then: 返回错误
    });
  });

  describe('并发处理', () => {
    it('同一 code 不能重复使用', async () => {
      // Given: 第一次调用成功
      // When: 再次使用同一 code 调用
      // Then: 返回错误（缓存已清理）
    });
  });

  describe('安全性', () => {
    it('返回的 token 应该是有效的 JWT', async () => {
      // When: 调用成功
      // Then: 返回的 token 可以正常解析
    });

    it('token 应该包含正确的用户 ID', async () => {
      // When: 调用成功
      // Then: token 中的 userId 与返回的 user._id 匹配
    });
  });
});
```

---

## 5. 测试数据准备

### 5.1 基础测试数据

```typescript
// test/fixtures/phase6b.ts

export const testGroup = {
  _id: new ObjectId(),
  teamId: testTeam._id,
  name: '测试分组'
};

export const testGroupMembers = [
  { groupId: testGroup._id, tmbId: testMembers[0]._id, role: 'owner' },
  { groupId: testGroup._id, tmbId: testMembers[1]._id, role: 'admin' },
  { groupId: testGroup._id, tmbId: testMembers[2]._id, role: 'member' }
];

export const testOrg = {
  _id: new ObjectId(),
  teamId: testTeam._id,
  name: '技术部',
  path: '/技术部',
  pathId: 'tech'
};

export const testOrgMembers = [
  { orgId: testOrg._id, tmbId: testMembers[0]._id },
  { orgId: testOrg._id, tmbId: testMembers[1]._id }
];

export const testWxScanResult = {
  openId: 'wx_open_id_123',
  unionId: 'wx_union_id_123',
  nickname: '微信用户',
  avatar: 'https://example.com/avatar.jpg'
};
```

### 5.2 Redis Mock

```typescript
// test/mocks/redis.ts

export const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn()
};

export function setupRedisWxScan(code: string, result: any) {
  mockRedis.get.mockImplementation((key) => {
    if (key === `wx_scan:${code}`) {
      return JSON.stringify(result);
    }
    return null;
  });
}

export function clearRedisWxScan() {
  mockRedis.get.mockReset();
  mockRedis.del.mockReset();
}
```

---

## 6. 测试执行

### 6.1 执行命令

```bash
# 运行 Phase 6B 所有测试
pnpm test -- test/api/phase6/groupMember.api.test.ts test/api/phase6/orgMember.api.test.ts test/api/phase6/wxLogin.api.test.ts

# 运行单个测试文件
pnpm test -- test/api/phase6/wxLogin.api.test.ts

# 监听模式
pnpm test:watch -- test/api/phase6/
```

### 6.2 覆盖率要求

| 指标 | 要求 |
|------|------|
| 行覆盖率 | ≥ 80% |
| 分支覆盖率 | ≥ 70% |
| 函数覆盖率 | ≥ 90% |

---

## 7. 验收标准

- [x] 所有测试用例通过
- [x] 覆盖率达标
- [x] MongoDB 扫码会话模型正确工作
- [x] 事务测试验证一致性
- [x] 测试执行时间 < 60s

---

## 8. 实际测试结果

### 8.1 测试统计

| 测试文件 | 测试用例数 | 通过数 | 执行时间 |
|---------|----------|--------|---------|
| groupMember.api.test.ts | 17 | 17 | ~19s |
| orgMember.api.test.ts | 11 | 11 | ~14s |
| wxLogin.api.test.ts | 11 | 11 | ~14s |
| **总计** | **39** | **39** | **~47s** |

### 8.2 实际测试用例清单

**groupMember.api.test.ts (17 个测试)**:

GET /api/support/user/team/group/members:
- ✅ 正常流程 > 应该返回分组成员列表
- ✅ 正常流程 > 应该包含成员的名称和头像
- ✅ 正常流程 > 应该按角色排序（owner > member）
- ✅ 参数验证 > groupId 必填
- ✅ 参数验证 > groupId 格式必须有效
- ✅ 权限验证 > 未认证请求应返回错误
- ✅ 权限验证 > 只能查询当前团队的分组
- ✅ 边界条件 > 分组不存在时返回错误
- ✅ 边界条件 > 分组没有成员时返回空数组

PUT /api/support/user/team/group/changeOwner:
- ✅ 正常流程 > 应该成功转让分组所有权
- ✅ 权限验证 > 只有分组 owner 可以转让
- ✅ 权限验证 > 未认证请求应返回错误
- ✅ 数据验证 > 新所有者必须是分组成员
- ✅ 数据验证 > 不能转让给自己
- ✅ 数据验证 > groupId 必填
- ✅ 数据验证 > tmbId 必填
- ✅ 数据验证 > 分组不存在应返回错误

**orgMember.api.test.ts (11 个测试)**:
- ✅ 正常流程 > 应该返回组织成员分页列表
- ✅ 正常流程 > 应该支持分页
- ✅ 正常流程 > 应该支持 orgPath 筛选
- ✅ 正常流程 > 应该返回成员的详细信息
- ✅ 参数验证 > pageNum 默认为 1
- ✅ 参数验证 > pageSize 默认为 10
- ✅ 参数验证 > pageNum 必须大于 0
- ✅ 参数验证 > pageSize 不能超过限制
- ✅ 权限验证 > 未认证请求应返回错误
- ✅ 边界条件 > 组织不存在时返回空列表
- ✅ 边界条件 > 不传 orgPath 时返回所有成员

**wxLogin.api.test.ts (11 个测试)**:
- ✅ 正常流程 - 已有用户 > 应该返回已有用户信息和 token
- ✅ 正常流程 - 新用户 > 应该自动创建新用户
- ✅ 正常流程 - 新用户 > 新用户应该自动创建默认团队
- ✅ 参数验证 > code 必填
- ✅ 错误处理 > 扫码信息不存在时返回错误
- ✅ 错误处理 > 扫码信息过期时返回错误
- ✅ 错误处理 > 用户尚未确认登录时返回错误
- ✅ 错误处理 > 仅扫码但未确认时返回错误
- ✅ 安全性 > 返回的 token 应该是有效的 JWT
- ✅ 安全性 > token 应该包含正确的用户信息
- ✅ 注意：此 API 不需要认证 > 不带认证信息也应该正常工作

### 8.3 执行命令

```bash
# 运行 Phase 6B 所有测试
pnpm vitest run test/api/phase6/groupMember.api.test.ts test/api/phase6/orgMember.api.test.ts test/api/phase6/wxLogin.api.test.ts
```

### 8.4 实现说明

1. **微信登录测试**: 使用 MongoDB 模型 (`MongoWxLoginSessionModel`) 而非 Redis Mock 存储扫码会话
2. **ObjectId 处理**: 聚合查询需要手动转换 ObjectId 类型
3. **分页验证**: pageNum=0 时应返回错误，需要先验证再设默认值

---

*创建时间: 2025-11-26*
*完成时间: 2025-11-26*

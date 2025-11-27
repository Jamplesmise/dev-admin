# Phase 6 - 接口补全规划概览

> 阶段: Phase 6 - 接口补全
> 优先级: P1-P3
> 接口数量: 25 个（待实现的 API）
> 创建时间: 2025-11-26
> **当前进度: Phase 6A ✅ + Phase 6B ✅ + Phase 6C ✅ 已完成**

---

## 进度概览

| 子阶段 | API 数量 | 状态 | 测试结果 |
|--------|---------|------|----------|
| Phase 6A | 5 | ✅ 已完成 | 32/32 通过 |
| Phase 6B | 4 | ✅ 已完成 | 39/39 通过 |
| **Phase 6C** | **5** | **✅ 已完成** | **48/48 通过** |
| Phase 6D | 11 | 待开始 | - |

---

## 1. 背景说明

本阶段用于补全 FastGPT 官方 proApi 前端所需但 fastgpt-dev 尚未实现的剩余 API 接口，使本项目达到 100% 接口覆盖率。

### 当前状态

| 指标 | 数值 |
|------|------|
| FastGPT 前端需求 | 113 个 API |
| 已实现 | 111 个 (98.2%) |
| 待实现 | 11 个 (9.7%) |
| Phase 6A 完成 | 5 个 ✅ |
| Phase 6B 完成 | 4 个 ✅ |
| Phase 6C 完成 | 5 个 ✅ |

### 缺失接口分类

| 分类 | 数量 | 优先级 |
|------|------|--------|
| 团队协作者管理 | 4 | P1 |
| 用户搜索 | 1 | P1 |
| 分组/组织成员 | 3 | P1 |
| 微信登录 | 1 | P1 |
| 应用评估创建 | 1 | P1 |
| 团队标签 | 3 | P2-P3 |
| 发票抬头 | 2 | P2 |
| 优惠券 | 1 | P2 |
| 收藏标签 | 1 | P2 |
| 数据集同步 | 3 | P2-P3 |
| 用户同步/导出 | 3 | P2 |
| 推广记录 | 1 | P2 |
| 应用模板类型 | 1 | P3 |

---

## 2. 分阶段开发计划

为保持每个阶段独立且精简，将缺失功能按依赖关系和优先级划分为 **4 个子阶段**：

### Phase 6A: 团队协作者与搜索 (5 个 API) ✅ 已完成

**目标**: 实现团队级别的权限协作者管理和统一搜索功能

| 接口 | 方法 | 路径 | 优先级 | 状态 |
|------|------|------|--------|------|
| 用户搜索 | GET | `/api/support/user/search` | P1 | ✅ |
| 团队协作者列表 | GET | `/api/support/user/team/collaborator/list` | P1 | ✅ |
| 更新协作者权限 | POST | `/api/support/user/team/collaborator/update` | P1 | ✅ |
| 更新单个协作者 | PUT | `/api/support/user/team/collaborator/updateOne` | P2 | ✅ |
| 删除协作者 | DELETE | `/api/support/user/team/collaborator/delete` | P1 | ✅ |

**完成时间**: 2025-11-26
**测试覆盖**: 32 个测试用例全部通过

---

### Phase 6B: 分组/组织成员与微信登录 (4 个 API) ✅ 已完成

**目标**: 完善分组和组织的成员查询，实现微信登录轮询

| 接口 | 方法 | 路径 | 优先级 | 状态 |
|------|------|------|--------|------|
| 分组成员列表 | GET | `/api/support/user/team/group/members` | P1 | ✅ |
| 更改分组所有者 | PUT | `/api/support/user/team/group/changeOwner` | P2 | ✅ |
| 组织成员列表 | GET | `/api/support/user/team/org/members` | P1 | ✅ |
| 微信登录结果 | POST | `/api/support/user/account/login/wx/getResult` | P1 | ✅ |

**完成时间**: 2025-11-26
**测试覆盖**: 39 个测试用例全部通过

---

### Phase 6C: 应用评估与发票优惠券 (5 个 API) ✅ 已完成

**目标**: 实现应用评估创建、发票抬头管理、优惠券兑换

| 接口 | 方法 | 路径 | 优先级 | 状态 |
|------|------|------|--------|------|
| 创建应用评估 | POST | `/api/core/app/evaluation/create` | P1 | ✅ |
| 获取发票抬头 | GET | `/api/support/user/team/invoiceAccount/getTeamInvoiceHeader` | P2 | ✅ |
| 更新发票抬头 | POST | `/api/support/user/team/invoiceAccount/update` | P2 | ✅ |
| 兑换优惠券 | GET | `/api/support/wallet/coupon/redeem` | P2 | ✅ |
| 更新收藏标签 | PUT | `/api/core/chat/setting/favourite/tags` | P2 | ✅ |

**完成时间**: 2025-11-26
**测试覆盖**: 48 个测试用例全部通过

---

### Phase 6D: 数据同步与其他 (11 个 API)

**目标**: 完成数据同步、用户管理扩展、团队标签等剩余功能

#### 6D-1: 用户管理扩展 (3 个)
| 接口 | 方法 | 路径 | 优先级 |
|------|------|------|--------|
| 成员同步 | POST | `/api/support/user/sync` | P2 |
| 成员导出 | GET | `/api/support/user/team/member/export` | P2 |
| 更新通知账户 | PUT | `/api/support/user/team/updateNotificationAccount` | P2 |

#### 6D-2: 团队标签 (3 个)
| 接口 | 方法 | 路径 | 优先级 |
|------|------|------|--------|
| 团队标签列表 | GET | `/api/support/user/team/tag/list` | P2 |
| 异步加载标签 | GET | `/api/support/user/team/tag/async` | P3 |
| 令牌获取应用 | GET | `/api/support/user/team/tag/getAppsByTeamTokens` | P3 |

#### 6D-3: 数据集同步 (3 个)
| 接口 | 方法 | 路径 | 优先级 |
|------|------|------|--------|
| 数据集同步 | POST | `/api/core/dataset/datasetSync` | P2 |
| 更改数据集所有者 | POST | `/api/core/dataset/changeOwner` | P2 |
| 外部文件集合 | POST | `/api/core/dataset/collection/create/externalFileUrl` | P3 |

#### 6D-4: 其他 (2 个)
| 接口 | 方法 | 路径 | 优先级 |
|------|------|------|--------|
| 推广记录列表 | POST | `/api/support/activity/promotion/getPromotions` | P2 |
| 模板类型列表 | GET | `/api/core/app/template/getTemplateTypes` | P3 |

---

## 3. 优先级矩阵

```
                    重要性
           高                    低
        ┌─────────────────────────────┐
紧急    │  Phase 6A (协作者+搜索)     │
        │  Phase 6B-1 (分组/组织成员)  │
        ├─────────────────────────────┤
        │  Phase 6B-2 (微信登录)      │
        │  Phase 6C-1 (应用评估)      │
        ├─────────────────────────────┤
不紧急  │  Phase 6C-2 (发票+优惠券)   │
        │  Phase 6D (同步+标签+其他)   │
        └─────────────────────────────┘
```

---

## 4. 完成标准

### Phase 6A (5 个 API) ✅ 已完成
- [x] 用户搜索支持成员/组织/分组三类搜索
- [x] 团队协作者 CRUD 完整
- [x] 权限位运算正确

### Phase 6B (4 个 API) ✅ 已完成
- [x] 分组成员列表正常返回
- [x] 分组所有者可转让
- [x] 组织成员分页查询正常
- [x] 微信登录轮询正常

### Phase 6C (5 个 API) ✅ 已完成
- [x] 应用评估支持请求体传递测试用例
- [x] 发票抬头 CRUD 完整（含格式验证和权限控制）
- [x] 优惠券兑换逻辑正确（含同批次限制和事务支持）
- [x] 收藏应用标签更新正常（含数量和长度限制）

### Phase 6D (11 个 API)
- [ ] 成员同步/导出正常
- [ ] 通知账户更新正常
- [ ] 团队标签功能完整
- [ ] 数据集同步/转让正常
- [ ] 推广记录分页查询正常
- [ ] 模板类型列表返回正常

---

## 5. 文件索引

```
docs/phase6-completion/
├── 01-feature-planning/
│   ├── overview.md                    # 本文件
│   ├── phase6a-collaborator.md        # 协作者规划
│   ├── phase6b-member.md              # 成员查询规划
│   ├── phase6c-evaluation.md          # 评估与发票规划
│   └── phase6d-others.md              # 其他功能规划
├── 02-data-model-design/
│   └── schema-design.md               # 新增 Schema 设计
├── 03-development-plan/
│   └── implementation-plan.md         # 实现计划
└── 04-test-plan/
    ├── phase6a-test-plan.md           # 6A 测试计划
    ├── phase6b-test-plan.md           # 6B 测试计划
    ├── phase6c-test-plan.md           # 6C 测试计划
    └── phase6d-test-plan.md           # 6D 测试计划
```

---

## 6. 认证中间件规范

> **重要提醒**: 详见 [API 认证中间件修复报告](../../troubleshooting/02-api-auth-fix-report.md)

### 6.1 API 开发必须添加认证中间件

```typescript
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';

// ⚠️ 必须在 beforeCallback 中添加 authMiddleware
const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(req: ApiRequestProps<Body>, _res: NextApiResponse) {
  const teamId = getTeamIdFromReq(req);
  // ...
}

export default NextAPI(handler);
```

### 6.2 测试编写注意事项

```typescript
// ✅ 正常认证测试
const response = await callApi(handler, {
  method: 'GET',
  auth  // 使用测试创建的 auth
});

// ✅ 测试认证失败场景 - 必须添加 skipAuthMock
it('应该拒绝未登录用户', async () => {
  const response = await callApi(handler, {
    method: 'GET',
    skipAuthMock: true  // 关闭 TEST_MODE 的自动认证
  });
  expectError(response);
});
```

### 6.3 例外情况

微信登录结果 API (`/api/support/user/account/login/wx/getResult`) **不需要**认证中间件，因为这是登录流程本身。

---

## 7. 预估工作量

| 子阶段 | API 数量 | 预估时间 | 累计时间 |
|--------|---------|---------|---------|
| 6A | 5 | 2-3 天 | 2-3 天 |
| 6B | 4 | 1-2 天 | 3-5 天 |
| 6C | 5 | 2-3 天 | 5-8 天 |
| 6D | 11 | 3-4 天 | 8-12 天 |
| **总计** | **25** | **8-12 天** | |

---

*创建时间: 2025-11-26*

# Schema 一致性分析与统一方案

> 创建日期: 2025-11-24
> 目的: 解决 Phase 1/2 数据模型设计与实际代码的不一致问题

---

## 一、问题概述

经过全面分析，发现以下三类不一致问题：

1. **文档设计 vs 实际代码** - 文档中设计的字段/集合名与代码实现不同
2. **测试工厂 vs API Model** - 测试数据工厂使用的模型与 API 使用的不一致
3. **`getTestModels()` 集合名错误** - 导致测试查询返回空结果

---

## 二、不一致清单

### 2.1 集合名称不一致

| 模块 | 文档设计 | 实际 API 代码 | `getTestModels()` | 状态 |
|------|----------|--------------|-------------------|------|
| 组织 | `organization` | `team_orgs` | `team_orgs` | ⚠️ 文档需更新 |
| 组织成员 | `organization_members` | `team_org_members` | `team_org_members` | ⚠️ 文档需更新 |
| 账单 | `bill` | `team_bills` | `team_bills` | ⚠️ 文档需更新 |
| OAuth绑定 | `oauth_bindings` | `user_oauth_bindings` | - | ⚠️ 文档需更新 |
| 成员分组 | `member_group` | `member_groups` | ❌ `member_group` | 🔴 测试代码错误 |
| 分组成员 | `group_members` | `group_members` | ❌ `group_member` | 🔴 测试代码错误 |
| 聊天记录 | - | `chats` | `chats` | ✅ 一致 |
| 审计日志 | `operation_logs` | `operationLogs` | `operationLogs` | ⚠️ 文档需更新 |

### 2.2 测试工厂动态导入缺失

以下测试工厂方法使用本地 Schema 而非动态导入 API Model，可能导致数据不写入正确的集合：

| 工厂方法 | 当前行为 | 应该使用 | 严重程度 |
|----------|----------|----------|----------|
| `createCollaborator()` | `getModel('collaborator')` | 动态导入 `MongoCollaboratorModel` | 🟡 中 |
| `createInvoice()` | `getModel('invoice')` | 动态导入 `MongoInvoiceModel` | 🟡 中 |
| `createApp()` | `getModel('app')` | 动态导入或使用 connectionMongo | 🟡 中 |
| `createDataset()` | `getModel('dataset')` | 动态导入或使用 connectionMongo | 🟡 中 |
| `createChat()` | `getModel('chat')` | 动态导入 `MongoChatModel` | 🟡 中 |

### 2.3 字段定义差异

#### 账单 (Bill) Schema

| 字段 | 文档设计 | 实际代码 | 状态 |
|------|----------|----------|------|
| `type` 枚举 | `BillTypeEnum` (未定义具体值) | `standard/extraDatasetSize/extraPoints` | ⚠️ 需确认 |
| `payment` 枚举 | `PaymentEnum` (未定义具体值) | `wx/alipay/balance/bank` | ⚠️ 需确认 |
| `status` 枚举 | `BillStatusEnum` (未定义具体值) | `pending/success/failed/canceled/refunded` | ⚠️ 需确认 |
| `subLevel` 枚举 | 未定义 | `free/experience/team/enterprise/custom` | ⚠️ 需补充文档 |
| `invoiced` 字段 | 无 | 有 (Boolean) | ⚠️ 需补充文档 |
| `invoiceId` 字段 | 无 | 有 (ObjectId) | ⚠️ 需补充文档 |

#### 组织 (Org) Schema

| 字段 | 文档设计 | 实际代码 | 状态 |
|------|----------|----------|------|
| `parentId` | 有 | 无 (使用 path 实现树形) | 🔴 设计差异 |
| `pathId` | 无 | 有 (必需，Nanoid) | 🔴 设计差异 |
| `pathIds` | 有 (数组) | 无 (使用 path 字符串) | 🔴 设计差异 |
| `order` | 有 | 无 | 🔴 设计差异 |
| `avatar` | 无 | 有 | ⚠️ 需补充文档 |
| `description` | 无 | 有 | ⚠️ 需补充文档 |

#### 微信登录会话 (WxLoginSession)

| 字段 | 文档设计 | 实际代码 | 状态 |
|------|----------|----------|------|
| `status` 枚举 | `waiting/scanned/confirmed/expired` | `waiting/success/expired` | 🔴 不一致 |

---

## 三、根本原因分析

```
┌─────────────────────────────────────────────────────────────┐
│                    问题根源                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 文档先行但未及时同步                                      │
│     - Phase 1 文档设计时参考了不同的命名规范                   │
│     - 实际开发时采用了 FastGPT 原有的 team_ 前缀命名          │
│                                                             │
│  2. 测试工厂与 API 代码独立演化                              │
│     - 早期测试工厂使用本地 Schema                            │
│     - 后期部分切换到动态导入，但未完全覆盖                     │
│                                                             │
│  3. getTestModels() 未随 API 代码更新                        │
│     - 集合名称使用单数形式（如 member_group）                 │
│     - 实际 API 使用复数形式（如 member_groups）               │
│                                                             │
│  4. 组织架构实现方案变更                                      │
│     - 文档设计使用 parentId + pathIds 数组                   │
│     - 实际采用 path 字符串 + pathId (Nanoid)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、统一方案

### 4.1 集合名称统一（以实际代码为准）

| 模块 | 统一集合名 | Model 导出名 |
|------|-----------|-------------|
| 用户 | `users` | `MongoUserModel` |
| OAuth绑定 | `user_oauth_bindings` | `MongoOAuthBindingModel` |
| 验证码会话 | `captcha_sessions` | `MongoCaptchaSessionModel` |
| 微信登录会话 | `wx_login_sessions` | `MongoWxLoginSessionModel` |
| 组织 | `team_orgs` | `MongoOrgModel` |
| 组织成员 | `team_org_members` | `MongoOrgMemberModel` |
| 成员分组 | `member_groups` | `MongoMemberGroupModel` |
| 分组成员 | `group_members` | `MongoGroupMemberModel` |
| 协作者 | `collaborators` | `MongoCollaboratorModel` |
| 账单 | `team_bills` | `MongoBillModel` |
| 发票 | `invoices` | `MongoInvoiceModel` |
| 审计日志 | `operationLogs` | `MongoOperationLog` |
| 聊天记录 | `chats` | `MongoChatModel` |

### 4.2 需要修复的测试代码

#### 修复 1: `getTestModels()` 集合名称

```typescript
// 修复前
MemberGroup: getModel<MemberGroupDocument>('member_group', MemberGroupSchema),
GroupMember: getModel<GroupMemberDocument>('group_member', GroupMemberSchema),

// 修复后
MemberGroup: getModel<MemberGroupDocument>('member_groups', MemberGroupSchema),
GroupMember: getModel<GroupMemberDocument>('group_members', GroupMemberSchema),
```

#### 修复 2: 测试工厂改为动态导入

```typescript
// createCollaborator - 改为动态导入
async createCollaborator(data: {...}): Promise<CollaboratorDocument> {
  const { MongoCollaboratorModel } = await import(
    '../../src/packages/service/support_permission/collaborator/schema'
  );
  return MongoCollaboratorModel.create({...}) as unknown as Promise<CollaboratorDocument>;
}

// createInvoice - 改为动态导入
async createInvoice(data: {...}): Promise<InvoiceDocument> {
  const { MongoInvoiceModel } = await import(
    '../../src/packages/service/support_wallet/invoice/schema'
  );
  return MongoInvoiceModel.create({...}) as unknown as Promise<InvoiceDocument>;
}

// createChat - 改为动态导入
async createChat(data: {...}): Promise<ChatDocument> {
  const { MongoChatModel } = await import(
    '../../src/packages/service/core/chat/schema'
  );
  return MongoChatModel.create({...}) as unknown as Promise<ChatDocument>;
}
```

### 4.3 需要更新的文档

| 文档路径 | 需要更新的内容 |
|----------|---------------|
| `docs/phase1-core/02-data-model-design/schema-overview.md` | 集合名称、组织 Schema 字段、账单枚举值 |
| `docs/phase2-important/02-data-model-design/schema-design.md` | 集合名称 |
| `.claude/CLAUDE.md` | 如有 Schema 相关描述需同步 |

---

## 五、执行计划

### Phase A: 修复测试代码（立即执行）

1. [ ] 修复 `getTestModels()` 中的集合名称
2. [ ] 将 `createCollaborator()` 改为动态导入
3. [ ] 将 `createInvoice()` 改为动态导入
4. [ ] 将 `createChat()` 改为动态导入
5. [ ] 运行测试验证修复效果

### Phase B: 更新设计文档（后续执行）

1. [ ] 更新 Phase 1 数据模型设计文档
2. [ ] 更新 Phase 2 数据模型设计文档
3. [ ] 生成统一的 Schema 参考文档

---

## 六、验证清单

修复完成后，需要验证：

- [ ] 所有单元测试通过
- [ ] 所有集成测试通过（需 MongoDB 运行）
- [ ] 所有 API 测试通过（需 MongoDB 运行）
- [ ] 文档与代码一致

---

## 七、附录：实际代码 Schema 文件位置

```
src/packages/service/
├── core/
│   └── chat/schema.ts                          # chats
├── support_permission/
│   ├── collaborator/schema.ts                  # collaborators
│   ├── memberGroup/
│   │   ├── memberGroupSchema.ts                # member_groups
│   │   └── groupMemberSchema.ts                # group_members
│   └── org/
│       ├── orgSchema.ts                        # team_orgs
│       └── orgMemberSchema.ts                  # team_org_members
├── support_user/
│   ├── auth/schema.ts                          # user_oauth_bindings, captcha_sessions, wx_login_sessions
│   └── schema.ts                               # users
├── support_user_audit/
│   └── schema.ts                               # operationLogs
└── support_wallet/
    ├── bill/schema.ts                          # team_bills
    └── invoice/schema.ts                       # invoices
```

---

*文档生成时间: 2025-11-24*
*生成工具: Claude Code Assistant*

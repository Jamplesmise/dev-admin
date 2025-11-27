# Phase 2 - 数据模型设计

> 阶段: Phase 2 - 重要功能
> 最后更新: 2025-11-24
> 状态: **已与代码同步**

---

## 1. Schema 汇总

| Collection | 模块 | 状态 | 说明 |
|------------|------|------|------|
| `member_groups` | 成员分组 | 已存在 | 分组定义 |
| `group_members` | 成员分组 | 已存在 | 分组成员关系 |
| `collaborators` | 协作者 | 已存在 | 资源协作者权限 |
| `invoices` | 发票 | 已存在 | 发票记录 |
| `chats` | 应用日志 | 已存在 | 聊天记录统计 |

---

## 2. Schema 详情

### 2.1 成员分组 (member_groups)

**位置**: `src/packages/service/support_permission/memberGroup/memberGroupSchema.ts`
**Model 导出**: `MongoMemberGroupModel`

```typescript
const MemberGroupSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  avatar: String
}, {
  timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});

// 索引
MemberGroupSchema.index({ teamId: 1 });
MemberGroupSchema.index({ teamId: 1, name: 1 });
MemberGroupSchema.index({ teamId: 1, createTime: -1 });

// 虚拟字段: members
MemberGroupSchema.virtual('members', {
  ref: 'group_members',
  localField: '_id',
  foreignField: 'groupId'
});
```

---

### 2.2 分组成员 (group_members)

**位置**: `src/packages/service/support_permission/memberGroup/groupMemberSchema.ts`
**Model 导出**: `MongoGroupMemberModel`

```typescript
const GroupMemberSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'member_groups',
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'member'],
    default: 'member'
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: false }
});

// 索引
GroupMemberSchema.index({ groupId: 1, tmbId: 1 }, { unique: true });
GroupMemberSchema.index({ teamId: 1, groupId: 1 });
GroupMemberSchema.index({ teamId: 1, tmbId: 1 });

// 虚拟字段: group
GroupMemberSchema.virtual('group', {
  ref: 'member_groups',
  localField: 'groupId',
  foreignField: '_id',
  justOne: true
});
```

---

### 2.3 协作者 (collaborators)

**位置**: `src/packages/service/support_permission/collaborator/schema.ts`
**Model 导出**: `MongoCollaboratorModel`

```typescript
const CollaboratorSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },

  // 资源信息
  resourceId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  resourceType: {
    type: String,
    enum: ['app', 'dataset'],
    required: true
  },

  // 协作者类型（三选一）
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member'
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'member_groups'
  },
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'team_orgs'
  },

  // 权限值（位运算）
  permission: {
    type: Number,
    required: true,
    default: 4  // 默认只读
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});

// 索引
CollaboratorSchema.index({ teamId: 1, resourceType: 1, resourceId: 1 });
CollaboratorSchema.index({ resourceType: 1, resourceId: 1, tmbId: 1 }, { unique: true, sparse: true });
CollaboratorSchema.index({ resourceType: 1, resourceId: 1, groupId: 1 }, { unique: true, sparse: true });
CollaboratorSchema.index({ resourceType: 1, resourceId: 1, orgId: 1 }, { unique: true, sparse: true });
```

**约束**: 必须有且仅有一个协作者类型（tmbId/groupId/orgId）

---

### 2.4 发票 (invoices)

**位置**: `src/packages/service/support_wallet/invoice/schema.ts`
**Model 导出**: `MongoInvoiceModel`

```typescript
const InvoiceSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member',
    required: true
  },

  // 关联账单
  billIds: [{
    type: Schema.Types.ObjectId,
    ref: 'team_bills'
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // 发票类型
  type: {
    type: String,
    enum: ['normal', 'special'],
    default: 'normal'
  },

  // 基本信息（必填）
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  taxNumber: {
    type: String,
    required: true,
    maxlength: 20
  },

  // 专票额外信息
  bankName: String,
  bankAccount: String,
  address: String,
  phone: String,

  // 收件信息
  receiverEmail: String,
  receiverAddress: String,
  receiverName: String,
  receiverPhone: String,

  // 状态
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected'],
    default: 'pending'
  },
  rejectReason: String,

  // 发票文件
  invoiceNo: String,          // 发票号码
  invoiceCode: String,        // 发票代码
  invoiceUrl: String,         // 电子发票下载 URL
  invoiceDate: Date,          // 开票日期

  // 时间戳
  completeTime: Date
}, {
  timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});

// 索引
InvoiceSchema.index({ teamId: 1, createTime: -1 });
InvoiceSchema.index({ teamId: 1, status: 1 });
InvoiceSchema.index({ invoiceNo: 1 }, { sparse: true });
```

---

### 2.5 聊天记录 (chats)

**位置**: `src/packages/service/core/chat/schema.ts`
**Model 导出**: `MongoChatModel`

```typescript
const ChatSchema = new Schema({
  appId: {
    type: Schema.Types.ObjectId,
    ref: 'apps',
    required: true
  },
  chatId: {
    type: String,
    required: true,
    unique: true
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member',
    required: true
  },
  userId: String,
  source: {
    type: String,
    enum: ['api', 'share', 'iframe', 'test'],
    default: 'api'
  },
  title: {
    type: String,
    default: '新对话'
  },
  messageCount: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  avgResponseTime: {
    type: Number,
    default: 0
  },
  satisfaction: {
    type: Number,
    min: 1,
    max: 5
  },
  status: {
    type: String,
    enum: ['running', 'finish', 'error'],
    default: 'running'
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});

// 索引
ChatSchema.index({ appId: 1, createTime: -1 });
ChatSchema.index({ teamId: 1, createTime: -1 });
ChatSchema.index({ appId: 1, status: 1 });
ChatSchema.index({ chatId: 1 }, { unique: true });
```

---

## 3. 关系图

```
┌─────────────────────────────────────────────────────────────┐
│                      成员分组系统                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      N:M      ┌────────────────┐        │
│   │ TeamMember   │<─────────────>│ member_groups  │        │
│   └──────────────┘               └────────────────┘        │
│          │              通过 group_members                  │
│          │                                                  │
│          └─────────────────┐                                │
│                           │                                │
│                           ▼                                │
│   ┌──────────────┐  ┌────────────────┐  ┌──────────────┐   │
│   │     apps     │  │    datasets    │  │  team_orgs   │   │
│   └──────────────┘  └────────────────┘  └──────────────┘   │
│          │                 │                   │            │
│          └─────────────────┼───────────────────┘            │
│                           │                                │
│                           ▼                                │
│                    ┌──────────────┐                        │
│                    │ collaborators│                        │
│                    │   (权限表)   │                        │
│                    └──────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       发票系统                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      1:N      ┌──────────────┐          │
│   │    teams     │──────────────>│   invoices   │          │
│   └──────────────┘               └──────────────┘          │
│                                         │                   │
│   ┌──────────────┐      N:1            │                   │
│   │  team_bills  │<────────────────────┘                   │
│   └──────────────┘    (billIds 数组)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      应用日志系统                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      1:N      ┌──────────────┐          │
│   │     apps     │──────────────>│    chats     │          │
│   └──────────────┘               └──────────────┘          │
│                                         │                   │
│   聚合统计:                              │                   │
│   - 总对话数 (count)                     │                   │
│   - 总消息数 (sum messageCount)          │                   │
│   - 总Token数 (sum totalTokens)          │                   │
│   - 平均响应时间 (avg avgResponseTime)   │                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 权限计算逻辑

### 权限位定义

```typescript
const PermissionBits = {
  read:   0b100,  // 4 - 读取权限
  write:  0b010,  // 2 - 写入权限
  manage: 0b001   // 1 - 管理权限
};

const PermissionPresets = {
  readOnly: 4,     // 0b100 - 只读
  readWrite: 6,    // 0b110 - 读+写
  full: 7          // 0b111 - 全部权限
};
```

### 协作者权限合并

当用户同时存在多种协作者身份时，权限取并集：

```typescript
// 计算用户对资源的最终权限
async function calculatePermission(
  resourceType: 'app' | 'dataset',
  resourceId: string,
  tmbId: string,
  userGroupIds: string[],
  userOrgIds: string[]
): Promise<number> {

  const collaborators = await MongoCollaboratorModel.find({
    resourceType,
    resourceId,
    $or: [
      { tmbId },
      { groupId: { $in: userGroupIds } },
      { orgId: { $in: userOrgIds } }
    ]
  });

  // 权限取并集（OR 运算）
  return collaborators.reduce(
    (perm, collab) => perm | collab.permission,
    0
  );
}

// 权限检查
function hasPermission(userPerm: number, requiredPerm: number): boolean {
  return (userPerm & requiredPerm) === requiredPerm;
}

// 使用示例
const userPerm = await calculatePermission('app', appId, tmbId, groupIds, orgIds);

if (hasPermission(userPerm, PermissionBits.write)) {
  // 允许写入
}
```

---

## 5. 索引策略

### 查询优化索引

| Collection | 索引 | 用途 |
|------------|------|------|
| collaborators | `{resourceType, resourceId, tmbId}` unique sparse | 按成员查权限 |
| collaborators | `{resourceType, resourceId, groupId}` unique sparse | 按分组查权限 |
| collaborators | `{resourceType, resourceId, orgId}` unique sparse | 按组织查权限 |
| invoices | `{teamId, status}` | 按状态筛选 |
| invoices | `{teamId, createTime: -1}` | 时间排序 |
| chats | `{appId, createTime: -1}` | 应用日志查询 |
| chats | `{teamId, createTime: -1}` | 团队日志查询 |

### 唯一约束

| Collection | 约束 | 说明 |
|------------|------|------|
| group_members | `{groupId, tmbId}` | 成员不重复加入 |
| invoices | `{invoiceNo}` sparse | 发票号唯一 |
| chats | `{chatId}` | 会话 ID 唯一 |

---

## 6. 文件位置速查

```
src/packages/service/
├── core/
│   └── chat/schema.ts                          # chats
├── support_permission/
│   ├── collaborator/schema.ts                  # collaborators
│   └── memberGroup/
│       ├── memberGroupSchema.ts                # member_groups
│       └── groupMemberSchema.ts                # group_members
└── support_wallet/
    └── invoice/schema.ts                       # invoices
```

---

*最后更新: 2025-11-24*
*已与实际代码实现同步*

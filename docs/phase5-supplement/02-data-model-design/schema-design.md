# Phase 5 - 补充功能数据模型设计

> 阶段: Phase 5 - 补充开发
> 最后更新: 2025-11-25
> 状态: 规划完成

---

## 1. Schema 汇总

| Collection | 模块 | 状态 | 说明 |
|------------|------|------|------|
| `invitation_links` | 邀请链接 | 需新建 | 团队邀请链接 |
| `user_informs` | 用户通知 | 需新建 | 站内通知消息 |
| `system_messages` | 系统消息 | 需新建 | 全局公告/弹窗 |
| `dataset_tags` | 数据集标签 | 需新建 | 标签定义 |
| `verification_codes` | 验证码 | 需新建 | 短信/邮件验证码 |

---

## 2. Schema 详情

### 2.1 邀请链接 (invitation_links)

**位置**: `src/packages/service/support_user/team/invitationLink/schema.ts`
**Model 导出**: `MongoInvitationLinkModel`

```typescript
import { Schema, model, models } from 'mongoose';
import { nanoid } from 'nanoid';

const InvitationLinkSchema = new Schema({
  // 所属团队
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },
  // 创建者
  creatorTmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member',
    required: true
  },
  // 唯一标识（用于 URL）
  linkId: {
    type: String,
    required: true,
    unique: true,
    default: () => nanoid(12)
  },
  // 使用限制
  maxUsage: {
    type: Number,
    default: 0           // 0 = 不限制
  },
  usedCount: {
    type: Number,
    default: 0
  },
  // 过期时间
  expireTime: {
    type: Date,
    required: true
  },
  // 状态
  status: {
    type: String,
    enum: ['active', 'disabled'],
    default: 'active'
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: false }
});

// 索引
InvitationLinkSchema.index({ teamId: 1, createTime: -1 });
InvitationLinkSchema.index({ linkId: 1 }, { unique: true });
InvitationLinkSchema.index({ expireTime: 1 });  // 用于清理过期链接

export const MongoInvitationLinkModel =
  models['invitation_links'] || model('invitation_links', InvitationLinkSchema);
```

**使用记录（可选扩展）**:
```typescript
// 如需记录每次使用详情，可新增 invitation_link_usages 表
const InvitationLinkUsageSchema = new Schema({
  linkId: String,
  userId: Schema.Types.ObjectId,
  usedTime: { type: Date, default: Date.now }
});
```

---

### 2.2 用户通知 (user_informs)

**位置**: `src/packages/service/support_user/inform/schema.ts`
**Model 导出**: `MongoUserInformModel`

```typescript
import { Schema, model, models } from 'mongoose';

// 通知类型枚举
export enum InformTypeEnum {
  system = 'system',       // 系统通知
  team = 'team',           // 团队通知（邀请、权限变更）
  billing = 'billing'      // 账单通知（充值、扣费、到期）
}

const UserInformSchema = new Schema({
  // 接收用户
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  // 通知类型
  type: {
    type: String,
    enum: Object.values(InformTypeEnum),
    required: true
  },
  // 通知内容
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  // 阅读状态
  isRead: {
    type: Boolean,
    default: false
  },
  // 关联信息
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams'
  },
  linkUrl: String,         // 点击跳转链接
  // 自动过期（可选）
  expireAt: Date
}, {
  timestamps: { createdAt: 'createTime', updatedAt: false }
});

// 索引
UserInformSchema.index({ userId: 1, createTime: -1 });
UserInformSchema.index({ userId: 1, isRead: 1 });
UserInformSchema.index({ userId: 1, type: 1 });
UserInformSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0, sparse: true }); // TTL

export const MongoUserInformModel =
  models['user_informs'] || model('user_informs', UserInformSchema);
```

---

### 2.3 系统消息 (system_messages)

**位置**: `src/packages/service/support/systemMessage/schema.ts`
**Model 导出**: `MongoSystemMessageModel`

```typescript
import { Schema, model, models } from 'mongoose';

// 消息优先级
export enum MessagePriorityEnum {
  normal = 'normal',
  important = 'important',
  urgent = 'urgent'
}

// 目标用户群
export enum TargetUsersEnum {
  all = 'all',
  free = 'free',
  paid = 'paid'
}

const SystemMessageSchema = new Schema({
  // 消息内容
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000       // 支持 Markdown
  },
  // 优先级
  priority: {
    type: String,
    enum: Object.values(MessagePriorityEnum),
    default: 'normal'
  },
  // 目标用户
  targetUsers: {
    type: String,
    enum: Object.values(TargetUsersEnum),
    default: 'all'
  },
  // 状态
  isActive: {
    type: Boolean,
    default: true
  },
  // 展示时间范围
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  // 操作按钮
  buttons: [{
    text: {
      type: String,
      maxlength: 20
    },
    action: {
      type: String,
      enum: ['close', 'link', 'confirm']
    },
    url: String
  }]
}, {
  timestamps: true
});

// 索引
SystemMessageSchema.index({ isActive: 1, startTime: 1, endTime: 1 });
SystemMessageSchema.index({ targetUsers: 1 });

export const MongoSystemMessageModel =
  models['system_messages'] || model('system_messages', SystemMessageSchema);
```

---

### 2.4 数据集标签 (dataset_tags)

**位置**: `src/packages/service/core/dataset/tag/schema.ts`
**Model 导出**: `MongoDatasetTagModel`

```typescript
import { Schema, model, models } from 'mongoose';

const DatasetTagSchema = new Schema({
  // 所属团队
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },
  // 所属数据集
  datasetId: {
    type: Schema.Types.ObjectId,
    ref: 'datasets',
    required: true
  },
  // 标签名称
  name: {
    type: String,
    required: true,
    maxlength: 50,
    trim: true
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: false }
});

// 索引
DatasetTagSchema.index({ datasetId: 1, name: 1 }, { unique: true });  // 同一数据集标签名唯一
DatasetTagSchema.index({ teamId: 1 });
DatasetTagSchema.index({ datasetId: 1, createTime: -1 });

export const MongoDatasetTagModel =
  models['dataset_tags'] || model('dataset_tags', DatasetTagSchema);
```

**标签与 Collection 关联**:
```typescript
// 已有的 dataset_collection_tags 表（如果存在）或扩展 dataset_collections 表
// 方案 A: 在 collection 中添加 tags 数组字段
// 方案 B: 新建关联表

// 方案 A（推荐 - 简单场景）
// 在 dataset_collections schema 中添加:
// tags: [{ type: Schema.Types.ObjectId, ref: 'dataset_tags' }]

// 方案 B（复杂场景 - 需要更多元数据）
const DatasetCollectionTagSchema = new Schema({
  collectionId: { type: Schema.Types.ObjectId, required: true },
  tagId: { type: Schema.Types.ObjectId, required: true }
});
DatasetCollectionTagSchema.index({ collectionId: 1, tagId: 1 }, { unique: true });
```

---

### 2.5 验证码 (verification_codes)

**位置**: `src/packages/service/support_user/auth/verificationCodeSchema.ts`
**Model 导出**: `MongoVerificationCodeModel`

```typescript
import { Schema, model, models } from 'mongoose';

// 验证码用途
export enum VerificationCodeTypeEnum {
  register = 'register',
  findPassword = 'findPassword',
  bindPhone = 'bindPhone',
  bindEmail = 'bindEmail'
}

const VerificationCodeSchema = new Schema({
  // 联系方式（手机号或邮箱）
  contact: {
    type: String,
    required: true
  },
  // 用途
  type: {
    type: String,
    enum: Object.values(VerificationCodeTypeEnum),
    required: true
  },
  // 验证码
  code: {
    type: String,
    required: true,
    length: 6
  },
  // 已使用
  isUsed: {
    type: Boolean,
    default: false
  },
  // 过期时间
  expireAt: {
    type: Date,
    required: true,
    index: { expires: 0 }   // TTL 自动删除
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: false }
});

// 索引
VerificationCodeSchema.index({ contact: 1, type: 1 });
VerificationCodeSchema.index({ contact: 1, code: 1, type: 1 });

export const MongoVerificationCodeModel =
  models['verification_codes'] || model('verification_codes', VerificationCodeSchema);
```

**注意**:
- 也可以使用 Redis 存储验证码（推荐，性能更好）
- MongoDB 方案适合需要持久化记录发送历史的场景

---

## 3. 关系图

```
┌─────────────────────────────────────────────────────────────┐
│                      邀请链接系统                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      1:N      ┌───────────────────┐     │
│   │    teams     │──────────────>│ invitation_links  │     │
│   └──────────────┘               └───────────────────┘     │
│                                          │                  │
│   ┌──────────────┐                      │                  │
│   │ team.member  │<─────────────────────┘                  │
│   │  (creator)   │        creatorTmbId                     │
│   └──────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       通知系统                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      1:N      ┌───────────────────┐     │
│   │    users     │──────────────>│   user_informs    │     │
│   └──────────────┘               └───────────────────┘     │
│                                          │                  │
│                                          │ (optional)       │
│                                          ▼                  │
│                                   ┌──────────────┐          │
│                                   │    teams     │          │
│                                   └──────────────┘          │
│                                                             │
│   ┌─────────────────────────────────────────────────┐      │
│   │              system_messages                     │      │
│   │     (全局公告，不关联具体用户，按条件筛选展示)       │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      数据集标签系统                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      1:N      ┌───────────────────┐     │
│   │   datasets   │──────────────>│   dataset_tags    │     │
│   └──────────────┘               └───────────────────┘     │
│                                          │                  │
│                                          │ N:M              │
│                                          ▼                  │
│                                ┌─────────────────────┐      │
│                                │ dataset_collections │      │
│                                │    (tags 字段)      │      │
│                                └─────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       验证码系统                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────────────────────────────────────────────┐    │
│   │                verification_codes                  │    │
│   │                                                    │    │
│   │   contact: "13800138000"                          │    │
│   │   type: "register"                                │    │
│   │   code: "123456"                                  │    │
│   │   expireAt: TTL 5min                              │    │
│   └───────────────────────────────────────────────────┘    │
│                                                             │
│   备选方案: Redis 存储                                       │
│   Key: auth:code:{type}:{contact}                          │
│   Value: {code}                                            │
│   TTL: 300s                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 索引策略

### 4.1 查询优化索引

| Collection | 索引 | 用途 |
|------------|------|------|
| invitation_links | `{teamId, createTime: -1}` | 团队邀请列表 |
| invitation_links | `{linkId}` unique | 链接查询 |
| user_informs | `{userId, createTime: -1}` | 用户通知列表 |
| user_informs | `{userId, isRead}` | 未读筛选 |
| dataset_tags | `{datasetId, name}` unique | 标签唯一 |
| verification_codes | `{contact, type}` | 验证码查询 |

### 4.2 TTL 索引

| Collection | 字段 | TTL | 说明 |
|------------|------|-----|------|
| user_informs | expireAt | 0 | 可选，通知过期自动删除 |
| verification_codes | expireAt | 0 | 5 分钟后自动删除 |

---

## 5. 与现有 Schema 的关系

### 5.1 需要扩展的现有 Schema

**team.member（团队成员）**:
```typescript
// 已有字段基础上，确保包含:
status: {
  type: String,
  enum: ['active', 'waiting', 'leave'],  // 添加 waiting 状态
  default: 'active'
}
```

**dataset_collections（数据集集合）**:
```typescript
// 添加标签字段
tags: [{
  type: Schema.Types.ObjectId,
  ref: 'dataset_tags'
}]
```

### 5.2 依赖的现有 Schema

| Schema | 模块 | 说明 |
|--------|------|------|
| teams | 团队 | 邀请链接关联 |
| team.member | 成员 | 创建者、接收者 |
| users | 用户 | 通知接收者 |
| datasets | 数据集 | 标签关联 |

---

## 6. 文件位置速查

```
src/packages/service/
├── support_user/
│   ├── team/
│   │   └── invitationLink/
│   │       ├── schema.ts              # invitation_links
│   │       └── controller.ts
│   ├── inform/
│   │   ├── schema.ts                  # user_informs
│   │   └── controller.ts
│   └── auth/
│       └── verificationCodeSchema.ts  # verification_codes
├── support/
│   └── systemMessage/
│       ├── schema.ts                  # system_messages
│       └── controller.ts
└── core/
    └── dataset/
        └── tag/
            ├── schema.ts              # dataset_tags
            └── controller.ts
```

---

## 7. 迁移注意事项

1. **创建顺序**: 先创建 Schema 文件，再创建 API 文件
2. **索引创建**: Schema 中定义的索引会在首次连接时自动创建
3. **数据兼容**: 新增字段使用默认值，不影响现有数据
4. **TTL 索引**: 注意 TTL 索引只对新插入的文档生效

---

*最后更新: 2025-11-25*

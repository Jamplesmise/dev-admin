# Phase 1 - Data Model Design Overview

> Phase: 1 - Core Features
> Last Updated: 2025-11-24
> Status: **已与代码同步**

---

## 1. Schema Summary

| Collection | Module | Status | Description |
|------------|--------|--------|-------------|
| `operationLogs` | Audit | Exists | Operation audit logs (TTL: 14 days) |
| `team_orgs` | Org | Exists | Organization hierarchy |
| `team_org_members` | Org | Exists | Org-member relations |
| `team_bills` | Payment | Exists | Payment orders |
| `user_oauth_bindings` | Auth | Exists | OAuth account bindings |
| `captcha_sessions` | Auth | Exists | Captcha verification (TTL) |
| `wx_login_sessions` | Auth | Exists | WeChat scan login (TTL) |

---

## 2. Schema Details

### 2.1 Operation Logs (operationLogs)

**Location**: `src/packages/service/support_user_audit/schema.ts`
**Model Export**: `MongoOperationLog`
**Note**: Uses `connectionLogMongo` (separate log database connection)

```typescript
const OperationLogSchema = new Schema({
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member',
    required: true
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'team',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  event: {
    type: String,
    enum: Object.values(AuditEventEnum),
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// Indexes
OperationLogSchema.index({ teamId: 1, tmbId: 1, event: 1 });
OperationLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 }); // TTL: 14 days
```

---

### 2.2 Organizations (team_orgs)

**Location**: `src/packages/service/support_permission/org/orgSchema.ts`
**Model Export**: `MongoOrgModel`

```typescript
const OrgSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'team',
    required: true
  },
  pathId: {
    type: String,
    required: true,
    default: () => getNanoid()  // Nanoid for unique path identifier
  },
  path: {
    type: String,
    default: ''  // Empty for root orgs, parent's path + '/' + parentPathId for children
  },
  name: {
    type: String,
    required: true
  },
  avatar: String,
  description: String,
  updateTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: false }
});

// Indexes
OrgSchema.index({ teamId: 1, path: 1 });
OrgSchema.index({ teamId: 1, pathId: 1 }, { unique: true });

// Virtual: members
OrgSchema.virtual('members', {
  ref: 'team_org_members',
  localField: '_id',
  foreignField: 'orgId'
});
```

**Tree Structure Implementation**:
- Uses `path` string instead of `parentId` reference
- `pathId` is a Nanoid unique identifier for each org
- Child org's `path` = parent's `path` + '/' + parent's `pathId`
- Example: Root path = '', Child path = '/abc123', Grandchild path = '/abc123/def456'

---

### 2.3 Organization Members (team_org_members)

**Location**: `src/packages/service/support_permission/org/orgMemberSchema.ts`
**Model Export**: `MongoOrgMemberModel`

```typescript
const OrgMemberSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'team',
    required: true
  },
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'team_orgs',
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member',
    required: true
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: false }
});

// Indexes
OrgMemberSchema.index({ teamId: 1, orgId: 1, tmbId: 1 }, { unique: true });
OrgMemberSchema.index({ teamId: 1, tmbId: 1 });

// Virtual: org
OrgMemberSchema.virtual('org', {
  ref: 'team_orgs',
  localField: 'orgId',
  foreignField: '_id',
  justOne: true
});
```

---

### 2.4 Bills (team_bills)

**Location**: `src/packages/service/support_wallet/bill/schema.ts`
**Model Export**: `MongoBillModel`

```typescript
const BillSchema = new Schema({
  // Order identification
  orderId: {
    type: String,
    required: true,
    unique: true
  },

  // References
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'team',
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member',
    required: true
  },

  // Bill type
  type: {
    type: String,
    enum: ['standard', 'extraDatasetSize', 'extraPoints'],
    required: true
  },

  // Payment details
  price: {
    type: Number,
    required: true,
    min: 0
  },
  payment: {
    type: String,
    enum: ['wx', 'alipay', 'balance', 'bank'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'canceled', 'refunded'],
    default: 'pending'
  },

  // Subscription details
  subLevel: {
    type: String,
    enum: ['free', 'experience', 'team', 'enterprise', 'custom']
  },
  subMode: {
    type: String,
    enum: ['month', 'year']
  },

  // Extra purchase details
  extraDatasetSize: Number,
  extraPoints: Number,

  // Payment credentials
  qrCode: String,
  codeUrl: String,
  transactionId: String,

  // Timestamps
  payTime: Date,
  expireTime: {
    type: Date,
    required: true
  },

  // Invoice relation
  invoiced: {
    type: Boolean,
    default: false
  },
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'invoices'
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});

// Indexes
BillSchema.index({ teamId: 1, createTime: -1 });
BillSchema.index({ status: 1, expireTime: 1 });
BillSchema.index({ tmbId: 1 });
BillSchema.index({ teamId: 1, status: 1, invoiced: 1 });
```

---

### 2.5 OAuth Bindings (user_oauth_bindings)

**Location**: `src/packages/service/support_user/auth/schema.ts`
**Model Export**: `MongoOAuthBindingModel`

```typescript
const OAuthBindingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  provider: {
    type: String,
    enum: ['github', 'google', 'dingtalk', 'feishu', 'wechat'],
    required: true
  },
  providerId: {
    type: String,
    required: true
  },

  // Tokens
  accessToken: String,
  refreshToken: String,

  // Profile info
  profile: {
    nickname: String,
    avatar: String,
    email: String
  },

  // Timestamps
  bindTime: {
    type: Date,
    default: Date.now
  },
  lastLoginTime: Date
});

// Indexes
OAuthBindingSchema.index({ userId: 1, provider: 1 }, { unique: true });
OAuthBindingSchema.index({ provider: 1, providerId: 1 }, { unique: true });
```

---

### 2.6 Captcha Sessions (captcha_sessions)

**Location**: `src/packages/service/support_user/auth/schema.ts`
**Model Export**: `MongoCaptchaSessionModel`

```typescript
const CaptchaSessionSchema = new Schema({
  captchaId: {
    type: String,
    required: true,
    unique: true
  },
  answer: {
    type: String,
    required: true
  },
  expireAt: {
    type: Date,
    required: true,
    index: { expires: 0 }  // TTL index - auto delete when expired
  }
});
```

---

### 2.7 WeChat Login Sessions (wx_login_sessions)

**Location**: `src/packages/service/support_user/auth/schema.ts`
**Model Export**: `MongoWxLoginSessionModel`

```typescript
const WxLoginSessionSchema = new Schema({
  sceneId: {
    type: String,
    required: true,
    unique: true
  },
  ticket: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'success', 'expired'],
    default: 'waiting'
  },
  openId: String,
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  inviterId: String,
  expireAt: {
    type: Date,
    required: true,
    index: { expires: 0 }  // TTL index
  }
});
```

---

## 3. Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                        User System                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐      1:N      ┌─────────────────────┐       │
│   │   User   │──────────────>│ user_oauth_bindings │       │
│   └──────────┘               └─────────────────────┘       │
│        │                                                    │
│        │ 1:N                                               │
│        ▼                                                    │
│   ┌──────────────┐                                         │
│   │ TeamMember   │                                         │
│   └──────────────┘                                         │
│        │                                                    │
│        │ N:M                                               │
│        ▼                                                    │
│   ┌────────────────────┐    N:1    ┌───────────────┐       │
│   │ team_org_members   │──────────>│   team_orgs   │       │
│   └────────────────────┘           └───────────────┘       │
│                                           │                 │
│                                           │ Tree (path)    │
│                                           ▼                 │
│                                    ┌───────────────┐       │
│                                    │   team_orgs   │       │
│                                    │   (parent)    │       │
│                                    └───────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Payment System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      1:N      ┌──────────────┐          │
│   │    Team      │──────────────>│  team_bills  │          │
│   └──────────────┘               └──────────────┘          │
│        │                               │                    │
│        │ 1:N                          │ N:1                │
│        ▼                               ▼                    │
│   ┌──────────────┐              ┌──────────────┐           │
│   │   TeamSub    │<─────────────│   invoices   │           │
│   └──────────────┘   triggers   └──────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       Audit System                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      1:N      ┌────────────────┐        │
│   │    Team      │──────────────>│ operationLogs  │        │
│   └──────────────┘               └────────────────┘        │
│                                         │                   │
│   ┌──────────────┐                     │                   │
│   │ TeamMember   │─────────────────────┘                   │
│   └──────────────┘        N:1                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Index Strategy

### Performance Indexes

| Collection | Index | Purpose |
|------------|-------|---------|
| team_bills | `{ teamId: 1, createTime: -1 }` | Bill list query |
| team_bills | `{ orderId: 1 }` unique | Order lookup |
| team_bills | `{ teamId: 1, status: 1, invoiced: 1 }` | Invoice query |
| operationLogs | `{ teamId: 1, tmbId: 1, event: 1 }` | Log filtering |
| team_orgs | `{ teamId: 1, path: 1 }` | Tree traversal |
| team_orgs | `{ teamId: 1, pathId: 1 }` unique | Path ID lookup |
| user_oauth_bindings | `{ provider: 1, providerId: 1 }` unique | OAuth lookup |

### TTL Indexes

| Collection | Field | TTL | Purpose |
|------------|-------|-----|---------|
| operationLogs | timestamp | 14 days | Auto cleanup |
| captcha_sessions | expireAt | 0 | 5 min sessions |
| wx_login_sessions | expireAt | 0 | 5 min sessions |

---

## 5. Migration Notes

1. All schemas use `timestamps: true` for createTime/updateTime
2. Use `Schema.Types.ObjectId` for all references
3. Add `sparse: true` for optional unique indexes
4. Organization uses path-based tree structure (not parentId reference)

---

*Last Updated: 2025-11-24*
*Synchronized with actual code implementation*

# Phase 4 - 其他功能规划概览

> 阶段: Phase 4 - 其他功能
> 优先级: P3
> 预计工期: 0.5 周 (2.5 天)
> 接口数量: 5 个
> 最后更新: 2025-11-23

---

## 1. 模块概览

| 模块 | 接口数 | 说明 | 依赖 |
|------|--------|------|------|
| 系统管理 | 3 | 模型协作者、推广数据 | Phase 2 协作者 |
| 其他服务 | 2 | 运营广告、工单系统 | - |

---

## 2. 系统管理模块 (3 接口)

### 2.1 模型协作者管理

允许管理员为特定模型设置访问权限。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取模型协作者 | GET | `/api/system/model/collaborator/list` | 获取模型权限列表 |
| 更新模型协作者 | POST | `/api/system/model/collaborator/update` | 设置模型权限 |

**请求/响应**:

```typescript
// 获取列表
type GetModelCollaboratorsRequest = {
  modelId: string;
}

type GetModelCollaboratorsResponse = {
  list: {
    _id: string;
    tmbId?: string;
    groupId?: string;
    orgId?: string;
    name: string;            // 协作者名称
    avatar?: string;
    permission: number;
  }[];
}

// 更新协作者
type UpdateModelCollaboratorRequest = {
  modelId: string;
  collaborators: {
    tmbId?: string;
    groupId?: string;
    orgId?: string;
    permission: number;
  }[];
}
```

### 2.2 推广数据

获取用户的推广统计数据。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取推广数据 | GET | `/api/support/activity/promotion/getPromotionData` | 推广统计 |

**响应**:

```typescript
type GetPromotionDataResponse = {
  // 推广码
  promotionCode: string;
  promotionUrl: string;

  // 统计数据
  totalInvites: number;      // 总邀请数
  validInvites: number;      // 有效邀请数
  totalReward: number;       // 总奖励金额
  pendingReward: number;     // 待发放奖励

  // 邀请明细
  inviteList: {
    userId: string;
    username: string;
    registerTime: string;
    status: 'pending' | 'valid' | 'invalid';
    reward: number;
  }[];
}
```

---

## 3. 其他服务模块 (2 接口)

### 3.1 运营广告

获取系统运营广告信息。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取运营广告 | GET | `/api/support/user/inform/getOperationalAd` | 获取广告 |

**响应**:

```typescript
type GetOperationalAdResponse = {
  ads: {
    _id: string;
    type: 'banner' | 'popup' | 'notice';
    title: string;
    content: string;
    imageUrl?: string;
    linkUrl?: string;
    position: string;        // 展示位置
    priority: number;
    startTime: string;
    endTime: string;
  }[];
}
```

### 3.2 工单系统

创建用户工单/反馈。

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建工单 | POST | `/api/common/workorder/create` | 提交工单 |

**请求/响应**:

```typescript
type CreateWorkOrderRequest = {
  type: 'bug' | 'feature' | 'question' | 'other';
  title: string;
  description: string;
  attachments?: string[];    // 附件 URL
  priority?: 'low' | 'medium' | 'high';
  contactEmail?: string;
}

type CreateWorkOrderResponse = {
  orderId: string;
  status: 'created';
}
```

---

## 4. 数据模型

### 4.1 模型协作者

复用 Phase 2 的 Collaborator Schema，resourceType 增加 'model' 类型。

```typescript
// 扩展 resourceType
type CollaboratorResourceType = 'app' | 'dataset' | 'model';
```

### 4.2 推广记录

```typescript
type PromotionRecordSchema = {
  _id: ObjectId;
  promoterId: ObjectId;      // 推广人 userId
  inviteeId: ObjectId;       // 被邀请人 userId
  promotionCode: string;     // 推广码

  status: 'pending' | 'valid' | 'invalid';
  reward: number;            // 奖励金额（分）
  rewardPaidAt?: Date;       // 发放时间

  registerTime: Date;
  validTime?: Date;          // 成为有效邀请的时间
}
```

### 4.3 运营广告

```typescript
type OperationalAdSchema = {
  _id: ObjectId;
  type: 'banner' | 'popup' | 'notice';

  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;

  position: string;          // 展示位置标识
  priority: number;          // 优先级

  // 展示时间
  startTime: Date;
  endTime: Date;

  // 展示条件
  targetUsers?: 'all' | 'free' | 'paid';
  targetPlatform?: 'web' | 'mobile' | 'all';

  // 状态
  enabled: boolean;

  createTime: Date;
  updateTime: Date;
}
```

### 4.4 工单

```typescript
type WorkOrderSchema = {
  _id: ObjectId;
  orderId: string;           // 工单号

  // 提交人
  userId?: ObjectId;
  teamId?: ObjectId;
  contactEmail: string;

  // 工单内容
  type: 'bug' | 'feature' | 'question' | 'other';
  title: string;
  description: string;
  attachments: string[];
  priority: 'low' | 'medium' | 'high';

  // 状态
  status: 'created' | 'processing' | 'resolved' | 'closed';

  // 处理信息
  assignee?: string;
  resolution?: string;

  createTime: Date;
  updateTime: Date;
  resolveTime?: Date;
}
```

---

## 5. 开发计划

### 时间安排

```
Day 1 (4h):
├── 模型协作者列表 (1.5h)
├── 模型协作者更新 (1.5h)
└── 测试 (1h)

Day 2 (4h):
├── 推广数据接口 (2h)
├── 运营广告接口 (1h)
└── 测试 (1h)

Day 3 (4h):
├── 工单创建接口 (2h)
├── 前端适配 (1h)
└── 集成测试 (1h)
```

---

## 6. 产出文件

```
packages/service/support/
├── promotion/
│   ├── schema.ts
│   └── controller.ts
├── advertisement/
│   ├── schema.ts
│   └── controller.ts
└── workorder/
    ├── schema.ts
    └── controller.ts

projects/app/src/pages/api/
├── system/model/collaborator/
│   ├── list.ts
│   └── update.ts
├── support/
│   ├── activity/promotion/getPromotionData.ts
│   └── user/inform/getOperationalAd.ts
└── common/workorder/create.ts

test/cases/
├── modelCollaborator/
├── promotion/
├── advertisement/
└── workorder/
```

---

## 7. 验收标准

- [ ] 5 个 API 全部实现
- [ ] 模型权限控制正确
- [ ] 推广数据统计正确
- [ ] 广告展示逻辑正确
- [ ] 工单创建成功
- [ ] 测试覆盖率 ≥ 80%

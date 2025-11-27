# Phase 4 - 数据模型设计

> 阶段: Phase 4 - 其他功能
> 最后更新: 2025-11-23

---

## 1. Schema 汇总

| Collection | 模块 | 状态 | 说明 |
|------------|------|------|------|
| `collaborators` | 模型协作者 | 扩展 | 增加 model 类型 |
| `promotion_records` | 推广 | 需新建 | 推广邀请记录 |
| `operational_ads` | 广告 | 需新建 | 运营广告 |
| `work_orders` | 工单 | 需新建 | 用户工单 |

---

## 2. 扩展现有 Schema

### 2.1 Collaborator 扩展

修改 Phase 2 的 Collaborator Schema，增加 model 资源类型：

```typescript
// packages/service/support/permission/collaborator/schema.ts

const CollaboratorSchema = new Schema({
  // ... 其他字段不变

  resourceType: {
    type: String,
    enum: ['app', 'dataset', 'model'],  // 增加 model
    required: true
  },

  // ... 其他字段不变
});
```

---

## 3. 新建 Schema

### 3.1 推广记录 (promotion_records)

**位置**: `packages/service/support/promotion/schema.ts` (新建)

```typescript
import { Schema, model, models } from 'mongoose';

const PromotionRecordSchema = new Schema({
  // 推广人
  promoterId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  promotionCode: {
    type: String,
    required: true
  },

  // 被邀请人
  inviteeId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },

  // 状态
  status: {
    type: String,
    enum: ['pending', 'valid', 'invalid'],
    default: 'pending'
  },

  // 奖励
  reward: {
    type: Number,
    default: 0,
    min: 0
  },
  rewardPaidAt: Date,

  // 时间
  registerTime: {
    type: Date,
    default: Date.now
  },
  validTime: Date
}, {
  timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});

// 索引
PromotionRecordSchema.index({ promoterId: 1, createTime: -1 });
PromotionRecordSchema.index({ promoterId: 1, status: 1 });
PromotionRecordSchema.index({ inviteeId: 1 }, { unique: true });
PromotionRecordSchema.index({ promotionCode: 1 });

export const MongoPromotionRecord = models['promotion_record'] || model('promotion_record', PromotionRecordSchema);
```

### 3.2 运营广告 (operational_ads)

**位置**: `packages/service/support/advertisement/schema.ts` (新建)

```typescript
import { Schema, model, models } from 'mongoose';

const OperationalAdSchema = new Schema({
  // 广告类型
  type: {
    type: String,
    enum: ['banner', 'popup', 'notice'],
    required: true
  },

  // 内容
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  content: {
    type: String,
    maxlength: 1000
  },
  imageUrl: String,
  linkUrl: String,

  // 展示配置
  position: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    default: 0
  },

  // 展示时间
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },

  // 展示条件
  targetUsers: {
    type: String,
    enum: ['all', 'free', 'paid'],
    default: 'all'
  },
  targetPlatform: {
    type: String,
    enum: ['web', 'mobile', 'all'],
    default: 'all'
  },

  // 状态
  enabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});

// 索引
OperationalAdSchema.index({ enabled: 1, startTime: 1, endTime: 1 });
OperationalAdSchema.index({ position: 1, priority: -1 });

export const MongoOperationalAd = models['operational_ad'] || model('operational_ad', OperationalAdSchema);
```

### 3.3 工单 (work_orders)

**位置**: `packages/service/support/workorder/schema.ts` (新建)

```typescript
import { Schema, model, models } from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 12);

const WorkOrderSchema = new Schema({
  // 工单号
  orderId: {
    type: String,
    default: () => `WO${nanoid()}`,
    unique: true
  },

  // 提交人
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'team'
  },
  contactEmail: {
    type: String,
    required: true
  },

  // 工单内容
  type: {
    type: String,
    enum: ['bug', 'feature', 'question', 'other'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },

  // 状态
  status: {
    type: String,
    enum: ['created', 'processing', 'resolved', 'closed'],
    default: 'created'
  },

  // 处理信息
  assignee: String,
  resolution: String,
  resolveTime: Date,

  // 内部备注
  internalNotes: [{
    content: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});

// 索引
WorkOrderSchema.index({ userId: 1, createTime: -1 });
WorkOrderSchema.index({ status: 1, priority: -1, createTime: -1 });
WorkOrderSchema.index({ type: 1, status: 1 });

export const MongoWorkOrder = models['work_order'] || model('work_order', WorkOrderSchema);
```

---

## 4. 关系图

```
┌─────────────────────────────────────────────────────────────┐
│                      推广系统                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      1:N      ┌──────────────────┐      │
│   │    User      │──────────────>│ PromotionRecord  │      │
│   │  (推广人)    │               │    (邀请记录)    │      │
│   └──────────────┘               └──────────────────┘      │
│          │                              │                   │
│          │                              │ N:1               │
│          │                              ▼                   │
│          │                       ┌──────────────┐          │
│          └──────────────────────>│    User      │          │
│                    被邀请人       │  (被邀请人)  │          │
│                                  └──────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      工单系统                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      1:N      ┌──────────────────┐      │
│   │    User      │──────────────>│   WorkOrder      │      │
│   └──────────────┘               └──────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 索引策略

| Collection | 索引 | 用途 |
|------------|------|------|
| promotion_records | `{promoterId, createTime}` | 推广人查询 |
| promotion_records | `{inviteeId}` unique | 防重复邀请 |
| operational_ads | `{enabled, startTime, endTime}` | 有效广告查询 |
| work_orders | `{userId, createTime}` | 用户工单列表 |
| work_orders | `{status, priority, createTime}` | 管理员列表 |

---

## 6. 变更记录

### 2025-11-25: 工单 attachments 字段类型升级

**变更内容**: 将 `attachments` 字段从字符串数组升级为对象数组

**变更前**:
```typescript
attachments: [{
  type: String
}]
```

**变更后**:
```typescript
attachments: [{
  filename: String,
  url: String,
  size: Number
}]
```

**变更原因**:
1. **业务需求**: 需要存储附件的元数据（文件名、大小）
2. **用户体验**: 前端需要显示文件名和大小信息
3. **功能完整性**: 与其他系统（如发票附件）保持一致

**影响分析**:
- ✅ **向后兼容**: 新格式包含原有的 url 信息
- ⚠️ **数据迁移**: 如果数据库中已有字符串数组格式的数据，需要迁移
- ✅ **类型安全**: TypeScript 类型定义已同步更新

**相关修改**:
- Schema: `src/packages/service/support/workorder/schema.ts:56-62`
- Type: `src/packages/global/support/workorder/type.d.ts:16-20`
- Controller: `src/packages/service/support/workorder/controller.ts:48`

**迁移脚本** (如需要):
```javascript
// MongoDB 数据迁移示例
db.work_orders.find({ attachments: { $elemMatch: { $type: "string" } } }).forEach(doc => {
  db.work_orders.updateOne(
    { _id: doc._id },
    {
      $set: {
        attachments: doc.attachments.map(url => ({
          filename: url.split('/').pop() || 'unknown',
          url: url,
          size: 0
        }))
      }
    }
  );
});
```

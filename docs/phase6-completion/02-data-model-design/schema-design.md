# Phase 6 数据模型设计

> 阶段: Phase 6 - 接口补全
> 创建时间: 2025-11-26
> 新增集合数量: 4 个
> 扩展集合数量: 2 个

---

## 1. 新增集合概览

| 集合名称 | 用途 | 子阶段 |
|---------|------|--------|
| `invoice_headers` | 发票抬头信息 | 6C |
| `coupon_codes` | 优惠券兑换码 | 6C |
| `user_coupons` | 用户持有的优惠券 | 6C |
| `team_tags` | 团队自定义标签 | 6D |
| `template_types` | 应用模板分类 | 6D |

---

## 2. 发票抬头 Schema

### 2.1 集合名称

`invoice_headers`

### 2.2 文件位置

`src/packages/service/support_invoice/schema.ts`

### 2.3 Schema 定义

```typescript
import { Schema, model, models, Model } from 'mongoose';
import type { InvoiceHeaderSchemaType } from '@fastgpt/global/support/invoice/type';

const InvoiceHeaderSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true,
    unique: true
  },

  // 发票类型
  invoiceType: {
    type: String,
    enum: ['personal', 'company'],
    required: true
  },

  // 基本信息
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  taxNumber: {
    type: String,
    maxlength: 20,
    validate: {
      validator: function(v: string) {
        // 企业类型必须有税号
        if (this.invoiceType === 'company' && !v) return false;
        // 税号格式：15-20 位字母数字
        if (v && !/^[A-Za-z0-9]{15,20}$/.test(v)) return false;
        return true;
      },
      message: '税号格式错误'
    }
  },

  // 企业专用信息
  bankName: { type: String, maxlength: 100 },
  bankAccount: { type: String, maxlength: 30 },
  companyAddress: { type: String, maxlength: 200 },
  companyPhone: { type: String, maxlength: 20 },

  // 收件信息
  receiverName: {
    type: String,
    required: true,
    maxlength: 50
  },
  receiverPhone: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => /^1[3-9]\d{9}$/.test(v),
      message: '手机号格式错误'
    }
  },
  receiverAddress: {
    type: String,
    required: true,
    maxlength: 200
  },
  receiverEmail: {
    type: String,
    validate: {
      validator: (v: string) => !v || /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(v),
      message: '邮箱格式错误'
    }
  },

  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

// 索引
InvoiceHeaderSchema.index({ teamId: 1 }, { unique: true });

// Model
export const MongoInvoiceHeader: Model<InvoiceHeaderSchemaType> =
  models['invoice_headers'] || model('invoice_headers', InvoiceHeaderSchema);
```

### 2.4 类型定义

```typescript
// src/packages/global/support/invoice/type.d.ts

export type InvoiceHeaderSchemaType = {
  _id: string;
  teamId: string;
  invoiceType: 'personal' | 'company';
  title: string;
  taxNumber?: string;
  bankName?: string;
  bankAccount?: string;
  companyAddress?: string;
  companyPhone?: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverEmail?: string;
  createTime: Date;
  updateTime: Date;
};
```

---

## 3. 优惠券 Schema

### 3.1 集合名称

- `coupon_codes` - 兑换码表
- `user_coupons` - 用户优惠券表

### 3.2 文件位置

`src/packages/service/support_wallet/coupon/schema.ts`

### 3.3 兑换码 Schema 定义

```typescript
import { Schema, model, models, Model } from 'mongoose';
import type { CouponCodeSchemaType, UserCouponSchemaType } from '@fastgpt/global/support/wallet/coupon/type';

// 兑换码表
const CouponCodeSchema = new Schema({
  // 兑换码（唯一）
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    maxlength: 20
  },

  // 批次 ID（用于限制同批次只能兑换一次）
  batchId: {
    type: String,
    required: true
  },

  // 优惠券类型
  type: {
    type: String,
    enum: ['discount', 'amount'],
    required: true
  },

  // 优惠值
  // discount: 折扣比例 1-99（代表 1%-99% 折扣）
  // amount: 金额（单位：分）
  value: {
    type: Number,
    required: true,
    min: 1
  },

  // 最低消费金额（分）
  minAmount: {
    type: Number,
    default: 0
  },

  // 适用范围
  scope: {
    type: String,
    enum: ['all', 'recharge'],
    default: 'all'
  },

  // 过期时间
  expireTime: {
    type: Date,
    required: true
  },

  // 状态
  status: {
    type: String,
    enum: ['unused', 'used', 'expired'],
    default: 'unused'
  },

  // 使用者信息
  usedBy: { type: Schema.Types.ObjectId, ref: 'users' },
  usedTime: { type: Date },

  createTime: { type: Date, default: Date.now }
});

// 索引
CouponCodeSchema.index({ code: 1 }, { unique: true });
CouponCodeSchema.index({ batchId: 1 });
CouponCodeSchema.index({ status: 1 });
CouponCodeSchema.index({ expireTime: 1 });

export const MongoCouponCode: Model<CouponCodeSchemaType> =
  models['coupon_codes'] || model('coupon_codes', CouponCodeSchema);
```

### 3.4 用户优惠券 Schema 定义

```typescript
// 用户优惠券表
const UserCouponSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },

  // 来源兑换码
  sourceCode: { type: String },

  // 批次 ID
  batchId: { type: String },

  // 优惠券类型
  type: {
    type: String,
    enum: ['discount', 'amount'],
    required: true
  },

  // 优惠值
  value: { type: Number, required: true },

  // 最低消费
  minAmount: { type: Number, default: 0 },

  // 适用范围
  scope: { type: String, default: 'all' },

  // 过期时间
  expireTime: { type: Date, required: true },

  // 状态
  status: {
    type: String,
    enum: ['available', 'used', 'expired'],
    default: 'available'
  },

  // 使用信息
  usedOrderId: { type: Schema.Types.ObjectId },
  usedTime: { type: Date },

  createTime: { type: Date, default: Date.now }
});

// 索引
UserCouponSchema.index({ userId: 1, status: 1 });
UserCouponSchema.index({ teamId: 1 });
UserCouponSchema.index({ batchId: 1, userId: 1 });
UserCouponSchema.index({ expireTime: 1 });

export const MongoUserCoupon: Model<UserCouponSchemaType> =
  models['user_coupons'] || model('user_coupons', UserCouponSchema);
```

### 3.5 类型定义

```typescript
// src/packages/global/support/wallet/coupon/type.d.ts

export type CouponType = 'discount' | 'amount';
export type CouponScope = 'all' | 'recharge';
export type CouponCodeStatus = 'unused' | 'used' | 'expired';
export type UserCouponStatus = 'available' | 'used' | 'expired';

export type CouponCodeSchemaType = {
  _id: string;
  code: string;
  batchId: string;
  type: CouponType;
  value: number;
  minAmount: number;
  scope: CouponScope;
  expireTime: Date;
  status: CouponCodeStatus;
  usedBy?: string;
  usedTime?: Date;
  createTime: Date;
};

export type UserCouponSchemaType = {
  _id: string;
  userId: string;
  teamId: string;
  sourceCode?: string;
  batchId?: string;
  type: CouponType;
  value: number;
  minAmount: number;
  scope: CouponScope;
  expireTime: Date;
  status: UserCouponStatus;
  usedOrderId?: string;
  usedTime?: Date;
  createTime: Date;
};
```

---

## 4. 团队标签 Schema

### 4.1 集合名称

`team_tags`

### 4.2 文件位置

`src/packages/service/support_user/team/tag/schema.ts`

### 4.3 Schema 定义

```typescript
import { Schema, model, models, Model } from 'mongoose';
import type { TeamTagSchemaType } from '@fastgpt/global/support/user/team/tag/type';

const TeamTagSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },

  // 标签唯一标识
  key: {
    type: String,
    required: true,
    maxlength: 50
  },

  // 显示名称
  label: {
    type: String,
    required: true,
    maxlength: 50
  },

  // 标签类型
  type: {
    type: String,
    enum: ['single', 'multi'],
    default: 'single'
  },

  // 选项列表
  options: [{
    value: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String }
  }],

  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

// 索引
TeamTagSchema.index({ teamId: 1 });
TeamTagSchema.index({ teamId: 1, key: 1 }, { unique: true });

export const MongoTeamTag: Model<TeamTagSchemaType> =
  models['team_tags'] || model('team_tags', TeamTagSchema);
```

### 4.4 类型定义

```typescript
// src/packages/global/support/user/team/tag/type.d.ts

export type TeamTagOption = {
  value: string;
  label: string;
  color?: string;
};

export type TeamTagSchemaType = {
  _id: string;
  teamId: string;
  key: string;
  label: string;
  type: 'single' | 'multi';
  options: TeamTagOption[];
  createTime: Date;
  updateTime: Date;
};
```

---

## 5. 模板类型 Schema

### 5.1 集合名称

`template_types`

### 5.2 文件位置

`src/packages/service/core/app/template/schema.ts`

### 5.3 Schema 定义

```typescript
import { Schema, model, models, Model } from 'mongoose';
import type { TemplateTypeSchemaType } from '@fastgpt/global/core/app/template/type';

const TemplateTypeSchema = new Schema({
  // 类型唯一标识
  key: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },

  // 显示名称
  label: {
    type: String,
    required: true,
    maxlength: 50
  },

  // 图标
  icon: { type: String },

  // 父类型 key（null 表示顶级类型）
  parentKey: { type: String, default: null },

  // 排序权重
  order: { type: Number, default: 0 },

  createTime: { type: Date, default: Date.now }
});

// 索引
TemplateTypeSchema.index({ key: 1 }, { unique: true });
TemplateTypeSchema.index({ parentKey: 1 });
TemplateTypeSchema.index({ order: 1 });

export const MongoTemplateType: Model<TemplateTypeSchemaType> =
  models['template_types'] || model('template_types', TemplateTypeSchema);
```

### 5.4 类型定义

```typescript
// src/packages/global/core/app/template/type.d.ts

export type TemplateTypeSchemaType = {
  _id: string;
  key: string;
  label: string;
  icon?: string;
  parentKey?: string;
  order: number;
  createTime: Date;
};

// 树形结构类型
export type TemplateTypeTreeItem = TemplateTypeSchemaType & {
  children?: TemplateTypeTreeItem[];
};
```

---

## 6. 扩展现有 Schema

### 6.1 CollaboratorSchema 扩展

**文件**: `src/packages/service/support_permission/collaborator/schema.ts`

**修改内容**: 在 `resourceType` 枚举中添加 `'team'`

```typescript
// 修改前
resourceType: {
  type: String,
  enum: ['app', 'dataset'],
  required: true
}

// 修改后
resourceType: {
  type: String,
  enum: ['app', 'dataset', 'team'],  // 新增 'team'
  required: true
}
```

**说明**: 支持团队级别的协作者权限管理

### 6.2 TeamSchema 扩展

**文件**: `src/packages/service/support_user/team/teamSchema.ts`

**修改内容**: 添加 `notificationConfig` 字段

```typescript
// 新增字段
notificationConfig: {
  email: {
    enabled: { type: Boolean, default: false },
    address: { type: String }
  },
  sms: {
    enabled: { type: Boolean, default: false },
    phone: { type: String }
  },
  webhook: {
    enabled: { type: Boolean, default: false },
    url: { type: String },
    secret: { type: String }
  }
}
```

---

## 7. 文件结构

### 7.1 新增文件

```
src/packages/
├── global/
│   ├── support/
│   │   ├── invoice/
│   │   │   └── type.d.ts              # 发票抬头类型
│   │   ├── wallet/
│   │   │   └── coupon/
│   │   │       └── type.d.ts          # 优惠券类型
│   │   └── user/
│   │       └── team/
│   │           └── tag/
│   │               └── type.d.ts      # 团队标签类型
│   └── core/
│       └── app/
│           └── template/
│               └── type.d.ts          # 模板类型
└── service/
    ├── support_invoice/
    │   └── schema.ts                  # 发票抬头 Schema
    ├── support_wallet/
    │   └── coupon/
    │       └── schema.ts              # 优惠券 Schema
    ├── support_user/
    │   └── team/
    │       └── tag/
    │           └── schema.ts          # 团队标签 Schema
    └── core/
        └── app/
            └── template/
                └── schema.ts          # 模板类型 Schema
```

---

## 8. 索引设计

### 8.1 索引汇总

| 集合 | 索引 | 类型 | 说明 |
|------|------|------|------|
| `invoice_headers` | `{ teamId: 1 }` | 唯一 | 每团队一条 |
| `coupon_codes` | `{ code: 1 }` | 唯一 | 兑换码唯一 |
| `coupon_codes` | `{ batchId: 1 }` | 普通 | 批次查询 |
| `coupon_codes` | `{ status: 1 }` | 普通 | 状态筛选 |
| `coupon_codes` | `{ expireTime: 1 }` | 普通 | 过期处理 |
| `user_coupons` | `{ userId: 1, status: 1 }` | 复合 | 用户优惠券查询 |
| `user_coupons` | `{ batchId: 1, userId: 1 }` | 复合 | 防重复兑换 |
| `team_tags` | `{ teamId: 1, key: 1 }` | 唯一 | 团队内标签唯一 |
| `template_types` | `{ key: 1 }` | 唯一 | 类型标识唯一 |
| `template_types` | `{ parentKey: 1 }` | 普通 | 树形查询 |

---

## 9. 数据迁移

### 9.1 是否需要迁移

本阶段所有集合均为**新增**，无需数据迁移。

### 9.2 初始化数据

**模板类型**需要初始化默认数据：

```typescript
// scripts/initTemplateTypes.ts
const defaultTypes = [
  { key: 'chat', label: '对话应用', order: 1 },
  { key: 'workflow', label: '工作流应用', order: 2 },
  { key: 'plugin', label: '插件应用', order: 3 },
  { key: 'chat-assistant', label: '对话助手', parentKey: 'chat', order: 1 },
  { key: 'chat-customer', label: '客服助手', parentKey: 'chat', order: 2 }
];

await MongoTemplateType.insertMany(defaultTypes);
```

---

*创建时间: 2025-11-26*

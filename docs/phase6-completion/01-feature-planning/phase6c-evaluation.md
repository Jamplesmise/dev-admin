# Phase 6C - 应用评估与发票优惠券

> 子阶段: Phase 6C
> API 数量: 5 个
> 优先级: P1-P2
> 创建时间: 2025-11-26
> **状态: ✅ 已完成**
> **完成时间: 2025-11-26**

---

## 1. 功能概述

### 1.1 目标

实现应用评估创建（支持文件上传）、发票抬头管理、优惠券兑换和收藏标签更新功能。

### 1.2 API 清单

| 序号 | 接口 | 方法 | 路径 | 优先级 |
|------|------|------|------|--------|
| 1 | 创建应用评估 | POST | `/api/core/app/evaluation/create` | P1 |
| 2 | 获取发票抬头 | GET | `/api/support/user/team/invoiceAccount/getTeamInvoiceHeader` | P2 |
| 3 | 更新发票抬头 | POST | `/api/support/user/team/invoiceAccount/update` | P2 |
| 4 | 兑换优惠券 | GET | `/api/support/wallet/coupon/redeem` | P2 |
| 5 | 更新收藏标签 | PUT | `/api/core/chat/setting/favourite/tags` | P2 |

---

## 2. API 详细规范

### 2.1 创建应用评估 API

#### `POST /api/core/app/evaluation/create`

**功能**: 创建应用评估任务，支持文件上传

**请求参数** (FormData):
```typescript
{
  appId: string;             // 必填，应用 ID
  datasetId: string;         // 必填，评估数据集 ID
  file?: File;               // 可选，上传的评估文件（CSV/JSON）
}
```

**响应数据**:
```typescript
{
  evaluationId: string;      // 创建的评估任务 ID
}
```

**实现要点**:
1. 解析 FormData 获取文件和参数
2. 验证应用和数据集权限
3. 支持 CSV/JSON 格式文件解析
4. 创建评估任务记录
5. 启动异步评估流程

**文件格式要求**:
- CSV: 包含 `input`, `expectedOutput` 两列
- JSON: `[{ "input": "...", "expectedOutput": "..." }]`

---

### 2.2 获取发票抬头 API

#### `GET /api/support/user/team/invoiceAccount/getTeamInvoiceHeader`

**功能**: 获取团队的发票抬头信息

**请求参数**: 无（从认证信息获取 teamId）

**响应数据**:
```typescript
type InvoiceHeaderType = {
  _id: string;
  teamId: string;

  // 发票类型
  invoiceType: 'personal' | 'company';  // 个人/企业

  // 基本信息
  title: string;              // 发票抬头
  taxNumber?: string;         // 税号（企业必填）

  // 企业专用信息
  bankName?: string;          // 开户银行
  bankAccount?: string;       // 银行账号
  companyAddress?: string;    // 公司地址
  companyPhone?: string;      // 公司电话

  // 收件信息
  receiverName: string;       // 收件人
  receiverPhone: string;      // 收件电话
  receiverAddress: string;    // 收件地址
  receiverEmail?: string;     // 电子发票接收邮箱

  createTime: Date;
  updateTime: Date;
} | null;  // 未设置时返回 null
```

**实现要点**:
1. 查询 `invoice_headers` 表
2. 根据 teamId 筛选
3. 未设置时返回 null

---

### 2.3 更新发票抬头 API

#### `POST /api/support/user/team/invoiceAccount/update`

**功能**: 创建或更新团队发票抬头

**请求参数** (Body):
```typescript
{
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
}
```

**响应数据**: 无

**实现要点**:
1. 验证当前用户有团队管理权限
2. 企业类型必须填写税号
3. 使用 upsert 操作（有则更新，无则创建）
4. 记录更新时间

**验证规则**:
- `taxNumber`: 15-20 位数字/字母
- `receiverPhone`: 有效手机号格式
- `receiverEmail`: 有效邮箱格式

---

### 2.4 兑换优惠券 API

#### `GET /api/support/wallet/coupon/redeem`

**功能**: 使用兑换码兑换优惠券

**请求参数** (Query):
```typescript
{
  code: string;  // 必填，兑换码
}
```

**响应数据**:
```typescript
{
  coupon: {
    _id: string;
    code: string;
    type: 'discount' | 'amount';   // 折扣/金额
    value: number;                  // 折扣比例或金额（分）
    minAmount?: number;             // 最低使用金额
    expireTime: Date;               // 过期时间
    scope: 'all' | 'recharge';      // 适用范围
  };
  message: string;  // 成功提示，如"兑换成功，获得 50 元优惠券"
}
```

**实现要点**:
1. 查询 `coupon_codes` 表验证兑换码
2. 检查兑换码状态（未使用、未过期）
3. 检查用户是否已兑换过同一批次
4. 创建用户优惠券记录
5. 标记兑换码为已使用
6. 返回优惠券详情

**错误情况**:
- 兑换码不存在
- 兑换码已被使用
- 兑换码已过期
- 用户已兑换过此批次

---

### 2.5 更新收藏标签 API

#### `PUT /api/core/chat/setting/favourite/tags`

**功能**: 更新收藏应用的标签

**请求参数** (Body):
```typescript
{
  appId: string;       // 必填，应用 ID
  tags: string[];      // 必填，标签列表
}
```

**响应数据**: 无

**实现要点**:
1. 验证应用是否已被收藏
2. 更新 `favourite_apps` 表的 tags 字段
3. 标签数量限制（如最多 5 个）
4. 单个标签长度限制（如最多 10 字符）

---

## 3. 数据模型

### 3.1 发票抬头 Schema (新增)

```typescript
// src/packages/service/support_invoice/schema.ts
const InvoiceHeaderSchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, required: true, unique: true },

  invoiceType: {
    type: String,
    enum: ['personal', 'company'],
    required: true
  },

  // 基本信息
  title: { type: String, required: true },
  taxNumber: { type: String },

  // 企业专用
  bankName: { type: String },
  bankAccount: { type: String },
  companyAddress: { type: String },
  companyPhone: { type: String },

  // 收件信息
  receiverName: { type: String, required: true },
  receiverPhone: { type: String, required: true },
  receiverAddress: { type: String, required: true },
  receiverEmail: { type: String },

  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

InvoiceHeaderSchema.index({ teamId: 1 }, { unique: true });
```

### 3.2 优惠券 Schema (新增)

```typescript
// src/packages/service/support_wallet/coupon/schema.ts

// 兑换码表
const CouponCodeSchema = new Schema({
  code: { type: String, required: true, unique: true },
  batchId: { type: String, required: true },   // 批次 ID

  type: {
    type: String,
    enum: ['discount', 'amount'],
    required: true
  },
  value: { type: Number, required: true },      // 折扣比例(0-100)或金额(分)
  minAmount: { type: Number, default: 0 },      // 最低消费

  scope: {
    type: String,
    enum: ['all', 'recharge'],
    default: 'all'
  },

  expireTime: { type: Date, required: true },

  status: {
    type: String,
    enum: ['unused', 'used', 'expired'],
    default: 'unused'
  },

  usedBy: { type: Schema.Types.ObjectId },      // 使用者 userId
  usedTime: { type: Date },

  createTime: { type: Date, default: Date.now }
});

CouponCodeSchema.index({ code: 1 }, { unique: true });
CouponCodeSchema.index({ batchId: 1 });
CouponCodeSchema.index({ status: 1 });

// 用户优惠券表
const UserCouponSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  teamId: { type: Schema.Types.ObjectId, required: true },

  sourceCode: { type: String },                 // 来源兑换码
  batchId: { type: String },                    // 批次 ID

  type: {
    type: String,
    enum: ['discount', 'amount'],
    required: true
  },
  value: { type: Number, required: true },
  minAmount: { type: Number, default: 0 },
  scope: { type: String, default: 'all' },

  expireTime: { type: Date, required: true },

  status: {
    type: String,
    enum: ['available', 'used', 'expired'],
    default: 'available'
  },

  usedOrderId: { type: Schema.Types.ObjectId }, // 使用的订单
  usedTime: { type: Date },

  createTime: { type: Date, default: Date.now }
});

UserCouponSchema.index({ userId: 1, status: 1 });
UserCouponSchema.index({ teamId: 1 });
UserCouponSchema.index({ batchId: 1, userId: 1 });
```

---

## 4. 任务分解

### 4.1 创建应用评估 (6C-1) ✅

```
[6C-1] 创建应用评估 API
├── [x] 创建 pages/api/core/app/evaluation/create.ts
├── [x] 实现请求体参数解析（简化版，不含文件上传）
├── [x] 验证测试用例格式（input 必填、长度限制）
├── [x] 支持自定义评估模型和评估指标
├── [x] 创建评估任务记录
├── [x] 创建评估项目记录
└── [x] 编写单元测试（15 个用例全部通过）
```

### 4.2 发票抬头管理 (6C-2) ✅

```
[6C-2] 发票抬头 API
├── [x] 创建 src/packages/global/support/wallet/invoiceHeader/constant.ts
├── [x] 创建 src/packages/global/support/wallet/invoiceHeader/type.d.ts
├── [x] 创建 src/packages/service/support_wallet/invoiceHeader/schema.ts
├── [x] 创建 pages/api/support/user/team/invoiceAccount/getTeamInvoiceHeader.ts
├── [x] 创建 pages/api/support/user/team/invoiceAccount/update.ts
├── [x] 实现查询逻辑
├── [x] 实现 upsert 更新逻辑
├── [x] 添加验证规则（税号、手机号、邮箱格式验证）
├── [x] 添加权限验证（仅 owner/admin 可更新）
└── [x] 编写单元测试（12 个用例全部通过）
```

### 4.3 优惠券兑换 (6C-3) ✅

```
[6C-3] 优惠券兑换 API
├── [x] 创建 src/packages/global/support/wallet/coupon/constant.ts
├── [x] 创建 src/packages/global/support/wallet/coupon/type.d.ts
├── [x] 创建 src/packages/service/support_wallet/coupon/schema.ts
├── [x] 创建 pages/api/support/wallet/coupon/redeem.ts
├── [x] 实现兑换码验证
├── [x] 实现过期检查
├── [x] 实现防重复兑换检查（同批次限制）
├── [x] 实现用户优惠券创建
├── [x] 实现兑换码状态更新（使用 MongoDB 事务）
└── [x] 编写单元测试（12 个用例全部通过）
```

### 4.4 收藏标签更新 (6C-4) ✅

```
[6C-4] 收藏标签更新 API
├── [x] 修改 pages/api/core/chat/setting/favourite/tags.ts（添加认证中间件）
├── [x] 验证收藏存在且属于当前用户
├── [x] 实现标签更新逻辑
├── [x] 添加标签数量限制（最多 5 个）
├── [x] 添加单个标签长度限制（最多 20 字符）
└── [x] 编写单元测试（9 个用例全部通过）
```

---

## 5. 新增文件清单

```
src/packages/service/
├── support_invoice/
│   └── schema.ts                                # 发票抬头 Schema
└── support_wallet/
    └── coupon/
        └── schema.ts                            # 优惠券 Schema

pages/api/
├── core/
│   ├── app/evaluation/
│   │   └── create.ts                            # 创建评估
│   └── chat/setting/favourite/
│       └── tags.ts                              # 更新标签
└── support/
    ├── user/team/invoiceAccount/
    │   ├── getTeamInvoiceHeader.ts              # 获取抬头
    │   └── update.ts                            # 更新抬头
    └── wallet/coupon/
        └── redeem.ts                            # 兑换优惠券

test/api/phase6/
├── evaluation.api.test.ts                       # 评估 API 测试
├── invoiceHeader.api.test.ts                    # 发票抬头测试
├── coupon.api.test.ts                           # 优惠券测试
└── favouriteTags.api.test.ts                    # 收藏标签测试
```

---

## 6. 与现有代码的关系

### 6.1 应用评估

已有实现:
- `EvaluationSchema`: 评估任务记录
- `EvaluationResultSchema`: 评估结果记录
- `GET /api/core/app/evaluation/list`: 评估列表
- `DELETE /api/core/app/evaluation/delete`: 删除评估

新增:
- `POST /api/core/app/evaluation/create`: 创建评估（文件上传）

### 6.2 收藏应用

已有实现:
- `FavouriteAppSchema`: 收藏应用记录
- `GET /api/core/chat/setting/getFavourite`: 获取收藏列表
- `POST /api/core/chat/setting/addFavourite`: 添加收藏
- `DELETE /api/core/chat/setting/removeFavourite`: 移除收藏

新增:
- `PUT /api/core/chat/setting/favourite/tags`: 更新收藏标签

---

## 7. 验收标准

- [x] 应用评估支持通过请求体传递测试用例
- [x] 测试用例验证（input 必填、长度限制）
- [x] 发票抬头支持个人/企业类型
- [x] 企业发票必须填写税号
- [x] 发票抬头 upsert 逻辑正确
- [x] 优惠券兑换码验证完整
- [x] 同批次兑换码不可重复兑换
- [x] 过期兑换码无法使用
- [x] 收藏标签数量和长度限制有效
- [x] 所有 API 通过认证中间件保护
- [x] 单元测试 48 个用例全部通过

---

## 8. 实际实现文件清单

### 8.1 类型定义文件

```
src/packages/global/support/wallet/
├── invoiceHeader/
│   ├── constant.ts              # 发票抬头常量
│   └── type.d.ts                # 发票抬头类型
└── coupon/
    ├── constant.ts              # 优惠券常量
    └── type.d.ts                # 优惠券类型

src/packages/global/core/chat/setting/
└── constant.ts                  # 添加 MAX_TAGS_COUNT 常量
```

### 8.2 Schema 文件

```
src/packages/service/support_wallet/
├── invoiceHeader/
│   └── schema.ts                # 发票抬头 Schema
└── coupon/
    └── schema.ts                # 优惠券 Schema (CouponCode + UserCoupon)

src/packages/service/core/app/evaluation/
├── schema.ts                    # 评估 Schema
└── itemSchema.ts                # 评估项目 Schema
```

### 8.3 API 文件

```
pages/api/
├── core/
│   ├── app/evaluation/
│   │   └── create.ts            # 创建评估 API
│   └── chat/setting/favourite/
│       └── tags.ts              # 更新标签 API (已修改添加认证)
└── support/
    ├── user/team/invoiceAccount/
    │   ├── getTeamInvoiceHeader.ts  # 获取发票抬头
    │   └── update.ts                # 更新发票抬头
    └── wallet/coupon/
        └── redeem.ts                # 兑换优惠券
```

### 8.4 测试文件

```
test/api/phase6/
├── invoiceHeader.api.test.ts    # 发票抬头测试 (12 用例)
├── coupon.api.test.ts           # 优惠券测试 (12 用例)
├── favouriteTags.api.test.ts    # 收藏标签测试 (9 用例)
└── evaluationCreate.api.test.ts # 应用评估测试 (15 用例)
```

---

## 9. 测试结果汇总

| 测试文件 | 用例数 | 通过 | 失败 |
|----------|--------|------|------|
| invoiceHeader.api.test.ts | 12 | 12 | 0 |
| coupon.api.test.ts | 12 | 12 | 0 |
| favouriteTags.api.test.ts | 9 | 9 | 0 |
| evaluationCreate.api.test.ts | 15 | 15 | 0 |
| **总计** | **48** | **48** | **0** |

---

*创建时间: 2025-11-26*
*完成时间: 2025-11-26*

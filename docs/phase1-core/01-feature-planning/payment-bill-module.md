# Phase 1 - Payment Bill Module Feature Planning

> Module: Payment & Billing
> Priority: P0
> APIs: 5
> Status: Planning

---

## 1. Module Overview

The Payment Bill module handles subscription purchases, payment processing (WeChat/Alipay), and order management.

### Existing Resources

| Resource | Path | Status |
|----------|------|--------|
| Types | `packages/global/support/wallet/bill/type.d.ts` | Exists |
| Constants | `packages/global/support/wallet/bill/constants.ts` | Exists |
| API Types | `packages/global/support/wallet/bill/api.d.ts` | Exists |
| Sub Schema | `packages/service/support/wallet/sub/schema.ts` | Exists |

### Missing Resources

| Resource | Path | Status |
|----------|------|--------|
| Bill Schema | `packages/service/support/wallet/bill/schema.ts` | Need Create |
| Bill Controller | `packages/service/support/wallet/bill/controller.ts` | Need Create |

---

## 2. API Specifications

### 2.1 Create Bill

**Endpoint**: `POST /api/support/wallet/bill/create`

**Request**:
```typescript
type CreateBillRequest = {
  type: BillTypeEnum;         // standard | extraDatasetSize | extraPoints

  // For standard subscription
  subLevel?: StandardSubLevelEnum;
  subMode?: SubModeEnum;      // month | year

  // For extra purchase
  extraDatasetSize?: number;  // GB
  extraPoints?: number;       // Points amount

  // Payment
  payment: PaymentEnum;       // wx | alipay | balance
}
```

**Response**:
```typescript
type CreateBillResponse = {
  billId: string;
  orderId: string;
  price: number;              // Amount in cents
  readPrice: string;          // Display price "¥99.00"
  payment: PaymentEnum;
  qrCode?: string;            // Payment QR code URL
  codeUrl?: string;           // Native payment URL
  expireTime: string;         // Order expiration
}
```

---

### 2.2 Get Bill List

**Endpoint**: `POST /api/support/wallet/bill/list`

**Request**:
```typescript
type GetBillListRequest = {
  pageNum: number;
  pageSize: number;
  type?: BillTypeEnum;
  status?: BillStatusEnum;
  startTime?: string;
  endTime?: string;
}
```

**Response**:
```typescript
type GetBillListResponse = {
  list: BillItem[];
  total: number;
}

type BillItem = {
  _id: string;
  orderId: string;
  type: BillTypeEnum;
  typeName: string;           // Display name
  price: number;
  readPrice: string;
  payment: PaymentEnum;
  status: BillStatusEnum;
  createTime: string;
  payTime?: string;

  // Subscription details
  subLevel?: StandardSubLevelEnum;
  subMode?: SubModeEnum;
}
```

---

### 2.3 Check Payment Result

**Endpoint**: `GET /api/support/wallet/bill/pay/checkPayResult`

**Request**:
```typescript
type CheckPayResultRequest = {
  billId: string;
}
```

**Response**:
```typescript
type CheckPayResultResponse = {
  status: BillStatusEnum;     // pending | success | failed | canceled
  payTime?: string;
}
```

---

### 2.4 Update Payment Method

**Endpoint**: `PUT /api/support/wallet/bill/pay/updatePayment`

**Request**:
```typescript
type UpdatePaymentRequest = {
  billId: string;
  payment: PaymentEnum;
}
```

**Response**:
```typescript
type UpdatePaymentResponse = {
  qrCode?: string;
  codeUrl?: string;
}
```

---

### 2.5 Balance Conversion

**Endpoint**: `GET /api/support/wallet/bill/balanceConversion`

**Request**:
```typescript
type BalanceConversionRequest = {
  type: BillTypeEnum;
  amount: number;             // Original amount
}
```

**Response**:
```typescript
type BalanceConversionResponse = {
  originalPrice: number;
  discountPrice: number;      // After balance deduction
  balanceUsed: number;
}
```

---

## 3. Data Model

### Bill Schema
```typescript
type BillSchema = {
  _id: ObjectId;
  orderId: string;            // Unique order number
  teamId: ObjectId;
  tmbId: ObjectId;            // Creator

  // Bill type
  type: BillTypeEnum;

  // Payment info
  price: number;              // Amount in cents
  payment: PaymentEnum;
  status: BillStatusEnum;

  // Subscription info (if type=standard)
  subLevel?: StandardSubLevelEnum;
  subMode?: SubModeEnum;

  // Extra purchase info
  extraDatasetSize?: number;
  extraPoints?: number;

  // Payment credentials
  qrCode?: string;
  codeUrl?: string;
  transactionId?: string;     // Third-party transaction ID

  // Timestamps
  createTime: Date;
  payTime?: Date;
  expireTime: Date;           // Order expiration (15 min)
}

// Indexes
{ teamId: 1, createTime: -1 }
{ orderId: 1 } unique
{ status: 1, expireTime: 1 }  // For cleanup job
```

---

## 4. Enums

```typescript
enum BillTypeEnum {
  standard = 'standard',
  extraDatasetSize = 'extraDatasetSize',
  extraPoints = 'extraPoints'
}

enum BillStatusEnum {
  pending = 'pending',
  success = 'success',
  failed = 'failed',
  canceled = 'canceled',
  refunded = 'refunded'
}

enum PaymentEnum {
  wx = 'wx',
  alipay = 'alipay',
  balance = 'balance',
  bank = 'bank'
}

enum StandardSubLevelEnum {
  free = 'free',
  experience = 'experience',
  team = 'team',
  enterprise = 'enterprise',
  custom = 'custom'
}

enum SubModeEnum {
  month = 'month',
  year = 'year'
}
```

---

## 5. Payment Integration

### WeChat Pay (Native)

Environment Variables:
```bash
WX_PAY_MCHID=           # Merchant ID
WX_PAY_APPID=           # App ID
WX_PAY_API_KEY=         # API Key
WX_PAY_SERIAL_NO=       # Certificate Serial
WX_PAY_PRIVATE_KEY=     # Private Key
WX_PAY_NOTIFY_URL=      # Callback URL
```

### Alipay (Face to Face)

Environment Variables:
```bash
ALIPAY_APP_ID=          # App ID
ALIPAY_PRIVATE_KEY=     # Private Key
ALIPAY_PUBLIC_KEY=      # Alipay Public Key
ALIPAY_NOTIFY_URL=      # Callback URL
```

---

## 6. Payment Flow

```
1. User selects plan → Frontend calls createBill
2. Backend creates order → Returns QR code
3. Frontend displays QR → User scans
4. Frontend polls checkPayResult every 2s
5. User completes payment → Third-party callback
6. Backend updates status → Updates subscription
7. Frontend receives success → Refreshes page
```

---

## 7. Frontend Integration

### Component Location
```
projects/app/src/pageComponents/price/
├── Standard.tsx              # Standard plans
├── ExtraPlan.tsx             # Extra purchases
└── Points.tsx                # Points purchase

projects/app/src/components/support/wallet/
├── QRCodePayModal.tsx        # Payment modal
└── PaymentSelect.tsx         # Payment selector
```

### API Client
```typescript
// projects/app/src/web/support/wallet/bill/api.ts
export const postCreatePayBill = (data) =>
  POST('/api/support/wallet/bill/create', data);

export const getPayBills = (data) =>
  POST('/api/support/wallet/bill/list', data);

export const checkBalancePayResult = (billId) =>
  GET('/api/support/wallet/bill/pay/checkPayResult', { billId });

export const putUpdateBillPayment = (data) =>
  PUT('/api/support/wallet/bill/pay/updatePayment', data);
```

---

## 8. Implementation Tasks

- [ ] Create Bill schema
- [ ] Create Bill controller
- [ ] Implement WeChat Pay integration
- [ ] Implement Alipay integration
- [ ] Create 5 API routes
- [ ] Implement payment callback handlers
- [ ] Add subscription update logic
- [ ] Update frontend API paths
- [ ] Write unit tests
- [ ] Write integration tests

---

## 9. Notes

1. Order expires in 15 minutes
2. Support concurrent payments (idempotent)
3. Log all payment operations to audit
4. Handle refund scenarios
5. Consider using message queue for callbacks

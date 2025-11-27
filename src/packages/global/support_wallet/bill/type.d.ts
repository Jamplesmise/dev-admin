import type {
  BillTypeEnum,
  BillStatusEnum,
  PaymentEnum,
  StandardSubLevelEnum,
  SubModeEnum
} from './constants';

// 账单 Schema 类型
export type BillSchemaType = {
  _id: string;
  orderId: string;
  teamId: string;
  tmbId: string;
  type: BillTypeEnum;
  price: number;
  payment: PaymentEnum;
  status: BillStatusEnum;
  subLevel?: StandardSubLevelEnum;
  subMode?: SubModeEnum;
  extraDatasetSize?: number;
  extraPoints?: number;
  qrCode?: string;
  codeUrl?: string;
  transactionId?: string;
  createTime: Date;
  payTime?: Date;
  expireTime: Date;
  // 发票相关
  invoiced?: boolean;
  invoiceId?: string;
};

// 创建账单请求
export type CreateBillRequest = {
  type: BillTypeEnum;
  subLevel?: StandardSubLevelEnum;
  subMode?: SubModeEnum;
  extraDatasetSize?: number;
  extraPoints?: number;
  payment: PaymentEnum;
};

// 创建账单响应
export type CreateBillResponse = {
  billId: string;
  orderId: string;
  price: number;
  readPrice: string;
  payment: PaymentEnum;
  qrCode?: string;
  codeUrl?: string;
  expireTime: string;
};

// 获取账单列表请求
export type GetBillListRequest = {
  pageNum: number;
  pageSize: number;
  type?: BillTypeEnum;
  status?: BillStatusEnum;
  startTime?: string;
  endTime?: string;
};

// 账单列表项
export type BillListItemType = {
  _id: string;
  orderId: string;
  type: BillTypeEnum;
  typeName: string;
  price: number;
  readPrice: string;
  payment: PaymentEnum;
  status: BillStatusEnum;
  createTime: string;
  payTime?: string;
  subLevel?: StandardSubLevelEnum;
  subMode?: SubModeEnum;
};

// 获取账单列表响应
export type GetBillListResponse = {
  list: BillListItemType[];
  total: number;
};

// 检查支付结果请求
export type CheckPayResultRequest = {
  billId: string;
};

// 检查支付结果响应
export type CheckPayResultResponse = {
  status: BillStatusEnum;
  payTime?: string;
};

// 更新支付方式请求
export type UpdatePaymentRequest = {
  billId: string;
  payment: PaymentEnum;
};

// 更新支付方式响应
export type UpdatePaymentResponse = {
  qrCode?: string;
  codeUrl?: string;
};

// 余额换算请求
export type BalanceConversionRequest = {
  type: BillTypeEnum;
  amount: number;
};

// 余额换算响应
export type BalanceConversionResponse = {
  originalPrice: number;
  discountPrice: number;
  balanceUsed: number;
};

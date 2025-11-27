import type { InvoiceTypeEnum, InvoiceStatusEnum } from './constant';

// 发票 Schema 类型
export type InvoiceSchemaType = {
  _id: string;
  teamId: string;
  tmbId: string; // 申请人

  // 关联账单
  billIds: string[];
  totalAmount: number; // 开票金额（分）

  // 发票类型
  type: `${InvoiceTypeEnum}`;

  // 基本信息
  title: string; // 发票抬头
  taxNumber: string; // 税号

  // 专票额外字段
  bankName?: string; // 开户银行
  bankAccount?: string; // 银行账号
  address?: string; // 公司地址
  phone?: string; // 公司电话

  // 收件信息
  receiverEmail?: string;
  receiverAddress?: string;
  receiverName?: string;
  receiverPhone?: string;

  // 状态
  status: `${InvoiceStatusEnum}`;
  rejectReason?: string;

  // 发票信息
  invoiceNo?: string; // 发票号码
  invoiceCode?: string; // 发票代码
  invoiceUrl?: string; // 电子发票下载 URL
  invoiceDate?: Date; // 开票日期

  createTime: Date;
  updateTime: Date;
  completeTime?: Date;
};

// 发票列表项类型
export type InvoiceListItemType = {
  _id: string;
  title: string;
  totalAmount: number;
  type: `${InvoiceTypeEnum}`;
  status: `${InvoiceStatusEnum}`;
  createTime: Date;
  completeTime?: Date;
  invoiceUrl?: string;
};

// 提交开票申请请求
export type SubmitInvoiceBody = {
  billIds: string[];
  type: `${InvoiceTypeEnum}`;
  title: string;
  taxNumber: string;
  // 专票字段
  bankName?: string;
  bankAccount?: string;
  address?: string;
  phone?: string;
  // 收件信息
  receiverEmail?: string;
  receiverAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
};

// 获取发票记录请求
export type GetInvoiceRecordsQuery = {
  status?: `${InvoiceStatusEnum}`;
  page?: string;
  pageSize?: string;
};

// 获取待开票列表请求
export type GetUnInvoiceListQuery = {
  startTime?: string;
  endTime?: string;
};

// 待开票账单项
export type UnInvoiceBillItem = {
  _id: string;
  amount: number; // 金额（分）
  createTime: Date;
  type: string; // 账单类型
  description?: string;
};

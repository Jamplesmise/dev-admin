import type { InvoiceHeaderTypeEnum } from './constant';

// 发票抬头 Schema 类型
export type InvoiceHeaderSchemaType = {
  _id: string;
  teamId: string;

  // 发票类型
  invoiceType: `${InvoiceHeaderTypeEnum}`;

  // 基本信息
  title: string; // 发票抬头
  taxNumber?: string; // 税号（企业必填）

  // 企业专用信息
  bankName?: string; // 开户银行
  bankAccount?: string; // 银行账号
  companyAddress?: string; // 公司地址
  companyPhone?: string; // 公司电话

  // 收件信息
  receiverName: string; // 收件人
  receiverPhone: string; // 收件电话
  receiverAddress: string; // 收件地址
  receiverEmail?: string; // 电子发票接收邮箱

  createTime: Date;
  updateTime: Date;
};

// 更新发票抬头请求
export type UpdateInvoiceHeaderBody = {
  invoiceType: `${InvoiceHeaderTypeEnum}`;
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
};

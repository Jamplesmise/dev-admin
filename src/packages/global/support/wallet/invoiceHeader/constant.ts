export const InvoiceHeaderCollectionName = 'invoice_headers';

// 发票抬头类型
export enum InvoiceHeaderTypeEnum {
  personal = 'personal', // 个人
  company = 'company' // 企业
}

export const InvoiceHeaderTypeMap = {
  [InvoiceHeaderTypeEnum.personal]: {
    label: 'invoiceHeader.type.personal',
    value: InvoiceHeaderTypeEnum.personal
  },
  [InvoiceHeaderTypeEnum.company]: {
    label: 'invoiceHeader.type.company',
    value: InvoiceHeaderTypeEnum.company
  }
};

export const InvoiceCollectionName = 'invoices';

// 发票类型
export enum InvoiceTypeEnum {
  normal = 'normal', // 普通发票
  special = 'special' // 专用发票
}

export const InvoiceTypeMap = {
  [InvoiceTypeEnum.normal]: {
    label: 'invoice.type.normal',
    value: InvoiceTypeEnum.normal
  },
  [InvoiceTypeEnum.special]: {
    label: 'invoice.type.special',
    value: InvoiceTypeEnum.special
  }
};

// 发票状态
export enum InvoiceStatusEnum {
  pending = 'pending', // 待处理
  processing = 'processing', // 处理中
  completed = 'completed', // 已完成
  rejected = 'rejected' // 已拒绝
}

export const InvoiceStatusMap = {
  [InvoiceStatusEnum.pending]: {
    label: 'invoice.status.pending',
    value: InvoiceStatusEnum.pending,
    color: 'gray.500'
  },
  [InvoiceStatusEnum.processing]: {
    label: 'invoice.status.processing',
    value: InvoiceStatusEnum.processing,
    color: 'blue.500'
  },
  [InvoiceStatusEnum.completed]: {
    label: 'invoice.status.completed',
    value: InvoiceStatusEnum.completed,
    color: 'green.500'
  },
  [InvoiceStatusEnum.rejected]: {
    label: 'invoice.status.rejected',
    value: InvoiceStatusEnum.rejected,
    color: 'red.500'
  }
};

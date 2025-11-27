// 账单类型
export enum BillTypeEnum {
  standard = 'standard',
  extraDatasetSize = 'extraDatasetSize',
  extraPoints = 'extraPoints'
}

// 账单状态
export enum BillStatusEnum {
  pending = 'pending',
  success = 'success',
  failed = 'failed',
  canceled = 'canceled',
  refunded = 'refunded'
}

// 支付方式
export enum PaymentEnum {
  wx = 'wx',
  alipay = 'alipay',
  balance = 'balance',
  bank = 'bank'
}

// 订阅等级
export enum StandardSubLevelEnum {
  free = 'free',
  experience = 'experience',
  team = 'team',
  enterprise = 'enterprise',
  custom = 'custom'
}

// 订阅周期
export enum SubModeEnum {
  month = 'month',
  year = 'year'
}

// 账单类型显示名称
export const BillTypeMap: Record<BillTypeEnum, string> = {
  [BillTypeEnum.standard]: '标准订阅',
  [BillTypeEnum.extraDatasetSize]: '扩展存储',
  [BillTypeEnum.extraPoints]: '扩展积分'
};

// 账单状态显示名称
export const BillStatusMap: Record<BillStatusEnum, string> = {
  [BillStatusEnum.pending]: '待支付',
  [BillStatusEnum.success]: '已完成',
  [BillStatusEnum.failed]: '失败',
  [BillStatusEnum.canceled]: '已取消',
  [BillStatusEnum.refunded]: '已退款'
};

// 支付方式显示名称
export const PaymentMap: Record<PaymentEnum, string> = {
  [PaymentEnum.wx]: '微信支付',
  [PaymentEnum.alipay]: '支付宝',
  [PaymentEnum.balance]: '余额支付',
  [PaymentEnum.bank]: '银行转账'
};

// 订阅等级显示名称
export const SubLevelMap: Record<StandardSubLevelEnum, string> = {
  [StandardSubLevelEnum.free]: '免费版',
  [StandardSubLevelEnum.experience]: '体验版',
  [StandardSubLevelEnum.team]: '团队版',
  [StandardSubLevelEnum.enterprise]: '企业版',
  [StandardSubLevelEnum.custom]: '定制版'
};

// 订单过期时间（15分钟）
export const BILL_EXPIRE_MINUTES = 15;

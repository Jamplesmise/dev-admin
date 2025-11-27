import type {
  CouponTypeEnum,
  CouponScopeEnum,
  CouponCodeStatusEnum,
  UserCouponStatusEnum
} from './constant';

// 兑换码 Schema 类型
export type CouponCodeSchemaType = {
  _id: string;
  code: string; // 兑换码（唯一）
  batchId: string; // 批次 ID

  type: `${CouponTypeEnum}`; // 优惠券类型
  value: number; // 优惠值（折扣比例 1-99 或金额，单位：分）
  minAmount: number; // 最低消费金额（分）
  scope: `${CouponScopeEnum}`; // 适用范围

  expireTime: Date; // 过期时间
  status: `${CouponCodeStatusEnum}`; // 状态

  usedBy?: string; // 使用者 userId
  usedTime?: Date; // 使用时间

  createTime: Date;
};

// 用户优惠券 Schema 类型
export type UserCouponSchemaType = {
  _id: string;
  userId: string;
  teamId: string;

  sourceCode?: string; // 来源兑换码
  batchId?: string; // 批次 ID

  type: `${CouponTypeEnum}`;
  value: number;
  minAmount: number;
  scope: `${CouponScopeEnum}`;

  expireTime: Date;
  status: `${UserCouponStatusEnum}`;

  usedOrderId?: string; // 使用的订单
  usedTime?: Date;

  createTime: Date;
};

// 兑换优惠券响应
export type RedeemCouponResponse = {
  coupon: {
    _id: string;
    code: string;
    type: `${CouponTypeEnum}`;
    value: number;
    minAmount: number;
    expireTime: Date;
    scope: `${CouponScopeEnum}`;
  };
  message: string;
};

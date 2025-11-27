export const CouponCodeCollectionName = 'coupon_codes';
export const UserCouponCollectionName = 'user_coupons';

// 优惠券类型
export enum CouponTypeEnum {
  discount = 'discount', // 折扣券（百分比）
  amount = 'amount' // 金额券（固定金额）
}

export const CouponTypeMap = {
  [CouponTypeEnum.discount]: {
    label: 'coupon.type.discount',
    value: CouponTypeEnum.discount
  },
  [CouponTypeEnum.amount]: {
    label: 'coupon.type.amount',
    value: CouponTypeEnum.amount
  }
};

// 优惠券适用范围
export enum CouponScopeEnum {
  all = 'all', // 全场通用
  recharge = 'recharge' // 仅充值
}

export const CouponScopeMap = {
  [CouponScopeEnum.all]: {
    label: 'coupon.scope.all',
    value: CouponScopeEnum.all
  },
  [CouponScopeEnum.recharge]: {
    label: 'coupon.scope.recharge',
    value: CouponScopeEnum.recharge
  }
};

// 兑换码状态
export enum CouponCodeStatusEnum {
  unused = 'unused', // 未使用
  used = 'used', // 已使用
  expired = 'expired' // 已过期
}

// 用户优惠券状态
export enum UserCouponStatusEnum {
  available = 'available', // 可用
  used = 'used', // 已使用
  expired = 'expired' // 已过期
}

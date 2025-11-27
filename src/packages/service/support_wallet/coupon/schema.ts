import { TeamCollectionName } from '../../../global/support_user_team/constant';
import {
  CouponCodeCollectionName,
  UserCouponCollectionName,
  CouponTypeEnum,
  CouponScopeEnum,
  CouponCodeStatusEnum,
  UserCouponStatusEnum
} from '../../../global/support/wallet/coupon/constant';
import type {
  CouponCodeSchemaType,
  UserCouponSchemaType
} from '../../../global/support/wallet/coupon/type';
import { connectionMongo, getMongoModel } from '../../common/mongo';

const { Schema } = connectionMongo;

// 兑换码表
export const CouponCodeSchema = new Schema(
  {
    // 兑换码（唯一）
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      maxlength: 20
    },

    // 批次 ID（用于限制同批次只能兑换一次）
    batchId: {
      type: String,
      required: true
    },

    // 优惠券类型
    type: {
      type: String,
      enum: Object.values(CouponTypeEnum),
      required: true
    },

    // 优惠值
    // discount: 折扣比例 1-99（代表 1%-99% 折扣）
    // amount: 金额（单位：分）
    value: {
      type: Number,
      required: true,
      min: 1
    },

    // 最低消费金额（分）
    minAmount: {
      type: Number,
      default: 0
    },

    // 适用范围
    scope: {
      type: String,
      enum: Object.values(CouponScopeEnum),
      default: CouponScopeEnum.all
    },

    // 过期时间
    expireTime: {
      type: Date,
      required: true
    },

    // 状态
    status: {
      type: String,
      enum: Object.values(CouponCodeStatusEnum),
      default: CouponCodeStatusEnum.unused
    },

    // 使用者信息
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: 'users'
    },
    usedTime: {
      type: Date
    }
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: false
    }
  }
);

// 索引
try {
  CouponCodeSchema.index({ code: 1 }, { unique: true });
  CouponCodeSchema.index({ batchId: 1 });
  CouponCodeSchema.index({ status: 1 });
  CouponCodeSchema.index({ expireTime: 1 });
} catch (error) {
  console.log(error);
}

export const MongoCouponCode = getMongoModel<CouponCodeSchemaType>(
  CouponCodeCollectionName,
  CouponCodeSchema
);

// 用户优惠券表
export const UserCouponSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: TeamCollectionName,
      required: true
    },

    // 来源兑换码
    sourceCode: {
      type: String
    },

    // 批次 ID
    batchId: {
      type: String
    },

    // 优惠券类型
    type: {
      type: String,
      enum: Object.values(CouponTypeEnum),
      required: true
    },

    // 优惠值
    value: {
      type: Number,
      required: true
    },

    // 最低消费
    minAmount: {
      type: Number,
      default: 0
    },

    // 适用范围
    scope: {
      type: String,
      enum: Object.values(CouponScopeEnum),
      default: CouponScopeEnum.all
    },

    // 过期时间
    expireTime: {
      type: Date,
      required: true
    },

    // 状态
    status: {
      type: String,
      enum: Object.values(UserCouponStatusEnum),
      default: UserCouponStatusEnum.available
    },

    // 使用信息
    usedOrderId: {
      type: Schema.Types.ObjectId
    },
    usedTime: {
      type: Date
    }
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: false
    }
  }
);

// 索引
try {
  UserCouponSchema.index({ userId: 1, status: 1 });
  UserCouponSchema.index({ teamId: 1 });
  UserCouponSchema.index({ batchId: 1, userId: 1 });
  UserCouponSchema.index({ expireTime: 1 });
} catch (error) {
  console.log(error);
}

export const MongoUserCoupon = getMongoModel<UserCouponSchemaType>(
  UserCouponCollectionName,
  UserCouponSchema
);

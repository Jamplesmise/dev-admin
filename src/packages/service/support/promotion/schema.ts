import { connectionMongo, getMongoModel } from '../../common/mongo';
import type { PromotionRecordSchemaType } from '../../../global/support/promotion/type';
import {
  PromotionRecordCollectionName,
  PromotionStatusEnum
} from '../../../global/support/promotion/constant';

const { Schema } = connectionMongo;

export const PromotionRecordSchema = new Schema(
  {
    // 推广人
    promoterId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true
    },
    promotionCode: {
      type: String,
      required: true,
      index: true
    },

    // 被邀请人
    inviteeId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      unique: true // 每个用户只能被邀请一次
    },

    // 状态
    status: {
      type: String,
      enum: Object.values(PromotionStatusEnum),
      default: PromotionStatusEnum.pending,
      index: true
    },

    // 奖励（单位：分）
    reward: {
      type: Number,
      default: 0,
      min: 0
    },
    rewardPaidAt: {
      type: Date
    },

    // 时间
    registerTime: {
      type: Date,
      default: Date.now
    },
    validTime: {
      type: Date
    }
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: 'updateTime'
    }
  }
);

// 索引
try {
  // 推广人查询（按时间倒序）
  PromotionRecordSchema.index({ promoterId: 1, createTime: -1 });
  // 推广人状态查询
  PromotionRecordSchema.index({ promoterId: 1, status: 1 });
  // 推广码查询
  PromotionRecordSchema.index({ promotionCode: 1 });
  // 被邀请人唯一性（已在字段定义中设置）
} catch (error) {
  console.log(error);
}

export const MongoPromotionRecord = getMongoModel<PromotionRecordSchemaType>(
  PromotionRecordCollectionName,
  PromotionRecordSchema
);

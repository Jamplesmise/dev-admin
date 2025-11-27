import { connectionMongo, getMongoModel } from '../../common/mongo';
import type { OperationalAdSchemaType } from '../../../global/support/advertisement/type';
import {
  OperationalAdCollectionName,
  AdTypeEnum,
  AdTargetUsersEnum,
  AdTargetPlatformEnum
} from '../../../global/support/advertisement/constant';

const { Schema } = connectionMongo;

export const OperationalAdSchema = new Schema(
  {
    // 广告类型
    type: {
      type: String,
      enum: Object.values(AdTypeEnum),
      required: true
    },

    // 内容
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    content: {
      type: String,
      maxlength: 1000
    },
    imageUrl: {
      type: String
    },
    linkUrl: {
      type: String
    },

    // 展示配置
    position: {
      type: String,
      required: true
    },
    priority: {
      type: Number,
      default: 0
    },

    // 展示时间
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },

    // 展示条件
    targetUsers: {
      type: String,
      enum: Object.values(AdTargetUsersEnum),
      default: AdTargetUsersEnum.all
    },
    targetPlatform: {
      type: String,
      enum: Object.values(AdTargetPlatformEnum),
      default: AdTargetPlatformEnum.all
    },

    // 状态
    enabled: {
      type: Boolean,
      default: true
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
  // 有效广告查询（启用 + 时间范围）
  OperationalAdSchema.index({ enabled: 1, startTime: 1, endTime: 1 });
  // 位置和优先级查询
  OperationalAdSchema.index({ position: 1, priority: -1 });
} catch (error) {
  console.log(error);
}

export const MongoOperationalAd = getMongoModel<OperationalAdSchemaType>(
  OperationalAdCollectionName,
  OperationalAdSchema
);

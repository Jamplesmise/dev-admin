/**
 * Team Schema
 * 团队数据模型
 */
import { getMongoModel, Schema } from '../../common/mongo/index';
import {
  TeamCollectionName
} from '../../../global/support_user_team/constant';
import type { TeamSchema as TeamSchemaType } from '../../../global/support_user_team/type.d';

const TeamSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true
    },
    avatar: {
      type: String,
      default: ''
    },
    balance: {
      type: Number,
      default: 0
    },
    teamDomain: {
      type: String,
      default: ''
    },
    limit: {
      lastExportDatasetTime: Date,
      lastWebsiteSyncTime: Date
    },
    notificationAccount: String,
    // 第三方账户
    lafAccount: {
      appid: String,
      token: String,
      pat: String
    },
    openaiAccount: {
      key: String,
      baseUrl: String
    },
    externalWorkflowVariables: {
      type: Schema.Types.Mixed,
      default: {}
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
  TeamSchema.index({ ownerId: 1 });
  TeamSchema.index({ name: 1 });
  TeamSchema.index({ teamDomain: 1 }, { sparse: true });
} catch (error) {
  console.log('Team schema index error:', error);
}

export const MongoTeamModel = getMongoModel<TeamSchemaType>(
  TeamCollectionName,
  TeamSchema
);

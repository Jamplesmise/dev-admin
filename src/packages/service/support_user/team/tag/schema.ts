/**
 * Team Tag Schema
 * 团队标签数据模型
 */
import { getMongoModel, Schema } from '../../../common/mongo/index';
import type { TeamTagSchema as TeamTagSchemaType } from '../../../../global/support_user_team/type.d';

const TeamTagCollectionName = 'team_tags';

const TeamTagOptionSchema = new Schema(
  {
    value: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String }
  },
  { _id: false }
);

const TeamTagSchema = new Schema(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'team'
    },
    key: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['single', 'multi'],
      default: 'single'
    },
    options: [TeamTagOptionSchema]
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
  TeamTagSchema.index({ teamId: 1 });
  TeamTagSchema.index({ teamId: 1, key: 1 }, { unique: true });
} catch (error) {
  console.log('TeamTag schema index error:', error);
}

export const MongoTeamTagModel = getMongoModel<TeamTagSchemaType>(
  TeamTagCollectionName,
  TeamTagSchema
);

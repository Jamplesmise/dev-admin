/**
 * TeamMember Schema
 * 团队成员数据模型
 */
import { getMongoModel, Schema } from '../../common/mongo/index';
import {
  TeamMemberCollectionName,
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '../../../global/support_user_team/constant';
import type { TeamMemberSchema as TeamMemberSchemaType } from '../../../global/support_user_team/type.d';

const TeamMemberSchema = new Schema(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'teams',
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    role: {
      type: String,
      enum: Object.values(TeamMemberRoleEnum),
      default: TeamMemberRoleEnum.owner
    },
    status: {
      type: String,
      enum: Object.values(TeamMemberStatusEnum),
      default: TeamMemberStatusEnum.active
    },
    avatar: {
      type: String,
      default: ''
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
  TeamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });
  TeamMemberSchema.index({ teamId: 1, status: 1 });
  TeamMemberSchema.index({ userId: 1 });
  TeamMemberSchema.index({ teamId: 1, role: 1 });
} catch (error) {
  console.log('TeamMember schema index error:', error);
}

export const MongoTeamMemberModel = getMongoModel<TeamMemberSchemaType>(
  TeamMemberCollectionName,
  TeamMemberSchema
);

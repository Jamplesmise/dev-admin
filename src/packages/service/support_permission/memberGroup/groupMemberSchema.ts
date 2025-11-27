import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '../../../global/support_user_team/constant';
import {
  MemberGroupCollectionName,
  GroupMemberCollectionName,
  GroupMemberRole
} from '../../../global/support_user_team/group/constant';
import type { GroupMemberSchemaType } from '../../../global/support_user_team/group/type';
import { connectionMongo, getMongoModel } from '../../common/mongo';

const { Schema } = connectionMongo;

export const GroupMemberSchema = new Schema(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: TeamCollectionName,
      required: true
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: MemberGroupCollectionName,
      required: true
    },
    tmbId: {
      type: Schema.Types.ObjectId,
      ref: TeamMemberCollectionName,
      required: true
    },
    role: {
      type: String,
      enum: Object.values(GroupMemberRole),
      default: GroupMemberRole.member
    }
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: false
    }
  }
);

// 虚拟字段：关联分组
GroupMemberSchema.virtual('group', {
  ref: MemberGroupCollectionName,
  localField: 'groupId',
  foreignField: '_id',
  justOne: true
});

// 索引
try {
  // 唯一约束：同一成员不能重复加入同一分组
  GroupMemberSchema.index({ groupId: 1, tmbId: 1 }, { unique: true });
  // 查询索引
  GroupMemberSchema.index({ teamId: 1, groupId: 1 });
  GroupMemberSchema.index({ teamId: 1, tmbId: 1 });
} catch (error) {
  console.log(error);
}

export const MongoGroupMemberModel = getMongoModel<GroupMemberSchemaType>(
  GroupMemberCollectionName,
  GroupMemberSchema
);

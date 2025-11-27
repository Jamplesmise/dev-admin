import {
  TeamCollectionName
} from '../../../global/support_user_team/constant';
import {
  MemberGroupCollectionName,
  GroupMemberCollectionName
} from '../../../global/support_user_team/group/constant';
import type { MemberGroupSchemaType } from '../../../global/support_user_team/group/type';
import { connectionMongo, getMongoModel } from '../../common/mongo';

const { Schema } = connectionMongo;

export const MemberGroupSchema = new Schema(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: TeamCollectionName,
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 50
    },
    avatar: {
      type: String
    }
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: 'updateTime'
    }
  }
);

// 虚拟字段：关联成员
MemberGroupSchema.virtual('members', {
  ref: GroupMemberCollectionName,
  localField: '_id',
  foreignField: 'groupId'
});

// 索引
try {
  MemberGroupSchema.index({ teamId: 1 });
  MemberGroupSchema.index({ teamId: 1, name: 1 });
  MemberGroupSchema.index({ teamId: 1, createTime: -1 });
} catch (error) {
  console.log(error);
}

export const MongoMemberGroupModel = getMongoModel<MemberGroupSchemaType>(
  MemberGroupCollectionName,
  MemberGroupSchema
);

import type { ClientSession } from 'mongoose';
import { MongoMemberGroupModel } from './memberGroupSchema';
import { MongoGroupMemberModel } from './groupMemberSchema';
import { GroupMemberRole } from '../../../global/support_user_team/group/constant';

// 获取用户所在的所有分组 ID
export const getGroupIdsByTmbId = async ({
  teamId,
  tmbId
}: {
  teamId: string;
  tmbId: string;
}): Promise<string[]> => {
  const groupMembers = await MongoGroupMemberModel.find({ teamId, tmbId }, 'groupId').lean();
  return groupMembers.map((item) => String(item.groupId));
};

// 获取分组成员数量
export const getGroupMemberCount = async ({
  groupId
}: {
  groupId: string;
}): Promise<number> => {
  return MongoGroupMemberModel.countDocuments({ groupId });
};

// 检查用户是否是分组管理员
export const isGroupOwner = async ({
  groupId,
  tmbId
}: {
  groupId: string;
  tmbId: string;
}): Promise<boolean> => {
  const member = await MongoGroupMemberModel.findOne({
    groupId,
    tmbId,
    role: GroupMemberRole.owner
  }).lean();
  return !!member;
};

// 删除分组及其所有成员关系
export const deleteGroupWithMembers = async ({
  groupId,
  teamId,
  session
}: {
  groupId: string;
  teamId: string;
  session?: ClientSession;
}): Promise<void> => {
  await Promise.all([
    MongoMemberGroupModel.deleteOne({ _id: groupId, teamId }, { session }),
    MongoGroupMemberModel.deleteMany({ groupId, teamId }, { session })
  ]);
};

// 批量添加分组成员
export const addGroupMembers = async ({
  teamId,
  groupId,
  tmbIds,
  role = GroupMemberRole.member,
  session
}: {
  teamId: string;
  groupId: string;
  tmbIds: string[];
  role?: `${GroupMemberRole}`;
  session?: ClientSession;
}): Promise<number> => {
  if (!tmbIds.length) return 0;

  // 过滤已存在的成员
  const existingMembers = await MongoGroupMemberModel.find({
    groupId,
    tmbId: { $in: tmbIds }
  }).lean();
  const existingTmbIds = new Set(existingMembers.map((m) => String(m.tmbId)));

  const newTmbIds = tmbIds.filter((id) => !existingTmbIds.has(id));
  if (!newTmbIds.length) return 0;

  const newMembers = newTmbIds.map((tmbId) => ({
    teamId,
    groupId,
    tmbId,
    role
  }));

  await MongoGroupMemberModel.insertMany(newMembers, { session });
  return newTmbIds.length;
};

// 移除分组成员
export const removeGroupMembers = async ({
  groupId,
  tmbIds,
  session
}: {
  groupId: string;
  tmbIds: string[];
  session?: ClientSession;
}): Promise<number> => {
  if (!tmbIds.length) return 0;

  const result = await MongoGroupMemberModel.deleteMany(
    { groupId, tmbId: { $in: tmbIds } },
    { session }
  );
  return result.deletedCount;
};

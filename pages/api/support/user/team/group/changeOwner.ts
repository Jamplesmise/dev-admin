import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoMemberGroupModel } from '@fastgpt/service/support_permission/memberGroup/memberGroupSchema';
import { MongoGroupMemberModel } from '@fastgpt/service/support_permission/memberGroup/groupMemberSchema';
import type { PutChangeGroupOwnerBody } from '@fastgpt/global/support_user_team/group/api';
import { GroupMemberRole } from '@fastgpt/global/support_user_team/group/constant';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { connectionMongo } from '@fastgpt/service/common/mongo';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 更改分组所有者
 * PUT /api/support/user/team/group/changeOwner
 */
async function handler(
  req: ApiRequestProps<PutChangeGroupOwnerBody>,
  _res: NextApiResponse
): Promise<void> {
  const { groupId, tmbId: newOwnerTmbId } = req.body;
  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);

  // 参数验证
  if (!groupId) {
    return Promise.reject('groupId is required');
  }
  if (!newOwnerTmbId) {
    return Promise.reject('tmbId is required');
  }

  // 不能转让给自己
  if (String(currentTmbId) === String(newOwnerTmbId)) {
    return Promise.reject('Cannot transfer ownership to yourself');
  }

  // 验证分组存在且属于当前团队
  const group = await MongoMemberGroupModel.findOne({
    _id: groupId,
    teamId
  }).lean();

  if (!group) {
    return Promise.reject('Group not found');
  }

  // 验证当前用户是分组 owner
  const currentUserMembership = await MongoGroupMemberModel.findOne({
    groupId: group._id,
    tmbId: currentTmbId
  }).lean();

  if (!currentUserMembership || currentUserMembership.role !== GroupMemberRole.owner) {
    return Promise.reject('Only group owner can transfer ownership');
  }

  // 验证新所有者是分组成员
  const newOwnerMembership = await MongoGroupMemberModel.findOne({
    groupId: group._id,
    tmbId: newOwnerTmbId
  }).lean();

  if (!newOwnerMembership) {
    return Promise.reject('New owner must be a group member');
  }

  // 使用事务更新角色
  const session = await connectionMongo.startSession();
  try {
    await session.withTransaction(async () => {
      // 旧 owner -> member
      await MongoGroupMemberModel.updateOne(
        { _id: currentUserMembership._id },
        { role: GroupMemberRole.member },
        { session }
      );

      // 新成员 -> owner
      await MongoGroupMemberModel.updateOne(
        { _id: newOwnerMembership._id },
        { role: GroupMemberRole.owner },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}

export default NextAPI(handler);

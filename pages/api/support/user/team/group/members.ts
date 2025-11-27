import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoMemberGroupModel } from '@fastgpt/service/support_permission/memberGroup/memberGroupSchema';
import { MongoGroupMemberModel } from '@fastgpt/service/support_permission/memberGroup/groupMemberSchema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
// 官方类型：GroupMemberItemType
type GroupMemberItemType = {
  tmbId: string;
  name: string;
  avatar: string;
  role: string;
};
import type { GetGroupMembersQuery } from '@fastgpt/global/support_user_team/group/api';
import { GroupMemberRole } from '@fastgpt/global/support_user_team/group/constant';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 获取分组成员列表
 * GET /api/support/user/team/group/members
 */
async function handler(
  req: ApiRequestProps<unknown, GetGroupMembersQuery>,
  _res: NextApiResponse
): Promise<GroupMemberItemType[]> {
  const { groupId } = req.query;
  const teamId = getTeamIdFromReq(req);

  if (!groupId) {
    return Promise.reject('groupId is required');
  }

  // 验证分组存在且属于当前团队
  const group = await MongoMemberGroupModel.findOne({
    _id: groupId,
    teamId
  }).lean();

  if (!group) {
    return Promise.reject('Group not found');
  }

  // 获取分组成员列表
  const groupMembers = await MongoGroupMemberModel.find({
    groupId: group._id,
    teamId
  }).lean();

  if (groupMembers.length === 0) {
    return [];
  }

  // 获取成员详情
  const tmbIds = groupMembers.map((gm) => gm.tmbId);
  const teamMembers = await MongoTeamMemberModel.find({
    _id: { $in: tmbIds }
  }).lean();

  // 构建 tmbId -> memberInfo 映射
  const memberMap = new Map<string, { name: string; avatar?: string }>();
  teamMembers.forEach((tm) => {
    memberMap.set(String(tm._id), {
      name: tm.name,
      avatar: tm.avatar
    });
  });

  // 组装结果并排序
  // 前端 GroupMemberItemType 期望字段: tmbId, name, avatar, role
  const result: GroupMemberItemType[] = groupMembers.map((gm) => {
    const memberInfo = memberMap.get(String(gm.tmbId));
    return {
      tmbId: String(gm.tmbId),
      name: memberInfo?.name || '', // 前端期望 name，不是 memberName
      avatar: memberInfo?.avatar || '',
      role: gm.role
    };
  });

  // 按角色排序: owner > member
  result.sort((a, b) => {
    const roleOrder = { [GroupMemberRole.owner]: 0, [GroupMemberRole.member]: 1 };
    const orderA = roleOrder[a.role as keyof typeof roleOrder] ?? 1;
    const orderB = roleOrder[b.role as keyof typeof roleOrder] ?? 1;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });

  return result;
}

export default NextAPI(handler);

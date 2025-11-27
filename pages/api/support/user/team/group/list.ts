import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoMemberGroupModel } from '@fastgpt/service/support_permission/memberGroup/memberGroupSchema';
import { MongoGroupMemberModel } from '@fastgpt/service/support_permission/memberGroup/groupMemberSchema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import type { GetGroupListBody } from '@fastgpt/global/support/permission/memberGroup/api';
import type { MemberGroupListItemType } from '@fastgpt/global/support/permission/memberGroup/type';
import { GroupMemberRole } from '@fastgpt/global/support/permission/memberGroup/constant';
import { Permission } from '@fastgpt/global/support/permission/controller';
import { ManageRoleVal, OwnerRoleVal } from '@fastgpt/global/support/permission/constant';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 官方类型：GetGroupListBody
type GetGroupListBody = {
  searchKey?: string;
  withMembers?: boolean;
};

// 官方类型：MemberGroupListItemType<true>
type MemberGroupListItemType = {
  _id: string;
  teamId: string;
  name: string;
  avatar: string;
  updateTime: Date;
  members: {
    tmbId: string;
    name: string;
    avatar: string;
  }[];
  count: number;
  owner?: {
    tmbId: string;
    name: string;
    avatar: string;
  };
  permission: {
    role: number;
    isOwner: boolean;
    hasManagePer: boolean;
    hasWritePer: boolean;
    hasReadPer: boolean;
  };
};

async function handler(
  req: ApiRequestProps<GetGroupListBody>,
  _res: NextApiResponse
): Promise<MemberGroupListItemType<boolean>[]> {
  const { searchKey, withMembers } = req.body;
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  // 构建查询条件
  const query: Record<string, unknown> = { teamId };

  if (searchKey && searchKey.trim()) {
    query.name = { $regex: searchKey.trim(), $options: 'i' };
  }

  // 获取分组列表
  const groups = await MongoMemberGroupModel.find(query)
    .sort({ updateTime: -1 })
    .lean();

  if (groups.length === 0) {
    return [];
  }

  const groupIds = groups.map((g) => g._id);

  // 检查当前用户在各群组中的角色
  const myGroupRoles = await MongoGroupMemberModel.find({
    groupId: { $in: groupIds },
    tmbId
  }).lean();

  const myRoleMap = new Map<string, string>();
  myGroupRoles.forEach((item) => {
    myRoleMap.set(String(item.groupId), item.role);
  });

  if (withMembers) {
    // 获取所有群组成员信息
    const allGroupMembers = await MongoGroupMemberModel.find({
      groupId: { $in: groupIds }
    }).lean();

    // 获取所有相关的团队成员信息
    const tmbIds = [...new Set(allGroupMembers.map((m) => m.tmbId))];
    const teamMembers = await MongoTeamMemberModel.find({
      _id: { $in: tmbIds }
    }).lean();

    // 构建 tmbId -> 成员信息 的映射
    const tmbInfoMap = new Map<string, { name: string; avatar: string }>();
    teamMembers.forEach((tmb) => {
      tmbInfoMap.set(String(tmb._id), {
        name: tmb.name,
        avatar: tmb.avatar || ''
      });
    });

    // 按 groupId 分组成员
    const groupMembersMap = new Map<string, Array<{
      tmbId: string;
      name: string;
      avatar: string;
      role: string;
    }>>();

    allGroupMembers.forEach((gm) => {
      const groupIdStr = String(gm.groupId);
      const tmbInfo = tmbInfoMap.get(String(gm.tmbId));

      if (!groupMembersMap.has(groupIdStr)) {
        groupMembersMap.set(groupIdStr, []);
      }

      groupMembersMap.get(groupIdStr)!.push({
        tmbId: String(gm.tmbId),
        name: tmbInfo?.name || '',
        avatar: tmbInfo?.avatar || '',
        role: gm.role
      });
    });

    // 组装返回数据
    return groups.map((group) => {
      const groupIdStr = String(group._id);
      const members = groupMembersMap.get(groupIdStr) || [];
      const ownerMember = members.find((m) => m.role === GroupMemberRole.owner);
      const myRole = myRoleMap.get(groupIdStr);

      // 构建权限对象
      let permission: Permission;
      if (myRole === GroupMemberRole.owner) {
        permission = new Permission({ isOwner: true });
      } else if (myRole === GroupMemberRole.admin) {
        permission = new Permission({ role: ManageRoleVal });
      } else {
        permission = new Permission({ role: 0 });
      }

      return {
        _id: groupIdStr,
        teamId: String(group.teamId),
        name: group.name,
        avatar: group.avatar || '',
        updateTime: group.updateTime,
        members: members.map((m) => ({
          tmbId: m.tmbId,
          name: m.name,
          avatar: m.avatar
        })),
        count: members.length,
        owner: ownerMember ? {
          tmbId: ownerMember.tmbId,
          name: ownerMember.name,
          avatar: ownerMember.avatar
        } : undefined,
        permission
      } as MemberGroupListItemType<true>;
    });
  } else {
    // 不需要成员信息时，返回简化数据
    return groups.map((group) => ({
      _id: String(group._id),
      teamId: String(group.teamId),
      name: group.name,
      avatar: group.avatar || '',
      updateTime: group.updateTime,
      members: undefined,
      count: undefined,
      owner: undefined,
      permission: undefined
    } as MemberGroupListItemType<false>));
  }
}

export default NextAPI(handler);

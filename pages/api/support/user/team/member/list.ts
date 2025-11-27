import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support_permission/org/orgMemberSchema';
import { MongoGroupMemberModel } from '@fastgpt/service/support_permission/memberGroup/groupMemberSchema';
import { TeamMemberStatusEnum, TeamMemberRoleEnum } from '@fastgpt/global/support_user_team/constant';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import type { TeamMemberItemType } from '@fastgpt/global/support_user_team/type';
import type { PaginationResponse } from '@fastgpt/global/common/type/pagination';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type GetTeamMemberListBody = {
  searchKey?: string;
  status?: 'active' | 'inactive';
  withOrgs?: boolean;
  withPermission?: boolean;
  orgId?: string;
  groupId?: string;
  offset?: number;
  pageSize?: number;
};

/**
 * 获取团队成员列表
 * POST /api/support/user/team/member/list
 *
 * 返回分页的成员列表，支持筛选和搜索
 */
async function handler(
  req: ApiRequestProps<GetTeamMemberListBody>,
  _res: NextApiResponse
): Promise<PaginationResponse<TeamMemberItemType>> {
  const teamId = getTeamIdFromReq(req);
  const {
    searchKey,
    status,
    withOrgs = false,
    withPermission = true,
    orgId,
    offset = 0,
    pageSize = 20
  } = req.body;

  // 构建查询条件
  const query: Record<string, unknown> = { teamId };

  // 状态筛选
  if (status === 'active') {
    query.status = TeamMemberStatusEnum.active;
  } else if (status === 'inactive') {
    query.status = { $in: [TeamMemberStatusEnum.leave, TeamMemberStatusEnum.forbidden] };
  } else {
    // 默认不显示已离开的成员
    query.status = { $ne: TeamMemberStatusEnum.leave };
  }

  // 搜索（按名称模糊匹配）
  if (searchKey && searchKey.trim()) {
    query.name = { $regex: searchKey.trim(), $options: 'i' };
  }

  /**
   * 按组织过滤成员
   *
   * 当 orgId 有值时，只返回该组织的成员
   * 当 orgId 为空字符串时，表示查询团队根目录，返回所有团队成员
   */
  let orgMemberTmbIds: string[] | null = null;
  if (orgId && orgId !== '') {
    // 查询该组织的成员 tmbId 列表
    const orgMembers = await MongoOrgMemberModel.find({
      teamId,
      orgId
    }).lean();
    orgMemberTmbIds = orgMembers.map((om) => String(om.tmbId));

    // 如果组织没有成员，直接返回空列表
    if (orgMemberTmbIds.length === 0) {
      return {
        total: 0,
        list: []
      };
    }

    // 添加 tmbId 过滤条件
    query._id = { $in: orgMemberTmbIds };
  }

  /**
   * 按群组过滤成员
   * 当 groupId 有值时，只返回该群组的成员
   */
  const { groupId } = req.body;
  let groupMemberMap = new Map<string, string>(); // tmbId -> role
  if (groupId && groupId !== '') {
    // 查询该群组的成员
    const groupMembers = await MongoGroupMemberModel.find({
      teamId,
      groupId
    }).lean();

    // 如果群组没有成员，直接返回空列表
    if (groupMembers.length === 0) {
      return {
        total: 0,
        list: []
      };
    }

    // 构建 tmbId -> role 映射
    groupMembers.forEach((gm) => {
      groupMemberMap.set(String(gm.tmbId), gm.role);
    });

    const groupMemberTmbIds = groupMembers.map((gm) => String(gm.tmbId));

    // 合并过滤条件
    if (query._id) {
      // 如果已有 orgId 过滤，取交集
      const existingIds = (query._id as { $in: string[] }).$in;
      const intersectionIds = existingIds.filter((id) => groupMemberTmbIds.includes(id));
      if (intersectionIds.length === 0) {
        return { total: 0, list: [] };
      }
      query._id = { $in: intersectionIds };
    } else {
      query._id = { $in: groupMemberTmbIds };
    }
  }

  // 查询总数
  const total = await MongoTeamMemberModel.countDocuments(query);

  // 查询列表
  const members = await MongoTeamMemberModel.find(query)
    .sort({ createTime: -1 })
    .skip(offset)
    .limit(pageSize)
    .lean();

  // 如果需要获取组织信息
  let tmbOrgMap = new Map<string, string[]>();
  if (withOrgs && members.length > 0) {
    const tmbIds = members.map((m) => m._id);

    // 查询成员所属的组织
    const orgMembers = await MongoOrgMemberModel.find({
      teamId,
      tmbId: { $in: tmbIds }
    }).lean();

    // 获取组织信息
    const orgIds = [...new Set(orgMembers.map((om) => om.orgId))];
    const orgs = await MongoOrgModel.find({
      _id: { $in: orgIds }
    }).lean();

    // 构建组织路径映射
    const orgPathMap = new Map<string, string>();
    orgs.forEach((org) => {
      // 简化路径：直接使用组织名称
      orgPathMap.set(String(org._id), org.path || org.name);
    });

    // 构建 tmbId -> 组织路径列表 的映射
    orgMembers.forEach((om) => {
      const tmbIdStr = String(om.tmbId);
      const orgPath = orgPathMap.get(String(om.orgId));
      if (orgPath) {
        if (!tmbOrgMap.has(tmbIdStr)) {
          tmbOrgMap.set(tmbIdStr, []);
        }
        tmbOrgMap.get(tmbIdStr)!.push(orgPath);
      }
    });
  }

  // 转换响应格式
  const list = members.map((member): TeamMemberItemType => {
    const isOwner = member.role === TeamMemberRoleEnum.owner;
    const tmbIdStr = String(member._id);

    const baseItem = {
      tmbId: tmbIdStr,
      userId: String(member.userId),
      teamId: String(member.teamId),
      memberName: member.name,
      avatar: member.avatar || '',
      role: member.role,
      status: member.status,
      createTime: member.createTime,
      updateTime: member.updateTime
    };

    // 添加权限信息
    const permissionItem = withPermission ? {
      permission: new TeamPermission({
        isOwner,
        role: isOwner ? undefined : (member as any).permission || 0
      })
    } : {};

    // 添加组织信息
    const orgsItem = withOrgs ? {
      orgs: tmbOrgMap.get(tmbIdStr) || []
    } : {};

    // 添加群组角色信息（当按 groupId 过滤时）
    const groupRoleItem = groupId && groupMemberMap.size > 0 ? {
      groupRole: groupMemberMap.get(tmbIdStr) || 'member'
    } : {};

    return {
      ...baseItem,
      ...permissionItem,
      ...orgsItem,
      ...groupRoleItem
    } as TeamMemberItemType;
  });

  return {
    total,
    list
  };
}

export default NextAPI(handler);

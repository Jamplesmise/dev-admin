/**
 * 删除团队协作者 API
 * DELETE /api/support/user/team/collaborator/delete
 *
 * 删除团队协作者
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoCollaboratorModel } from '@fastgpt/service/support_permission/collaborator/schema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { ResourceTypeEnum } from '@fastgpt/global/support/permission/collaborator/constant';
import { TeamMemberRoleEnum } from '@fastgpt/global/support_user_team/constant';
import { Types } from 'mongoose';
import { getTeamMemberPermission } from '@fastgpt/service/support_permission/controller';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// Query 参数类型
type QueryType = {
  tmbId?: string;
  groupId?: string;
  orgId?: string;
};

async function handler(
  req: ApiRequestProps<unknown, QueryType>,
  _res: NextApiResponse
): Promise<void> {
  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);
  const { tmbId, groupId, orgId } = req.query;

  // 参数验证：必须有且仅有一个协作者标识
  const types = [tmbId, groupId, orgId].filter(Boolean);
  if (types.length !== 1) {
    throw new Error('必须指定且仅指定一个协作者标识 (tmbId/groupId/orgId)');
  }

  const teamIdObj = new Types.ObjectId(teamId);

  // 权限验证：只有 owner 或有管理权限的用户可以操作
  const currentMember = await MongoTeamMemberModel.findById(currentTmbId).lean();
  if (!currentMember) {
    throw new Error('当前用户不是团队成员');
  }

  const permission = await getTeamMemberPermission({
    teamId,
    tmbId: currentTmbId,
    role: currentMember.role as `${TeamMemberRoleEnum}`
  });

  if (!permission.isOwner && !permission.hasManagePer) {
    throw new Error('只有团队所有者或管理员可以删除协作者');
  }

  // 获取团队 owner 的 tmbId，用于保护 owner 不被删除
  const ownerMember = await MongoTeamMemberModel.findOne({
    teamId: teamIdObj,
    role: TeamMemberRoleEnum.owner
  }).lean();

  const ownerTmbId = ownerMember ? String(ownerMember._id) : null;

  // 保护 owner 不被删除
  if (tmbId && tmbId === ownerTmbId) {
    throw new Error('不能删除团队所有者');
  }

  // 构建查询条件
  const filter: Record<string, unknown> = {
    teamId: teamIdObj,
    resourceType: ResourceTypeEnum.team
  };

  if (tmbId) {
    filter.tmbId = new Types.ObjectId(tmbId);
  } else if (groupId) {
    filter.groupId = new Types.ObjectId(groupId);
  } else if (orgId) {
    filter.orgId = new Types.ObjectId(orgId);
  }

  // 删除协作者（物理删除）
  await MongoCollaboratorModel.deleteOne(filter);

  return;
}

export default NextAPI(handler);

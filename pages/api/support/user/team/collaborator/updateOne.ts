/**
 * 更新单个团队协作者权限 API
 * PUT /api/support/user/team/collaborator/updateOne
 *
 * 更新单个协作者的权限
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
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 请求体类型
type BodyType = {
  permission: number;
  tmbId?: string;
  groupId?: string;
  orgId?: string;
};

// 验证权限值是否有效
// 团队权限是 6 位：apikeyCreate(32) + datasetCreate(16) + appCreate(8) + read(4) + write(2) + manage(1)
// 最大值 = 0b111111 = 63
function isValidPermission(permission: number): boolean {
  return Number.isInteger(permission) && permission >= 0 && permission <= 63;
}

async function handler(
  req: ApiRequestProps<BodyType>,
  _res: NextApiResponse
): Promise<void> {
  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);
  const { permission, tmbId, groupId, orgId } = req.body;

  // 参数验证：必须有且仅有一个协作者标识
  const types = [tmbId, groupId, orgId].filter(Boolean);
  if (types.length !== 1) {
    throw new Error('必须指定且仅指定一个协作者标识 (tmbId/groupId/orgId)');
  }

  // 验证权限值
  if (!isValidPermission(permission)) {
    throw new Error(`无效的权限值: ${permission}，必须在 0-63 之间`);
  }

  const teamIdObj = new Types.ObjectId(teamId);

  // 权限验证：只有 owner 或有管理权限的用户可以操作
  const currentMember = await MongoTeamMemberModel.findById(currentTmbId).lean();
  if (!currentMember) {
    throw new Error('当前用户不是团队成员');
  }

  const memberPermission = await getTeamMemberPermission({
    teamId,
    tmbId: currentTmbId,
    role: currentMember.role as `${TeamMemberRoleEnum}`
  });

  if (!memberPermission.isOwner && !memberPermission.hasManagePer) {
    throw new Error('只有团队所有者或管理员可以管理协作者权限');
  }

  // 获取团队 owner 的 tmbId，用于保护 owner 权限不被修改
  const ownerMember = await MongoTeamMemberModel.findOne({
    teamId: teamIdObj,
    role: TeamMemberRoleEnum.owner
  }).lean();

  const ownerTmbId = ownerMember ? String(ownerMember._id) : null;

  // 保护 owner 权限不被修改
  if (tmbId && tmbId === ownerTmbId) {
    throw new Error('不能修改团队所有者的权限');
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

  // 更新协作者权限
  const result = await MongoCollaboratorModel.updateOne(filter, {
    $set: { permission }
  });

  if (result.matchedCount === 0) {
    throw new Error('协作者不存在');
  }

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId: currentTmbId,
    event: AuditEventEnum.ASSIGN_PERMISSION,
    metadata: {
      objectName: tmbId || groupId || orgId || '未知对象',
      permission: String(permission)
    }
  });

  return;
}

export default NextAPI(handler);

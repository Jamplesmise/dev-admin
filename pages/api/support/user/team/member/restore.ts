import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '@fastgpt/global/support_user_team/constant';
import { getTeamMemberPermission } from '@fastgpt/service/support_permission/controller';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type RestoreMemberRequest = {
  tmbId: string;
};

type RestoreMemberResponse = {
  success: boolean;
};

/**
 * 恢复已删除的成员
 * POST /api/support/user/team/member/restore
 */
async function handler(
  req: ApiRequestProps<RestoreMemberRequest>,
  _res: NextApiResponse
): Promise<RestoreMemberResponse> {
  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);
  const { tmbId } = req.body;

  // 参数验证
  if (!tmbId) {
    throw new Error('缺少成员 ID');
  }

  // 检查当前用户权限（必须是 owner 或有管理权限）
  const currentMember = await MongoTeamMemberModel.findOne({
    _id: currentTmbId,
    teamId
  }).lean();

  if (!currentMember) {
    throw new Error('当前用户不是该团队成员');
  }

  const permission = await getTeamMemberPermission({
    teamId,
    tmbId: currentTmbId,
    role: currentMember.role as `${TeamMemberRoleEnum}`
  });

  if (!permission.isOwner && !permission.hasManagePer) {
    throw new Error('没有权限恢复成员');
  }

  // 检查目标成员是否存在且状态为 leave
  const targetMember = await MongoTeamMemberModel.findOne({
    _id: tmbId,
    teamId,
    status: TeamMemberStatusEnum.leave
  }).lean();

  if (!targetMember) {
    throw new Error('成员不存在或不需要恢复');
  }

  // 恢复成员状态为 active
  await MongoTeamMemberModel.updateOne(
    { _id: tmbId, teamId },
    { status: TeamMemberStatusEnum.active }
  );

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId: currentTmbId,
    event: AuditEventEnum.RECOVER_TEAM_MEMBER,
    metadata: { memberName: targetMember.name || '未知成员' }
  });

  return { success: true };
}

export default NextAPI(handler);

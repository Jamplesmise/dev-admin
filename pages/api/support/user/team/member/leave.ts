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
import { MongoCollaboratorModel } from '@fastgpt/service/support_permission/collaborator/schema';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type LeaveMemberResponse = {
  success: boolean;
};

/**
 * 成员主动离开团队
 * DELETE /api/support/user/team/member/leave
 */
async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<LeaveMemberResponse> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  // 检查当前成员
  const currentMember = await MongoTeamMemberModel.findOne({
    _id: tmbId,
    teamId
  }).lean();

  if (!currentMember) {
    throw new Error('成员不存在');
  }

  // owner 不能离开团队
  if (currentMember.role === TeamMemberRoleEnum.owner) {
    throw new Error('团队 owner 不能离开团队，请先转让团队所有权');
  }

  // 更新成员状态为 leave
  await MongoTeamMemberModel.updateOne(
    { _id: tmbId, teamId },
    { status: TeamMemberStatusEnum.leave }
  );

  // 清理该成员的协作者权限
  await MongoCollaboratorModel.deleteMany({
    teamId,
    tmbId
  });

  // 记录审计日志（成员主动离开）
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.KICK_OUT_TEAM,
    metadata: { memberName: `${currentMember.name}（主动离开）` }
  });

  return { success: true };
}

export default NextAPI(handler);

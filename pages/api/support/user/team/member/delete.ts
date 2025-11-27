import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support_permission/org/orgMemberSchema';
import { TeamMemberRoleEnum, TeamMemberStatusEnum } from '@fastgpt/global/support_user_team/constant';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 前端使用 DELETE 方法，参数通过 query string 传递
 * DELETE /api/support/user/team/member/delete?tmbId=xxx
 */
type DeleteMemberQuery = {
  tmbId: string;
};

/**
 * 删除团队成员（将成员状态设置为 leave）
 */
async function handler(
  req: ApiRequestProps<unknown, DeleteMemberQuery>,
  _res: NextApiResponse
): Promise<{ success: boolean }> {
  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);
  // DELETE 方法参数在 query 中
  const { tmbId } = req.query;

  if (!tmbId) {
    throw new Error('成员 ID 不能为空');
  }

  // 不能删除自己
  if (tmbId === currentTmbId) {
    throw new Error('不能删除自己');
  }

  // 查找要删除的成员
  const targetMember = await MongoTeamMemberModel.findOne({
    _id: tmbId,
    teamId
  }).lean();

  if (!targetMember) {
    throw new Error('成员不存在');
  }

  // 不能删除团队所有者
  if (targetMember.role === TeamMemberRoleEnum.owner) {
    throw new Error('不能删除团队所有者');
  }

  // 检查当前用户权限（只有 owner 可以删除成员）
  const currentMember = await MongoTeamMemberModel.findOne({
    _id: currentTmbId,
    teamId
  }).lean();

  if (!currentMember || currentMember.role !== TeamMemberRoleEnum.owner) {
    throw new Error('仅团队所有者可以删除成员');
  }

  // 更新成员状态为 leave
  await MongoTeamMemberModel.updateOne(
    { _id: tmbId, teamId },
    { $set: { status: TeamMemberStatusEnum.leave } }
  );

  // 同时删除该成员在所有组织中的关系
  await MongoOrgMemberModel.deleteMany({
    teamId,
    tmbId
  });

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId: currentTmbId,
    event: AuditEventEnum.KICK_OUT_TEAM,
    metadata: { memberName: targetMember.name || '未知成员' }
  });

  return { success: true };
}

export default NextAPI(handler);

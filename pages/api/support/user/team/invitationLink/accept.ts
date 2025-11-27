import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getUserIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import {
  getInvitationLinkByLinkId,
  validateInvitationLink,
  incrementInvitationLinkUsage
} from '@fastgpt/service/support_user/team/invitationLink/controller';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { MongoTeamModel } from '@fastgpt/service/support_user/team/teamSchema';
import { MongoUserModel } from '@fastgpt/service/support_user/schema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support_user_team/constant';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type AcceptInvitationRequest = {
  linkId: string;
};

/**
 * 接受邀请加入团队
 * POST /api/support/user/team/invitationLink/accept
 *
 * 前端期望返回：string (teamId)
 */
async function handler(
  req: ApiRequestProps<AcceptInvitationRequest>,
  _res: NextApiResponse
): Promise<string> {
  const userId = getUserIdFromReq(req);
  const { linkId } = req.body;

  // 参数验证
  if (!linkId) {
    throw new Error('缺少邀请链接 ID');
  }

  // 获取邀请链接
  const link = await getInvitationLinkByLinkId(linkId);
  if (!link) {
    throw new Error('邀请链接不存在');
  }

  // 验证邀请链接有效性
  const validation = validateInvitationLink(link);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  // 获取团队信息
  const team = await MongoTeamModel.findById(link.teamId).lean();
  if (!team) {
    throw new Error('团队不存在');
  }

  // 检查用户是否已在团队中
  const existingMember = await MongoTeamMemberModel.findOne({
    teamId: link.teamId,
    userId,
    status: { $ne: TeamMemberStatusEnum.leave }
  }).lean();

  if (existingMember) {
    throw new Error('您已是该团队成员');
  }

  // 检查团队成员数是否达上限（简化版，实际应检查套餐限制）
  const memberCount = await MongoTeamMemberModel.countDocuments({
    teamId: link.teamId,
    status: TeamMemberStatusEnum.active
  });

  // 假设免费版最多 3 个成员
  const maxMembers = 3;
  if (memberCount >= maxMembers) {
    throw new Error('团队成员数已达上限');
  }

  // 获取用户信息
  const user = await MongoUserModel.findById(userId).lean();
  const memberName = user?.username || '新成员';

  // 创建团队成员记录（普通成员不设置 role，权限通过协作者系统控制）
  const newMember = await MongoTeamMemberModel.create({
    teamId: link.teamId,
    userId,
    name: memberName,
    status: TeamMemberStatusEnum.active,
    avatar: user?.avatar || ''
  });

  // 更新邀请链接使用计数
  await incrementInvitationLinkUsage(linkId);

  // 记录审计日志
  await addAuditLog({
    teamId: String(link.teamId),
    tmbId: String(newMember._id),
    event: AuditEventEnum.JOIN_TEAM,
    metadata: { link: linkId }
  });

  // 返回 teamId 字符串（前端期望格式）
  return String(team._id);
}

export default NextAPI(handler);

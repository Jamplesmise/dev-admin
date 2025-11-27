import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { TeamMemberRoleEnum } from '@fastgpt/global/support_user_team/constant';
import {
  getInvitationLinkByLinkId,
  setInvitationLinkStatus
} from '@fastgpt/service/support_user/team/invitationLink/controller';
import { getTeamMemberPermission } from '@fastgpt/service/support_permission/controller';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type ForbidInvitationLinkRequest = {
  linkId: string;
  forbid?: boolean; // 可选，默认为 true（禁用）
};

/**
 * 禁用邀请链接
 * PUT /api/support/user/team/invitationLink/forbid
 *
 * 前端期望返回：string
 */
async function handler(
  req: ApiRequestProps<ForbidInvitationLinkRequest>,
  _res: NextApiResponse
): Promise<string> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);
  const { linkId, forbid = true } = req.body; // 默认禁用

  // 参数验证
  if (!linkId) {
    throw new Error('缺少邀请链接 ID');
  }

  // 检查当前用户权限（必须是 owner 或有管理权限）
  const currentMember = await MongoTeamMemberModel.findOne({
    _id: tmbId,
    teamId
  }).lean();

  if (!currentMember) {
    throw new Error('当前用户不是该团队成员');
  }

  const permission = await getTeamMemberPermission({
    teamId,
    tmbId,
    role: currentMember.role as `${TeamMemberRoleEnum}`
  });

  if (!permission.isOwner && !permission.hasManagePer) {
    throw new Error('没有权限操作邀请链接');
  }

  // 检查邀请链接是否属于当前团队
  const link = await getInvitationLinkByLinkId(linkId);
  if (!link) {
    throw new Error('邀请链接不存在');
  }

  if (String(link.teamId) !== teamId) {
    throw new Error('邀请链接不属于当前团队');
  }

  // 更新邀请链接状态
  await setInvitationLinkStatus(linkId, forbid);

  return 'success';
}

export default NextAPI(handler);

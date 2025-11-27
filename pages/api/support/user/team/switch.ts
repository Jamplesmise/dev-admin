import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware } from '@fastgpt/service/common/middle/authMiddleware';
import { TeamMemberStatusEnum } from '@fastgpt/global/support_user_team/constant';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type SwitchTeamRequest = {
  teamId: string;
};

/**
 * 切换当前团队
 * 验证用户是否是该团队成员，并返回团队信息
 */
async function handler(
  req: ApiRequestProps<SwitchTeamRequest>,
  _res: NextApiResponse
): Promise<{ success: boolean }> {
  const { userId, teamMembers } = req.auth;
  const { teamId } = req.body;

  if (!userId) {
    throw new Error('用户未登录');
  }

  if (!teamId) {
    throw new Error('团队 ID 不能为空');
  }

  // 验证用户是否是该团队成员
  const targetTeam = teamMembers?.find(
    (tmb) => tmb.teamId === teamId && tmb.status === TeamMemberStatusEnum.active
  );

  if (!targetTeam) {
    throw new Error('您不是该团队成员或已被禁用');
  }

  // 团队切换通过 Cookie 和前端状态管理完成
  // 这里只做验证
  return { success: true };
}

export default NextAPI(handler);

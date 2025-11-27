import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support_user_team/constant';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 前端期望的响应格式
 * GET 返回 { count: number }
 */
type GetMemberCountResponse = {
  count: number;
};

/**
 * 获取团队活跃成员数量
 * GET /api/support/user/team/member/count
 */
async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<GetMemberCountResponse> {
  const teamId = getTeamIdFromReq(req);

  // 统计活跃成员数量（不包括 leave 状态）
  const count = await MongoTeamMemberModel.countDocuments({
    teamId,
    status: { $ne: TeamMemberStatusEnum.leave }
  });

  return { count };
}

export default NextAPI(handler);

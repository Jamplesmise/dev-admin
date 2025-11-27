import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamTagModel } from '@fastgpt/service/support_user/team/tag/schema';
import type { TeamTagSchema } from '@fastgpt/global/support_user_team/type.d';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 团队标签列表 API
 * GET /api/support/user/team/tag/list
 */
async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<TeamTagSchema[]> {
  const teamId = getTeamIdFromReq(req);

  // 查询所有团队标签，按创建时间排序
  const tags = await MongoTeamTagModel.find({ teamId })
    .sort({ createTime: 1 })
    .lean();

  return tags as unknown as TeamTagSchema[];
}

export default NextAPI(handler);

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamTagModel } from '@fastgpt/service/support_user/team/tag/schema';
import type { TeamTagSchema } from '@fastgpt/global/support_user_team/type.d';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type QueryType = {
  page?: string;
  pageSize?: string;
  keyword?: string;
};

type ResponseType = {
  list: TeamTagSchema[];
  total: number;
  hasMore: boolean;
};

/**
 * 异步加载标签 API
 * GET /api/support/user/team/tag/async
 * 支持分页和搜索
 */
async function handler(
  req: ApiRequestProps<{}, QueryType>,
  _res: NextApiResponse
): Promise<ResponseType> {
  const teamId = getTeamIdFromReq(req);
  const { page = '1', pageSize = '20', keyword } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const skip = (pageNum - 1) * limit;

  // 构建查询条件
  const query: Record<string, unknown> = { teamId };

  if (keyword && keyword.trim()) {
    // 支持按 key 或 label 搜索
    query.$or = [
      { key: { $regex: keyword.trim(), $options: 'i' } },
      { label: { $regex: keyword.trim(), $options: 'i' } }
    ];
  }

  // 并行查询列表和总数
  const [list, total] = await Promise.all([
    MongoTeamTagModel.find(query)
      .sort({ createTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MongoTeamTagModel.countDocuments(query)
  ]);

  return {
    list: list as unknown as TeamTagSchema[],
    total,
    hasMore: skip + list.length < total
  };
}

export default NextAPI(handler);

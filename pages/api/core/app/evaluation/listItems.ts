/**
 * 获取评估项目列表
 *
 * POST /api/core/app/evaluation/listItems
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { getEvaluationItems } from '@fastgpt/service/core/app/evaluation/controller';
import type { listEvalItemsBody } from '@fastgpt/global/core/app/evaluation/api';
import type { listEvalItemsItem } from '@fastgpt/global/core/app/evaluation/type';
import type { PaginationResponse } from '@fastgpt/global/common/type';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps<listEvalItemsBody>,
  _res: NextApiResponse
): Promise<PaginationResponse<listEvalItemsItem>> {
  const teamId = getTeamIdFromReq(req);
  const { evalId, pageNum, pageSize } = req.body;

  if (!evalId) {
    throw new Error('evalId 不能为空');
  }

  const result = await getEvaluationItems({
    teamId,
    evalId,
    pageNum: pageNum ? Number(pageNum) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined
  });

  return result;
}

export default NextAPI(handler);

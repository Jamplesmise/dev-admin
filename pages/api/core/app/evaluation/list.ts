/**
 * 获取评估任务列表
 *
 * POST /api/core/app/evaluation/list
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { getEvaluationList } from '@fastgpt/service/core/app/evaluation/controller';
import type { listEvaluationsBody } from '@fastgpt/global/core/app/evaluation/api';
import type { evaluationType } from '@fastgpt/global/core/app/evaluation/type';
import type { PaginationResponse } from '@fastgpt/global/common/type';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps<listEvaluationsBody>,
  _res: NextApiResponse
): Promise<PaginationResponse<evaluationType>> {
  const teamId = getTeamIdFromReq(req);
  const { searchKey, pageNum, pageSize } = req.body;

  const result = await getEvaluationList({
    teamId,
    searchKey,
    pageNum: pageNum ? Number(pageNum) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined
  });

  return result;
}

export default NextAPI(handler);

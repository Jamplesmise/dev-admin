/**
 * 更新评估项目
 *
 * POST /api/core/app/evaluation/updateItem
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { updateEvaluationItem } from '@fastgpt/service/core/app/evaluation/controller';
import type { updateEvalItemBody } from '@fastgpt/global/core/app/evaluation/api';
import type { listEvalItemsItem } from '@fastgpt/global/core/app/evaluation/type';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps<updateEvalItemBody>,
  _res: NextApiResponse
): Promise<listEvalItemsItem> {
  const teamId = getTeamIdFromReq(req);
  const { evalItemId, question, expectedResponse, variables } = req.body;

  if (!evalItemId) {
    throw new Error('evalItemId 不能为空');
  }

  const item = await updateEvaluationItem({
    teamId,
    evalItemId,
    question,
    expectedResponse,
    variables
  });

  return item;
}

export default NextAPI(handler);

/**
 * 删除评估项目
 *
 * DELETE /api/core/app/evaluation/deleteItem
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { deleteEvaluationItem } from '@fastgpt/service/core/app/evaluation/controller';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 官方格式: { evalItemId: string }
type DeleteEvalItemBody = {
  evalItemId: string;
};

async function handler(
  req: ApiRequestProps<DeleteEvalItemBody>,
  _res: NextApiResponse
): Promise<{ success: boolean }> {
  const teamId = getTeamIdFromReq(req);
  const { evalItemId } = req.body;

  if (!evalItemId) {
    throw new Error('evalItemId 不能为空');
  }

  await deleteEvaluationItem({
    teamId,
    evalItemId
  });

  return { success: true };
}

export default NextAPI(handler);

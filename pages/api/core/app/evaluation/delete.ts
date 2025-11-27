/**
 * 删除评估任务
 *
 * DELETE /api/core/app/evaluation/delete?evalId=xxx
 * 或
 * DELETE /api/core/app/evaluation/delete (body: { evalId: string })
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { deleteEvaluation } from '@fastgpt/service/core/app/evaluation/controller';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 官方格式: { evalId: string }
type DeleteEvalParams = {
  evalId?: string;
};

async function handler(
  req: ApiRequestProps<DeleteEvalParams, DeleteEvalParams>,
  _res: NextApiResponse
): Promise<{ success: boolean }> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  // 支持从 query 或 body 获取 evalId
  const evalId = req.query.evalId || req.body?.evalId;

  if (!evalId) {
    throw new Error('evalId 不能为空');
  }

  await deleteEvaluation({
    teamId,
    evalId
  });

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.DELETE_EVALUATION,
    metadata: {
      evalId
    }
  });

  return { success: true };
}

export default NextAPI(handler);

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 前端参数格式
 * PUT { name }
 */
type UpdateNameRequest = {
  name: string; // 前端使用 name，不是 memberName
};

type UpdateNameResponse = {
  success: boolean;
};

/**
 * 成员更新自己的名称
 * PUT /api/support/user/team/member/updateName
 */
async function handler(
  req: ApiRequestProps<UpdateNameRequest>,
  _res: NextApiResponse
): Promise<UpdateNameResponse> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);
  const { name } = req.body;

  // 参数验证
  if (!name || name.trim().length === 0) {
    throw new Error('成员名称不能为空');
  }

  if (name.trim().length > 50) {
    throw new Error('成员名称不能超过 50 个字符');
  }

  // 获取原名称
  const currentMember = await MongoTeamMemberModel.findOne({ _id: tmbId, teamId }).lean();
  const oldName = currentMember?.name || '未知';

  // 更新自己的名称
  const result = await MongoTeamMemberModel.updateOne(
    { _id: tmbId, teamId },
    { name: name.trim() }
  );

  if (result.matchedCount === 0) {
    throw new Error('成员不存在');
  }

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.CHANGE_MEMBER_NAME,
    metadata: { memberName: oldName, newName: name.trim() }
  });

  return { success: true };
}

export default NextAPI(handler);

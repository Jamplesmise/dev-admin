import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq, getTmbIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';
import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support_permission/org/orgMemberSchema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 前端使用 DELETE 方法，参数通过 query string 传递
 * DELETE /api/support/user/team/org/deleteMember?orgId=xxx&tmbId=xxx
 */
type DeleteMemberQuery = {
  orgId: string;
  tmbId: string; // 要从组织移除的成员 ID
};

async function handler(
  req: ApiRequestProps<unknown, DeleteMemberQuery>,
  _res: NextApiResponse
): Promise<{ success: boolean }> {
  // DELETE 方法参数在 query 中
  const { orgId, tmbId } = req.query;

  if (!orgId) {
    throw new Error('缺少组织 ID');
  }

  if (!tmbId) {
    throw new Error('缺少成员 ID');
  }

  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);

  // 检查组织是否存在
  const org = await MongoOrgModel.findOne({ _id: orgId, teamId }).lean();
  if (!org) {
    throw new Error('组织不存在');
  }

  // 删除成员关系
  const result = await MongoOrgMemberModel.deleteOne({
    teamId,
    orgId,
    tmbId
  });

  if (result.deletedCount === 0) {
    throw new Error('成员不在该组织中');
  }

  // 查询被移除成员的名称
  const memberInfo = await MongoTeamMemberModel.findById(tmbId).lean();
  const memberName = memberInfo?.name || tmbId;

  // 记录审计日志（从部门移除成员，显示具体成员名称）
  await addAuditLog({
    teamId,
    tmbId: currentTmbId,
    event: AuditEventEnum.CHANGE_DEPARTMENT,
    metadata: { departmentName: `${org.name}（移除成员：${memberName}）` }
  });

  return { success: true };
}

export default NextAPI(handler);

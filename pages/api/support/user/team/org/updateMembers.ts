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
 * 前端期望的参数格式 (putUpdateOrgMembersData)
 */
type UpdateMembersBody = {
  orgId?: string;
  members: { tmbId: string }[]; // 要添加到组织的成员列表
};

async function handler(
  req: ApiRequestProps<UpdateMembersBody>,
  _res: NextApiResponse
): Promise<{ success: boolean; addedCount: number }> {
  const { orgId, members } = req.body;

  if (!orgId) {
    throw new Error('缺少组织 ID');
  }

  if (!members || !Array.isArray(members)) {
    throw new Error('缺少成员列表');
  }

  // 提取 tmbId 列表
  const tmbIds = members.map((m) => m.tmbId).filter(Boolean);

  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);

  // 检查组织是否存在
  const org = await MongoOrgModel.findOne({ _id: orgId, teamId }).lean();
  if (!org) {
    throw new Error('组织不存在');
  }

  // 过滤出不存在的成员关系
  const existingMembers = await MongoOrgMemberModel.find({
    teamId,
    orgId,
    tmbId: { $in: tmbIds }
  }).lean();

  const existingTmbIds = new Set(existingMembers.map((m) => String(m.tmbId)));
  const newTmbIds = tmbIds.filter((tmbId) => !existingTmbIds.has(tmbId));

  // 批量创建新的成员关系
  if (newTmbIds.length > 0) {
    const newMembers = newTmbIds.map((tmbId) => ({
      teamId,
      orgId,
      tmbId
    }));

    await MongoOrgMemberModel.insertMany(newMembers);

    // 查询新增成员的名称
    const memberInfos = await MongoTeamMemberModel.find({
      _id: { $in: newTmbIds }
    }).lean();

    const memberNames = memberInfos.map((m) => m.name || String(m._id)).join('、');

    // 记录审计日志（添加成员到部门，显示具体成员名称）
    await addAuditLog({
      teamId,
      tmbId: currentTmbId,
      event: AuditEventEnum.CHANGE_DEPARTMENT,
      metadata: { departmentName: `${org.name}（添加成员：${memberNames}）` }
    });
  }

  return {
    success: true,
    addedCount: newTmbIds.length
  };
}

export default NextAPI(handler);

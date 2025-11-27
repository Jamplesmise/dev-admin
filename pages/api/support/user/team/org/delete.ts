import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support_permission/org/orgMemberSchema';
import type { OrgSchemaType } from '@fastgpt/global/support_user_team/org/type';
import { getOrgChildrenPath } from '@fastgpt/global/support_user_team/org/constant';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type DeleteOrgBody = {
  orgId: string;
};

type DeleteOrgQuery = {
  orgId: string;
};

async function handler(
  req: ApiRequestProps<DeleteOrgBody, DeleteOrgQuery>,
  _res: NextApiResponse
): Promise<{ success: boolean }> {
  // 前端使用 DELETE 方法，参数在 query 中
  const orgId = req.query.orgId || req.body.orgId;

  if (!orgId) {
    throw new Error('缺少组织 ID');
  }

  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  // 查找组织
  const org = await MongoOrgModel.findOne({ _id: orgId, teamId }).lean();
  if (!org) {
    throw new Error('组织不存在');
  }

  // 检查是否为根组织
  if (org.path === '' && org.name === 'ROOT') {
    throw new Error('根组织不允许删除');
  }

  // 获取子组织路径前缀
  const childPath = getOrgChildrenPath(org as OrgSchemaType);

  // 获取所有子组织
  const childOrgs = await MongoOrgModel.find({
    teamId,
    path: { $regex: `^${childPath}` }
  }).lean();

  const allOrgIds = [orgId, ...childOrgs.map((o) => String(o._id))];

  // 删除所有组织成员关系
  await MongoOrgMemberModel.deleteMany({
    teamId,
    orgId: { $in: allOrgIds }
  });

  // 删除所有子组织和当前组织
  await MongoOrgModel.deleteMany({
    teamId,
    $or: [{ _id: orgId }, { path: { $regex: `^${childPath}` } }]
  });

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.DELETE_DEPARTMENT,
    metadata: { departmentName: org.name }
  });

  return { success: true };
}

export default NextAPI(handler);

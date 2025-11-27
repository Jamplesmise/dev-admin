import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import type { OrgSchemaType } from '@fastgpt/global/support_user_team/org/type';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type UpdateOrgBody = {
  orgId: string;
  name?: string;
  avatar?: string;
  description?: string;
};

async function handler(
  req: ApiRequestProps<UpdateOrgBody>,
  _res: NextApiResponse
): Promise<OrgSchemaType> {
  const { orgId, name, avatar, description } = req.body;

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

  // 检查是否为根组织 (ROOT 组织不允许修改名称)
  if (org.path === '' && org.name === 'ROOT' && name) {
    throw new Error('根组织不允许修改名称');
  }

  // 如果修改名称，检查同级是否有同名组织
  if (name && name.trim() !== org.name) {
    const existingOrg = await MongoOrgModel.findOne({
      teamId,
      path: org.path,
      name: name.trim(),
      _id: { $ne: orgId }
    }).lean();
    if (existingOrg) {
      throw new Error('同级已存在同名组织');
    }
  }

  // 更新组织
  const updateData: Record<string, string | undefined> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (avatar !== undefined) updateData.avatar = avatar;
  if (description !== undefined) updateData.description = description;

  const updatedOrg = await MongoOrgModel.findByIdAndUpdate(
    orgId,
    { $set: updateData },
    { new: true }
  ).lean();

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.CHANGE_DEPARTMENT,
    metadata: { departmentName: org.name }
  });

  return updatedOrg as OrgSchemaType;
}

export default NextAPI(handler);

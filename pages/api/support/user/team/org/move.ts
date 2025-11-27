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
import { getOrgChildrenPath } from '@fastgpt/global/support_user_team/org/constant';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

/**
 * 前端期望的参数格式 (putMoveOrgType)
 * 注意：前端使用 targetOrgId 而非 targetParentId
 */
type MoveOrgBody = {
  orgId: string;
  targetOrgId?: string; // 目标父组织 ID，不传则移动到根级
};

async function handler(
  req: ApiRequestProps<MoveOrgBody>,
  _res: NextApiResponse
): Promise<{ success: boolean }> {
  const { orgId, targetOrgId: targetParentId } = req.body;

  if (!orgId) {
    throw new Error('缺少组织 ID');
  }

  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  // 查找要移动的组织
  const org = await MongoOrgModel.findOne({ _id: orgId, teamId }).lean();
  if (!org) {
    throw new Error('组织不存在');
  }

  // 检查是否为根组织
  if (org.path === '' && org.name === 'ROOT') {
    throw new Error('根组织不允许移动');
  }

  // 获取目标路径
  let newPath = '';
  if (targetParentId) {
    // 检查目标父组织是否存在
    const targetParent = await MongoOrgModel.findOne({ _id: targetParentId, teamId }).lean();
    if (!targetParent) {
      throw new Error('目标父组织不存在');
    }

    // 检查是否将组织移动到自己的子组织下
    const currentPath = getOrgChildrenPath(org as OrgSchemaType);
    if (
      targetParent.path.startsWith(currentPath) ||
      String(targetParent._id) === orgId
    ) {
      throw new Error('不能将组织移动到自己或其子组织下');
    }

    newPath = getOrgChildrenPath(targetParent as OrgSchemaType);
  }

  // 检查目标位置是否有同名组织
  const existingOrg = await MongoOrgModel.findOne({
    teamId,
    path: newPath,
    name: org.name,
    _id: { $ne: orgId }
  }).lean();
  if (existingOrg) {
    throw new Error('目标位置已存在同名组织');
  }

  // 获取旧路径前缀
  const oldPath = getOrgChildrenPath(org as OrgSchemaType);

  // 获取所有子组织
  const childOrgs = await MongoOrgModel.find({
    teamId,
    path: { $regex: `^${oldPath}` }
  }).lean();

  // 计算新的子组织路径
  const newOrgPath = `${newPath}/${org.pathId}`;

  // 批量更新子组织路径
  for (const child of childOrgs) {
    const childNewPath = child.path.replace(oldPath, newOrgPath);
    await MongoOrgModel.updateOne({ _id: child._id }, { $set: { path: childNewPath } });
  }

  // 更新当前组织路径
  await MongoOrgModel.updateOne({ _id: orgId }, { $set: { path: newPath } });

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.RELOCATE_DEPARTMENT,
    metadata: { departmentName: org.name }
  });

  return { success: true };
}

export default NextAPI(handler);

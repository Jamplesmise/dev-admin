/**
 * 删除应用协作者
 *
 * DELETE /api/core/app/collaborator/delete?appId=xxx&tmbId=xxx
 * 或 DELETE /api/core/app/collaborator/delete?appId=xxx&groupId=xxx
 * 或 DELETE /api/core/app/collaborator/delete?appId=xxx&orgId=xxx
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { ResourceTypeEnum } from '@fastgpt/global/support/permission/collaborator/constant';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { deleteCollaborator } from '@fastgpt/service/support_permission/collaborator/controller';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';
import {
  getAppNameAndType,
  getMemberName,
  getGroupName,
  getOrgName
} from '@fastgpt/service/support_permission/collaborator/nameQuery';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 官方格式: { appId: string } & (tmbId | groupId | orgId)
type DeleteParams = {
  appId?: string;
  tmbId?: string;
  groupId?: string;
  orgId?: string;
};

async function handler(
  req: ApiRequestProps<DeleteParams, DeleteParams>,
  _res: NextApiResponse
): Promise<{ success: boolean }> {
  // 支持从 query 或 body 获取参数
  const appId = req.query.appId || req.body?.appId;
  const tmbId = req.query.tmbId || req.body?.tmbId;
  const groupId = req.query.groupId || req.body?.groupId;
  const orgId = req.query.orgId || req.body?.orgId;

  if (!appId) {
    throw new Error('appId 不能为空');
  }

  if (!tmbId && !groupId && !orgId) {
    throw new Error('需要提供 tmbId、groupId 或 orgId 中的一个');
  }

  const teamId = getTeamIdFromReq(req);
  const currentTmbId = getTmbIdFromReq(req);

  await deleteCollaborator({
    resourceType: ResourceTypeEnum.app,
    resourceId: appId,
    teamId,
    tmbId,
    groupId,
    orgId
  });

  // 记录审计日志 - 查询真实名称
  let itemName = '';
  let itemValueName = '';

  // 并行查询应用信息和协作者名称
  const appInfoPromise = getAppNameAndType(appId);
  let namePromise: Promise<string>;

  if (tmbId) {
    itemName = '成员';
    namePromise = getMemberName(tmbId);
  } else if (groupId) {
    itemName = '群组';
    namePromise = getGroupName(groupId);
  } else if (orgId) {
    itemName = '组织';
    namePromise = getOrgName(orgId);
  } else {
    namePromise = Promise.resolve('');
  }

  const [appInfo, collaboratorName] = await Promise.all([appInfoPromise, namePromise]);
  itemValueName = collaboratorName;

  await addAuditLog({
    teamId,
    tmbId: currentTmbId,
    event: AuditEventEnum.DELETE_APP_COLLABORATOR,
    metadata: {
      appName: appInfo.name,
      appType: appInfo.type,
      itemName,
      itemValueName
    }
  });

  return { success: true };
}

export default NextAPI(handler);

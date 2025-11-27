/**
 * 更新应用协作者
 *
 * POST /api/core/app/collaborator/update
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { ResourceTypeEnum } from '@fastgpt/global/support/permission/collaborator/constant';
import type { CollaboratorItemType } from '@fastgpt/global/support/permission/collaborator/type';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import {
  updateCollaborators,
  type UpdateCollaboratorResult
} from '@fastgpt/service/support_permission/collaborator/controller';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';
import {
  getAppNameAndType,
  getMemberNames,
  getGroupNames,
  getOrgNames
} from '@fastgpt/service/support_permission/collaborator/nameQuery';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 官方格式: { appId: string, collaborators: [...] }
type UpdateAppCollaboratorBody = {
  appId: string;
  collaborators: CollaboratorItemType[];
};

async function handler(
  req: ApiRequestProps<UpdateAppCollaboratorBody>,
  _res: NextApiResponse
): Promise<UpdateCollaboratorResult> {
  const { appId, collaborators } = req.body;

  if (!appId) {
    throw new Error('appId 不能为空');
  }

  if (!collaborators || !Array.isArray(collaborators)) {
    throw new Error('collaborators 不能为空');
  }

  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  const result = await updateCollaborators({
    resourceType: ResourceTypeEnum.app,
    resourceId: appId,
    teamId,
    collaborators
  });

  // 记录审计日志 - 查询真实名称
  const tmbIds = collaborators.filter((c) => c.tmbId).map((c) => c.tmbId as string);
  const groupIds = collaborators.filter((c) => c.groupId).map((c) => c.groupId as string);
  const orgIds = collaborators.filter((c) => c.orgId).map((c) => c.orgId as string);

  // 并行查询所有名称
  const [appInfo, memberNames, groupNames, orgNameList] = await Promise.all([
    getAppNameAndType(appId),
    getMemberNames(tmbIds),
    getGroupNames(groupIds),
    getOrgNames(orgIds)
  ]);

  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.UPDATE_APP_COLLABORATOR,
    metadata: {
      appName: appInfo.name,
      appType: appInfo.type,
      tmbList: memberNames,
      groupList: groupNames,
      orgList: orgNameList,
      permission: String(collaborators[0]?.permission || 0)
    }
  });

  return result;
}

export default NextAPI(handler);

/**
 * 获取应用协作者列表
 *
 * GET /api/core/app/collaborator/list?appId=xxx
 */
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  getCollaboratorList,
  type CollaboratorItemDetailType
} from '@fastgpt/service/support_permission/collaborator/controller';
import { ResourceTypeEnum } from '@fastgpt/global/support/permission/collaborator/constant';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 官方格式: { appId: string }
type ListQuery = {
  appId: string;
};

// 官方响应格式
type CollaboratorListResponse = {
  clbs: CollaboratorItemDetailType[];
  parentClbs?: CollaboratorItemDetailType[];
};

async function handler(
  req: ApiRequestProps<unknown, ListQuery>,
  _res: NextApiResponse
): Promise<CollaboratorListResponse> {
  const { appId } = req.query;

  if (!appId) {
    throw new Error('appId 不能为空');
  }

  const teamId = getTeamIdFromReq(req);

  const collaborators = await getCollaboratorList({
    resourceType: ResourceTypeEnum.app,
    resourceId: appId,
    teamId
  });

  // 返回官方格式: { clbs: [...], parentClbs?: [...] }
  return {
    clbs: collaborators,
    parentClbs: []
  };
}

export default NextAPI(handler);

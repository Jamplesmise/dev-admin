/**
 * 获取数据集协作者列表
 *
 * GET /api/core/dataset/collaborator/list?datasetId=xxx
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

// 官方格式: { datasetId: string }
type ListQuery = {
  datasetId: string;
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
  const { datasetId } = req.query;

  if (!datasetId) {
    throw new Error('datasetId 不能为空');
  }

  const teamId = getTeamIdFromReq(req);

  const collaborators = await getCollaboratorList({
    resourceType: ResourceTypeEnum.dataset,
    resourceId: datasetId,
    teamId
  });

  // 返回官方格式: { clbs: [...], parentClbs?: [...] }
  return {
    clbs: collaborators,
    parentClbs: []
  };
}

export default NextAPI(handler);

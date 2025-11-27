import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { ResourceTypeEnum } from '@fastgpt/global/support/permission/collaborator/constant';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import {
  updateModelCollaborators,
  type UpdateCollaboratorResult
} from '@fastgpt/service/support_permission/collaborator/controller';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 前端发送的参数格式：{ models: string[], collaborators: CollaboratorItemType[] }
type UpdateModelCollaboratorBody = {
  models: string[];
  collaborators: Array<{
    tmbId?: string;
    groupId?: string;
    orgId?: string;
    permission: number;
  }>;
};

async function handler(
  req: ApiRequestProps<UpdateModelCollaboratorBody>,
  _res: NextApiResponse
): Promise<UpdateCollaboratorResult> {
  const { models, collaborators } = req.body;

  if (!models || !Array.isArray(models) || models.length === 0) {
    throw new Error('缺少模型列表');
  }

  if (!collaborators || !Array.isArray(collaborators)) {
    throw new Error('缺少协作者列表');
  }

  const teamId = getTeamIdFromReq(req);

  // 为每个模型更新协作者
  return updateModelCollaborators({
    resourceType: ResourceTypeEnum.model,
    models,
    teamId,
    collaborators
  });
}

export default NextAPI(handler);

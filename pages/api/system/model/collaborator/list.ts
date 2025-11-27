import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { getModelCollaboratorList } from '@fastgpt/service/support_permission/collaborator/controller';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 前端发送的参数是 model (模型名称)
type QueryType = {
  model?: string;
};

// 返回格式：{ clbs: CollaboratorItemDetailType[], parentClbs?: CollaboratorItemDetailType[] }
type CollaboratorListResponse = {
  clbs: Array<{
    tmbId?: string;
    groupId?: string;
    orgId?: string;
    teamId: string;
    permission: { value: number };
    name: string;
    avatar: string;
  }>;
  parentClbs?: Array<{
    tmbId?: string;
    groupId?: string;
    orgId?: string;
    teamId: string;
    permission: { value: number };
    name: string;
    avatar: string;
  }>;
};

async function handler(
  req: ApiRequestProps<unknown, QueryType>,
  _res: NextApiResponse
): Promise<CollaboratorListResponse> {
  const { model } = req.query;

  if (!model) {
    throw new Error('缺少模型 ID');
  }

  const teamId = getTeamIdFromReq(req);

  // 使用 model 名称作为 resourceId
  const clbs = await getModelCollaboratorList({
    model,
    teamId
  });

  return { clbs };
}

export default NextAPI(handler);

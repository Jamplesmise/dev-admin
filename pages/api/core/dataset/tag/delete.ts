/**
 * 删除数据集标签
 *
 * DELETE /api/core/dataset/tag/delete
 */

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoDatasetTagModel } from '@fastgpt/service/core/dataset/tag/schema';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type DeleteTagResponse = {
  success: boolean;
};

async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<DeleteTagResponse> {
  const teamId = getTeamIdFromReq(req);
  const { tagId } = req.query as { tagId?: string };

  // 参数校验
  if (!tagId) {
    throw new Error('tagId 不能为空');
  }

  // 验证标签存在且属于该团队
  const tag = await MongoDatasetTagModel.findOne({
    _id: tagId,
    teamId
  });

  if (!tag) {
    throw new Error('标签不存在或无权限删除');
  }

  // 删除标签
  await MongoDatasetTagModel.deleteOne({ _id: tagId });

  // TODO: 清理标签与 collection 的关联（如果有的话）
  // 需要根据实际的 collection schema 来实现

  return {
    success: true
  };
}

export default NextAPI(handler);

/**
 * 创建数据集标签
 *
 * POST /api/core/dataset/tag/create
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

type CreateTagRequest = {
  datasetId: string;
  name: string;
};

type CreateTagResponse = {
  tagId: string;
  name: string;
};

async function handler(
  req: ApiRequestProps<CreateTagRequest>,
  _res: NextApiResponse
): Promise<CreateTagResponse> {
  const teamId = getTeamIdFromReq(req);
  const { datasetId, name } = req.body;

  // 参数校验
  if (!datasetId) {
    throw new Error('datasetId 不能为空');
  }
  if (!name || name.trim() === '') {
    throw new Error('标签名称不能为空');
  }
  if (name.length > 50) {
    throw new Error('标签名称不能超过 50 个字符');
  }

  const trimmedName = name.trim();

  // 检查标签名称在数据集内是否唯一
  const existingTag = await MongoDatasetTagModel.findOne({
    datasetId,
    name: trimmedName
  });

  if (existingTag) {
    throw new Error('标签名称已存在');
  }

  // 创建标签
  const newTag = await MongoDatasetTagModel.create({
    teamId,
    datasetId,
    name: trimmedName
  });

  return {
    tagId: String(newTag._id),
    name: newTag.name
  };
}

export default NextAPI(handler);

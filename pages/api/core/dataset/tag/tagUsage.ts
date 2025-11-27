import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type TagUsageRequest = {
  tagId: string;
};

type DatasetCollectionBriefType = {
  _id: string;
  name: string;
  datasetId: string;
  datasetName: string;
};

type TagUsageResponse = {
  tagId: string;
  label: string;
  usageCount: number;
  collections: DatasetCollectionBriefType[]; // 使用该标签的数据集集合列表
};

/**
 * 获取标签使用统计
 * 查看哪些数据集集合使用了该标签
 * TODO: 实现标签使用统计
 */
async function handler(
  req: ApiRequestProps<TagUsageRequest>,
  _res: NextApiResponse
): Promise<TagUsageResponse> {
  const teamId = getTeamIdFromReq(req);
  const { tagId } = req.body;

  if (!tagId) {
    throw new Error('标签 ID 不能为空');
  }

  // TODO: 实现标签使用统计
  // 1. 验证标签存在且属于该团队
  // 2. 查询所有使用该标签的数据集集合
  // 3. 关联数据集名称
  // 4. 返回统计结果

  // 临时返回空数据
  return {
    tagId,
    label: '',
    usageCount: 0,
    collections: []
  };
}

export default NextAPI(handler);

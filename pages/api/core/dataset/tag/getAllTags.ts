import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type TagWithUsageType = {
  _id: string;
  label: string;
  key: string;
  color?: string;
  usageCount: number; // 使用该标签的数据集数量
};

/**
 * 获取所有标签（含使用统计）
 * 用于标签选择器等场景
 * TODO: 实现带使用统计的标签列表
 */
async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<TagWithUsageType[]> {
  const teamId = getTeamIdFromReq(req);

  // TODO: 实现带使用统计的标签列表
  // 1. 查询该团队的所有标签
  // 2. 统计每个标签在数据集中的使用次数
  // 3. 按使用次数或字母顺序排序

  // 临时返回空列表
  return [];
}

export default NextAPI(handler);

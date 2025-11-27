import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type AddTagToCollectionsRequest = {
  tagId: string;
  collectionIds: string[]; // 数据集集合 ID 列表
};

/**
 * 批量添加标签到数据集集合
 * TODO: 实现批量添加标签逻辑
 */
async function handler(
  req: ApiRequestProps<AddTagToCollectionsRequest>,
  _res: NextApiResponse
): Promise<{ success: boolean; updated: number }> {
  const teamId = getTeamIdFromReq(req);
  const { tagId, collectionIds } = req.body;

  if (!tagId) {
    throw new Error('标签 ID 不能为空');
  }

  if (!collectionIds || collectionIds.length === 0) {
    throw new Error('数据集集合 ID 列表不能为空');
  }

  // TODO: 实现批量添加标签逻辑
  // 1. 验证标签存在且属于该团队
  // 2. 验证所有数据集集合都属于该团队
  // 3. 批量更新数据集集合的 tags 字段
  // 4. 返回更新数量
  // 5. 记录操作日志

  throw new Error('批量添加标签功能待实现');
}

export default NextAPI(handler);

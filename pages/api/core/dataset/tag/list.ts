import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type DatasetTagType = {
  _id: string;
  teamId: string;
  label: string;
  key: string;
  color?: string;
  createTime: Date;
  updateTime?: Date;
};

/**
 * 获取数据集标签列表
 * TODO: 实现标签列表查询
 */
async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<DatasetTagType[]> {
  const teamId = getTeamIdFromReq(req);

  // TODO: 实现标签列表查询
  // 1. 查询该团队的所有标签
  // 2. 按创建时间排序
  // 3. 可选：添加使用次数统计

  // 临时返回空列表
  return [];
}

export default NextAPI(handler);

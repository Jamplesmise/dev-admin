/**
 * 获取用户通知列表
 *
 * POST /api/support/user/inform/list
 */

import type { NextApiResponse } from 'next';
import { Types } from 'mongoose';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getUserIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import {
  MongoUserInformModel,
  InformTypeEnum
} from '@fastgpt/service/support_user/inform/schema';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type GetInformListRequest = {
  type?: 'system' | 'team' | 'billing' | 'all';
  status?: 'read' | 'unread' | 'all';
  offset?: number;
  limit?: number;
};

type InformItemType = {
  _id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createTime: Date;
  teamId?: string;
  teamName?: string;
  linkUrl?: string;
};

type GetInformListResponse = {
  total: number;
  list: InformItemType[];
};

async function handler(
  req: ApiRequestProps<GetInformListRequest>,
  _res: NextApiResponse
): Promise<GetInformListResponse> {
  const userId = getUserIdFromReq(req);
  const { type = 'all', status = 'all', offset = 0, limit = 20 } = req.body || {};

  // 构建查询条件
  const query: Record<string, unknown> = { userId: new Types.ObjectId(userId) };

  // 类型筛选
  if (type && type !== 'all') {
    query.type = type;
  }

  // 状态筛选
  if (status === 'read') {
    query.isRead = true;
  } else if (status === 'unread') {
    query.isRead = false;
  }

  // 并行查询总数和列表
  const [total, list] = await Promise.all([
    MongoUserInformModel.countDocuments(query),
    MongoUserInformModel.find(query)
      .sort({ createTime: -1 })
      .skip(offset)
      .limit(Math.min(limit, 100))
      .lean()
  ]);

  return {
    total,
    list: list.map((item) => ({
      _id: String(item._id),
      type: item.type,
      title: item.title,
      content: item.content,
      isRead: item.isRead,
      createTime: item.createTime,
      teamId: item.teamId ? String(item.teamId) : undefined,
      linkUrl: item.linkUrl
    }))
  };
}

export default NextAPI(handler);

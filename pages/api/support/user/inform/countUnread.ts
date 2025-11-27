/**
 * 获取未读通知数量
 *
 * GET /api/support/user/inform/countUnread
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

type CountUnreadResponse = {
  total: number;
  byType: {
    system: number;
    team: number;
    billing: number;
  };
};

async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<CountUnreadResponse> {
  const userId = getUserIdFromReq(req);

  // 使用聚合查询分类计数
  const result = await MongoUserInformModel.aggregate([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        isRead: false
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);

  // 构建分类计数
  const byType = {
    system: 0,
    team: 0,
    billing: 0
  };

  let total = 0;
  for (const item of result) {
    const type = item._id as keyof typeof byType;
    if (type in byType) {
      byType[type] = item.count;
      total += item.count;
    }
  }

  return {
    total,
    byType
  };
}

export default NextAPI(handler);

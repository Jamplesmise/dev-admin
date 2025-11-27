/**
 * 标记通知为已读
 *
 * GET /api/support/user/inform/read
 */

import type { NextApiResponse } from 'next';
import { Types } from 'mongoose';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getUserIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoUserInformModel } from '@fastgpt/service/support_user/inform/schema';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type ReadInformResponse = {
  success: boolean;
  modifiedCount?: number;
};

async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<ReadInformResponse> {
  const userId = getUserIdFromReq(req);
  // 兼容 id 和 informId 两种参数名
  const { id, informId, all } = req.query as { id?: string; informId?: string; all?: string };
  const targetId = id || informId;

  const userIdObj = new Types.ObjectId(userId);

  // 全部标记已读
  if (all === 'true') {
    const result = await MongoUserInformModel.updateMany(
      { userId: userIdObj, isRead: false },
      { $set: { isRead: true } }
    );

    return {
      success: true,
      modifiedCount: result.modifiedCount
    };
  }

  // 标记单个通知
  if (targetId) {
    const result = await MongoUserInformModel.updateOne(
      { _id: new Types.ObjectId(targetId), userId: userIdObj },
      { $set: { isRead: true } }
    );

    if (result.matchedCount === 0) {
      throw new Error('通知不存在或无权限');
    }

    return {
      success: true,
      modifiedCount: result.modifiedCount
    };
  }

  throw new Error('请提供 id 或 all=true 参数');
}

export default NextAPI(handler);

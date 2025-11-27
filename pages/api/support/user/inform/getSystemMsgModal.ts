/**
 * 获取需要弹窗展示的系统消息
 *
 * GET /api/support/user/inform/getSystemMsgModal
 */

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getUserIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import {
  MongoSystemMessageModel,
  type SystemMessageButtonType
} from '@fastgpt/service/support/systemMessage/schema';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type SystemMsgModalMessage = {
  _id: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  buttons?: SystemMessageButtonType[];
};

type GetSystemMsgModalResponse = {
  hasMessage: boolean;
  message?: SystemMsgModalMessage;
};

async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<GetSystemMsgModalResponse> {
  const userId = getUserIdFromReq(req);
  const now = new Date();

  // 查询当前有效的系统消息
  // 条件：isActive=true, 当前时间在 startTime 和 endTime 之间（如果设置了的话）
  const message = await MongoSystemMessageModel.findOne({
    isActive: true,
    $or: [
      { startTime: { $exists: false } },
      { startTime: null },
      { startTime: { $lte: now } }
    ],
    $and: [
      {
        $or: [
          { endTime: { $exists: false } },
          { endTime: null },
          { endTime: { $gte: now } }
        ]
      }
    ]
  })
    .sort({ priority: -1, createTime: -1 })
    .lean();

  if (!message) {
    return {
      hasMessage: false
    };
  }

  return {
    hasMessage: true,
    message: {
      _id: String(message._id),
      title: message.title,
      content: message.content,
      priority: message.priority as 'normal' | 'important' | 'urgent',
      buttons: message.buttons
    }
  };
}

export default NextAPI(handler);

/**
 * 获取应用日志总体数据
 *
 * GET /api/core/app/logs/getTotalData
 */
import type { NextApiResponse } from 'next';
import { Types } from 'mongoose';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import type { getTotalDataQuery, getTotalDataResponse } from '@fastgpt/global/core/app/logs/api';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoAppChatLogModel } from '@fastgpt/service/core/app/logs/schema';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps<unknown, getTotalDataQuery>,
  _res: NextApiResponse
): Promise<getTotalDataResponse> {
  const { appId } = req.query;

  if (!appId) {
    throw new Error('缺少应用 ID');
  }

  const teamId = getTeamIdFromReq(req);

  // 从 AppChatLog 集合聚合统计数据
  const pipeline = [
    {
      $match: {
        appId: new Types.ObjectId(appId),
        teamId: new Types.ObjectId(teamId)
      }
    },
    {
      $group: {
        _id: null,
        // 统计唯一用户数
        totalUsers: { $addToSet: '$userId' },
        // 统计总对话数（每条记录是一个会话）
        totalChats: { $sum: 1 },
        // 统计总积分
        totalPoints: { $sum: '$totalPoints' }
      }
    },
    {
      $project: {
        _id: 0,
        totalUsers: { $size: '$totalUsers' },
        totalChats: 1,
        totalPoints: 1
      }
    }
  ];

  const result = await MongoAppChatLogModel.aggregate(pipeline);
  const stats = result[0];

  if (!stats) {
    return {
      totalUsers: 0,
      totalChats: 0,
      totalPoints: 0
    };
  }

  return {
    totalUsers: stats.totalUsers || 0,
    totalChats: stats.totalChats || 0,
    totalPoints: Math.round((stats.totalPoints || 0) * 100) / 100
  };
}

export default NextAPI(handler);

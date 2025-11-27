/**
 * 获取应用图表数据
 *
 * POST /api/core/app/logs/getChartData
 */
import type { NextApiResponse } from 'next';
import { Types } from 'mongoose';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import type {
  getChartDataBody,
  getChartDataResponse,
  AppLogTimespanEnum,
  AppChatLogUserData,
  AppChatLogChatData,
  AppChatLogAppData
} from '@fastgpt/global/core/app/logs/api';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoAppChatLogModel } from '@fastgpt/service/core/app/logs/schema';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 获取时间分组表达式
function getTimeGroupExpression(timespan: AppLogTimespanEnum) {
  switch (timespan) {
    case 'day':
      return {
        year: { $year: '$updateTime' },
        month: { $month: '$updateTime' },
        day: { $dayOfMonth: '$updateTime' }
      };
    case 'week':
      return {
        year: { $year: '$updateTime' },
        week: { $isoWeek: '$updateTime' }
      };
    case 'month':
      return {
        year: { $year: '$updateTime' },
        month: { $month: '$updateTime' }
      };
    case 'quarter':
      return {
        year: { $year: '$updateTime' },
        quarter: { $ceil: { $divide: [{ $month: '$updateTime' }, 3] } }
      };
    default:
      return {
        year: { $year: '$updateTime' },
        month: { $month: '$updateTime' },
        day: { $dayOfMonth: '$updateTime' }
      };
  }
}

// 将分组结果转换为时间戳
function groupToTimestamp(group: Record<string, number>, timespan: AppLogTimespanEnum): number {
  const { year, month, day, week, quarter } = group;

  switch (timespan) {
    case 'day':
      return new Date(year, month - 1, day).getTime();
    case 'week': {
      // ISO 周转换为日期
      const jan4 = new Date(year, 0, 4);
      const dayOfWeek = jan4.getDay() || 7;
      const firstMonday = new Date(jan4);
      firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
      const weekDate = new Date(firstMonday);
      weekDate.setDate(firstMonday.getDate() + (week - 1) * 7);
      return weekDate.getTime();
    }
    case 'month':
      return new Date(year, month - 1, 1).getTime();
    case 'quarter':
      return new Date(year, (quarter - 1) * 3, 1).getTime();
    default:
      return new Date(year, month - 1, day || 1).getTime();
  }
}

async function handler(
  req: ApiRequestProps<getChartDataBody>,
  _res: NextApiResponse
): Promise<getChartDataResponse> {
  const {
    appId,
    dateStart,
    dateEnd,
    source,
    offset,
    userTimespan,
    chatTimespan,
    appTimespan
  } = req.body;

  if (!appId) {
    throw new Error('缺少应用 ID');
  }

  const teamId = getTeamIdFromReq(req);
  const teamIdObj = new Types.ObjectId(teamId);
  const appIdObj = new Types.ObjectId(appId);

  // 构建基础匹配条件
  const baseMatch: Record<string, unknown> = {
    teamId: teamIdObj,
    appId: appIdObj,
    updateTime: {
      $gte: new Date(dateStart),
      $lte: new Date(dateEnd)
    }
  };

  // 添加来源过滤
  if (source && source.length > 0) {
    baseMatch.source = { $in: source };
  }

  // 计算用户留存的偏移日期
  const offsetDays = offset || 1;
  const retentionDateStart = new Date(dateStart);
  retentionDateStart.setDate(retentionDateStart.getDate() - offsetDays);

  // 用户数据聚合
  const userDataPipeline = [
    { $match: baseMatch },
    {
      $group: {
        _id: getTimeGroupExpression(userTimespan as AppLogTimespanEnum),
        users: { $addToSet: '$userId' },
        newUsers: {
          $addToSet: {
            $cond: [{ $eq: ['$isFirstChat', true] }, '$userId', null]
          }
        },
        points: { $sum: '$totalPoints' },
        // 按来源统计
        sourceData: { $push: '$source' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1, '_id.quarter': 1 } }
  ];

  // 对话数据聚合
  const chatDataPipeline = [
    { $match: baseMatch },
    {
      $group: {
        _id: getTimeGroupExpression(chatTimespan as AppLogTimespanEnum),
        chatItemCount: { $sum: '$chatItemCount' },
        chatCount: { $sum: 1 },
        errorCount: { $sum: '$errorCount' },
        points: { $sum: '$totalPoints' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1, '_id.quarter': 1 } }
  ];

  // 应用数据聚合
  const appDataPipeline = [
    { $match: baseMatch },
    {
      $group: {
        _id: getTimeGroupExpression(appTimespan as AppLogTimespanEnum),
        goodFeedBackCount: { $sum: '$goodFeedbackCount' },
        badFeedBackCount: { $sum: '$badFeedbackCount' },
        chatCount: { $sum: 1 },
        totalResponseTime: { $sum: '$totalResponseTime' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1, '_id.quarter': 1 } }
  ];

  // 并行执行聚合
  const [userResult, chatResult, appResult] = await Promise.all([
    MongoAppChatLogModel.aggregate(userDataPipeline),
    MongoAppChatLogModel.aggregate(chatDataPipeline),
    MongoAppChatLogModel.aggregate(appDataPipeline)
  ]);

  // 转换用户数据
  const userData: AppChatLogUserData = userResult.map((item) => {
    const users = (item.users || []).filter(Boolean);
    const newUsers = (item.newUsers || []).filter(Boolean);

    // 统计来源分布
    const sourceCountMap: Record<string, number> = {};
    (item.sourceData || []).forEach((s: string) => {
      sourceCountMap[s] = (sourceCountMap[s] || 0) + 1;
    });

    return {
      timestamp: groupToTimestamp(item._id, userTimespan as AppLogTimespanEnum),
      summary: {
        userCount: users.length,
        newUserCount: newUsers.length,
        retentionUserCount: Math.max(0, users.length - newUsers.length),
        points: item.points || 0,
        sourceCountMap
      }
    };
  });

  // 转换对话数据
  const chatData: AppChatLogChatData = chatResult.map((item) => ({
    timestamp: groupToTimestamp(item._id, chatTimespan as AppLogTimespanEnum),
    summary: {
      chatItemCount: item.chatItemCount || 0,
      chatCount: item.chatCount || 0,
      errorCount: item.errorCount || 0,
      points: item.points || 0
    }
  }));

  // 转换应用数据
  const appData: AppChatLogAppData = appResult.map((item) => ({
    timestamp: groupToTimestamp(item._id, appTimespan as AppLogTimespanEnum),
    summary: {
      goodFeedBackCount: item.goodFeedBackCount || 0,
      badFeedBackCount: item.badFeedBackCount || 0,
      chatCount: item.chatCount || 0,
      totalResponseTime: item.totalResponseTime || 0
    }
  }));

  return {
    userData,
    chatData,
    appData
  };
}

export default NextAPI(handler);

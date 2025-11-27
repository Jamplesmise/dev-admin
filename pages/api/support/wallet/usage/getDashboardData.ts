/**
 * 获取 Dashboard 数据
 * 对应前端 "仪表盘" 页面
 *
 * POST /api/support/wallet/usage/getDashboardData
 *
 * 前端参数格式 (GetUsageDashboardProps):
 * {
 *   dateStart: string,
 *   dateEnd: string,
 *   sources?: string[],
 *   teamMemberIds?: string[],
 *   projectName?: string,
 *   unit: 'day' | 'month'
 * }
 *
 * 返回格式 (GetUsageDashboardResponseItem[]):
 * [
 *   { date: Date, totalPoints: number },
 *   ...
 * ]
 */

import type { NextApiResponse } from 'next';
import { Types } from 'mongoose';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoUsageModel } from '@fastgpt/service/support_wallet/usage/schema';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type GetDashboardDataRequest = {
  dateStart: string;
  dateEnd: string;
  sources?: string[];
  teamMemberIds?: string[];
  projectName?: string;
  unit: 'day' | 'month';
};

// 返回类型 (匹配官方 GetUsageDashboardResponseItem)
type GetUsageDashboardResponseItem = {
  date: Date;
  totalPoints: number;
};

async function handler(
  req: ApiRequestProps<GetDashboardDataRequest>,
  _res: NextApiResponse
): Promise<GetUsageDashboardResponseItem[]> {
  const teamId = getTeamIdFromReq(req);
  const { dateStart, dateEnd, sources, teamMemberIds, projectName, unit = 'day' } = req.body;

  if (!dateStart || !dateEnd) {
    throw new Error('开始时间和结束时间不能为空');
  }

  const start = new Date(dateStart);
  const end = new Date(dateEnd);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('无效的时间格式');
  }

  // 设置结束时间为当天结束
  end.setHours(23, 59, 59, 999);

  // 构建查询条件
  const matchQuery: Record<string, unknown> = {
    teamId: new Types.ObjectId(teamId),
    time: { $gte: start, $lte: end }
  };

  // 成员筛选 (数组)
  if (teamMemberIds && teamMemberIds.length > 0) {
    matchQuery.tmbId = { $in: teamMemberIds.map((id) => new Types.ObjectId(id)) };
  }

  // 来源筛选 (数组)
  if (sources && sources.length > 0) {
    matchQuery.source = { $in: sources };
  }

  // 项目名筛选
  if (projectName) {
    matchQuery.appName = { $regex: projectName, $options: 'i' };
  }

  // 根据 unit 设置日期格式
  const dateFormat = unit === 'month' ? '%Y-%m-01' : '%Y-%m-%d';

  // 聚合查询
  const trendStats = await MongoUsageModel.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$time' } },
        totalPoints: { $sum: '$totalPoints' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // 格式化返回数据
  const result: GetUsageDashboardResponseItem[] = trendStats.map(
    (item: { _id: string; totalPoints: number }) => ({
      date: new Date(item._id),
      totalPoints: item.totalPoints
    })
  );

  return result;
}

export default NextAPI(handler);

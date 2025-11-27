/**
 * 获取用量统计列表
 * 对应前端 "使用详情" 页面
 *
 * POST /api/support/wallet/usage/getUsage
 *
 * 前端参数格式 (PaginationProps<GetUsageProps>):
 * {
 *   pageNum: number,
 *   pageSize: number,
 *   data: {
 *     dateStart: string,
 *     dateEnd: string,
 *     sources?: string[],
 *     teamMemberIds?: string[],
 *     projectName?: string
 *   }
 * }
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
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support_user_team/constant';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 前端请求参数类型
type GetUsageRequest = {
  // 分页参数 (可能在外层或内层)
  pageNum?: number;
  pageSize?: number;
  current?: number; // 兼容 current
  // 查询参数 (可能在 data 内或外层)
  data?: {
    dateStart: string;
    dateEnd: string;
    sources?: string[];
    teamMemberIds?: string[];
    projectName?: string;
  };
  // 兼容直接传参
  dateStart?: string;
  dateEnd?: string;
  sources?: string[];
  teamMemberIds?: string[];
  projectName?: string;
};

// SourceMemberType - 来源成员信息
type SourceMemberType = {
  name: string;
  avatar: string;
  status: `${TeamMemberStatusEnum}`;
};

// UsageItemType - 用量详情项
type UsageItemType = {
  moduleName: string;
  model?: string;
  amount: number;
  inputTokens?: number;
  outputTokens?: number;
  charsLength?: number;
  duration?: number;
};

// 返回数据项类型 (匹配官方 UsageListItemType)
type UsageListItemType = {
  id: string;
  time: Date;
  appName: string;
  source: string;
  totalPoints: number;
  list: UsageItemType[];
  sourceMember: SourceMemberType;
};

// 返回类型 (PaginationResponse)
type GetUsageResponse = {
  list: UsageListItemType[];
  total: number;
};

// 最大查询范围：90天
const MAX_QUERY_DAYS = 90;

async function handler(
  req: ApiRequestProps<GetUsageRequest>,
  _res: NextApiResponse
): Promise<GetUsageResponse> {
  const teamId = getTeamIdFromReq(req);

  // 调试日志
  console.log('[getUsage] req.body:', JSON.stringify(req.body, null, 2));
  console.log('[getUsage] teamId:', teamId);

  // 兼容两种传参方式
  const params = req.body.data || req.body;
  const { dateStart, dateEnd, sources, teamMemberIds, projectName } = params;
  const pageNum = req.body.pageNum || req.body.current || 1;
  const pageSize = req.body.pageSize || 20;

  console.log('[getUsage] parsed params:', { dateStart, dateEnd, sources, teamMemberIds, projectName, pageNum, pageSize });

  // 参数校验
  if (!dateStart || !dateEnd) {
    throw new Error('请提供时间范围');
  }

  const start = new Date(dateStart);
  const end = new Date(dateEnd);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('无效的时间格式');
  }

  // 检查时间范围
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > MAX_QUERY_DAYS) {
    throw new Error(`查询范围不能超过 ${MAX_QUERY_DAYS} 天`);
  }

  // 设置结束时间为当天结束
  end.setHours(23, 59, 59, 999);

  // 构建查询条件
  const query: Record<string, unknown> = {
    teamId: new Types.ObjectId(teamId),
    time: { $gte: start, $lte: end }
  };

  console.log('[getUsage] query:', JSON.stringify(query, null, 2));

  // 成员筛选 (数组)
  if (teamMemberIds && teamMemberIds.length > 0) {
    query.tmbId = { $in: teamMemberIds.map((id) => new Types.ObjectId(id)) };
  }

  // 来源筛选 (数组)
  if (sources && sources.length > 0) {
    query.source = { $in: sources };
  }

  // 项目名筛选
  if (projectName) {
    query.appName = { $regex: projectName, $options: 'i' };
  }

  // 查询总数
  const total = await MongoUsageModel.countDocuments(query);

  // 分页查询
  const usages = await MongoUsageModel.find(query)
    .sort({ time: -1 })
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    .lean();

  // 获取成员信息 (包含 name, avatar, status)
  const tmbIds = [...new Set(usages.map((u) => String(u.tmbId)))];
  const members =
    tmbIds.length > 0
      ? await MongoTeamMemberModel.find({
          _id: { $in: tmbIds.map((id) => new Types.ObjectId(id)) }
        })
          .select('_id name avatar status')
          .lean()
      : [];

  // 构建成员信息 Map
  const memberMap = new Map<string, SourceMemberType>(
    members.map((m) => [
      String(m._id),
      {
        name: m.name || '未知成员',
        avatar: m.avatar || '',
        status: (m.status as `${TeamMemberStatusEnum}`) || TeamMemberStatusEnum.active
      }
    ])
  );

  // 默认成员信息 (用于找不到成员的情况)
  const defaultMember: SourceMemberType = {
    name: '未知成员',
    avatar: '',
    status: TeamMemberStatusEnum.active
  };

  // 格式化返回数据 (匹配官方 UsageListItemType)
  const list: UsageListItemType[] = usages.map((usage) => ({
    id: String(usage._id),
    time: usage.time,
    appName: usage.appName || '-',
    source: usage.source,
    totalPoints: usage.totalPoints,
    list: (usage.list || []).map((item) => ({
      moduleName: item.moduleName || '',
      model: item.model,
      amount: item.amount || 0,
      inputTokens: item.inputTokens,
      outputTokens: item.outputTokens
    })),
    sourceMember: memberMap.get(String(usage.tmbId)) || defaultMember
  }));

  return {
    list,
    total
  };
}

export default NextAPI(handler);

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type ChatHomeDataType = {
  // 最近聊天记录
  recentChats: Array<{
    chatId: string;
    appId: string;
    appName: string;
    appAvatar?: string;
    title: string;
    latestMessage: string;
    updateTime: Date;
  }>;
  // 常用应用
  frequentApps: Array<{
    appId: string;
    appName: string;
    appAvatar?: string;
    usageCount: number;
  }>;
  // 团队统计
  teamStats: {
    totalChats: number;
    totalMessages: number;
    activeApps: number;
  };
};

/**
 * 获取聊天主页数据
 * 包含最近聊天、常用应用、团队统计等
 * TODO: 实现主页数据聚合
 */
async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<ChatHomeDataType> {
  const teamId = getTeamIdFromReq(req);
  const { tmbId } = req.auth;

  // TODO: 实现主页数据聚合
  // 1. 查询用户最近的聊天记录（Top 10）
  // 2. 统计用户常用的应用（按使用次数排序）
  // 3. 统计团队整体数据
  // 4. 可选：添加今日/本周趋势

  // 临时返回空数据
  return {
    recentChats: [],
    frequentApps: [],
    teamStats: {
      totalChats: 0,
      totalMessages: 0,
      activeApps: 0
    }
  };
}

export default NextAPI(handler);

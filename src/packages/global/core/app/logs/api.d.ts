import type { ChatSourceEnum } from '../../chat/constants';

export enum AppLogTimespanEnum {
  day = 'day',
  week = 'week',
  month = 'month',
  quarter = 'quarter'
}

// getChartData 请求体
export type getChartDataBody = {
  appId: string;
  dateStart: Date;
  dateEnd: Date;
  source?: ChatSourceEnum[];
  offset: number;
  userTimespan: AppLogTimespanEnum;
  chatTimespan: AppLogTimespanEnum;
  appTimespan: AppLogTimespanEnum;
};

// 用户数据类型
export type AppChatLogUserData = {
  timestamp: number;
  summary: {
    userCount: number;
    newUserCount: number;
    retentionUserCount: number;
    points: number;
    sourceCountMap: Record<string, number>;
  };
}[];

// 对话数据类型
export type AppChatLogChatData = {
  timestamp: number;
  summary: {
    chatItemCount: number;
    chatCount: number;
    errorCount: number;
    points: number;
  };
}[];

// 应用数据类型
export type AppChatLogAppData = {
  timestamp: number;
  summary: {
    goodFeedBackCount: number;
    badFeedBackCount: number;
    chatCount: number;
    totalResponseTime: number;
  };
}[];

// getChartData 响应
export type getChartDataResponse = {
  userData: AppChatLogUserData;
  chatData: AppChatLogChatData;
  appData: AppChatLogAppData;
};

// getTotalData 请求参数
export type getTotalDataQuery = {
  appId: string;
};

// getTotalData 响应
export type getTotalDataResponse = {
  totalUsers: number;
  totalChats: number;
  totalPoints: number;
};

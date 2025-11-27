import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type TeamAppItemType = {
  _id: string;
  name: string;
  avatar?: string;
  intro?: string;
  type: string; // 'simple' | 'workflow'
  permission: {
    hasReadPermission: boolean;
    hasWritePermission: boolean;
    hasManagePermission: boolean;
  };
  // 统计信息
  stats?: {
    chatCount: number; // 对话次数
    messageCount: number; // 消息数
    lastUseTime?: Date; // 最后使用时间
  };
};

type GetTeamAppsQuery = {
  searchKey?: string;
  type?: string; // 应用类型过滤
  sortBy?: 'name' | 'lastUse' | 'chatCount'; // 排序方式
};

/**
 * 获取团队应用列表
 * 用于聊天时选择应用
 * TODO: 实现应用列表查询
 */
async function handler(
  req: ApiRequestProps<unknown, GetTeamAppsQuery>,
  _res: NextApiResponse
): Promise<TeamAppItemType[]> {
  const teamId = getTeamIdFromReq(req);
  const { tmbId, permission } = req.auth;
  const { searchKey, type, sortBy = 'lastUse' } = req.query;

  // TODO: 实现应用列表查询
  // 1. 查询用户有权限访问的应用
  //    - 自己创建的应用
  //    - 作为协作者的应用
  //    - 团队公开的应用
  // 2. 应用搜索和类型过滤
  // 3. 加载应用使用统计
  // 4. 按指定方式排序
  // 5. 返回应用列表（含权限信息）

  // 临时返回空列表
  return [];
}

export default NextAPI(handler);

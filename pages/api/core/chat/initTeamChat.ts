/**
 * 初始化团队聊天
 *
 * POST /api/core/chat/initTeamChat
 *
 * 创建新对话或恢复已有对话
 */

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoChatModel, ChatStatusEnum } from '@fastgpt/service/core/chat/schema';
import { nanoid } from 'nanoid';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type InitTeamChatRequest = {
  appId: string;
  chatId?: string;
  variables?: Record<string, unknown>;
};

type ChatHistoryItem = {
  role: 'user' | 'ai';
  content: string;
  createTime: Date;
};

type InitTeamChatResponse = {
  chatId: string;
  appId: string;
  app: {
    name: string;
    avatar: string;
    intro?: string;
  };
  history?: ChatHistoryItem[];
};

async function handler(
  req: ApiRequestProps<InitTeamChatRequest>,
  _res: NextApiResponse
): Promise<InitTeamChatResponse> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);
  const { appId, chatId, variables } = req.body;

  // 参数校验
  if (!appId) {
    throw new Error('appId 不能为空');
  }

  // TODO: 验证用户对应用的访问权限
  // const app = await MongoAppModel.findOne({ _id: appId, teamId });
  // if (!app) {
  //   throw new Error('应用不存在或无权限访问');
  // }

  // 如果提供了 chatId，尝试恢复对话
  if (chatId) {
    const existingChat = await MongoChatModel.findOne({
      chatId,
      appId,
      teamId
    });

    if (!existingChat) {
      throw new Error('对话不存在');
    }

    // TODO: 查询历史消息
    // const messages = await MongoChatItemModel.find({ chatId }).sort({ createTime: 1 });

    return {
      chatId: existingChat.chatId,
      appId: String(existingChat.appId),
      app: {
        name: `App_${String(appId).slice(-4)}`, // 简化：后续关联查询应用信息
        avatar: '',
        intro: ''
      },
      history: [] // 简化：暂不返回历史消息
    };
  }

  // 创建新对话
  const newChatId = nanoid();

  await MongoChatModel.create({
    chatId: newChatId,
    appId,
    teamId,
    tmbId,
    source: 'api',
    title: '新对话',
    messageCount: 0,
    totalTokens: 0,
    status: ChatStatusEnum.running
  });

  return {
    chatId: newChatId,
    appId,
    app: {
      name: `App_${String(appId).slice(-4)}`,
      avatar: '',
      intro: ''
    }
  };
}

export default NextAPI(handler);

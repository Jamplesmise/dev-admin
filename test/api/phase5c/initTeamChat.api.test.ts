/**
 * Phase 5C - 团队聊天初始化 API 测试
 *
 * 测试范围:
 * - POST /api/core/chat/initTeamChat
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { connectTestDB, disconnectTestDB } from '../../utils/db';
import { callApi, expectSuccess, expectError } from '../../utils/apiTestHelper';
import initTeamChatHandler from '../../../pages/api/core/chat/initTeamChat';
import { MongoChatModel, ChatStatusEnum } from '@fastgpt/service/core/chat/schema';

describe('Phase 5C - 团队聊天初始化 API', () => {
  const testTeamId = '507f1f77bcf86cd799439012';
  const testTmbId = '507f1f77bcf86cd799439013';
  const testUserId = '507f1f77bcf86cd799439011';
  const testAppId = '507f1f77bcf86cd799439030';

  const defaultAuth = {
    userId: testUserId,
    teamId: testTeamId,
    tmbId: testTmbId
  };

  // 数据库连接
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  // 清理测试数据
  beforeEach(async () => {
    await MongoChatModel.deleteMany({ teamId: testTeamId });
  });

  afterEach(async () => {
    await MongoChatModel.deleteMany({ teamId: testTeamId });
  });

  describe('POST /api/core/chat/initTeamChat', () => {
    describe('参数验证', () => {
      it('缺少 appId 应返回错误', async () => {
        const res = await callApi(initTeamChatHandler, {
          method: 'POST',
          auth: defaultAuth,
          body: {}
        });

        expectError(res, 500);
      });
    });

    describe('创建新对话', () => {
      it('应成功创建新对话', async () => {
        const res = await callApi(initTeamChatHandler, {
          method: 'POST',
          auth: defaultAuth,
          body: { appId: testAppId }
        });

        const data = expectSuccess(res);
        expect(data.chatId).toBeDefined();
        expect(data.appId).toBe(testAppId);
      });

      it('应返回应用信息', async () => {
        const res = await callApi(initTeamChatHandler, {
          method: 'POST',
          auth: defaultAuth,
          body: { appId: testAppId }
        });

        const data = expectSuccess(res);
        expect(data.app).toBeDefined();
        expect(data.app.name).toBeDefined();
      });

      it('应在数据库创建聊天记录', async () => {
        const res = await callApi(initTeamChatHandler, {
          method: 'POST',
          auth: defaultAuth,
          body: { appId: testAppId }
        });

        const data = expectSuccess(res);

        // 验证数据库记录
        const chat = await MongoChatModel.findOne({ chatId: data.chatId });
        expect(chat).not.toBeNull();
        expect(chat?.teamId.toString()).toBe(testTeamId);
        expect(chat?.appId.toString()).toBe(testAppId);
      });
    });

    describe('恢复对话', () => {
      let existingChatId: string;

      beforeEach(async () => {
        // 创建一个已存在的对话
        const chat = await MongoChatModel.create({
          chatId: 'existing-chat-123',
          appId: testAppId,
          teamId: testTeamId,
          tmbId: testTmbId,
          source: 'api',
          title: '已存在的对话',
          messageCount: 5,
          totalTokens: 1000,
          status: ChatStatusEnum.running
        });
        existingChatId = chat.chatId;
      });

      it('应恢复现有对话', async () => {
        const res = await callApi(initTeamChatHandler, {
          method: 'POST',
          auth: defaultAuth,
          body: {
            appId: testAppId,
            chatId: existingChatId
          }
        });

        const data = expectSuccess(res);
        expect(data.chatId).toBe(existingChatId);
      });

      it('不存在的对话应返回错误', async () => {
        const res = await callApi(initTeamChatHandler, {
          method: 'POST',
          auth: defaultAuth,
          body: {
            appId: testAppId,
            chatId: 'non-existent-chat-id'
          }
        });

        expectError(res, 500);
      });

      it('appId 不匹配应返回错误', async () => {
        const res = await callApi(initTeamChatHandler, {
          method: 'POST',
          auth: defaultAuth,
          body: {
            appId: '507f1f77bcf86cd799439099', // 不同的 appId
            chatId: existingChatId
          }
        });

        expectError(res, 500);
      });
    });

    describe('多次调用', () => {
      it('多次创建应生成不同的 chatId', async () => {
        const res1 = await callApi(initTeamChatHandler, {
          method: 'POST',
          auth: defaultAuth,
          body: { appId: testAppId }
        });

        const res2 = await callApi(initTeamChatHandler, {
          method: 'POST',
          auth: defaultAuth,
          body: { appId: testAppId }
        });

        const data1 = expectSuccess(res1);
        const data2 = expectSuccess(res2);

        expect(data1.chatId).not.toBe(data2.chatId);
      });
    });
  });
});

/**
 * Phase 5C - 用量统计 API 测试
 *
 * 测试范围:
 * - POST /api/support/wallet/usage/getUsage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { connectTestDB, disconnectTestDB } from '../../utils/db';
import { callApi, expectSuccess, expectError } from '../../utils/apiTestHelper';
import getUsageHandler from '../../../pages/api/support/wallet/usage/getUsage';
import { MongoChatModel, ChatStatusEnum } from '@fastgpt/service/core/chat/schema';

describe('Phase 5C - 用量统计 API', () => {
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

  describe('POST /api/support/wallet/usage/getUsage', () => {
    beforeEach(async () => {
      // 创建测试聊天记录
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      await MongoChatModel.insertMany([
        {
          chatId: 'chat-1',
          appId: testAppId,
          teamId: testTeamId,
          tmbId: testTmbId,
          source: 'api',
          title: '对话 1',
          messageCount: 5,
          totalTokens: 1000,
          status: ChatStatusEnum.finish,
          createTime: now
        },
        {
          chatId: 'chat-2',
          appId: testAppId,
          teamId: testTeamId,
          tmbId: testTmbId,
          source: 'api',
          title: '对话 2',
          messageCount: 3,
          totalTokens: 1500,
          status: ChatStatusEnum.finish,
          createTime: yesterday
        },
        {
          chatId: 'chat-3',
          appId: testAppId,
          teamId: testTeamId,
          tmbId: testTmbId,
          source: 'api',
          title: '对话 3',
          messageCount: 10,
          totalTokens: 2000,
          status: ChatStatusEnum.finish,
          createTime: twoDaysAgo
        }
      ]);
    });

    it('应返回正确的统计总计', async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const res = await callApi(getUsageHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          startTime: threeDaysAgo.toISOString().split('T')[0],
          endTime: now.toISOString().split('T')[0]
        }
      });

      const data = expectSuccess(res);
      expect(data.totalTokens).toBe(4500);
      expect(data.totalRequests).toBe(3);
    });

    it('应返回时间线数据', async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const res = await callApi(getUsageHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          startTime: threeDaysAgo.toISOString().split('T')[0],
          endTime: now.toISOString().split('T')[0],
          groupBy: 'day'
        }
      });

      const data = expectSuccess(res);
      expect(data.timeline).toBeDefined();
      expect(Array.isArray(data.timeline)).toBe(true);
    });

    it('应返回按应用分组', async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const res = await callApi(getUsageHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          startTime: threeDaysAgo.toISOString().split('T')[0],
          endTime: now.toISOString().split('T')[0]
        }
      });

      const data = expectSuccess(res);
      expect(data.byApp).toBeDefined();
      expect(Array.isArray(data.byApp)).toBe(true);
    });

    it('缺少时间范围应返回错误', async () => {
      const res = await callApi(getUsageHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {}
      });

      expectError(res, 500);
    });

    it('时间范围过大应返回错误', async () => {
      const res = await callApi(getUsageHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          startTime: '2025-01-01',
          endTime: '2025-12-31'
        }
      });

      expectError(res, 500);
    });

    it('无效的时间格式应返回错误', async () => {
      const res = await callApi(getUsageHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          startTime: 'invalid-date',
          endTime: '2025-11-25'
        }
      });

      expectError(res, 500);
    });

    it('无数据时应返回零值', async () => {
      // 清空数据
      await MongoChatModel.deleteMany({ teamId: testTeamId });

      const res = await callApi(getUsageHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {
          startTime: '2025-11-20',
          endTime: '2025-11-25'
        }
      });

      const data = expectSuccess(res);
      expect(data.totalTokens).toBe(0);
      expect(data.totalRequests).toBe(0);
    });
  });
});

/**
 * Phase 5C - 用户通知 API 测试
 *
 * 测试范围:
 * - POST /api/support/user/inform/list
 * - GET /api/support/user/inform/countUnread
 * - GET /api/support/user/inform/read
 * - GET /api/support/user/inform/getSystemMsgModal
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { connectTestDB, disconnectTestDB } from '../../utils/db';
import { callApi, expectSuccess, expectError } from '../../utils/apiTestHelper';
import listHandler from '../../../pages/api/support/user/inform/list';
import countUnreadHandler from '../../../pages/api/support/user/inform/countUnread';
import readHandler from '../../../pages/api/support/user/inform/read';
import getSystemMsgModalHandler from '../../../pages/api/support/user/inform/getSystemMsgModal';
import {
  MongoUserInformModel,
  InformTypeEnum
} from '@fastgpt/service/support_user/inform/schema';
import { MongoSystemMessageModel } from '@fastgpt/service/support/systemMessage/schema';

describe('Phase 5C - 用户通知 API', () => {
  const testUserId = '507f1f77bcf86cd799439011';
  const testTeamId = '507f1f77bcf86cd799439012';
  const testTmbId = '507f1f77bcf86cd799439013';
  const otherUserId = '507f1f77bcf86cd799439099';

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
    await MongoUserInformModel.deleteMany({ userId: testUserId });
    await MongoUserInformModel.deleteMany({ userId: otherUserId });
    await MongoSystemMessageModel.deleteMany({});
  });

  afterEach(async () => {
    await MongoUserInformModel.deleteMany({ userId: testUserId });
    await MongoUserInformModel.deleteMany({ userId: otherUserId });
    await MongoSystemMessageModel.deleteMany({});
  });

  describe('POST /api/support/user/inform/list', () => {
    beforeEach(async () => {
      // 创建测试通知
      await MongoUserInformModel.insertMany([
        {
          userId: testUserId,
          type: InformTypeEnum.system,
          title: '系统通知 1',
          content: '这是系统通知内容 1',
          isRead: false
        },
        {
          userId: testUserId,
          type: InformTypeEnum.system,
          title: '系统通知 2',
          content: '这是系统通知内容 2',
          isRead: true
        },
        {
          userId: testUserId,
          type: InformTypeEnum.team,
          title: '团队通知 1',
          content: '这是团队通知内容',
          isRead: false
        },
        {
          userId: testUserId,
          type: InformTypeEnum.billing,
          title: '账单通知 1',
          content: '这是账单通知内容',
          isRead: false
        }
      ]);
    });

    it('应返回通知列表', async () => {
      const res = await callApi(listHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {}
      });

      const data = expectSuccess(res);
      expect(data.total).toBe(4);
      expect(data.list.length).toBe(4);
    });

    it('应按时间倒序排列', async () => {
      const res = await callApi(listHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: {}
      });

      const data = expectSuccess(res);
      const list = data.list;

      for (let i = 1; i < list.length; i++) {
        expect(new Date(list[i - 1].createTime).getTime()).toBeGreaterThanOrEqual(
          new Date(list[i].createTime).getTime()
        );
      }
    });

    it('应按类型筛选', async () => {
      const res = await callApi(listHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: { type: 'system' }
      });

      const data = expectSuccess(res);
      expect(data.total).toBe(2);
      data.list.forEach((item: { type: string }) => {
        expect(item.type).toBe('system');
      });
    });

    it('应筛选未读通知', async () => {
      const res = await callApi(listHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: { status: 'unread' }
      });

      const data = expectSuccess(res);
      expect(data.total).toBe(3);
      data.list.forEach((item: { isRead: boolean }) => {
        expect(item.isRead).toBe(false);
      });
    });

    it('应筛选已读通知', async () => {
      const res = await callApi(listHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: { status: 'read' }
      });

      const data = expectSuccess(res);
      expect(data.total).toBe(1);
    });

    it('应正确分页', async () => {
      const res = await callApi(listHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: { offset: 0, limit: 2 }
      });

      const data = expectSuccess(res);
      expect(data.list.length).toBe(2);
      expect(data.total).toBe(4);
    });

    it('offset 超出范围应返回空列表', async () => {
      const res = await callApi(listHandler, {
        method: 'POST',
        auth: defaultAuth,
        body: { offset: 100, limit: 10 }
      });

      const data = expectSuccess(res);
      expect(data.list.length).toBe(0);
    });
  });

  describe('GET /api/support/user/inform/countUnread', () => {
    beforeEach(async () => {
      await MongoUserInformModel.insertMany([
        {
          userId: testUserId,
          type: InformTypeEnum.system,
          title: '系统通知',
          content: '内容',
          isRead: false
        },
        {
          userId: testUserId,
          type: InformTypeEnum.system,
          title: '系统通知 2',
          content: '内容',
          isRead: false
        },
        {
          userId: testUserId,
          type: InformTypeEnum.team,
          title: '团队通知',
          content: '内容',
          isRead: false
        },
        {
          userId: testUserId,
          type: InformTypeEnum.billing,
          title: '账单通知',
          content: '内容',
          isRead: true
        }
      ]);
    });

    it('应返回正确的总数', async () => {
      const res = await callApi(countUnreadHandler, {
        method: 'GET',
        auth: defaultAuth
      });

      const data = expectSuccess(res);
      expect(data.total).toBe(3);
    });

    it('应返回分类计数', async () => {
      const res = await callApi(countUnreadHandler, {
        method: 'GET',
        auth: defaultAuth
      });

      const data = expectSuccess(res);
      expect(data.byType.system).toBe(2);
      expect(data.byType.team).toBe(1);
      expect(data.byType.billing).toBe(0);
    });

    it('全部已读时应返回 0', async () => {
      await MongoUserInformModel.updateMany({ userId: testUserId }, { $set: { isRead: true } });

      const res = await callApi(countUnreadHandler, {
        method: 'GET',
        auth: defaultAuth
      });

      const data = expectSuccess(res);
      expect(data.total).toBe(0);
    });
  });

  describe('GET /api/support/user/inform/read', () => {
    let informId: string;

    beforeEach(async () => {
      const informs = await MongoUserInformModel.insertMany([
        {
          userId: testUserId,
          type: InformTypeEnum.system,
          title: '通知 1',
          content: '内容',
          isRead: false
        },
        {
          userId: testUserId,
          type: InformTypeEnum.team,
          title: '通知 2',
          content: '内容',
          isRead: false
        }
      ]);
      informId = informs[0]._id.toString();
    });

    it('应成功标记单个通知', async () => {
      const res = await callApi(readHandler, {
        method: 'GET',
        auth: defaultAuth,
        query: { informId }
      });

      const data = expectSuccess(res);
      expect(data.success).toBe(true);

      // 验证已标记
      const countRes = await callApi(countUnreadHandler, {
        method: 'GET',
        auth: defaultAuth
      });
      const countData = expectSuccess(countRes);
      expect(countData.total).toBe(1);
    });

    it('应成功标记全部已读', async () => {
      const res = await callApi(readHandler, {
        method: 'GET',
        auth: defaultAuth,
        query: { all: 'true' }
      });

      const data = expectSuccess(res);
      expect(data.success).toBe(true);

      const countRes = await callApi(countUnreadHandler, {
        method: 'GET',
        auth: defaultAuth
      });
      const countData = expectSuccess(countRes);
      expect(countData.total).toBe(0);
    });

    it('不能标记其他用户的通知', async () => {
      const otherInform = await MongoUserInformModel.create({
        userId: otherUserId,
        type: InformTypeEnum.system,
        title: '其他用户通知',
        content: '内容',
        isRead: false
      });

      const res = await callApi(readHandler, {
        method: 'GET',
        auth: defaultAuth,
        query: { informId: otherInform._id.toString() }
      });

      expectError(res, 500);
    });
  });

  describe('GET /api/support/user/inform/getSystemMsgModal', () => {
    it('无消息时应返回 hasMessage: false', async () => {
      const res = await callApi(getSystemMsgModalHandler, {
        method: 'GET',
        auth: defaultAuth
      });

      const data = expectSuccess(res);
      expect(data.hasMessage).toBe(false);
      expect(data.message).toBeUndefined();
    });

    it('有消息时应返回系统消息', async () => {
      await MongoSystemMessageModel.create({
        title: '系统公告',
        content: '这是一条重要公告',
        priority: 'important',
        isActive: true,
        startTime: new Date(Date.now() - 1000),
        endTime: new Date(Date.now() + 86400000)
      });

      const res = await callApi(getSystemMsgModalHandler, {
        method: 'GET',
        auth: defaultAuth
      });

      const data = expectSuccess(res);
      expect(data.hasMessage).toBe(true);
      expect(data.message?.title).toBe('系统公告');
    });

    it('未开始的消息不应返回', async () => {
      await MongoSystemMessageModel.create({
        title: '未来公告',
        content: '内容',
        isActive: true,
        startTime: new Date(Date.now() + 86400000)
      });

      const res = await callApi(getSystemMsgModalHandler, {
        method: 'GET',
        auth: defaultAuth
      });

      const data = expectSuccess(res);
      expect(data.hasMessage).toBe(false);
    });

    it('已结束的消息不应返回', async () => {
      await MongoSystemMessageModel.create({
        title: '过期公告',
        content: '内容',
        isActive: true,
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() - 1000)
      });

      const res = await callApi(getSystemMsgModalHandler, {
        method: 'GET',
        auth: defaultAuth
      });

      const data = expectSuccess(res);
      expect(data.hasMessage).toBe(false);
    });
  });
});

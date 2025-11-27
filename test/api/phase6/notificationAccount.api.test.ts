/**
 * 更新通知账户 API 测试
 * PUT /api/support/user/team/updateNotificationAccount
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, AuthHeaders } from '../../utils/apiTestHelper';
import handler from '../../../pages/api/support/user/team/updateNotificationAccount';
import { MongoTeamModel } from '@fastgpt/service/support_user/team/teamSchema';

describe('PUT /api/support/user/team/updateNotificationAccount', () => {
  let auth: AuthHeaders;
  let teamId: string;
  let tmbId: string;
  let userId: string;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearAllTestCollections();

    // 创建测试用户和团队
    const user = await testDataFactory.createUser({ username: '团队所有者' });
    userId = user._id.toString();

    const team = await testDataFactory.createTeam({ name: '测试团队', ownerId: userId });
    teamId = team._id.toString();

    // 创建团队成员（owner 角色）
    const member = await testDataFactory.createTeamMember({
      teamId,
      userId,
      name: '团队所有者',
      role: 'owner',
      status: 'active'
    });
    tmbId = member._id.toString();

    auth = { teamId, tmbId, userId };
  });

  describe('邮箱通知设置', () => {
    it('应该成功启用邮箱通知', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          emailNotification: {
            enabled: true,
            email: 'test@example.com'
          }
        }
      });

      expect(response.statusCode).toBe(200);

      // 验证数据库更新
      const team = await MongoTeamModel.findById(teamId).lean();
      expect(team?.notificationAccount).toContain('email:test@example.com');
    });

    it('应该成功禁用邮箱通知', async () => {
      // 先启用
      await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          emailNotification: {
            enabled: true,
            email: 'test@example.com'
          }
        }
      });

      // 再禁用
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          emailNotification: {
            enabled: false,
            email: 'test@example.com'
          }
        }
      });

      expect(response.statusCode).toBe(200);

      // 验证数据库更新
      const team = await MongoTeamModel.findById(teamId).lean();
      expect(team?.notificationAccount).not.toContain('email:');
    });

    it('启用时未提供邮箱应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          emailNotification: {
            enabled: true,
            email: ''
          }
        }
      });

      expectError(response);
    });

    it('无效邮箱格式应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          emailNotification: {
            enabled: true,
            email: 'invalid-email'
          }
        }
      });

      expectError(response);
    });
  });

  describe('短信通知设置', () => {
    it('应该成功启用短信通知', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          smsNotification: {
            enabled: true,
            phone: '13800138000'
          }
        }
      });

      expect(response.statusCode).toBe(200);

      const team = await MongoTeamModel.findById(teamId).lean();
      expect(team?.notificationAccount).toContain('sms:13800138000');
    });

    it('启用时未提供手机号应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          smsNotification: {
            enabled: true,
            phone: ''
          }
        }
      });

      expectError(response);
    });

    it('无效手机号格式应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          smsNotification: {
            enabled: true,
            phone: '12345'
          }
        }
      });

      expectError(response);
    });
  });

  describe('Webhook 通知设置', () => {
    it('应该成功启用 Webhook 通知', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          webhookNotification: {
            enabled: true,
            url: 'https://example.com/webhook'
          }
        }
      });

      expect(response.statusCode).toBe(200);

      const team = await MongoTeamModel.findById(teamId).lean();
      expect(team?.notificationAccount).toContain('webhook:https://example.com/webhook');
    });

    it('应该成功设置带 secret 的 Webhook', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          webhookNotification: {
            enabled: true,
            url: 'https://example.com/webhook',
            secret: 'my-secret-key'
          }
        }
      });

      expect(response.statusCode).toBe(200);

      const team = await MongoTeamModel.findById(teamId).lean();
      expect(team?.notificationAccount).toContain('webhook:https://example.com/webhook#my-secret-key');
    });

    it('启用时未提供 URL 应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          webhookNotification: {
            enabled: true,
            url: ''
          }
        }
      });

      expectError(response);
    });

    it('无效 URL 格式应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          webhookNotification: {
            enabled: true,
            url: 'not-a-valid-url'
          }
        }
      });

      expectError(response);
    });
  });

  describe('多渠道通知设置', () => {
    it('应该成功同时启用多个通知渠道', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          emailNotification: {
            enabled: true,
            email: 'test@example.com'
          },
          smsNotification: {
            enabled: true,
            phone: '13800138000'
          },
          webhookNotification: {
            enabled: true,
            url: 'https://example.com/webhook'
          }
        }
      });

      expect(response.statusCode).toBe(200);

      const team = await MongoTeamModel.findById(teamId).lean();
      expect(team?.notificationAccount).toContain('email:test@example.com');
      expect(team?.notificationAccount).toContain('sms:13800138000');
      expect(team?.notificationAccount).toContain('webhook:https://example.com/webhook');
    });

    it('应该成功清空所有通知设置', async () => {
      // 先启用
      await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          emailNotification: { enabled: true, email: 'test@example.com' }
        }
      });

      // 再清空
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          emailNotification: { enabled: false, email: '' },
          smsNotification: { enabled: false, phone: '' },
          webhookNotification: { enabled: false, url: '' }
        }
      });

      expect(response.statusCode).toBe(200);

      const team = await MongoTeamModel.findById(teamId).lean();
      expect(team?.notificationAccount).toBe('');
    });
  });

  describe('权限验证', () => {
    it('owner 可以更新通知设置', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {
          emailNotification: { enabled: true, email: 'test@example.com' }
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('admin 可以更新通知设置', async () => {
      const adminUser = await testDataFactory.createUser({ username: '管理员' });
      const adminMember = await testDataFactory.createTeamMember({
        teamId,
        userId: adminUser._id.toString(),
        name: '管理员',
        role: 'admin',
        status: 'active'
      });

      const adminAuth = {
        teamId,
        tmbId: adminMember._id.toString(),
        userId: adminUser._id.toString()
      };

      const response = await callApi(handler, {
        method: 'PUT',
        auth: adminAuth,
        body: {
          emailNotification: { enabled: true, email: 'admin@example.com' }
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('普通成员不能更新通知设置', async () => {
      const memberUser = await testDataFactory.createUser({ username: '普通成员' });
      const normalMember = await testDataFactory.createTeamMember({
        teamId,
        userId: memberUser._id.toString(),
        name: '普通成员',
        role: 'member',
        status: 'active'
      });

      const memberAuth = {
        teamId,
        tmbId: normalMember._id.toString(),
        userId: memberUser._id.toString()
      };

      const response = await callApi(handler, {
        method: 'PUT',
        auth: memberAuth,
        body: {
          emailNotification: { enabled: true, email: 'member@example.com' }
        }
      });

      expectError(response);
    });

    it('未认证请求应被拒绝', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        skipAuthMock: true,
        body: {
          emailNotification: { enabled: true, email: 'test@example.com' }
        }
      });

      expectError(response);
    });
  });

  describe('边界情况', () => {
    it('空请求体应正常处理', async () => {
      const response = await callApi(handler, {
        method: 'PUT',
        auth,
        body: {}
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

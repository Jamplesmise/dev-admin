/**
 * Phase 6B - 微信登录结果 API 测试
 * 测试微信扫码登录获取结果 API
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  connectTestDB,
  disconnectTestDB,
  clearAllTestCollections,
  testDataFactory
} from '../../utils/db';
import { callApi, expectSuccess, expectError } from '../../utils/apiTestHelper';
import { connectionMongo } from '../../../src/packages/service/common/mongo';
import { WxLoginStatusEnum, OAuthProviderEnum } from '../../../src/packages/global/support_user/auth/constants';

// 导入 API handler
import getResultHandler from '@/api/support/user/account/login/wx/getResult';

// 微信登录会话 Model
async function getWxLoginSessionModel() {
  const { MongoWxLoginSessionModel } = await import(
    '../../../src/packages/service/support_user/auth/schema'
  );
  return MongoWxLoginSessionModel;
}

// OAuth 绑定 Model
async function getOAuthBindingModel() {
  const { MongoOAuthBindingModel } = await import(
    '../../../src/packages/service/support_user/auth/schema'
  );
  return MongoOAuthBindingModel;
}

// 用户 Model
async function getUserModel() {
  const { MongoUserModel } = await import(
    '../../../src/packages/service/support_user/schema'
  );
  return MongoUserModel;
}

describe('Phase 6B - 微信登录结果 API 测试', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearAllTestCollections();
    // 清理微信登录会话
    try {
      await connectionMongo.connection.collection('wx_login_sessions').deleteMany({});
      await connectionMongo.connection.collection('user_oauth_bindings').deleteMany({});
    } catch {
      // 集合可能不存在
    }
  });

  describe('POST /api/support/user/account/login/wx/getResult', () => {
    describe('正常流程 - 已有用户', () => {
      it('应该返回已有用户信息和 token', async () => {
        // 创建用户
        const user = await testDataFactory.createUser({ username: '已有微信用户' });

        // 创建 OAuth 绑定
        const OAuthModel = await getOAuthBindingModel();
        await OAuthModel.create({
          userId: user._id,
          provider: OAuthProviderEnum.wechat,
          providerId: 'wx_openid_123',
          profile: { nickname: '微信用户' },
          bindTime: new Date(),
          lastLoginTime: new Date()
        });

        // 创建团队和成员
        const team = await testDataFactory.createTeam({ name: '用户团队' });
        await testDataFactory.createTeamMember({
          teamId: team._id.toString(),
          userId: user._id.toString(),
          name: '团队成员'
        });

        // 创建登录会话
        const WxModel = await getWxLoginSessionModel();
        await WxModel.create({
          sceneId: 'test_scene_123',
          ticket: 'test_ticket_123',
          status: WxLoginStatusEnum.confirmed,
          openId: 'wx_openid_123',
          expireAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        const response = await callApi(getResultHandler, {
          method: 'POST',
          body: {
            code: 'test_scene_123'
          }
        });

        const data = expectSuccess<{
          user: { _id: string; username: string };
          token: string;
          isNewUser: boolean;
        }>(response);

        expect(data.user._id).toBe(user._id.toString());
        expect(data.user.username).toBe('已有微信用户');
        expect(data.token).toBeDefined();
        expect(data.isNewUser).toBe(false);
      });
    });

    describe('正常流程 - 新用户', () => {
      it('应该自动创建新用户', async () => {
        // 创建登录会话（新用户，无 OAuth 绑定）
        const WxModel = await getWxLoginSessionModel();
        await WxModel.create({
          sceneId: 'new_user_scene',
          ticket: 'new_user_ticket',
          status: WxLoginStatusEnum.confirmed,
          openId: 'wx_new_openid_456',
          expireAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        const response = await callApi(getResultHandler, {
          method: 'POST',
          body: {
            code: 'new_user_scene'
          }
        });

        const data = expectSuccess<{
          user: { _id: string; username: string };
          token: string;
          isNewUser: boolean;
        }>(response);

        expect(data.user._id).toBeDefined();
        expect(data.user.username).toContain('微信用户');
        expect(data.token).toBeDefined();
        expect(data.isNewUser).toBe(true);
      });

      it('新用户应该自动创建默认团队', async () => {
        const WxModel = await getWxLoginSessionModel();
        await WxModel.create({
          sceneId: 'new_user_team_scene',
          ticket: 'new_user_team_ticket',
          status: WxLoginStatusEnum.confirmed,
          openId: 'wx_new_team_openid',
          expireAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        const response = await callApi(getResultHandler, {
          method: 'POST',
          body: {
            code: 'new_user_team_scene'
          }
        });

        const data = expectSuccess<{ user: { _id: string }; token: string }>(response);

        // 验证团队被创建
        const { MongoTeamModel } = await import(
          '../../../src/packages/service/support_user/team/teamSchema'
        );
        const { MongoTeamMemberModel } = await import(
          '../../../src/packages/service/support_user/team/teamMemberSchema'
        );

        const teamMember = await MongoTeamMemberModel.findOne({
          userId: data.user._id
        }).lean();

        expect(teamMember).toBeDefined();

        if (teamMember) {
          const team = await MongoTeamModel.findById(teamMember.teamId).lean();
          expect(team).toBeDefined();
          expect(team?.name).toContain('的团队');
        }
      });
    });

    describe('参数验证', () => {
      it('code 必填', async () => {
        const response = await callApi(getResultHandler, {
          method: 'POST',
          body: {}
        });

        expectError(response);
      });
    });

    describe('错误处理', () => {
      it('扫码信息不存在时返回错误', async () => {
        const response = await callApi(getResultHandler, {
          method: 'POST',
          body: {
            code: 'non_existent_scene'
          }
        });

        expectError(response);
      });

      it('扫码信息过期时返回错误', async () => {
        const WxModel = await getWxLoginSessionModel();
        await WxModel.create({
          sceneId: 'expired_scene',
          ticket: 'expired_ticket',
          status: WxLoginStatusEnum.confirmed,
          openId: 'wx_expired_openid',
          expireAt: new Date(Date.now() - 1000) // 已过期
        });

        const response = await callApi(getResultHandler, {
          method: 'POST',
          body: {
            code: 'expired_scene'
          }
        });

        expectError(response);
      });

      it('用户尚未确认登录时返回错误', async () => {
        const WxModel = await getWxLoginSessionModel();
        await WxModel.create({
          sceneId: 'waiting_scene',
          ticket: 'waiting_ticket',
          status: WxLoginStatusEnum.waiting, // 还在等待扫码
          expireAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        const response = await callApi(getResultHandler, {
          method: 'POST',
          body: {
            code: 'waiting_scene'
          }
        });

        expectError(response);
      });

      it('仅扫码但未确认时返回错误', async () => {
        const WxModel = await getWxLoginSessionModel();
        await WxModel.create({
          sceneId: 'scanned_scene',
          ticket: 'scanned_ticket',
          status: WxLoginStatusEnum.scanned, // 已扫码但未确认
          openId: 'wx_scanned_openid',
          expireAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        const response = await callApi(getResultHandler, {
          method: 'POST',
          body: {
            code: 'scanned_scene'
          }
        });

        expectError(response);
      });
    });

    describe('安全性', () => {
      it('返回的 token 应该是有效的 JWT', async () => {
        const WxModel = await getWxLoginSessionModel();
        await WxModel.create({
          sceneId: 'jwt_test_scene',
          ticket: 'jwt_test_ticket',
          status: WxLoginStatusEnum.confirmed,
          openId: 'wx_jwt_test_openid',
          expireAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        const response = await callApi(getResultHandler, {
          method: 'POST',
          body: {
            code: 'jwt_test_scene'
          }
        });

        const data = expectSuccess<{ token: string }>(response);

        // JWT 格式: header.payload.signature
        const parts = data.token.split('.');
        expect(parts).toHaveLength(3);
      });

      it('token 应该包含正确的用户信息', async () => {
        const WxModel = await getWxLoginSessionModel();
        await WxModel.create({
          sceneId: 'payload_test_scene',
          ticket: 'payload_test_ticket',
          status: WxLoginStatusEnum.confirmed,
          openId: 'wx_payload_test_openid',
          expireAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        const response = await callApi(getResultHandler, {
          method: 'POST',
          body: {
            code: 'payload_test_scene'
          }
        });

        const data = expectSuccess<{
          user: { _id: string };
          token: string;
        }>(response);

        // 解析 JWT payload
        const payload = JSON.parse(
          Buffer.from(data.token.split('.')[1], 'base64').toString()
        );

        expect(payload.userId).toBe(data.user._id);
        expect(payload.teamId).toBeDefined();
        expect(payload.tmbId).toBeDefined();
      });
    });

    describe('注意：此 API 不需要认证', () => {
      it('不带认证信息也应该正常工作', async () => {
        const WxModel = await getWxLoginSessionModel();
        await WxModel.create({
          sceneId: 'no_auth_scene',
          ticket: 'no_auth_ticket',
          status: WxLoginStatusEnum.confirmed,
          openId: 'wx_no_auth_openid',
          expireAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        // 不传 auth，也不传 skipAuthMock
        const response = await callApi(getResultHandler, {
          method: 'POST',
          body: {
            code: 'no_auth_scene'
          }
        });

        const data = expectSuccess<{ user: { _id: string } }>(response);
        expect(data.user._id).toBeDefined();
      });
    });
  });
});

/**
 * 令牌获取应用 API 测试
 * GET /api/support/user/team/tag/getAppsByTeamTokens
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, AuthHeaders } from '../../utils/apiTestHelper';
import handler from '../../../pages/api/support/user/team/tag/getAppsByTeamTokens';

describe('GET /api/support/user/team/tag/getAppsByTeamTokens', () => {
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

  describe('基本功能', () => {
    it('无 tokens 参数应返回空数组', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it('空 tokens 参数应返回空数组', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { tokens: '' }
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it('无效 tokens 应返回空数组', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { tokens: 'invalid-token-1,invalid-token-2' }
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it('应该支持逗号分隔的多个 tokens', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { tokens: 'token1, token2, token3' }
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
      // 由于没有实际的 openapi_keys 数据，返回空数组
      expect(data).toHaveLength(0);
    });
  });

  describe('权限验证', () => {
    it('普通成员也可以查询', async () => {
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
        method: 'GET',
        auth: memberAuth,
        query: { tokens: 'some-token' }
      });

      const data = expectSuccess(response);
      expect(Array.isArray(data)).toBe(true);
    });

    it('未认证请求应被拒绝', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        skipAuthMock: true,
        query: { tokens: 'some-token' }
      });

      expectError(response);
    });
  });
});

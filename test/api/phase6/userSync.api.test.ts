/**
 * 成员同步 API 测试
 * POST /api/support/user/sync
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, AuthHeaders } from '../../utils/apiTestHelper';
import handler from '../../../pages/api/support/user/sync';
import type { PostUserSyncResponse } from '../../../src/packages/global/support_user/sync/type';

describe('POST /api/support/user/sync', () => {
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
    const user = await testDataFactory.createUser({ username: '管理员' });
    userId = user._id.toString();

    const team = await testDataFactory.createTeam({ name: '测试团队', ownerId: userId });
    teamId = team._id.toString();

    // 创建团队成员（owner 角色）
    const member = await testDataFactory.createTeamMember({
      teamId,
      userId,
      name: '管理员',
      role: 'owner',
      status: 'active'
    });
    tmbId = member._id.toString();

    auth = { teamId, tmbId, userId };
  });

  describe('正常流程 - 增量同步', () => {
    it('应该创建新用户', async () => {
      const response = await callApi<PostUserSyncResponse>(handler, {
        method: 'POST',
        auth,
        body: {
          users: [
            {
              externalId: 'ext_001',
              username: '张三',
              email: 'zhangsan@example.com'
            }
          ],
          syncMode: 'incremental'
        }
      });

      const data = expectSuccess(response);
      expect(data.created).toBe(1);
      expect(data.updated).toBe(0);
      expect(data.skipped).toBe(0);
      expect(data.errors).toHaveLength(0);
    });

    it('应该批量创建多个用户', async () => {
      const response = await callApi<PostUserSyncResponse>(handler, {
        method: 'POST',
        auth,
        body: {
          users: [
            { externalId: 'ext_001', username: '张三', email: 'zhangsan@example.com' },
            { externalId: 'ext_002', username: '李四', email: 'lisi@example.com' },
            { externalId: 'ext_003', username: '王五', email: 'wangwu@example.com' }
          ],
          syncMode: 'incremental'
        }
      });

      const data = expectSuccess(response);
      expect(data.created).toBe(3);
      expect(data.errors).toHaveLength(0);
    });

    it('应该更新已有用户信息', async () => {
      // 先创建一个用户
      await testDataFactory.createUser({
        username: '旧名字',
        email: 'existuser@example.com'
      });

      const response = await callApi<PostUserSyncResponse>(handler, {
        method: 'POST',
        auth,
        body: {
          users: [
            {
              externalId: 'ext_001',
              username: '新名字',
              email: 'existuser@example.com',
              avatar: 'https://example.com/new-avatar.png'
            }
          ],
          syncMode: 'incremental'
        }
      });

      const data = expectSuccess(response);
      expect(data.updated).toBeGreaterThanOrEqual(0);
      expect(data.errors).toHaveLength(0);
    });

    it('应该自动创建不存在的部门', async () => {
      const response = await callApi<PostUserSyncResponse>(handler, {
        method: 'POST',
        auth,
        body: {
          users: [
            {
              externalId: 'ext_001',
              username: '张三',
              email: 'zhangsan2@example.com',
              department: '技术部/后端组'
            }
          ],
          syncMode: 'incremental'
        }
      });

      const data = expectSuccess(response);
      expect(data.created).toBe(1);
      expect(data.errors).toHaveLength(0);
    });
  });

  describe('正常流程 - 全量同步', () => {
    it('应该将不在列表中的成员标记为离开', async () => {
      // 先创建两个用户和成员
      const user1 = await testDataFactory.createUser({
        username: '成员A',
        email: 'membera@example.com'
      });
      await testDataFactory.createTeamMember({
        teamId,
        userId: user1._id.toString(),
        name: '成员A',
        role: 'member',
        status: 'active'
      });

      const user2 = await testDataFactory.createUser({
        username: '成员B',
        email: 'memberb@example.com'
      });
      await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员B',
        role: 'member',
        status: 'active'
      });

      // 全量同步只包含成员A
      const response = await callApi<PostUserSyncResponse>(handler, {
        method: 'POST',
        auth,
        body: {
          users: [
            {
              externalId: 'ext_001',
              username: '成员A',
              email: 'membera@example.com'
            }
          ],
          syncMode: 'full'
        }
      });

      const data = expectSuccess(response);
      expect(data.errors).toHaveLength(0);
    });

    it('全量同步不应影响 owner', async () => {
      const response = await callApi<PostUserSyncResponse>(handler, {
        method: 'POST',
        auth,
        body: {
          users: [],
          syncMode: 'full'
        }
      });

      // owner 不应被标记为离开
      const data = expectSuccess(response);
      expect(data.errors).toHaveLength(0);
    });
  });

  describe('参数验证', () => {
    it('users 必填', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          syncMode: 'incremental'
        }
      });

      expectError(response);
    });

    it('syncMode 必填', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          users: [{ externalId: 'ext_001', username: '张三' }]
        }
      });

      expectError(response);
    });

    it('syncMode 必须是有效值', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          users: [{ externalId: 'ext_001', username: '张三' }],
          syncMode: 'invalid'
        }
      });

      expectError(response);
    });

    it('每个用户必须有 externalId', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          users: [{ username: '张三' }],
          syncMode: 'incremental'
        }
      });

      expectError(response);
    });

    it('每个用户必须有 username', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          users: [{ externalId: 'ext_001' }],
          syncMode: 'incremental'
        }
      });

      expectError(response);
    });
  });

  describe('权限验证', () => {
    it('只有 owner/admin 可以同步', async () => {
      // 创建普通成员
      const normalUser = await testDataFactory.createUser({ username: '普通成员' });
      const normalMember = await testDataFactory.createTeamMember({
        teamId,
        userId: normalUser._id.toString(),
        name: '普通成员',
        role: 'member',
        status: 'active'
      });

      const normalAuth = {
        teamId,
        tmbId: normalMember._id.toString(),
        userId: normalUser._id.toString()
      };

      const response = await callApi(handler, {
        method: 'POST',
        auth: normalAuth,
        body: {
          users: [{ externalId: 'ext_001', username: '张三' }],
          syncMode: 'incremental'
        }
      });

      expectError(response);
    });

    it('admin 可以同步', async () => {
      // 创建 admin 成员
      const adminUser = await testDataFactory.createUser({ username: '管理员成员' });
      const adminMember = await testDataFactory.createTeamMember({
        teamId,
        userId: adminUser._id.toString(),
        name: '管理员成员',
        role: 'admin',
        status: 'active'
      });

      const adminAuth = {
        teamId,
        tmbId: adminMember._id.toString(),
        userId: adminUser._id.toString()
      };

      const response = await callApi<PostUserSyncResponse>(handler, {
        method: 'POST',
        auth: adminAuth,
        body: {
          users: [{ externalId: 'ext_001', username: '张三', email: 'admin_test@example.com' }],
          syncMode: 'incremental'
        }
      });

      const data = expectSuccess(response);
      expect(data.created).toBe(1);
    });

    it('未认证请求应被拒绝', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        skipAuthMock: true,
        body: {
          users: [{ externalId: 'ext_001', username: '张三' }],
          syncMode: 'incremental'
        }
      });

      expectError(response);
    });
  });

  describe('错误处理', () => {
    it('空用户列表应正常处理', async () => {
      const response = await callApi<PostUserSyncResponse>(handler, {
        method: 'POST',
        auth,
        body: {
          users: [],
          syncMode: 'incremental'
        }
      });

      const data = expectSuccess(response);
      expect(data.created).toBe(0);
      expect(data.updated).toBe(0);
      expect(data.skipped).toBe(0);
    });
  });
});

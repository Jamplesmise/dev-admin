/**
 * 更改数据集所有者 API 测试
 * POST /api/core/dataset/changeOwner
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, AuthHeaders } from '../../utils/apiTestHelper';
import handler from '../../../pages/api/core/dataset/changeOwner';

describe('POST /api/core/dataset/changeOwner', () => {
  let auth: AuthHeaders;
  let teamId: string;
  let tmbId: string;
  let userId: string;
  let datasetId: string;

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

    // 创建测试数据集
    const dataset = await testDataFactory.createDataset({
      teamId,
      tmbId,
      name: '测试数据集'
    });
    datasetId = dataset._id.toString();

    auth = { teamId, tmbId, userId };
  });

  describe('正常更改所有者', () => {
    it('owner 可以将数据集所有者更改为其他成员', async () => {
      // 创建新的成员作为新所有者
      const newOwnerUser = await testDataFactory.createUser({ username: '新所有者' });
      const newOwnerMember = await testDataFactory.createTeamMember({
        teamId,
        userId: newOwnerUser._id.toString(),
        name: '新所有者',
        role: 'member',
        status: 'active'
      });

      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId,
          newOwnerId: newOwnerMember._id.toString()
        }
      });

      const data = expectSuccess(response);
      expect(data.success).toBe(true);
      expect(data.message).toBe('数据集所有者更改成功');
    });

    it('admin 可以更改数据集所有者', async () => {
      const adminUser = await testDataFactory.createUser({ username: '管理员' });
      const adminMember = await testDataFactory.createTeamMember({
        teamId,
        userId: adminUser._id.toString(),
        name: '管理员',
        role: 'admin',
        status: 'active'
      });

      const newOwnerUser = await testDataFactory.createUser({ username: '新所有者' });
      const newOwnerMember = await testDataFactory.createTeamMember({
        teamId,
        userId: newOwnerUser._id.toString(),
        name: '新所有者',
        role: 'member',
        status: 'active'
      });

      const adminAuth = {
        teamId,
        tmbId: adminMember._id.toString(),
        userId: adminUser._id.toString()
      };

      const response = await callApi(handler, {
        method: 'POST',
        auth: adminAuth,
        body: {
          datasetId,
          newOwnerId: newOwnerMember._id.toString()
        }
      });

      const data = expectSuccess(response);
      expect(data.success).toBe(true);
    });

    it('数据集当前所有者可以更改所有者', async () => {
      // 创建数据集所有者成员
      const datasetOwnerUser = await testDataFactory.createUser({ username: '数据集所有者' });
      const datasetOwnerMember = await testDataFactory.createTeamMember({
        teamId,
        userId: datasetOwnerUser._id.toString(),
        name: '数据集所有者',
        role: 'member',
        status: 'active'
      });

      // 创建一个由该成员拥有的数据集
      const ownedDataset = await testDataFactory.createDataset({
        teamId,
        tmbId: datasetOwnerMember._id.toString(),
        name: '我的数据集'
      });

      // 创建新所有者
      const newOwnerUser = await testDataFactory.createUser({ username: '新所有者' });
      const newOwnerMember = await testDataFactory.createTeamMember({
        teamId,
        userId: newOwnerUser._id.toString(),
        name: '新所有者',
        role: 'member',
        status: 'active'
      });

      const datasetOwnerAuth = {
        teamId,
        tmbId: datasetOwnerMember._id.toString(),
        userId: datasetOwnerUser._id.toString()
      };

      const response = await callApi(handler, {
        method: 'POST',
        auth: datasetOwnerAuth,
        body: {
          datasetId: ownedDataset._id.toString(),
          newOwnerId: newOwnerMember._id.toString()
        }
      });

      const data = expectSuccess(response);
      expect(data.success).toBe(true);
    });

    it('新所有者与当前所有者相同时应返回成功（无需更改）', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId,
          newOwnerId: tmbId
        }
      });

      const data = expectSuccess(response);
      expect(data.success).toBe(true);
      expect(data.message).toBe('新所有者与当前所有者相同，无需更改');
    });
  });

  describe('参数验证', () => {
    it('缺少 datasetId 应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          newOwnerId: testDataFactory.randomObjectId()
        }
      });

      expectError(response);
    });

    it('缺少 newOwnerId 应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId
        }
      });

      expectError(response);
    });

    it('无效的 datasetId 格式应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId: 'invalid-id',
          newOwnerId: testDataFactory.randomObjectId()
        }
      });

      expectError(response);
    });

    it('无效的 newOwnerId 格式应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId,
          newOwnerId: 'invalid-id'
        }
      });

      expectError(response);
    });

    it('不存在的 datasetId 应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId: testDataFactory.randomObjectId(),
          newOwnerId: testDataFactory.randomObjectId()
        }
      });

      expectError(response);
    });
  });

  describe('权限验证', () => {
    it('普通成员不能更改其他人的数据集所有者', async () => {
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
          datasetId,
          newOwnerId: normalMember._id.toString()
        }
      });

      expectError(response);
    });

    it('新所有者必须是团队成员', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId,
          newOwnerId: testDataFactory.randomObjectId()
        }
      });

      expectError(response);
    });

    it('新所有者必须是活跃状态的成员', async () => {
      // 创建一个非活跃状态的成员
      const inactiveUser = await testDataFactory.createUser({ username: '非活跃成员' });
      const inactiveMember = await testDataFactory.createTeamMember({
        teamId,
        userId: inactiveUser._id.toString(),
        name: '非活跃成员',
        role: 'member',
        status: 'leave' // 非活跃状态
      });

      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId,
          newOwnerId: inactiveMember._id.toString()
        }
      });

      expectError(response);
    });

    it('未认证请求应被拒绝', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        skipAuthMock: true,
        body: {
          datasetId,
          newOwnerId: testDataFactory.randomObjectId()
        }
      });

      expectError(response);
    });
  });
});

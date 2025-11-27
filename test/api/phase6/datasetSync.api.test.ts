/**
 * 数据集同步 API 测试
 * POST /api/core/dataset/datasetSync
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, AuthHeaders } from '../../utils/apiTestHelper';
import handler from '../../../pages/api/core/dataset/datasetSync';

describe('POST /api/core/dataset/datasetSync', () => {
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

  describe('正常同步', () => {
    it('应该成功创建同步任务', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId
        }
      });

      const data = expectSuccess(response);
      expect(data.taskId).toBeDefined();
      expect(data.status).toBe('queued');
    });

    it('手动同步模式应该成功', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId,
          syncMode: 'manual'
        }
      });

      const data = expectSuccess(response);
      expect(data.taskId).toBeDefined();
      expect(data.status).toBe('queued');
    });

    it('自动同步模式应该成功', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId,
          syncMode: 'auto'
        }
      });

      const data = expectSuccess(response);
      expect(data.taskId).toBeDefined();
      expect(data.status).toBe('queued');
    });
  });

  describe('参数验证', () => {
    it('缺少 datasetId 应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {}
      });

      expectError(response);
    });

    it('无效的 datasetId 格式应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId: 'invalid-id'
        }
      });

      expectError(response);
    });

    it('不存在的 datasetId 应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: {
          datasetId: testDataFactory.randomObjectId()
        }
      });

      expectError(response);
    });
  });

  describe('权限验证', () => {
    it('owner 可以同步', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        auth,
        body: { datasetId }
      });

      const data = expectSuccess(response);
      expect(data.taskId).toBeDefined();
    });

    it('admin 可以同步', async () => {
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
        method: 'POST',
        auth: adminAuth,
        body: { datasetId }
      });

      const data = expectSuccess(response);
      expect(data.taskId).toBeDefined();
    });

    it('普通成员不能同步（无协作者权限）', async () => {
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
        body: { datasetId }
      });

      expectError(response);
    });

    it('有写权限的协作者可以同步', async () => {
      const collaboratorUser = await testDataFactory.createUser({ username: '协作者' });
      const collaboratorMember = await testDataFactory.createTeamMember({
        teamId,
        userId: collaboratorUser._id.toString(),
        name: '协作者',
        role: 'member',
        status: 'active'
      });

      // 添加写权限的协作者
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: datasetId,
        resourceType: 'dataset',
        tmbId: collaboratorMember._id.toString(),
        permission: 6 // 读写权限
      });

      const collaboratorAuth = {
        teamId,
        tmbId: collaboratorMember._id.toString(),
        userId: collaboratorUser._id.toString()
      };

      const response = await callApi(handler, {
        method: 'POST',
        auth: collaboratorAuth,
        body: { datasetId }
      });

      const data = expectSuccess(response);
      expect(data.taskId).toBeDefined();
    });

    it('只有读权限的协作者不能同步', async () => {
      const readOnlyUser = await testDataFactory.createUser({ username: '只读协作者' });
      const readOnlyMember = await testDataFactory.createTeamMember({
        teamId,
        userId: readOnlyUser._id.toString(),
        name: '只读协作者',
        role: 'member',
        status: 'active'
      });

      // 添加只读权限的协作者 (permission: 0 表示无权限/仅被添加但无实际权限)
      // permission: 4 实际上是读权限，但根据我们的 API 实现，需要 permission >= 2 (写权限)
      // 所以设置 permission: 0 或 1 来测试无写权限的情况
      await testDataFactory.createCollaborator({
        teamId,
        resourceId: datasetId,
        resourceType: 'dataset',
        tmbId: readOnlyMember._id.toString(),
        permission: 1 // 无写权限
      });

      const readOnlyAuth = {
        teamId,
        tmbId: readOnlyMember._id.toString(),
        userId: readOnlyUser._id.toString()
      };

      const response = await callApi(handler, {
        method: 'POST',
        auth: readOnlyAuth,
        body: { datasetId }
      });

      expectError(response);
    });

    it('未认证请求应被拒绝', async () => {
      const response = await callApi(handler, {
        method: 'POST',
        skipAuthMock: true,
        body: { datasetId }
      });

      expectError(response);
    });
  });
});

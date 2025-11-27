/**
 * 团队标签 API 测试
 * GET /api/support/user/team/tag/list
 * GET /api/support/user/team/tag/async
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, AuthHeaders } from '../../utils/apiTestHelper';
import listHandler from '../../../pages/api/support/user/team/tag/list';
import asyncHandler from '../../../pages/api/support/user/team/tag/async';

describe('团队标签 API', () => {
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

  describe('GET /api/support/user/team/tag/list', () => {
    describe('正常获取', () => {
      it('空团队应返回空列表', async () => {
        const response = await callApi(listHandler, {
          method: 'GET',
          auth
        });

        const data = expectSuccess(response);
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
      });

      it('应该返回所有团队标签', async () => {
        // 创建测试标签
        await testDataFactory.createTeamTag({
          teamId,
          key: 'priority',
          label: '优先级',
          type: 'single',
          options: [
            { value: 'high', label: '高', color: '#ff0000' },
            { value: 'medium', label: '中', color: '#ffff00' },
            { value: 'low', label: '低', color: '#00ff00' }
          ]
        });

        await testDataFactory.createTeamTag({
          teamId,
          key: 'status',
          label: '状态',
          type: 'single',
          options: [
            { value: 'active', label: '活跃' },
            { value: 'inactive', label: '停用' }
          ]
        });

        const response = await callApi(listHandler, {
          method: 'GET',
          auth
        });

        const data = expectSuccess(response);
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(2);
      });

      it('应该包含完整的标签信息', async () => {
        await testDataFactory.createTeamTag({
          teamId,
          key: 'category',
          label: '分类',
          type: 'multi',
          options: [
            { value: 'tech', label: '技术', color: '#0000ff' },
            { value: 'business', label: '业务', color: '#00ff00' }
          ]
        });

        const response = await callApi(listHandler, {
          method: 'GET',
          auth
        });

        const data = expectSuccess(response);
        expect(data).toHaveLength(1);

        const tag = data[0];
        expect(tag.key).toBe('category');
        expect(tag.label).toBe('分类');
        expect(tag.type).toBe('multi');
        expect(tag.options).toHaveLength(2);
        expect(tag.options[0]).toMatchObject({
          value: 'tech',
          label: '技术',
          color: '#0000ff'
        });
      });

      it('应该按创建时间排序', async () => {
        // 创建三个标签，确保顺序
        await testDataFactory.createTeamTag({
          teamId,
          key: 'tag1',
          label: '标签1'
        });

        // 稍微等待以确保时间戳不同
        await new Promise(resolve => setTimeout(resolve, 10));

        await testDataFactory.createTeamTag({
          teamId,
          key: 'tag2',
          label: '标签2'
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        await testDataFactory.createTeamTag({
          teamId,
          key: 'tag3',
          label: '标签3'
        });

        const response = await callApi(listHandler, {
          method: 'GET',
          auth
        });

        const data = expectSuccess(response);
        expect(data).toHaveLength(3);
        expect(data[0].key).toBe('tag1');
        expect(data[1].key).toBe('tag2');
        expect(data[2].key).toBe('tag3');
      });

      it('不应返回其他团队的标签', async () => {
        // 创建另一个团队的标签
        const otherTeam = await testDataFactory.createTeam({ name: '其他团队' });

        await testDataFactory.createTeamTag({
          teamId: otherTeam._id.toString(),
          key: 'other',
          label: '其他标签'
        });

        // 创建本团队的标签
        await testDataFactory.createTeamTag({
          teamId,
          key: 'mine',
          label: '我的标签'
        });

        const response = await callApi(listHandler, {
          method: 'GET',
          auth
        });

        const data = expectSuccess(response);
        expect(data).toHaveLength(1);
        expect(data[0].key).toBe('mine');
      });
    });

    describe('权限验证', () => {
      it('普通成员也可以查看标签', async () => {
        // 创建普通成员
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

        // 创建一个标签
        await testDataFactory.createTeamTag({
          teamId,
          key: 'test',
          label: '测试标签'
        });

        const response = await callApi(listHandler, {
          method: 'GET',
          auth: memberAuth
        });

        const data = expectSuccess(response);
        expect(data).toHaveLength(1);
      });

      it('未认证请求应被拒绝', async () => {
        const response = await callApi(listHandler, {
          method: 'GET',
          skipAuthMock: true
        });

        expectError(response);
      });
    });

    describe('边界情况', () => {
      it('应该正确处理没有 options 的标签', async () => {
        await testDataFactory.createTeamTag({
          teamId,
          key: 'simple',
          label: '简单标签'
        });

        const response = await callApi(listHandler, {
          method: 'GET',
          auth
        });

        const data = expectSuccess(response);
        expect(data).toHaveLength(1);
        expect(data[0].options).toEqual([]);
      });

      it('应该正确处理大量标签', async () => {
        // 创建 20 个标签
        for (let i = 0; i < 20; i++) {
          await testDataFactory.createTeamTag({
            teamId,
            key: `tag${i.toString().padStart(2, '0')}`,
            label: `标签${i}`
          });
        }

        const response = await callApi(listHandler, {
          method: 'GET',
          auth
        });

        const data = expectSuccess(response);
        expect(data).toHaveLength(20);
      });
    });
  });

  describe('GET /api/support/user/team/tag/async', () => {
    describe('分页功能', () => {
      it('默认返回第一页', async () => {
        // 创建 25 个标签
        for (let i = 0; i < 25; i++) {
          await testDataFactory.createTeamTag({
            teamId,
            key: `tag${i.toString().padStart(2, '0')}`,
            label: `标签${i}`
          });
        }

        const response = await callApi(asyncHandler, {
          method: 'GET',
          auth
        });

        const data = expectSuccess(response);
        expect(data.list).toHaveLength(20); // 默认 pageSize 是 20
        expect(data.total).toBe(25);
        expect(data.hasMore).toBe(true);
      });

      it('应该正确返回第二页', async () => {
        // 创建 25 个标签
        for (let i = 0; i < 25; i++) {
          await testDataFactory.createTeamTag({
            teamId,
            key: `tag${i.toString().padStart(2, '0')}`,
            label: `标签${i}`
          });
        }

        const response = await callApi(asyncHandler, {
          method: 'GET',
          auth,
          query: { page: '2' }
        });

        const data = expectSuccess(response);
        expect(data.list).toHaveLength(5);
        expect(data.total).toBe(25);
        expect(data.hasMore).toBe(false);
      });

      it('应该支持自定义 pageSize', async () => {
        // 创建 15 个标签
        for (let i = 0; i < 15; i++) {
          await testDataFactory.createTeamTag({
            teamId,
            key: `tag${i.toString().padStart(2, '0')}`,
            label: `标签${i}`
          });
        }

        const response = await callApi(asyncHandler, {
          method: 'GET',
          auth,
          query: { pageSize: '5' }
        });

        const data = expectSuccess(response);
        expect(data.list).toHaveLength(5);
        expect(data.total).toBe(15);
        expect(data.hasMore).toBe(true);
      });

      it('空结果应正确返回', async () => {
        const response = await callApi(asyncHandler, {
          method: 'GET',
          auth
        });

        const data = expectSuccess(response);
        expect(data.list).toHaveLength(0);
        expect(data.total).toBe(0);
        expect(data.hasMore).toBe(false);
      });
    });

    describe('搜索功能', () => {
      beforeEach(async () => {
        // 创建测试标签
        await testDataFactory.createTeamTag({
          teamId,
          key: 'priority',
          label: '优先级'
        });
        await testDataFactory.createTeamTag({
          teamId,
          key: 'status',
          label: '状态'
        });
        await testDataFactory.createTeamTag({
          teamId,
          key: 'category',
          label: '分类'
        });
      });

      it('应该支持按 key 搜索', async () => {
        const response = await callApi(asyncHandler, {
          method: 'GET',
          auth,
          query: { keyword: 'priority' }
        });

        const data = expectSuccess(response);
        expect(data.list).toHaveLength(1);
        expect(data.list[0].key).toBe('priority');
      });

      it('应该支持按 label 搜索', async () => {
        const response = await callApi(asyncHandler, {
          method: 'GET',
          auth,
          query: { keyword: '状态' }
        });

        const data = expectSuccess(response);
        expect(data.list).toHaveLength(1);
        expect(data.list[0].label).toBe('状态');
      });

      it('搜索应忽略大小写', async () => {
        const response = await callApi(asyncHandler, {
          method: 'GET',
          auth,
          query: { keyword: 'PRIORITY' }
        });

        const data = expectSuccess(response);
        expect(data.list).toHaveLength(1);
      });

      it('无匹配结果应返回空列表', async () => {
        const response = await callApi(asyncHandler, {
          method: 'GET',
          auth,
          query: { keyword: 'nonexistent' }
        });

        const data = expectSuccess(response);
        expect(data.list).toHaveLength(0);
        expect(data.total).toBe(0);
      });
    });

    describe('权限验证', () => {
      it('未认证请求应被拒绝', async () => {
        const response = await callApi(asyncHandler, {
          method: 'GET',
          skipAuthMock: true
        });

        expectError(response);
      });
    });
  });
});

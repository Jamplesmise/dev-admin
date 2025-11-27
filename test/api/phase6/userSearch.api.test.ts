/**
 * 用户搜索 API 测试
 * GET /api/support/user/search
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  connectTestDB,
  disconnectTestDB,
  clearAllTestCollections,
  testDataFactory
} from '../../utils/db';
import {
  callApi,
  expectSuccess,
  expectError,
  createTestContext,
  type AuthHeaders
} from '../../utils/apiTestHelper';

// 导入 handler
import handler from '@/api/support/user/search';

describe('GET /api/support/user/search', () => {
  let teamId: string;
  let tmbId: string;
  let auth: AuthHeaders;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearAllTestCollections();
    const context = await createTestContext(testDataFactory);
    teamId = context.teamId;
    tmbId = context.tmbId;
    auth = context.auth;
  });

  describe('正常流程', () => {
    it('应该返回匹配的成员列表', async () => {
      // 创建多个成员
      const user2 = await testDataFactory.createUser({ username: '张三' });
      await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '张三'
      });

      const user3 = await testDataFactory.createUser({ username: '张四' });
      await testDataFactory.createTeamMember({
        teamId,
        userId: user3._id.toString(),
        name: '张四'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { searchKey: '张' }
      });

      const data = expectSuccess<{
        members: { memberName: string }[];
        orgs: unknown[];
        groups: unknown[];
      }>(response);

      expect(data.members.length).toBe(2);
      expect(data.members.every((m) => m.memberName.includes('张'))).toBe(true);
    });

    it('应该返回匹配的组织列表', async () => {
      // 创建组织
      await testDataFactory.createOrg({
        teamId,
        name: '技术部',
        path: '/技术部'
      });

      await testDataFactory.createOrg({
        teamId,
        name: '技术支持组',
        path: '/技术支持组'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { searchKey: '技术' }
      });

      const data = expectSuccess<{
        members: unknown[];
        orgs: { name: string }[];
        groups: unknown[];
      }>(response);

      expect(data.orgs.length).toBe(2);
      expect(data.orgs.every((o) => o.name.includes('技术'))).toBe(true);
    });

    it('应该返回匹配的分组列表', async () => {
      // 创建分组
      await testDataFactory.createMemberGroup({
        teamId,
        name: '核心开发组'
      });

      await testDataFactory.createMemberGroup({
        teamId,
        name: '核心测试组'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { searchKey: '核心' }
      });

      const data = expectSuccess<{
        members: unknown[];
        orgs: unknown[];
        groups: { name: string }[];
      }>(response);

      expect(data.groups.length).toBe(2);
      expect(data.groups.every((g) => g.name.includes('核心'))).toBe(true);
    });

    it('应该支持只搜索成员', async () => {
      // 使用唯一关键词避免与 beforeEach 创建的成员冲突
      const uniqueKey = `只搜成员${Date.now()}`;

      // 创建成员、组织、分组（都使用相同的关键词）
      const user2 = await testDataFactory.createUser({ username: uniqueKey });
      await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: uniqueKey
      });

      await testDataFactory.createOrg({
        teamId,
        name: `${uniqueKey}部门`,
        path: `/${uniqueKey}部门`
      });

      await testDataFactory.createMemberGroup({
        teamId,
        name: `${uniqueKey}分组`
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: {
          searchKey: uniqueKey,
          members: 'true',
          orgs: 'false',
          groups: 'false'
        }
      });

      const data = expectSuccess<{
        members: unknown[];
        orgs: unknown[];
        groups: unknown[];
      }>(response);

      // 只返回成员，不返回组织和分组
      expect(data.members.length).toBe(1);
      expect(data.orgs.length).toBe(0);
      expect(data.groups.length).toBe(0);
    });

    it('应该支持只搜索组织', async () => {
      await testDataFactory.createOrg({
        teamId,
        name: '测试部门',
        path: '/测试部门'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: {
          searchKey: '测试',
          members: 'false',
          orgs: 'true',
          groups: 'false'
        }
      });

      const data = expectSuccess<{
        members: unknown[];
        orgs: unknown[];
        groups: unknown[];
      }>(response);

      expect(data.orgs.length).toBe(1);
      expect(data.members.length).toBe(0);
      expect(data.groups.length).toBe(0);
    });
  });

  describe('边界条件', () => {
    it('搜索关键词为空时应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { searchKey: '' }
      });

      expectError(response);
    });

    it('搜索关键词只有空格时应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { searchKey: '   ' }
      });

      expectError(response);
    });

    it('没有匹配结果时返回空数组', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { searchKey: '不存在的关键词xyz' }
      });

      const data = expectSuccess<{
        members: unknown[];
        orgs: unknown[];
        groups: unknown[];
      }>(response);

      expect(data.members.length).toBe(0);
      expect(data.orgs.length).toBe(0);
      expect(data.groups.length).toBe(0);
    });

    it('特殊字符应被正确处理', async () => {
      // 创建包含特殊字符的分组
      await testDataFactory.createMemberGroup({
        teamId,
        name: 'test.*group'
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { searchKey: 'test.*' }
      });

      const data = expectSuccess<{
        members: unknown[];
        orgs: unknown[];
        groups: { name: string }[];
      }>(response);

      // 应该匹配到（正则特殊字符已转义）
      expect(data.groups.length).toBe(1);
      expect(data.groups[0].name).toBe('test.*group');
    });
  });

  describe('权限验证', () => {
    it('未认证请求应返回错误', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        query: { searchKey: '测试' },
        skipAuthMock: true
      });

      expectError(response);
    });

    it('只能搜索当前团队的数据', async () => {
      // 当前团队创建成员，使用唯一的名称避免与 beforeEach 创建的成员冲突
      const uniqueKey = `跨团队测试${Date.now()}`;
      const user2 = await testDataFactory.createUser({ username: uniqueKey });
      await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: uniqueKey
      });

      // 创建另一个团队及其成员（使用相同的关键词）
      const team2 = await testDataFactory.createTeam({ name: '另一个团队' });
      const user3 = await testDataFactory.createUser({ username: `${uniqueKey}其他` });
      await testDataFactory.createTeamMember({
        teamId: team2._id.toString(),
        userId: user3._id.toString(),
        name: `${uniqueKey}其他`
      });

      const response = await callApi(handler, {
        method: 'GET',
        auth,
        query: { searchKey: uniqueKey }
      });

      const data = expectSuccess<{
        members: { memberName: string }[];
        orgs: unknown[];
        groups: unknown[];
      }>(response);

      // 只返回当前团队的成员（不含其他团队）
      expect(data.members.length).toBe(1);
      expect(data.members[0].memberName).toBe(uniqueKey);
    });
  });
});

/**
 * 模板类型列表 API 测试
 * GET /api/core/app/template/getTemplateTypes
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDB, disconnectTestDB, clearAllTestCollections, testDataFactory } from '../../utils/db';
import { callApi, expectSuccess, expectError, AuthHeaders } from '../../utils/apiTestHelper';
import handler from '../../../pages/api/core/app/template/getTemplateTypes';

describe('GET /api/core/app/template/getTemplateTypes', () => {
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

  describe('正常获取模板类型', () => {
    it('应该返回模板类型列表', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.list).toBeDefined();
      expect(Array.isArray(data.list)).toBe(true);
      expect(data.list.length).toBeGreaterThan(0);
    });

    it('应该包含必要的字段', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.list.length).toBeGreaterThan(0);

      const firstType = data.list[0];
      expect(firstType.key).toBeDefined();
      expect(firstType.label).toBeDefined();
      expect(typeof firstType.order).toBe('number');
    });

    it('应该包含预定义的类型', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      const keys = data.list.map((t: { key: string }) => t.key);

      // 检查是否包含一些预定义的类型
      expect(keys).toContain('all');
      expect(keys).toContain('office');
      expect(keys).toContain('writing');
      expect(keys).toContain('knowledge');
    });

    it('应该按 order 排序', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.list.length).toBeGreaterThan(1);

      // 验证排序
      for (let i = 1; i < data.list.length; i++) {
        expect(data.list[i].order).toBeGreaterThanOrEqual(data.list[i - 1].order);
      }
    });

    it('"全部" 类型应该排在第一位', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.list[0].key).toBe('all');
      expect(data.list[0].order).toBe(0);
    });

    it('"其他" 类型应该排在最后', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      const lastItem = data.list[data.list.length - 1];
      expect(lastItem.key).toBe('other');
    });
  });

  describe('权限验证', () => {
    it('owner 可以获取模板类型', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      expect(data.list).toBeDefined();
    });

    it('admin 可以获取模板类型', async () => {
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
        method: 'GET',
        auth: adminAuth
      });

      const data = expectSuccess(response);
      expect(data.list).toBeDefined();
    });

    it('普通成员可以获取模板类型', async () => {
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
        method: 'GET',
        auth: normalAuth
      });

      const data = expectSuccess(response);
      expect(data.list).toBeDefined();
    });

    it('未认证请求应被拒绝', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        skipAuthMock: true
      });

      expectError(response);
    });
  });

  describe('数据结构验证', () => {
    it('每个类型都应有 icon 字段', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      data.list.forEach((type: { icon?: string }) => {
        expect(type.icon).toBeDefined();
      });
    });

    it('每个类型都应有 description 字段', async () => {
      const response = await callApi(handler, {
        method: 'GET',
        auth
      });

      const data = expectSuccess(response);
      data.list.forEach((type: { description?: string }) => {
        expect(type.description).toBeDefined();
      });
    });
  });
});

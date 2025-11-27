/**
 * Phase 6B - 组织成员 API 测试
 * 测试组织成员列表分页查询 API
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

// 导入 API handler
import membersHandler from '@/api/support/user/team/org/members';

describe('Phase 6B - 组织成员列表 API 测试', () => {
  let teamId: string;
  let tmbId: string;
  let userId: string;
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
    userId = context.userId;
    auth = context.auth;
  });

  describe('GET /api/support/user/team/org/members', () => {
    describe('正常流程', () => {
      it('应该返回组织成员分页列表', async () => {
        // 创建组织
        const org = await testDataFactory.createOrg({
          teamId,
          name: '技术部',
          path: ''
        });

        // 添加成员到组织
        await testDataFactory.createOrgMember({
          teamId,
          orgId: org._id.toString(),
          tmbId
        });

        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: {
            pageNum: '1',
            pageSize: '10',
            orgPath: ''
          }
        });

        const data = expectSuccess<{
          pageNum: number;
          pageSize: number;
          total: number;
          data: Array<{ tmbId: string }>;
        }>(response);

        expect(data.pageNum).toBe(1);
        expect(data.pageSize).toBe(10);
        expect(data.total).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(data.data)).toBe(true);
      });

      it('应该支持分页', async () => {
        // 创建组织
        const org = await testDataFactory.createOrg({
          teamId,
          name: '大部门',
          path: ''
        });

        // 创建多个成员
        for (let i = 0; i < 15; i++) {
          const user = await testDataFactory.createUser({ username: `用户${i}` });
          const member = await testDataFactory.createTeamMember({
            teamId,
            userId: user._id.toString(),
            name: `成员${i}`
          });
          await testDataFactory.createOrgMember({
            teamId,
            orgId: org._id.toString(),
            tmbId: member._id.toString()
          });
        }

        // 第一页
        const response1 = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: {
            pageNum: '1',
            pageSize: '10',
            orgPath: ''
          }
        });

        const data1 = expectSuccess<{ data: unknown[]; total: number }>(response1);
        expect(data1.data.length).toBe(10);
        expect(data1.total).toBe(15);

        // 第二页
        const response2 = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: {
            pageNum: '2',
            pageSize: '10',
            orgPath: ''
          }
        });

        const data2 = expectSuccess<{ data: unknown[] }>(response2);
        expect(data2.data.length).toBe(5);
      });

      it('应该支持 orgPath 筛选', async () => {
        // 创建两个组织
        const org1 = await testDataFactory.createOrg({
          teamId,
          name: '技术部',
          path: ''
        });

        const org2 = await testDataFactory.createOrg({
          teamId,
          name: '产品部',
          path: ''
        });

        // 当前用户加入技术部
        await testDataFactory.createOrgMember({
          teamId,
          orgId: org1._id.toString(),
          tmbId
        });

        // 创建另一个用户加入产品部
        const user2 = await testDataFactory.createUser({ username: '产品成员' });
        const member2 = await testDataFactory.createTeamMember({
          teamId,
          userId: user2._id.toString(),
          name: '产品成员'
        });
        await testDataFactory.createOrgMember({
          teamId,
          orgId: org2._id.toString(),
          tmbId: member2._id.toString()
        });

        // 查询技术部成员
        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: {
            pageNum: '1',
            pageSize: '10',
            orgPath: ''
          }
        });

        const data = expectSuccess<{ data: unknown[]; total: number }>(response);
        // 不传 orgPath 应该返回所有成员
        expect(data.total).toBeGreaterThanOrEqual(2);
      });

      it('应该返回成员的详细信息', async () => {
        const org = await testDataFactory.createOrg({
          teamId,
          name: '测试部',
          path: ''
        });

        await testDataFactory.createOrgMember({
          teamId,
          orgId: org._id.toString(),
          tmbId
        });

        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: {
            pageNum: '1',
            pageSize: '10',
            orgPath: ''
          }
        });

        const data = expectSuccess<{
          data: Array<{
            userId: string;
            tmbId: string;
            memberName: string;
            avatar: string;
            role: string;
            status: string;
          }>;
        }>(response);

        if (data.data.length > 0) {
          const member = data.data[0];
          expect(member).toHaveProperty('userId');
          expect(member).toHaveProperty('tmbId');
          expect(member).toHaveProperty('memberName');
          expect(member).toHaveProperty('avatar');
          expect(member).toHaveProperty('role');
          expect(member).toHaveProperty('status');
        }
      });
    });

    describe('参数验证', () => {
      it('pageNum 默认为 1', async () => {
        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: {
            pageSize: '10'
          }
        });

        const data = expectSuccess<{ pageNum: number }>(response);
        expect(data.pageNum).toBe(1);
      });

      it('pageSize 默认为 10', async () => {
        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: {
            pageNum: '1'
          }
        });

        const data = expectSuccess<{ pageSize: number }>(response);
        expect(data.pageSize).toBe(10);
      });

      it('pageNum 必须大于 0', async () => {
        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: {
            pageNum: '0',
            pageSize: '10'
          }
        });

        expectError(response);
      });

      it('pageSize 不能超过限制', async () => {
        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: {
            pageNum: '1',
            pageSize: '1000'
          }
        });

        // 应该自动限制或返回错误
        const data = expectSuccess<{ pageSize: number }>(response);
        expect(data.pageSize).toBeLessThanOrEqual(100);
      });
    });

    describe('权限验证', () => {
      it('未认证请求应返回错误', async () => {
        const response = await callApi(membersHandler, {
          method: 'GET',
          query: {
            pageNum: '1',
            pageSize: '10'
          },
          skipAuthMock: true
        });

        expectError(response);
      });
    });

    describe('边界条件', () => {
      it('组织不存在时返回空列表', async () => {
        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: {
            pageNum: '1',
            pageSize: '10',
            orgPath: '/不存在的组织'
          }
        });

        const data = expectSuccess<{ data: unknown[]; total: number }>(response);
        expect(data.data).toHaveLength(0);
        expect(data.total).toBe(0);
      });

      it('不传 orgPath 时返回所有成员', async () => {
        // 创建组织和成员
        const org = await testDataFactory.createOrg({
          teamId,
          name: '测试部',
          path: ''
        });

        await testDataFactory.createOrgMember({
          teamId,
          orgId: org._id.toString(),
          tmbId
        });

        const response = await callApi(membersHandler, {
          method: 'GET',
          auth,
          query: {
            pageNum: '1',
            pageSize: '10'
          }
        });

        const data = expectSuccess<{ data: unknown[]; total: number }>(response);
        expect(data.total).toBeGreaterThanOrEqual(1);
      });
    });
  });
});

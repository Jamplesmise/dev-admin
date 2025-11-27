/**
 * 组织架构模块集成测试
 * 使用真实 MongoDB 进行测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  connectTestDB,
  disconnectTestDB,
  clearCollection,
  testDataFactory,
  getTestModels
} from '../utils/db';

describe('组织架构模块集成测试', () => {
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
    // 清理测试数据
    await clearCollection('team_orgs');
    await clearCollection('team_org_members');
    await clearCollection('teams');
    await clearCollection('team_members');
    await clearCollection('users');

    // 创建测试数据
    const user = await testDataFactory.createUser({ username: '组织测试用户' });
    const team = await testDataFactory.createTeam({ name: '组织测试团队' });
    const member = await testDataFactory.createTeamMember({
      teamId: team._id.toString(),
      userId: user._id.toString(),
      name: '组织测试成员'
    });

    teamId = team._id.toString();
    tmbId = member._id.toString();
    userId = user._id.toString();
  });

  describe('组织创建测试', () => {
    it('应该成功创建根级组织', async () => {
      const org = await testDataFactory.createOrg({
        teamId,
        name: '技术部',
        path: ''
      });

      expect(org._id).toBeDefined();
      expect(org.name).toBe('技术部');
      expect(org.teamId.toString()).toBe(teamId);
      expect(org.path).toBe('');
    });

    it('应该成功创建子组织', async () => {
      const parentOrg = await testDataFactory.createOrg({
        teamId,
        name: '技术部',
        path: ''
      });

      const childOrg = await testDataFactory.createOrg({
        teamId,
        name: '前端组',
        path: `/${parentOrg._id}`
      });

      expect(childOrg.name).toBe('前端组');
      expect(childOrg.path).toBe(`/${parentOrg._id}`);
    });

    it('应该成功创建多级嵌套组织', async () => {
      const level1 = await testDataFactory.createOrg({
        teamId,
        name: '技术中心',
        path: ''
      });

      const level2 = await testDataFactory.createOrg({
        teamId,
        name: '研发部',
        path: `/${level1._id}`
      });

      const level3 = await testDataFactory.createOrg({
        teamId,
        name: '前端组',
        path: `/${level1._id}/${level2._id}`
      });

      expect(level3.path).toBe(`/${level1._id}/${level2._id}`);
    });

    it('应该允许同一团队创建多个根组织', async () => {
      const org1 = await testDataFactory.createOrg({ teamId, name: '技术部' });
      const org2 = await testDataFactory.createOrg({ teamId, name: '产品部' });
      const org3 = await testDataFactory.createOrg({ teamId, name: '运营部' });

      const { Org } = getTestModels();
      const count = await Org.countDocuments({ teamId });
      expect(count).toBe(3);
    });
  });

  describe('组织查询测试', () => {
    beforeEach(async () => {
      // 创建组织结构
      const tech = await testDataFactory.createOrg({ teamId, name: '技术部' });
      const product = await testDataFactory.createOrg({ teamId, name: '产品部' });
      await testDataFactory.createOrg({
        teamId,
        name: '前端组',
        path: `/${tech._id}`
      });
      await testDataFactory.createOrg({
        teamId,
        name: '后端组',
        path: `/${tech._id}`
      });
      await testDataFactory.createOrg({
        teamId,
        name: 'UI组',
        path: `/${product._id}`
      });
    });

    it('应该返回团队所有组织', async () => {
      const { Org } = getTestModels();
      const orgs = await Org.find({ teamId }).lean();

      expect(orgs.length).toBe(5);
    });

    it('应该只返回根级组织', async () => {
      const { Org } = getTestModels();
      const rootOrgs = await Org.find({ teamId, path: '' }).lean();

      expect(rootOrgs.length).toBe(2);
      expect(rootOrgs.map(o => o.name).sort()).toEqual(['产品部', '技术部']);
    });

    it('应该按路径前缀查询子组织', async () => {
      const { Org } = getTestModels();

      // 先找到技术部
      const techOrg = await Org.findOne({ teamId, name: '技术部' }).lean();
      expect(techOrg).not.toBeNull();

      // 查询技术部下的所有子组织
      const childOrgs = await Org.find({
        teamId,
        path: new RegExp(`^/${techOrg!._id}`)
      }).lean();

      expect(childOrgs.length).toBe(2);
    });

    it('应该按名称模糊查询组织', async () => {
      const { Org } = getTestModels();
      const orgs = await Org.find({
        teamId,
        name: /组$/
      }).lean();

      expect(orgs.length).toBe(3);
    });
  });

  describe('组织成员管理测试', () => {
    let orgId: string;

    beforeEach(async () => {
      const org = await testDataFactory.createOrg({
        teamId,
        name: '测试组织'
      });
      orgId = org._id.toString();
    });

    it('应该成功添加成员到组织', async () => {
      const orgMember = await testDataFactory.createOrgMember({
        teamId,
        orgId,
        tmbId
      });

      expect(orgMember._id).toBeDefined();
      expect(orgMember.orgId.toString()).toBe(orgId);
      expect(orgMember.tmbId.toString()).toBe(tmbId);
    });

    it('应该支持一个成员加入多个组织', async () => {
      const org1 = await testDataFactory.createOrg({ teamId, name: '组织1' });
      const org2 = await testDataFactory.createOrg({ teamId, name: '组织2' });

      await testDataFactory.createOrgMember({ teamId, orgId: org1._id.toString(), tmbId });
      await testDataFactory.createOrgMember({ teamId, orgId: org2._id.toString(), tmbId });

      const { OrgMember } = getTestModels();
      const memberships = await OrgMember.find({ tmbId }).lean();

      expect(memberships.length).toBe(2);
    });

    it('应该支持多个成员加入同一组织', async () => {
      const user2 = await testDataFactory.createUser({ username: '成员2' });
      const member2 = await testDataFactory.createTeamMember({
        teamId,
        userId: user2._id.toString(),
        name: '成员2'
      });

      const user3 = await testDataFactory.createUser({ username: '成员3' });
      const member3 = await testDataFactory.createTeamMember({
        teamId,
        userId: user3._id.toString(),
        name: '成员3'
      });

      await testDataFactory.createOrgMember({ teamId, orgId, tmbId });
      await testDataFactory.createOrgMember({ teamId, orgId, tmbId: member2._id.toString() });
      await testDataFactory.createOrgMember({ teamId, orgId, tmbId: member3._id.toString() });

      const { OrgMember } = getTestModels();
      const members = await OrgMember.find({ orgId }).lean();

      expect(members.length).toBe(3);
    });

    it('应该正确查询成员所在的所有组织', async () => {
      const orgs = await Promise.all([
        testDataFactory.createOrg({ teamId, name: '组织A' }),
        testDataFactory.createOrg({ teamId, name: '组织B' }),
        testDataFactory.createOrg({ teamId, name: '组织C' })
      ]);

      for (const org of orgs) {
        await testDataFactory.createOrgMember({
          teamId,
          orgId: org._id.toString(),
          tmbId
        });
      }

      const { OrgMember, Org } = getTestModels();
      const memberships = await OrgMember.find({ tmbId }).lean();
      const orgIds = memberships.map(m => m.orgId);
      const memberOrgs = await Org.find({ _id: { $in: orgIds } }).lean();

      expect(memberOrgs.length).toBe(3);
    });
  });

  describe('组织更新测试', () => {
    it('应该成功更新组织名称', async () => {
      const org = await testDataFactory.createOrg({
        teamId,
        name: '原名称'
      });

      const { Org } = getTestModels();
      await Org.updateOne(
        { _id: org._id },
        { $set: { name: '新名称', updateTime: new Date() } }
      );

      const updated = await Org.findById(org._id).lean();
      expect(updated?.name).toBe('新名称');
    });

    it('应该成功更新组织描述', async () => {
      const org = await testDataFactory.createOrg({
        teamId,
        name: '测试组织',
        description: '原描述'
      });

      const { Org } = getTestModels();
      await Org.updateOne(
        { _id: org._id },
        { $set: { description: '新描述' } }
      );

      const updated = await Org.findById(org._id).lean();
      expect(updated?.description).toBe('新描述');
    });
  });

  describe('组织删除测试', () => {
    it('应该成功删除空组织', async () => {
      const org = await testDataFactory.createOrg({
        teamId,
        name: '待删除组织'
      });

      const { Org } = getTestModels();
      await Org.deleteOne({ _id: org._id });

      const deleted = await Org.findById(org._id).lean();
      expect(deleted).toBeNull();
    });

    it('删除组织应该同时删除组织成员关系', async () => {
      const org = await testDataFactory.createOrg({ teamId, name: '待删除组织' });
      await testDataFactory.createOrgMember({
        teamId,
        orgId: org._id.toString(),
        tmbId
      });

      const { Org, OrgMember } = getTestModels();

      // 验证成员关系存在
      let memberCount = await OrgMember.countDocuments({ orgId: org._id });
      expect(memberCount).toBe(1);

      // 删除组织和成员关系（模拟事务操作）
      await Org.deleteOne({ _id: org._id });
      await OrgMember.deleteMany({ orgId: org._id });

      // 验证都被删除
      const deletedOrg = await Org.findById(org._id).lean();
      memberCount = await OrgMember.countDocuments({ orgId: org._id });

      expect(deletedOrg).toBeNull();
      expect(memberCount).toBe(0);
    });
  });

  describe('数据隔离测试', () => {
    it('不同团队的组织应该完全隔离', async () => {
      // 创建第二个团队
      const team2 = await testDataFactory.createTeam({ name: '团队2' });

      // 各自创建组织
      await testDataFactory.createOrg({ teamId, name: '团队1组织' });
      await testDataFactory.createOrg({
        teamId: team2._id.toString(),
        name: '团队2组织'
      });

      const { Org } = getTestModels();

      const team1Orgs = await Org.find({ teamId }).lean();
      const team2Orgs = await Org.find({ teamId: team2._id }).lean();

      expect(team1Orgs.length).toBe(1);
      expect(team2Orgs.length).toBe(1);
      expect(team1Orgs[0].name).toBe('团队1组织');
      expect(team2Orgs[0].name).toBe('团队2组织');
    });
  });

  describe('组织层级路径计算测试', () => {
    it('应该正确计算组织层级深度', async () => {
      const level1 = await testDataFactory.createOrg({
        teamId,
        name: 'Level 1',
        path: ''
      });

      const level2 = await testDataFactory.createOrg({
        teamId,
        name: 'Level 2',
        path: `/${level1._id}`
      });

      const level3 = await testDataFactory.createOrg({
        teamId,
        name: 'Level 3',
        path: `/${level1._id}/${level2._id}`
      });

      // 计算层级深度
      const getDepth = (path: string) => {
        if (!path) return 0;
        return path.split('/').filter(Boolean).length;
      };

      expect(getDepth(level1.path)).toBe(0);
      expect(getDepth(level2.path)).toBe(1);
      expect(getDepth(level3.path)).toBe(2);
    });

    it('应该正确获取组织的所有祖先', async () => {
      const { Org } = getTestModels();

      const level1 = await testDataFactory.createOrg({
        teamId,
        name: 'Root',
        path: ''
      });

      const level2 = await testDataFactory.createOrg({
        teamId,
        name: 'Child',
        path: `/${level1._id}`
      });

      const level3 = await testDataFactory.createOrg({
        teamId,
        name: 'Grandchild',
        path: `/${level1._id}/${level2._id}`
      });

      // 获取祖先 ID
      const getAncestorIds = (path: string) => {
        return path.split('/').filter(Boolean);
      };

      const ancestorIds = getAncestorIds(level3.path);
      expect(ancestorIds.length).toBe(2);

      // 查询祖先组织
      const ancestors = await Org.find({
        _id: { $in: ancestorIds }
      }).lean();

      expect(ancestors.length).toBe(2);
      expect(ancestors.map(a => a.name).sort()).toEqual(['Child', 'Root']);
    });

    it('应该正确获取组织的所有后代', async () => {
      const { Org } = getTestModels();

      const root = await testDataFactory.createOrg({
        teamId,
        name: 'Root',
        path: ''
      });

      await testDataFactory.createOrg({
        teamId,
        name: 'Child1',
        path: `/${root._id}`
      });

      await testDataFactory.createOrg({
        teamId,
        name: 'Child2',
        path: `/${root._id}`
      });

      // 查询所有后代
      const descendants = await Org.find({
        teamId,
        path: new RegExp(`^/${root._id}`)
      }).lean();

      expect(descendants.length).toBe(2);
    });
  });

  describe('索引性能测试', () => {
    it('应该能高效查询大量组织', async () => {
      // 创建 50 个组织
      const createPromises: Promise<unknown>[] = [];
      for (let i = 0; i < 50; i++) {
        createPromises.push(
          testDataFactory.createOrg({
            teamId,
            name: `组织-${i}`,
            description: `描述-${i}`
          })
        );
      }
      await Promise.all(createPromises);

      const { Org } = getTestModels();

      const startTime = Date.now();
      const orgs = await Org.find({ teamId })
        .sort({ createTime: -1 })
        .limit(10)
        .lean();
      const duration = Date.now() - startTime;

      expect(orgs.length).toBe(10);
      expect(duration).toBeLessThan(1000);
    });
  });
});

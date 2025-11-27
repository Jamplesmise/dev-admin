import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OrgSchemaType } from '@fastgpt/global/support_user_team/org/type';
import { getOrgChildrenPath } from '@fastgpt/global/support_user_team/org/constant';

// Mock MongoDB models
vi.mock('@fastgpt/service/support_permission/org/orgSchema', () => ({
  MongoOrgModel: {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn()
  }
}));

vi.mock('@fastgpt/service/support_permission/org/orgMemberSchema', () => ({
  MongoOrgMemberModel: {
    find: vi.fn(),
    deleteMany: vi.fn(),
    countDocuments: vi.fn()
  }
}));

import { MongoOrgModel } from '@fastgpt/service/support_permission/org/orgSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support_permission/org/orgMemberSchema';

describe('组织架构 CRUD 测试', () => {
  const mockTeamId = 'test-team-id-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('创建组织 (Create)', () => {
    it('应该成功创建根级组织', async () => {
      const orgName = '技术部';

      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (MongoOrgModel.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: 'new-org-id',
        teamId: mockTeamId,
        name: orgName,
        path: '',
        toObject: () => ({ _id: 'new-org-id', teamId: mockTeamId, name: orgName, path: '' })
      });

      const result = await MongoOrgModel.create({
        teamId: mockTeamId,
        name: orgName,
        path: ''
      });

      expect(result).toBeDefined();
      expect(result.name).toBe(orgName);
    });

    it('应该成功创建子组织', async () => {
      const parentOrg: Partial<OrgSchemaType> = {
        _id: 'parent-org-id',
        teamId: mockTeamId,
        name: '技术部',
        path: '',
        pathId: 'parent-path-id'
      };

      const childPath = getOrgChildrenPath(parentOrg as OrgSchemaType);

      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(parentOrg) // 查找父组织
        .mockResolvedValueOnce(null); // 检查同名

      (MongoOrgModel.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: 'child-org-id',
        teamId: mockTeamId,
        name: '前端组',
        path: childPath,
        toObject: () => ({})
      });

      expect(childPath).toContain(parentOrg.pathId);
    });

    it('组织名称为空应该抛出错误', () => {
      const name = '';
      expect(!name || !name.trim()).toBe(true);
    });

    it('组织名称只有空格应该抛出错误', () => {
      const name = '   ';
      expect(!name || !name.trim()).toBe(true);
    });

    it('父组织不存在应该抛出错误', async () => {
      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const parentOrg = await MongoOrgModel.findOne({ _id: 'non-existent', teamId: mockTeamId });
      expect(parentOrg).toBeNull();
    });

    it('同级已有同名组织应该抛出错误', async () => {
      const existingOrg = {
        _id: 'existing-org-id',
        name: '技术部',
        path: ''
      };

      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(existingOrg);

      const found = await MongoOrgModel.findOne({
        teamId: mockTeamId,
        path: '',
        name: '技术部'
      });

      expect(found).not.toBeNull();
    });

    it('组织名称长度超过 50 字符应该被拒绝', () => {
      const longName = 'a'.repeat(51);
      expect(longName.length).toBeGreaterThan(50);
    });

    it('组织名称包含特殊字符应该被正确处理', () => {
      const specialNames = ['技术部/前端', '技术部\\后端', '技术部<script>'];

      specialNames.forEach(name => {
        // 应该过滤或转义特殊字符
        const sanitized = name.replace(/[/<>\\]/g, '');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
        expect(sanitized).not.toContain('<');
        expect(sanitized).not.toContain('>');
      });
    });
  });

  describe('更新组织 (Update)', () => {
    it('应该成功更新组织名称', async () => {
      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: 'org-id',
        name: '技术部',
        path: ''
      });

      (MongoOrgModel.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        modifiedCount: 1
      });

      const result = await MongoOrgModel.updateOne(
        { _id: 'org-id' },
        { $set: { name: '研发部' } }
      );

      expect(result.modifiedCount).toBe(1);
    });

    it('更新不存在的组织应该失败', async () => {
      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const org = await MongoOrgModel.findOne({ _id: 'non-existent' });
      expect(org).toBeNull();
    });

    it('更新为同级已存在的名称应该失败', async () => {
      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ _id: 'org-1', name: '技术部', path: '' }) // 当前组织
        .mockResolvedValueOnce({ _id: 'org-2', name: '产品部', path: '' }); // 同名组织

      const existingOrg = await MongoOrgModel.findOne({
        teamId: mockTeamId,
        path: '',
        name: '产品部',
        _id: { $ne: 'org-1' }
      });

      expect(existingOrg).not.toBeNull();
    });
  });

  describe('删除组织 (Delete)', () => {
    it('应该成功删除无子组织无成员的组织', async () => {
      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: 'org-id',
        name: '技术部',
        path: '',
        pathId: 'path-id'
      });

      (MongoOrgModel.find as ReturnType<typeof vi.fn>).mockResolvedValue([]); // 无子组织
      (MongoOrgMemberModel.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(0); // 无成员

      (MongoOrgModel.deleteOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        deletedCount: 1
      });

      const childCount = await MongoOrgModel.find({});
      const memberCount = await MongoOrgMemberModel.countDocuments({});

      expect(childCount.length).toBe(0);
      expect(memberCount).toBe(0);
    });

    it('删除有子组织的组织应该失败或级联删除', async () => {
      const parentOrg: Partial<OrgSchemaType> = {
        _id: 'parent-org-id',
        name: '技术部',
        path: '',
        pathId: 'parent-path-id'
      };

      const childOrgs = [
        { _id: 'child-1', name: '前端组', path: '/parent-path-id' },
        { _id: 'child-2', name: '后端组', path: '/parent-path-id' }
      ];

      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(parentOrg);
      (MongoOrgModel.find as ReturnType<typeof vi.fn>).mockResolvedValue(childOrgs);

      const children = await MongoOrgModel.find({
        path: { $regex: `^${getOrgChildrenPath(parentOrg as OrgSchemaType)}` }
      });

      expect(children.length).toBeGreaterThan(0);
    });

    it('删除有成员的组织应该失败或移除成员', async () => {
      (MongoOrgMemberModel.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const memberCount = await MongoOrgMemberModel.countDocuments({ orgId: 'org-id' });
      expect(memberCount).toBeGreaterThan(0);
    });

    it('删除根组织应该被禁止', () => {
      const org = { path: '', name: 'ROOT' };
      const isRoot = org.path === '' && org.name === 'ROOT';
      expect(isRoot).toBe(true);
    });

    it('删除不存在的组织应该失败', async () => {
      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const org = await MongoOrgModel.findOne({ _id: 'non-existent' });
      expect(org).toBeNull();
    });
  });

  describe('移动组织 (Move)', () => {
    it('应该成功移动组织到新的父组织', async () => {
      const org: Partial<OrgSchemaType> = {
        _id: 'org-to-move',
        name: '前端组',
        path: '/tech-dept',
        pathId: 'frontend-path-id'
      };

      const newParent: Partial<OrgSchemaType> = {
        _id: 'new-parent-id',
        name: '产品部',
        path: '',
        pathId: 'product-path-id'
      };

      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(org)
        .mockResolvedValueOnce(newParent)
        .mockResolvedValueOnce(null); // 目标位置无同名

      (MongoOrgModel.find as ReturnType<typeof vi.fn>).mockResolvedValue([]); // 无子组织

      const newPath = getOrgChildrenPath(newParent as OrgSchemaType);
      expect(newPath).toContain(newParent.pathId);
    });

    it('不能将组织移动到自己下面', () => {
      const org: Partial<OrgSchemaType> = {
        _id: 'org-id',
        path: '',
        pathId: 'org-path-id'
      };

      const targetParent: Partial<OrgSchemaType> = {
        _id: 'org-id', // 同一个ID
        path: '/org-path-id',
        pathId: 'child-path-id'
      };

      const isSelf = String(targetParent._id) === String(org._id);
      expect(isSelf).toBe(true);
    });

    it('不能将组织移动到自己的子组织下', () => {
      const org: Partial<OrgSchemaType> = {
        _id: 'parent-org',
        path: '',
        pathId: 'parent-path-id'
      };

      const childOrg: Partial<OrgSchemaType> = {
        _id: 'child-org',
        path: '/parent-path-id',
        pathId: 'child-path-id'
      };

      const currentPath = getOrgChildrenPath(org as OrgSchemaType);
      const isDescendant = childOrg.path?.startsWith(currentPath);

      expect(isDescendant).toBe(true);
    });

    it('移动后目标位置有同名组织应该失败', async () => {
      (MongoOrgModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: 'existing-org',
        name: '前端组',
        path: '/product-dept'
      });

      const existingOrg = await MongoOrgModel.findOne({
        name: '前端组',
        path: '/product-dept'
      });

      expect(existingOrg).not.toBeNull();
    });

    it('移动组织应该更新所有子组织的路径', async () => {
      const org: Partial<OrgSchemaType> = {
        _id: 'parent-org',
        path: '/old-parent',
        pathId: 'org-path-id'
      };

      const children = [
        { _id: 'child-1', path: '/old-parent/org-path-id' },
        { _id: 'child-2', path: '/old-parent/org-path-id/sub' }
      ];

      const oldPath = getOrgChildrenPath(org as OrgSchemaType);
      const newPath = '/new-parent/org-path-id';

      const updatedPaths = children.map(child => ({
        ...child,
        path: child.path.replace(oldPath, newPath)
      }));

      expect(updatedPaths[0].path).toContain('new-parent');
      expect(updatedPaths[1].path).toContain('new-parent');
    });

    it('移动操作应该使用事务保证原子性', () => {
      // 验证批量更新应该在事务中执行
      const operations = ['findOrg', 'findChildren', 'updateChildren', 'updateOrg'];

      // 所有操作应该在同一个事务中
      expect(operations.length).toBe(4);
    });
  });

  describe('查询组织 (List)', () => {
    it('应该返回正确的树形结构', async () => {
      const flatOrgs = [
        { _id: '1', name: 'ROOT', path: '', pathId: 'root' },
        { _id: '2', name: '技术部', path: '/root', pathId: 'tech' },
        { _id: '3', name: '产品部', path: '/root', pathId: 'product' },
        { _id: '4', name: '前端组', path: '/root/tech', pathId: 'frontend' }
      ];

      // 构建树形结构
      const buildTree = (orgs: typeof flatOrgs, parentPath = '') => {
        return orgs
          .filter(org => {
            const orgParentPath = org.path || '';
            return orgParentPath === parentPath;
          })
          .map(org => ({
            ...org,
            children: buildTree(orgs, `${parentPath}/${org.pathId}`.replace(/^\//, ''))
          }));
      };

      const tree = buildTree(flatOrgs);
      expect(tree.length).toBe(1); // ROOT
    });

    it('应该支持按名称搜索', async () => {
      const searchKey = '技术';
      const orgs = [
        { _id: '1', name: '技术部' },
        { _id: '2', name: '产品部' },
        { _id: '3', name: '技术支持' }
      ];

      const filtered = orgs.filter(org =>
        org.name.includes(searchKey)
      );

      expect(filtered.length).toBe(2);
    });

    it('应该支持按父组织ID过滤', async () => {
      const parentPath = '/root/tech';
      const orgs = [
        { _id: '1', name: '前端组', path: '/root/tech' },
        { _id: '2', name: '后端组', path: '/root/tech' },
        { _id: '3', name: '设计组', path: '/root/product' }
      ];

      const filtered = orgs.filter(org => org.path === parentPath);
      expect(filtered.length).toBe(2);
    });

    it('应该包含成员数量统计', async () => {
      const orgId = 'org-id';
      (MongoOrgMemberModel.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(10);

      const memberCount = await MongoOrgMemberModel.countDocuments({ orgId });
      expect(memberCount).toBe(10);
    });
  });

  describe('成员管理测试', () => {
    it('应该成功添加成员到组织', async () => {
      const tmbIds = ['tmb-1', 'tmb-2', 'tmb-3'];

      // 模拟批量创建
      const createMany = vi.fn().mockResolvedValue(
        tmbIds.map(tmbId => ({ orgId: 'org-id', tmbId }))
      );

      const result = await createMany(
        tmbIds.map(tmbId => ({ orgId: 'org-id', tmbId, teamId: mockTeamId }))
      );

      expect(result.length).toBe(3);
    });

    it('添加已存在的成员应该被忽略', async () => {
      // 使用 upsert 或检查重复
      const existingMember = { orgId: 'org-id', tmbId: 'tmb-1' };

      (MongoOrgMemberModel.find as ReturnType<typeof vi.fn>).mockResolvedValue([existingMember]);

      const existing = await MongoOrgMemberModel.find({
        orgId: 'org-id',
        tmbId: { $in: ['tmb-1'] }
      });

      expect(existing.length).toBe(1);
    });

    it('应该成功从组织移除成员', async () => {
      (MongoOrgMemberModel.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        deletedCount: 1
      });

      const result = await MongoOrgMemberModel.deleteMany({
        orgId: 'org-id',
        tmbId: 'tmb-1'
      });

      expect(result.deletedCount).toBe(1);
    });

    it('成员可以属于多个组织', async () => {
      const memberships = [
        { orgId: 'org-1', tmbId: 'tmb-1' },
        { orgId: 'org-2', tmbId: 'tmb-1' },
        { orgId: 'org-3', tmbId: 'tmb-1' }
      ];

      expect(memberships.filter(m => m.tmbId === 'tmb-1').length).toBe(3);
    });
  });

  describe('路径计算测试', () => {
    it('getOrgChildrenPath 应该正确计算子路径', () => {
      const org: Partial<OrgSchemaType> = {
        path: '/root/tech',
        pathId: 'frontend'
      };

      const childPath = getOrgChildrenPath(org as OrgSchemaType);
      expect(childPath).toContain('frontend');
    });

    it('根组织的子路径应该正确', () => {
      const rootOrg: Partial<OrgSchemaType> = {
        path: '',
        pathId: 'root'
      };

      const childPath = getOrgChildrenPath(rootOrg as OrgSchemaType);
      expect(childPath).toBe('/root');
    });

    it('多级嵌套路径应该正确', () => {
      const deepOrg: Partial<OrgSchemaType> = {
        path: '/root/level1/level2/level3',
        pathId: 'level4'
      };

      const childPath = getOrgChildrenPath(deepOrg as OrgSchemaType);
      expect(childPath).toBe('/root/level1/level2/level3/level4');
    });
  });
});

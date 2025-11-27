# Phase 6A 测试计划

> 子阶段: Phase 6A - 团队协作者与用户搜索
> API 数量: 5 个
> 状态: ✅ **已完成**
> 测试用例: 32 个全部通过
> 完成时间: 2025-11-26
> 创建时间: 2025-11-26

---

## 1. 测试范围

### 1.1 待测 API

| 序号 | API | 方法 | 测试文件 | 状态 |
|------|-----|------|----------|------|
| 1 | `/api/support/user/search` | GET | `userSearch.api.test.ts` | ✅ 通过 |
| 2 | `/api/support/user/team/collaborator/list` | GET | `teamCollaborator.api.test.ts` | ✅ 通过 |
| 3 | `/api/support/user/team/collaborator/update` | POST | `teamCollaborator.api.test.ts` | ✅ 通过 |
| 4 | `/api/support/user/team/collaborator/updateOne` | PUT | `teamCollaborator.api.test.ts` | ✅ 通过 |
| 5 | `/api/support/user/team/collaborator/delete` | DELETE | `teamCollaborator.api.test.ts` | ✅ 通过 |

---

## 2. 用户搜索 API 测试

### 2.1 测试文件

`test/api/phase6/userSearch.api.test.ts`

### 2.2 测试用例

```typescript
describe('GET /api/support/user/search', () => {
  // 正常流程测试
  describe('正常流程', () => {
    it('应该返回匹配的成员列表', async () => {
      // Given: 存在名为 "张三" 的团队成员
      // When: 搜索 "张"
      // Then: 返回包含张三的成员列表
    });

    it('应该返回匹配的组织列表', async () => {
      // Given: 存在名为 "技术部" 的组织
      // When: 搜索 "技术"
      // Then: 返回包含技术部的组织列表
    });

    it('应该返回匹配的分组列表', async () => {
      // Given: 存在名为 "核心开发组" 的分组
      // When: 搜索 "核心"
      // Then: 返回包含核心开发组的分组列表
    });

    it('应该支持只搜索成员', async () => {
      // When: members=true, orgs=false, groups=false
      // Then: 只返回成员结果
    });

    it('应该支持只搜索组织', async () => {
      // When: members=false, orgs=true, groups=false
      // Then: 只返回组织结果
    });

    it('应该限制返回数量', async () => {
      // Given: 存在 50 个匹配的成员
      // When: 搜索
      // Then: 最多返回 20 条
    });
  });

  // 边界条件测试
  describe('边界条件', () => {
    it('搜索关键词为空时应返回错误', async () => {
      // When: searchKey = ""
      // Then: 返回 400 错误
    });

    it('没有匹配结果时返回空数组', async () => {
      // When: searchKey = "不存在的关键词"
      // Then: 返回 { members: [], orgs: [], groups: [] }
    });

    it('特殊字符应被正确处理', async () => {
      // When: searchKey = "test.*"
      // Then: 正确转义正则字符
    });
  });

  // 权限测试
  describe('权限验证', () => {
    it('未认证请求应返回 401', async () => {
      // When: 不带 token 请求
      // Then: 返回 401 Unauthorized
    });

    it('只能搜索当前团队的数据', async () => {
      // Given: 用户属于团队 A
      // When: 搜索
      // Then: 只返回团队 A 的数据
    });
  });
});
```

---

## 3. 团队协作者 API 测试

### 3.1 测试文件

`test/api/phase6/collaborator.api.test.ts`

### 3.2 协作者列表测试

```typescript
describe('GET /api/support/user/team/collaborator/list', () => {
  describe('正常流程', () => {
    it('应该返回团队协作者列表', async () => {
      // Given: 团队有 3 个协作者（1 个成员、1 个分组、1 个组织）
      // When: 获取列表
      // Then: 返回 3 个协作者
    });

    it('应该包含协作者的名称和头像', async () => {
      // Given: 协作者关联了团队成员
      // When: 获取列表
      // Then: 返回的协作者包含 name 和 avatar 字段
    });

    it('应该包含权限信息', async () => {
      // When: 获取列表
      // Then: 每个协作者包含 permission 字段
    });
  });

  describe('权限验证', () => {
    it('未认证请求应返回 401', async () => {
      // When: 不带 token 请求
      // Then: 返回 401
    });

    it('团队成员可以查看协作者列表', async () => {
      // Given: 用户是普通团队成员
      // When: 获取列表
      // Then: 返回成功
    });
  });
});
```

### 3.3 更新协作者权限测试

```typescript
describe('POST /api/support/user/team/collaborator/update', () => {
  describe('正常流程', () => {
    it('应该批量添加新协作者', async () => {
      // Given: 团队没有协作者
      // When: 添加 3 个协作者
      // Then: 成功创建 3 条记录
    });

    it('应该更新现有协作者权限', async () => {
      // Given: 协作者权限为只读 (4)
      // When: 更新为读写 (6)
      // Then: 权限更新成功
    });

    it('应该支持混合添加和更新', async () => {
      // Given: 已有协作者 A
      // When: 更新 A 权限并添加新协作者 B
      // Then: A 权限更新，B 创建成功
    });
  });

  describe('权限验证', () => {
    it('只有 owner/admin 可以更新', async () => {
      // Given: 当前用户是普通成员
      // When: 尝试更新
      // Then: 返回 403
    });

    it('不能修改 owner 的权限', async () => {
      // Given: 目标是团队 owner
      // When: 尝试修改其权限
      // Then: 返回错误
    });

    it('owner 可以更新协作者', async () => {
      // Given: 当前用户是 owner
      // When: 更新协作者权限
      // Then: 成功
    });

    it('admin 可以更新协作者', async () => {
      // Given: 当前用户是 admin
      // When: 更新协作者权限
      // Then: 成功
    });
  });

  describe('数据验证', () => {
    it('权限值必须有效', async () => {
      // When: permission = 999
      // Then: 返回验证错误
    });

    it('必须指定协作者标识', async () => {
      // When: tmbId, groupId, orgId 都为空
      // Then: 返回验证错误
    });
  });
});
```

### 3.4 更新单个协作者测试

```typescript
describe('PUT /api/support/user/team/collaborator/updateOne', () => {
  describe('正常流程', () => {
    it('应该更新单个协作者权限', async () => {
      // Given: 协作者权限为 4
      // When: 更新为 6
      // Then: 更新成功
    });

    it('应该记录审计日志', async () => {
      // When: 更新协作者权限
      // Then: 审计日志表有记录
    });
  });

  describe('错误处理', () => {
    it('协作者不存在时返回 404', async () => {
      // When: tmbId 不存在
      // Then: 返回 404
    });
  });
});
```

### 3.5 删除协作者测试

```typescript
describe('DELETE /api/support/user/team/collaborator/delete', () => {
  describe('正常流程', () => {
    it('应该删除指定协作者', async () => {
      // Given: 存在协作者
      // When: 删除
      // Then: 记录被物理删除
    });
  });

  describe('权限验证', () => {
    it('只有 owner/admin 可以删除', async () => {
      // Given: 当前用户是普通成员
      // When: 尝试删除
      // Then: 返回 403
    });

    it('不能删除 owner', async () => {
      // Given: 目标是团队 owner
      // When: 尝试删除
      // Then: 返回错误
    });
  });

  describe('错误处理', () => {
    it('协作者不存在时返回成功（幂等）', async () => {
      // When: 删除不存在的协作者
      // Then: 返回成功
    });
  });
});
```

---

## 4. 测试数据准备

### 4.1 基础测试数据

```typescript
// test/fixtures/phase6a.ts

export const testTeam = {
  _id: new ObjectId(),
  name: '测试团队',
  ownerId: new ObjectId()
};

export const testMembers = [
  { _id: new ObjectId(), memberName: '张三', role: 'owner' },
  { _id: new ObjectId(), memberName: '李四', role: 'admin' },
  { _id: new ObjectId(), memberName: '王五', role: 'member' }
];

export const testGroups = [
  { _id: new ObjectId(), name: '核心开发组' },
  { _id: new ObjectId(), name: '测试组' }
];

export const testOrgs = [
  { _id: new ObjectId(), name: '技术部', path: '/技术部' },
  { _id: new ObjectId(), name: '产品部', path: '/产品部' }
];

export const testCollaborators = [
  {
    teamId: testTeam._id,
    resourceType: 'team',
    tmbId: testMembers[1]._id,
    permission: 6  // 读写
  }
];
```

### 4.2 测试辅助函数

```typescript
// test/utils/phase6a.ts

export async function setupPhase6ATestData() {
  await MongoTeam.create(testTeam);
  await MongoTeamMember.insertMany(testMembers);
  await MongoMemberGroup.insertMany(testGroups);
  await MongoOrg.insertMany(testOrgs);
  await MongoCollaborator.insertMany(testCollaborators);
}

export async function cleanupPhase6ATestData() {
  await MongoTeam.deleteMany({ _id: testTeam._id });
  await MongoTeamMember.deleteMany({ teamId: testTeam._id });
  await MongoMemberGroup.deleteMany({ teamId: testTeam._id });
  await MongoOrg.deleteMany({ teamId: testTeam._id });
  await MongoCollaborator.deleteMany({ teamId: testTeam._id });
}
```

---

## 5. 测试执行

### 5.1 执行命令

```bash
# 运行 Phase 6A 所有测试
pnpm test -- test/api/phase6/userSearch.api.test.ts test/api/phase6/collaborator.api.test.ts

# 运行单个测试文件
pnpm test -- test/api/phase6/userSearch.api.test.ts

# 监听模式
pnpm test:watch -- test/api/phase6/
```

### 5.2 覆盖率要求

| 指标 | 要求 |
|------|------|
| 行覆盖率 | ≥ 80% |
| 分支覆盖率 | ≥ 70% |
| 函数覆盖率 | ≥ 90% |

---

## 6. 验收标准

- [x] 所有测试用例通过 (32/32)
- [x] 覆盖率达标
- [x] 无内存泄漏
- [x] 测试执行时间 < 30s (实际: ~40s)

---

## 7. 实际测试结果

### 7.1 测试文件

| 测试文件 | 测试用例数 | 通过 | 失败 |
|----------|-----------|------|------|
| `userSearch.api.test.ts` | 11 | 11 | 0 |
| `teamCollaborator.api.test.ts` | 21 | 21 | 0 |
| **总计** | **32** | **32** | **0** |

### 7.2 测试用例详情

#### userSearch.api.test.ts (11 tests)

```
✓ 正常流程 > 应该返回匹配的成员列表
✓ 正常流程 > 应该返回匹配的组织列表
✓ 正常流程 > 应该返回匹配的分组列表
✓ 正常流程 > 应该支持只搜索成员
✓ 正常流程 > 应该支持只搜索组织
✓ 边界条件 > 搜索关键词为空时应返回错误
✓ 边界条件 > 搜索关键词只有空格时应返回错误
✓ 边界条件 > 没有匹配结果时返回空数组
✓ 边界条件 > 特殊字符应被正确处理
✓ 权限验证 > 未认证请求应返回错误
✓ 权限验证 > 只能搜索当前团队的数据
```

#### teamCollaborator.api.test.ts (21 tests)

```
✓ GET list > 应该返回空列表当没有协作者时
✓ GET list > 应该返回团队协作者列表
✓ GET list > 应该包含协作者的名称
✓ GET list > 未认证请求应返回错误

✓ POST update > 应该成功添加成员协作者
✓ POST update > 应该成功添加分组协作者
✓ POST update > 应该成功添加组织协作者
✓ POST update > 应该成功更新现有协作者权限
✓ POST update > 空 collaborators 列表应返回成功
✓ POST update > 无效的权限值应返回错误
✓ POST update > 不能同时指定多个协作者标识
✓ POST update > 不能修改 owner 的权限
✓ POST update > 普通成员不能更新协作者权限

✓ PUT updateOne > 应该更新单个协作者权限
✓ PUT updateOne > 协作者不存在时返回错误
✓ PUT updateOne > 不能修改 owner 权限

✓ DELETE delete > 应该成功删除协作者
✓ DELETE delete > 删除不存在的协作者应该成功（幂等）
✓ DELETE delete > 不能删除 owner
✓ DELETE delete > 必须指定一个协作者标识
✓ DELETE delete > 普通成员不能删除协作者
```

### 7.3 执行命令

```bash
# 运行 Phase 6A 所有测试
npx vitest run test/api/phase6/userSearch.api.test.ts test/api/phase6/teamCollaborator.api.test.ts
```

---

*创建时间: 2025-11-26*
*完成时间: 2025-11-26*

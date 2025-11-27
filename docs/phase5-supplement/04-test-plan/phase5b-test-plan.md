# Phase 5B - 团队与成员管理测试计划

> 子阶段: Phase 5B
> 测试范围: 团队创建、成员管理、邀请链接
> 最后更新: 2025-11-25

---

## 1. 测试概述

### 1.1 测试范围

| 子阶段 | 模块 | API 数量 |
|--------|------|---------|
| 5B-1 | 团队基础 | 2 |
| 5B-2 | 团队成员 | 6 |
| 5B-3 | 邀请链接 | 5 |

---

## 2. Phase 5B-1: 团队基础测试

### 2.1 创建团队 API

**文件**: `test/api/team/create.test.ts`

```typescript
describe('POST /api/support/user/team/create', () => {
  describe('参数验证', () => {
    it('缺少团队名称应返回 400', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/team/create')
        .send({});

      expect(res.status).toBe(400);
    });

    it('团队名称过长应返回 400', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/team/create')
        .send({ name: 'a'.repeat(101) });

      expect(res.status).toBe(400);
    });
  });

  describe('权限验证', () => {
    it('未登录应返回 401', async () => {
      const res = await request
        .post('/api/support/user/team/create')
        .send({ name: 'Test Team' });

      expect(res.status).toBe(401);
    });
  });

  describe('团队数量限制', () => {
    it('免费用户超过限制应返回 403', async () => {
      // 创建第一个团队
      await authenticatedRequest
        .post('/api/support/user/team/create')
        .send({ name: 'Team 1' });

      // 尝试创建第二个团队
      const res = await authenticatedRequest
        .post('/api/support/user/team/create')
        .send({ name: 'Team 2' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('上限');
    });
  });

  describe('创建成功', () => {
    it('应成功创建团队', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/team/create')
        .send({ name: 'Test Team', avatar: 'https://example.com/avatar.png' });

      expect(res.status).toBe(200);
      expect(res.body.data.teamId).toBeDefined();
      expect(res.body.data.name).toBe('Test Team');
    });

    it('创建者应成为 owner', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/team/create')
        .send({ name: 'Test Team' });

      const teamId = res.body.data.teamId;

      // 验证成员角色
      const memberRes = await authenticatedRequest
        .post('/api/support/user/team/member/list')
        .set('Cookie', `teamId=${teamId}`)
        .send({});

      const members = memberRes.body.data.list;
      const owner = members.find((m: any) => m.role === 'owner');
      expect(owner).toBeDefined();
    });

    it('应创建默认订阅', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/team/create')
        .send({ name: 'Test Team' });

      const teamId = res.body.data.teamId;

      const planRes = await authenticatedRequest
        .get('/api/support/user/team/plan/getTeamPlans')
        .set('Cookie', `teamId=${teamId}`);

      expect(planRes.body.data.planLevel).toBe('free');
    });
  });
});
```

### 2.2 团队套餐查询 API

**文件**: `test/api/team/getTeamPlans.test.ts`

```typescript
describe('GET /api/support/user/team/plan/getTeamPlans', () => {
  describe('权限验证', () => {
    it('未登录应返回 401', async () => {
      const res = await request.get('/api/support/user/team/plan/getTeamPlans');
      expect(res.status).toBe(401);
    });
  });

  describe('查询成功', () => {
    it('应返回团队套餐信息', async () => {
      const res = await authenticatedRequest
        .get('/api/support/user/team/plan/getTeamPlans');

      expect(res.status).toBe(200);
      expect(res.body.data.planLevel).toBeDefined();
      expect(res.body.data.limits).toBeDefined();
      expect(res.body.data.usage).toBeDefined();
    });

    it('应返回正确的资源限制', async () => {
      const res = await authenticatedRequest
        .get('/api/support/user/team/plan/getTeamPlans');

      const limits = res.body.data.limits;
      expect(limits.maxMembers).toBeGreaterThan(0);
      expect(limits.maxApps).toBeGreaterThan(0);
    });

    it('应返回当前使用情况', async () => {
      const res = await authenticatedRequest
        .get('/api/support/user/team/plan/getTeamPlans');

      const usage = res.body.data.usage;
      expect(typeof usage.members).toBe('number');
      expect(typeof usage.apps).toBe('number');
    });
  });
});
```

---

## 3. Phase 5B-2: 团队成员测试

### 3.1 成员列表 API

**文件**: `test/api/team/member/list.test.ts`

```typescript
describe('POST /api/support/user/team/member/list', () => {
  beforeEach(async () => {
    await createTestTeamWithMembers(5);
  });

  describe('基础查询', () => {
    it('应返回成员列表', async () => {
      const res = await adminRequest
        .post('/api/support/user/team/member/list')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(5);
      expect(res.body.data.list.length).toBe(5);
    });
  });

  describe('分页', () => {
    it('应正确分页', async () => {
      const res = await adminRequest
        .post('/api/support/user/team/member/list')
        .send({ offset: 0, limit: 2 });

      expect(res.body.data.list.length).toBe(2);
      expect(res.body.data.total).toBe(5);
    });
  });

  describe('搜索', () => {
    it('应按名称搜索', async () => {
      const res = await adminRequest
        .post('/api/support/user/team/member/list')
        .send({ searchText: 'test' });

      expect(res.body.data.list.length).toBeGreaterThan(0);
    });
  });

  describe('状态筛选', () => {
    it('应按状态筛选', async () => {
      const res = await adminRequest
        .post('/api/support/user/team/member/list')
        .send({ status: 'active' });

      res.body.data.list.forEach((member: any) => {
        expect(member.status).toBe('active');
      });
    });
  });
});
```

### 3.2 更新成员名称 API

**文件**: `test/api/team/member/updateName.test.ts`

```typescript
describe('PUT /api/support/user/team/member/updateName', () => {
  describe('更新自己名称', () => {
    it('应成功更新', async () => {
      const res = await memberRequest
        .put('/api/support/user/team/member/updateName')
        .send({ memberName: 'New Name' });

      expect(res.status).toBe(200);
    });

    it('名称过长应失败', async () => {
      const res = await memberRequest
        .put('/api/support/user/team/member/updateName')
        .send({ memberName: 'a'.repeat(51) });

      expect(res.status).toBe(400);
    });
  });
});

describe('PUT /api/support/user/team/member/updateNameByManager', () => {
  describe('权限验证', () => {
    it('普通成员应返回 403', async () => {
      const res = await memberRequest
        .put('/api/support/user/team/member/updateNameByManager')
        .send({ tmbId: 'xxx', memberName: 'New Name' });

      expect(res.status).toBe(403);
    });

    it('管理员应成功', async () => {
      const res = await adminRequest
        .put('/api/support/user/team/member/updateNameByManager')
        .send({ tmbId: targetTmbId, memberName: 'New Name' });

      expect(res.status).toBe(200);
    });
  });
});
```

### 3.3 离开团队 API

**文件**: `test/api/team/member/leave.test.ts`

```typescript
describe('DELETE /api/support/user/team/member/leave', () => {
  describe('离开限制', () => {
    it('owner 不能离开团队', async () => {
      const res = await ownerRequest
        .delete('/api/support/user/team/member/leave');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('owner');
    });
  });

  describe('离开成功', () => {
    it('普通成员应成功离开', async () => {
      const res = await memberRequest
        .delete('/api/support/user/team/member/leave');

      expect(res.status).toBe(200);
    });

    it('离开后不能访问团队资源', async () => {
      await memberRequest.delete('/api/support/user/team/member/leave');

      const res = await memberRequest
        .post('/api/support/user/team/member/list')
        .send({});

      expect(res.status).toBe(403);
    });
  });
});
```

---

## 4. Phase 5B-3: 邀请链接测试

### 4.1 创建邀请链接 API

**文件**: `test/api/team/invitationLink/create.test.ts`

```typescript
describe('POST /api/support/user/team/invitationLink/create', () => {
  describe('权限验证', () => {
    it('普通成员不能创建', async () => {
      const res = await memberRequest
        .post('/api/support/user/team/invitationLink/create')
        .send({});

      expect(res.status).toBe(403);
    });

    it('管理员可以创建', async () => {
      const res = await adminRequest
        .post('/api/support/user/team/invitationLink/create')
        .send({});

      expect(res.status).toBe(200);
    });
  });

  describe('创建成功', () => {
    it('应返回邀请链接', async () => {
      const res = await adminRequest
        .post('/api/support/user/team/invitationLink/create')
        .send({ expireDays: 7, maxUsage: 10 });

      expect(res.body.data.linkId).toBeDefined();
      expect(res.body.data.link).toContain(res.body.data.linkId);
      expect(res.body.data.maxUsage).toBe(10);
    });

    it('默认 7 天过期', async () => {
      const res = await adminRequest
        .post('/api/support/user/team/invitationLink/create')
        .send({});

      const expireTime = new Date(res.body.data.expireTime);
      const now = new Date();
      const diffDays = (expireTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeCloseTo(7, 0);
    });
  });
});
```

### 4.2 接受邀请 API

**文件**: `test/api/team/invitationLink/accept.test.ts`

```typescript
describe('POST /api/support/user/team/invitationLink/accept', () => {
  let invitationLinkId: string;

  beforeEach(async () => {
    const res = await adminRequest
      .post('/api/support/user/team/invitationLink/create')
      .send({ maxUsage: 2 });
    invitationLinkId = res.body.data.linkId;
  });

  describe('链接验证', () => {
    it('无效链接应返回 404', async () => {
      const res = await newUserRequest
        .post('/api/support/user/team/invitationLink/accept')
        .send({ linkId: 'invalid-link-id' });

      expect(res.status).toBe(404);
    });

    it('已禁用链接应返回 400', async () => {
      await adminRequest
        .put('/api/support/user/team/invitationLink/forbid')
        .send({ linkId: invitationLinkId, forbid: true });

      const res = await newUserRequest
        .post('/api/support/user/team/invitationLink/accept')
        .send({ linkId: invitationLinkId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('禁用');
    });

    it('过期链接应返回 400', async () => {
      // 需要模拟过期场景
    });

    it('达到使用上限应返回 400', async () => {
      // 使用 2 次后
      await newUserRequest
        .post('/api/support/user/team/invitationLink/accept')
        .send({ linkId: invitationLinkId });

      await anotherUserRequest
        .post('/api/support/user/team/invitationLink/accept')
        .send({ linkId: invitationLinkId });

      // 第 3 次应失败
      const res = await thirdUserRequest
        .post('/api/support/user/team/invitationLink/accept')
        .send({ linkId: invitationLinkId });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('上限');
    });
  });

  describe('接受成功', () => {
    it('应成功加入团队', async () => {
      const res = await newUserRequest
        .post('/api/support/user/team/invitationLink/accept')
        .send({ linkId: invitationLinkId });

      expect(res.status).toBe(200);
      expect(res.body.data.teamId).toBeDefined();
    });

    it('已在团队中应返回 409', async () => {
      await newUserRequest
        .post('/api/support/user/team/invitationLink/accept')
        .send({ linkId: invitationLinkId });

      const res = await newUserRequest
        .post('/api/support/user/team/invitationLink/accept')
        .send({ linkId: invitationLinkId });

      expect(res.status).toBe(409);
    });

    it('使用计数应增加', async () => {
      await newUserRequest
        .post('/api/support/user/team/invitationLink/accept')
        .send({ linkId: invitationLinkId });

      const listRes = await adminRequest
        .get('/api/support/user/team/invitationLink/list');

      const link = listRes.body.data.list.find(
        (l: any) => l.linkId === invitationLinkId
      );

      expect(link.usedCount).toBe(1);
    });
  });
});
```

---

## 5. 测试工具函数

**文件**: `test/helpers/teamTestHelpers.ts`

```typescript
// 创建测试团队
export async function createTestTeam(userId: string, name = 'Test Team') {
  // ...
}

// 创建带成员的测试团队
export async function createTestTeamWithMembers(memberCount: number) {
  // ...
}

// 添加团队成员
export async function addTestTeamMember(teamId: string, role = 'member') {
  // ...
}

// 创建邀请链接
export async function createTestInvitationLink(teamId: string, tmbId: string) {
  // ...
}
```

---

## 6. 验收标准

| 子阶段 | 测试覆盖率 | 通过率 |
|--------|-----------|--------|
| 5B-1 | ≥ 80% | 100% |
| 5B-2 | ≥ 80% | 100% |
| 5B-3 | ≥ 80% | 100% |

---

*最后更新: 2025-11-25*

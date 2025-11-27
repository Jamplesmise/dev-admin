# Phase 5C - 通知与其他功能测试计划

> 子阶段: Phase 5C
> 测试范围: 用户通知、空壳 API 补全
> 最后更新: 2025-11-25
> 状态: ✅ **已完成 - 42 个测试全部通过**

---

## 1. 测试概述

### 1.1 测试范围

| 子阶段 | 模块 | API 数量 | 测试数 | 状态 |
|--------|------|---------|--------|------|
| 5C-1 | 用户通知 | 4 | 17 | ✅ 通过 |
| 5C-2 | 空壳补全 | 4 | 25 | ✅ 通过 |

### 1.2 测试文件

| 文件 | 测试数 | 状态 |
|------|--------|------|
| `test/api/phase5c/inform.api.test.ts` | 17 | ✅ |
| `test/api/phase5c/usage.api.test.ts` | 7 | ✅ |
| `test/api/phase5c/datasetTag.api.test.ts` | 10 | ✅ |
| `test/api/phase5c/initTeamChat.api.test.ts` | 8 | ✅ |

---

## 2. Phase 5C-1: 用户通知测试

### 2.1 通知列表 API

**文件**: `test/api/inform/list.test.ts`

```typescript
describe('POST /api/support/user/inform/list', () => {
  beforeEach(async () => {
    await createTestInforms(userId, [
      { type: 'system', title: '系统通知 1', isRead: false },
      { type: 'system', title: '系统通知 2', isRead: true },
      { type: 'team', title: '团队通知 1', isRead: false },
      { type: 'billing', title: '账单通知 1', isRead: false }
    ]);
  });

  describe('权限验证', () => {
    it('未登录应返回 401', async () => {
      const res = await request
        .post('/api/support/user/inform/list')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('基础查询', () => {
    it('应返回通知列表', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/inform/list')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(4);
      expect(res.body.data.list.length).toBe(4);
    });

    it('应按时间倒序排列', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/inform/list')
        .send({});

      const list = res.body.data.list;
      for (let i = 1; i < list.length; i++) {
        expect(new Date(list[i - 1].createTime).getTime())
          .toBeGreaterThanOrEqual(new Date(list[i].createTime).getTime());
      }
    });
  });

  describe('类型筛选', () => {
    it('应按类型筛选', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/inform/list')
        .send({ type: 'system' });

      expect(res.body.data.total).toBe(2);
      res.body.data.list.forEach((item: any) => {
        expect(item.type).toBe('system');
      });
    });

    it('type=all 应返回全部', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/inform/list')
        .send({ type: 'all' });

      expect(res.body.data.total).toBe(4);
    });
  });

  describe('状态筛选', () => {
    it('应筛选未读通知', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/inform/list')
        .send({ status: 'unread' });

      expect(res.body.data.total).toBe(3);
      res.body.data.list.forEach((item: any) => {
        expect(item.isRead).toBe(false);
      });
    });

    it('应筛选已读通知', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/inform/list')
        .send({ status: 'read' });

      expect(res.body.data.total).toBe(1);
    });
  });

  describe('分页', () => {
    it('应正确分页', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/inform/list')
        .send({ offset: 0, limit: 2 });

      expect(res.body.data.list.length).toBe(2);
      expect(res.body.data.total).toBe(4);
    });

    it('offset 超出范围应返回空列表', async () => {
      const res = await authenticatedRequest
        .post('/api/support/user/inform/list')
        .send({ offset: 100, limit: 10 });

      expect(res.body.data.list.length).toBe(0);
    });
  });
});
```

### 2.2 未读计数 API

**文件**: `test/api/inform/countUnread.test.ts`

```typescript
describe('GET /api/support/user/inform/countUnread', () => {
  beforeEach(async () => {
    await createTestInforms(userId, [
      { type: 'system', isRead: false },
      { type: 'system', isRead: false },
      { type: 'team', isRead: false },
      { type: 'billing', isRead: true }
    ]);
  });

  describe('权限验证', () => {
    it('未登录应返回 401', async () => {
      const res = await request.get('/api/support/user/inform/countUnread');
      expect(res.status).toBe(401);
    });
  });

  describe('计数正确性', () => {
    it('应返回正确的总数', async () => {
      const res = await authenticatedRequest
        .get('/api/support/user/inform/countUnread');

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
    });

    it('应返回分类计数', async () => {
      const res = await authenticatedRequest
        .get('/api/support/user/inform/countUnread');

      expect(res.body.data.byType.system).toBe(2);
      expect(res.body.data.byType.team).toBe(1);
      expect(res.body.data.byType.billing).toBe(0);
    });

    it('全部已读时应返回 0', async () => {
      await markAllAsRead(userId);

      const res = await authenticatedRequest
        .get('/api/support/user/inform/countUnread');

      expect(res.body.data.total).toBe(0);
    });
  });
});
```

### 2.3 标记已读 API

**文件**: `test/api/inform/read.test.ts`

```typescript
describe('GET /api/support/user/inform/read', () => {
  let informId: string;

  beforeEach(async () => {
    const informs = await createTestInforms(userId, [
      { type: 'system', isRead: false },
      { type: 'team', isRead: false }
    ]);
    informId = informs[0]._id.toString();
  });

  describe('标记单个已读', () => {
    it('应成功标记单个通知', async () => {
      const res = await authenticatedRequest
        .get(`/api/support/user/inform/read?informId=${informId}`);

      expect(res.status).toBe(200);

      // 验证已标记
      const countRes = await authenticatedRequest
        .get('/api/support/user/inform/countUnread');

      expect(countRes.body.data.total).toBe(1);
    });

    it('无效 ID 应返回 404', async () => {
      const res = await authenticatedRequest
        .get('/api/support/user/inform/read?informId=invalid');

      expect(res.status).toBe(404);
    });

    it('不能标记其他用户的通知', async () => {
      const otherUserInform = await createInformForUser(otherUserId);

      const res = await authenticatedRequest
        .get(`/api/support/user/inform/read?informId=${otherUserInform._id}`);

      expect(res.status).toBe(404);
    });
  });

  describe('标记全部已读', () => {
    it('应成功标记全部已读', async () => {
      const res = await authenticatedRequest
        .get('/api/support/user/inform/read?all=true');

      expect(res.status).toBe(200);

      const countRes = await authenticatedRequest
        .get('/api/support/user/inform/countUnread');

      expect(countRes.body.data.total).toBe(0);
    });
  });
});
```

### 2.4 系统消息模态框 API

**文件**: `test/api/inform/getSystemMsgModal.test.ts`

```typescript
describe('GET /api/support/user/inform/getSystemMsgModal', () => {
  describe('无消息时', () => {
    it('应返回 hasMessage: false', async () => {
      const res = await authenticatedRequest
        .get('/api/support/user/inform/getSystemMsgModal');

      expect(res.status).toBe(200);
      expect(res.body.data.hasMessage).toBe(false);
      expect(res.body.data.message).toBeUndefined();
    });
  });

  describe('有消息时', () => {
    beforeEach(async () => {
      await createSystemMessage({
        title: '系统公告',
        content: '这是一条重要公告',
        priority: 'important',
        isActive: true,
        startTime: new Date(Date.now() - 1000),
        endTime: new Date(Date.now() + 86400000)
      });
    });

    it('应返回系统消息', async () => {
      const res = await authenticatedRequest
        .get('/api/support/user/inform/getSystemMsgModal');

      expect(res.body.data.hasMessage).toBe(true);
      expect(res.body.data.message.title).toBe('系统公告');
    });

    it('应返回消息按钮', async () => {
      const res = await authenticatedRequest
        .get('/api/support/user/inform/getSystemMsgModal');

      expect(res.body.data.message.buttons).toBeDefined();
    });
  });

  describe('消息时效性', () => {
    it('未开始的消息不应返回', async () => {
      await createSystemMessage({
        title: '未来公告',
        startTime: new Date(Date.now() + 86400000),
        isActive: true
      });

      const res = await authenticatedRequest
        .get('/api/support/user/inform/getSystemMsgModal');

      expect(res.body.data.hasMessage).toBe(false);
    });

    it('已结束的消息不应返回', async () => {
      await createSystemMessage({
        title: '过期公告',
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() - 1000),
        isActive: true
      });

      const res = await authenticatedRequest
        .get('/api/support/user/inform/getSystemMsgModal');

      expect(res.body.data.hasMessage).toBe(false);
    });
  });
});
```

---

## 3. Phase 5C-2: 空壳补全测试

### 3.1 用量统计 API

**文件**: `test/api/usage/getUsage.test.ts`

```typescript
describe('POST /api/support/wallet/usage/getUsage', () => {
  beforeEach(async () => {
    await createTestUsageRecords(teamId, [
      { date: '2025-11-20', points: 100, tokens: 1000, requests: 10 },
      { date: '2025-11-21', points: 150, tokens: 1500, requests: 15 },
      { date: '2025-11-22', points: 200, tokens: 2000, requests: 20 }
    ]);
  });

  describe('权限验证', () => {
    it('未登录应返回 401', async () => {
      const res = await request
        .post('/api/support/wallet/usage/getUsage')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('参数验证', () => {
    it('缺少时间范围应返回 400', async () => {
      const res = await authenticatedRequest
        .post('/api/support/wallet/usage/getUsage')
        .send({});

      expect(res.status).toBe(400);
    });

    it('时间范围过大应返回 400', async () => {
      const res = await authenticatedRequest
        .post('/api/support/wallet/usage/getUsage')
        .send({
          startTime: '2025-01-01',
          endTime: '2025-12-31'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('范围');
    });
  });

  describe('统计正确性', () => {
    it('应返回正确的总计', async () => {
      const res = await authenticatedRequest
        .post('/api/support/wallet/usage/getUsage')
        .send({
          startTime: '2025-11-20',
          endTime: '2025-11-22'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.totalPoints).toBe(450);
      expect(res.body.data.totalTokens).toBe(4500);
      expect(res.body.data.totalRequests).toBe(45);
    });

    it('应返回时间线数据', async () => {
      const res = await authenticatedRequest
        .post('/api/support/wallet/usage/getUsage')
        .send({
          startTime: '2025-11-20',
          endTime: '2025-11-22',
          groupBy: 'day'
        });

      expect(res.body.data.timeline.length).toBe(3);
    });

    it('应返回按应用分组', async () => {
      const res = await authenticatedRequest
        .post('/api/support/wallet/usage/getUsage')
        .send({
          startTime: '2025-11-20',
          endTime: '2025-11-22'
        });

      expect(res.body.data.byApp).toBeDefined();
      expect(Array.isArray(res.body.data.byApp)).toBe(true);
    });
  });
});
```

### 3.2 数据集标签 API

**文件**: `test/api/dataset/tag.test.ts`

```typescript
describe('Dataset Tag APIs', () => {
  let datasetId: string;

  beforeEach(async () => {
    const dataset = await createTestDataset(teamId);
    datasetId = dataset._id.toString();
  });

  describe('POST /api/core/dataset/tag/create', () => {
    describe('权限验证', () => {
      it('无权限应返回 403', async () => {
        const res = await memberRequest
          .post('/api/core/dataset/tag/create')
          .send({ datasetId, name: 'Test Tag' });

        expect(res.status).toBe(403);
      });
    });

    describe('创建成功', () => {
      it('应成功创建标签', async () => {
        const res = await ownerRequest
          .post('/api/core/dataset/tag/create')
          .send({ datasetId, name: 'Test Tag' });

        expect(res.status).toBe(200);
        expect(res.body.data.tagId).toBeDefined();
        expect(res.body.data.name).toBe('Test Tag');
      });

      it('重复名称应返回 409', async () => {
        await ownerRequest
          .post('/api/core/dataset/tag/create')
          .send({ datasetId, name: 'Test Tag' });

        const res = await ownerRequest
          .post('/api/core/dataset/tag/create')
          .send({ datasetId, name: 'Test Tag' });

        expect(res.status).toBe(409);
      });
    });

    describe('参数验证', () => {
      it('名称过长应返回 400', async () => {
        const res = await ownerRequest
          .post('/api/core/dataset/tag/create')
          .send({ datasetId, name: 'a'.repeat(51) });

        expect(res.status).toBe(400);
      });

      it('名称为空应返回 400', async () => {
        const res = await ownerRequest
          .post('/api/core/dataset/tag/create')
          .send({ datasetId, name: '' });

        expect(res.status).toBe(400);
      });
    });
  });

  describe('DELETE /api/core/dataset/tag/delete', () => {
    let tagId: string;

    beforeEach(async () => {
      const res = await ownerRequest
        .post('/api/core/dataset/tag/create')
        .send({ datasetId, name: 'To Delete' });
      tagId = res.body.data.tagId;
    });

    describe('删除成功', () => {
      it('应成功删除标签', async () => {
        const res = await ownerRequest
          .delete(`/api/core/dataset/tag/delete?tagId=${tagId}`);

        expect(res.status).toBe(200);
      });

      it('删除后应从列表消失', async () => {
        await ownerRequest
          .delete(`/api/core/dataset/tag/delete?tagId=${tagId}`);

        const listRes = await ownerRequest
          .get(`/api/core/dataset/tag/list?datasetId=${datasetId}`);

        const deleted = listRes.body.data.find((t: any) => t._id === tagId);
        expect(deleted).toBeUndefined();
      });
    });

    describe('关联清理', () => {
      it('删除后应清理 collection 关联', async () => {
        // 先关联到 collection
        await associateTagToCollection(tagId, collectionId);

        // 删除标签
        await ownerRequest
          .delete(`/api/core/dataset/tag/delete?tagId=${tagId}`);

        // 验证关联已清理
        const collection = await getCollectionById(collectionId);
        expect(collection.tags).not.toContain(tagId);
      });
    });
  });
});
```

### 3.3 团队聊天初始化 API

**文件**: `test/api/chat/initTeamChat.test.ts`

```typescript
describe('POST /api/core/chat/initTeamChat', () => {
  let appId: string;

  beforeEach(async () => {
    const app = await createTestApp(teamId);
    appId = app._id.toString();
  });

  describe('权限验证', () => {
    it('未登录应返回 401', async () => {
      const res = await request
        .post('/api/core/chat/initTeamChat')
        .send({ appId });

      expect(res.status).toBe(401);
    });

    it('无应用访问权限应返回 403', async () => {
      const res = await noPermissionUserRequest
        .post('/api/core/chat/initTeamChat')
        .send({ appId });

      expect(res.status).toBe(403);
    });
  });

  describe('参数验证', () => {
    it('缺少 appId 应返回 400', async () => {
      const res = await authenticatedRequest
        .post('/api/core/chat/initTeamChat')
        .send({});

      expect(res.status).toBe(400);
    });

    it('无效 appId 应返回 404', async () => {
      const res = await authenticatedRequest
        .post('/api/core/chat/initTeamChat')
        .send({ appId: 'invalid-id' });

      expect(res.status).toBe(404);
    });
  });

  describe('创建新对话', () => {
    it('应成功创建新对话', async () => {
      const res = await authenticatedRequest
        .post('/api/core/chat/initTeamChat')
        .send({ appId });

      expect(res.status).toBe(200);
      expect(res.body.data.chatId).toBeDefined();
      expect(res.body.data.appId).toBe(appId);
    });

    it('应返回应用信息', async () => {
      const res = await authenticatedRequest
        .post('/api/core/chat/initTeamChat')
        .send({ appId });

      expect(res.body.data.app).toBeDefined();
      expect(res.body.data.app.name).toBeDefined();
    });
  });

  describe('恢复对话', () => {
    let existingChatId: string;

    beforeEach(async () => {
      const chatRes = await authenticatedRequest
        .post('/api/core/chat/initTeamChat')
        .send({ appId });
      existingChatId = chatRes.body.data.chatId;

      // 添加一些消息历史
      await addTestChatMessages(existingChatId, 5);
    });

    it('应恢复现有对话', async () => {
      const res = await authenticatedRequest
        .post('/api/core/chat/initTeamChat')
        .send({ appId, chatId: existingChatId });

      expect(res.status).toBe(200);
      expect(res.body.data.chatId).toBe(existingChatId);
    });

    it('应返回历史消息', async () => {
      const res = await authenticatedRequest
        .post('/api/core/chat/initTeamChat')
        .send({ appId, chatId: existingChatId });

      expect(res.body.data.history).toBeDefined();
      expect(res.body.data.history.length).toBe(5);
    });
  });
});
```

---

## 4. 测试工具函数

**文件**: `test/helpers/informTestHelpers.ts`

```typescript
// 创建测试通知
export async function createTestInforms(
  userId: string,
  informs: Partial<UserInformType>[]
) {
  return await MongoUserInformModel.insertMany(
    informs.map((inform) => ({
      userId,
      type: 'system',
      title: 'Test Inform',
      content: 'Test Content',
      isRead: false,
      ...inform
    }))
  );
}

// 标记全部已读
export async function markAllAsRead(userId: string) {
  await MongoUserInformModel.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );
}

// 创建系统消息
export async function createSystemMessage(data: Partial<SystemMessageType>) {
  return await MongoSystemMessageModel.create({
    title: 'Test Message',
    content: 'Test Content',
    priority: 'normal',
    isActive: true,
    ...data
  });
}

// 创建测试用量记录
export async function createTestUsageRecords(
  teamId: string,
  records: { date: string; points: number; tokens: number; requests: number }[]
) {
  // ...
}
```

---

## 5. 验收标准

| 子阶段 | 测试覆盖率 | 通过率 | 状态 |
|--------|-----------|--------|------|
| 5C-1 | ≥ 80% | 100% | ✅ 已完成 |
| 5C-2 | ≥ 80% | 100% | ✅ 已完成 |

---

## 6. 测试执行

### 6.1 执行命令

```bash
# 运行 Phase 5C 所有测试
pnpm test test/api/phase5c/
```

### 6.2 执行结果 (2025-11-25)

```
 ✓ test/api/phase5c/inform.api.test.ts (17 tests) 5594ms
 ✓ test/api/phase5c/usage.api.test.ts (7 tests) 1599ms
 ✓ test/api/phase5c/datasetTag.api.test.ts (10 tests) 1823ms
 ✓ test/api/phase5c/initTeamChat.api.test.ts (8 tests) 1208ms

 Test Files  4 passed (4)
      Tests  42 passed (42)
   Duration  15.25s
```

---

*最后更新: 2025-11-25*

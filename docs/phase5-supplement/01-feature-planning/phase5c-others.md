# Phase 5C - 通知与其他功能规划

> 子阶段: Phase 5C
> 优先级: P1-P2
> 接口数量: 8 个
> 最后更新: 2025-11-25

---

## 1. 模块概述

补充用户通知系统和空壳 API 的业务逻辑。

### 当前状态

| 功能 | 状态 | 说明 |
|------|------|------|
| 运营广告 | ✅ 已实现 | 完整 |
| 通知列表 | ❌ 缺失 | 需新建 |
| 未读计数 | ❌ 缺失 | 需新建 |
| 标记已读 | ❌ 缺失 | 需新建 |
| 系统消息模态框 | ❌ 缺失 | 需新建 |
| 用量统计 | ❌ 空壳 | 需补全 |
| 标签创建/删除 | ❌ 空壳 | 需补全 |
| 团队聊天初始化 | ❌ 空壳 | 需补全 |

---

## 2. Phase 5C-1: 用户通知 (4 个 API)

### 2.1 通知列表

**端点**: `POST /api/support/user/inform/list`

**功能**: 获取用户的通知列表

**请求**:
```typescript
type GetInformListRequest = {
  type?: 'system' | 'team' | 'billing' | 'all';
  status?: 'read' | 'unread' | 'all';
  offset?: number;
  limit?: number;
};
```

**响应**:
```typescript
type GetInformListResponse = {
  total: number;
  list: {
    _id: string;
    type: 'system' | 'team' | 'billing';
    title: string;
    content: string;
    isRead: boolean;
    createTime: Date;
    // 关联数据
    teamId?: string;
    teamName?: string;
    linkUrl?: string;      // 跳转链接
  }[];
};
```

---

### 2.2 未读数量

**端点**: `GET /api/support/user/inform/countUnread`

**功能**: 获取未读通知数量

**响应**:
```typescript
type CountUnreadResponse = {
  total: number;
  byType: {
    system: number;
    team: number;
    billing: number;
  };
};
```

---

### 2.3 标记已读

**端点**: `GET /api/support/user/inform/read`

**功能**: 标记通知为已读

**请求**:
```typescript
type ReadInformRequest = {
  informId?: string;      // 单个通知 ID
  all?: boolean;          // 全部标记已读
};
```

**响应**: `{ success: true }`

---

### 2.4 系统消息模态框

**端点**: `GET /api/support/user/inform/getSystemMsgModal`

**功能**: 获取需要弹窗展示的系统消息（如公告、升级提醒）

**响应**:
```typescript
type GetSystemMsgModalResponse = {
  hasMessage: boolean;
  message?: {
    _id: string;
    title: string;
    content: string;       // Markdown 格式
    priority: 'normal' | 'important' | 'urgent';
    buttons?: {
      text: string;
      action: 'close' | 'link' | 'confirm';
      url?: string;
    }[];
  };
};
```

---

## 3. Phase 5C-2: 空壳补全 (4 个 API)

### 3.1 用量统计

**端点**: `POST /api/support/wallet/usage/getUsage`

**现状**: 空壳，返回空数据

**请求**:
```typescript
type GetUsageRequest = {
  startTime: string;      // ISO 日期
  endTime: string;
  groupBy?: 'day' | 'week' | 'month';
};
```

**响应**:
```typescript
type GetUsageResponse = {
  totalPoints: number;
  totalTokens: number;
  totalRequests: number;

  // 按时间分组
  timeline: {
    date: string;
    points: number;
    tokens: number;
    requests: number;
  }[];

  // 按应用分组
  byApp: {
    appId: string;
    appName: string;
    points: number;
    tokens: number;
    requests: number;
  }[];

  // 按模型分组
  byModel: {
    model: string;
    points: number;
    tokens: number;
    requests: number;
  }[];
};
```

**实现要点**:
- 需要聚合 `usages` 表数据
- 支持多维度分组统计

---

### 3.2 标签创建

**端点**: `POST /api/core/dataset/tag/create`

**现状**: 空壳，抛出异常

**请求**:
```typescript
type CreateTagRequest = {
  datasetId: string;
  name: string;
};
```

**响应**:
```typescript
type CreateTagResponse = {
  tagId: string;
  name: string;
};
```

**实现要点**:
- 验证 dataset 权限
- 检查标签名称唯一性
- 创建标签记录

---

### 3.3 标签删除

**端点**: `DELETE /api/core/dataset/tag/delete`

**现状**: 空壳，抛出异常

**请求**:
```typescript
type DeleteTagRequest = {
  tagId: string;
};
```

**响应**: `{ success: true }`

**实现要点**:
- 验证权限
- 删除标签
- 清理标签与 collection 的关联

---

### 3.4 团队聊天初始化

**端点**: `POST /api/core/chat/initTeamChat`

**现状**: 空壳，抛出异常

**请求**:
```typescript
type InitTeamChatRequest = {
  appId: string;
  chatId?: string;        // 可选，不传则创建新对话
};
```

**响应**:
```typescript
type InitTeamChatResponse = {
  chatId: string;
  appId: string;
  // 应用信息
  app: {
    name: string;
    avatar: string;
    intro?: string;
  };
  // 历史消息（如果是恢复对话）
  history?: {
    role: 'user' | 'ai';
    content: string;
    createTime: Date;
  }[];
};
```

**实现要点**:
- 验证用户对应用的访问权限
- 创建或恢复聊天会话
- 返回必要的上下文信息

---

## 4. 数据模型

### 4.1 用户通知 Schema

**位置**: `src/packages/service/support_user/inform/schema.ts`

```typescript
const UserInformSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  type: {
    type: String,
    enum: ['system', 'team', 'billing'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  isRead: {
    type: Boolean,
    default: false
  },

  // 关联数据
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams'
  },
  linkUrl: String,

  // 过期时间（可选 TTL）
  expireAt: Date
}, {
  timestamps: { createdAt: 'createTime', updatedAt: false }
});

// 索引
UserInformSchema.index({ userId: 1, createTime: -1 });
UserInformSchema.index({ userId: 1, isRead: 1 });
UserInformSchema.index({ userId: 1, type: 1 });
UserInformSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0, sparse: true });
```

### 4.2 系统消息 Schema

**位置**: `src/packages/service/support/systemMessage/schema.ts`

```typescript
const SystemMessageSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['normal', 'important', 'urgent'],
    default: 'normal'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  targetUsers: {
    type: String,
    enum: ['all', 'free', 'paid'],  // 目标用户群
    default: 'all'
  },
  buttons: [{
    text: String,
    action: {
      type: String,
      enum: ['close', 'link', 'confirm']
    },
    url: String
  }],
  startTime: Date,
  endTime: Date
}, {
  timestamps: true
});

// 索引
SystemMessageSchema.index({ isActive: 1, startTime: 1, endTime: 1 });
```

### 4.3 数据集标签 Schema

**位置**: `src/packages/service/core/dataset/tag/schema.ts`

```typescript
const DatasetTagSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },
  datasetId: {
    type: Schema.Types.ObjectId,
    ref: 'datasets',
    required: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 50
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: false }
});

// 索引
DatasetTagSchema.index({ datasetId: 1, name: 1 }, { unique: true });
DatasetTagSchema.index({ teamId: 1 });
```

---

## 5. 实现任务

### 5.1 文件结构

```
pages/api/
├── support/user/inform/
│   ├── list.ts                      # 新建
│   ├── countUnread.ts               # 新建
│   ├── read.ts                      # 新建
│   └── getSystemMsgModal.ts         # 新建
├── support/wallet/usage/
│   └── getUsage.ts                  # 补全空壳
├── core/dataset/tag/
│   ├── create.ts                    # 补全空壳
│   └── delete.ts                    # 补全空壳
└── core/chat/
    └── initTeamChat.ts              # 补全空壳

src/packages/service/
├── support_user/inform/
│   ├── schema.ts                    # 新建
│   └── controller.ts                # 新建
├── support/systemMessage/
│   └── schema.ts                    # 新建
└── core/dataset/tag/
    └── schema.ts                    # 新建
```

### 5.2 开发清单

**Phase 5C-1 (用户通知)**:
- [ ] 创建用户通知 Schema
- [ ] 创建系统消息 Schema
- [ ] 实现通知列表 API
- [ ] 实现未读计数 API
- [ ] 实现标记已读 API
- [ ] 实现系统消息模态框 API

**Phase 5C-2 (空壳补全)**:
- [ ] 补全用量统计 API
- [ ] 创建数据集标签 Schema
- [ ] 补全标签创建 API
- [ ] 补全标签删除 API
- [ ] 补全团队聊天初始化 API
- [ ] 编写单元测试

---

## 6. 测试用例

### 6.1 用户通知

```typescript
describe('User Inform APIs', () => {
  beforeEach(async () => {
    // 创建测试通知
    await createTestInforms(userId, [
      { type: 'system', title: 'System Notice', isRead: false },
      { type: 'team', title: 'Team Invite', isRead: false },
      { type: 'billing', title: 'Payment Success', isRead: true }
    ]);
  });

  it('should get unread count', async () => {
    const res = await authenticatedRequest
      .get('/api/support/user/inform/countUnread');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
  });

  it('should get inform list', async () => {
    const res = await authenticatedRequest
      .post('/api/support/user/inform/list')
      .send({ status: 'unread' });

    expect(res.status).toBe(200);
    expect(res.body.data.list.length).toBe(2);
  });

  it('should mark as read', async () => {
    const res = await authenticatedRequest
      .get('/api/support/user/inform/read?all=true');

    expect(res.status).toBe(200);

    // 验证已全部已读
    const countRes = await authenticatedRequest
      .get('/api/support/user/inform/countUnread');

    expect(countRes.body.data.total).toBe(0);
  });
});
```

### 6.2 用量统计

```typescript
describe('GET /api/support/wallet/usage/getUsage', () => {
  it('should return usage statistics', async () => {
    const res = await authenticatedRequest
      .post('/api/support/wallet/usage/getUsage')
      .send({
        startTime: '2025-11-01',
        endTime: '2025-11-25',
        groupBy: 'day'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.timeline).toBeDefined();
    expect(res.body.data.byApp).toBeDefined();
  });
});
```

---

## 7. 注意事项

### 7.1 通知推送（可选）

当前规划只包含被动查询通知，如需主动推送，可考虑：

1. **WebSocket**: 实时推送
2. **SSE (Server-Sent Events)**: 轻量级推送
3. **轮询**: 定时查询（已包含在未读计数 API 中）

建议首期使用轮询方式，后续按需升级。

### 7.2 用量统计性能

大数据量下聚合查询可能较慢，建议：

1. 添加合适的索引
2. 考虑预聚合（定时任务计算日/周/月统计）
3. 限制查询时间范围（最多 3 个月）

---

*最后更新: 2025-11-25*

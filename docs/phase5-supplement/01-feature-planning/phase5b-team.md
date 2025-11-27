# Phase 5B - 团队与成员管理功能规划

> 子阶段: Phase 5B
> 优先级: P0-P1
> 接口数量: 13 个
> 最后更新: 2025-11-25

---

## 1. 模块概述

补充团队管理的核心功能，包括团队创建、成员管理、邀请链接。

### 当前状态

| 功能 | 状态 | 说明 |
|------|------|------|
| 团队列表 | ✅ 已实现 | 从认证中间件获取 |
| 切换团队 | ✅ 已实现 | 完整 |
| 创建团队 | ❌ 空壳 | 需补全 |
| 成员列表 | ❌ 空壳 | 需补全 |
| 成员计数 | ✅ 已实现 | 完整 |
| 删除成员 | ✅ 已实现 | 完整 |
| 邀请链接 | ❌ 完全缺失 | 需新建 |

---

## 2. Phase 5B-1: 团队基础 (2 个 API)

### 2.1 创建团队

**端点**: `POST /api/support/user/team/create`

**功能**: 创建新团队，创建者自动成为 owner

**请求**:
```typescript
type CreateTeamRequest = {
  name: string;           // 团队名称
  avatar?: string;        // 团队头像 URL
};
```

**响应**:
```typescript
type CreateTeamResponse = {
  teamId: string;
  name: string;
  avatar: string;
};
```

**业务逻辑**:
1. 验证用户已登录
2. 检查用户创建团队数量限制（免费版最多 1 个）
3. 创建团队记录
4. 创建团队成员记录（owner 角色）
5. 创建默认订阅（free 套餐）
6. 记录操作日志

**错误码**:
| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误 |
| 403 | 已达团队数量上限 |

---

### 2.2 获取团队套餐

**端点**: `GET /api/support/user/team/plan/getTeamPlans`

**功能**: 获取当前团队的套餐信息和资源使用情况

**请求**: 无（从认证中间件获取 teamId）

**响应**:
```typescript
type GetTeamPlansResponse = {
  planLevel: 'free' | 'experience' | 'team' | 'enterprise' | 'custom';
  planName: string;
  expireTime?: Date;

  // 资源限制
  limits: {
    maxMembers: number;
    maxApps: number;
    maxDatasets: number;
    maxDatasetSize: number;  // GB
    monthlyPoints: number;
  };

  // 当前使用
  usage: {
    members: number;
    apps: number;
    datasets: number;
    datasetSize: number;
    usedPoints: number;
  };

  // 额外购买
  extraPurchase?: {
    datasetSize: number;
    points: number;
  };
};
```

**业务逻辑**:
1. 获取团队订阅信息
2. 统计当前资源使用情况
3. 计算剩余配额

---

## 3. Phase 5B-2: 团队成员 (6 个 API)

### 3.1 成员列表

**端点**: `POST /api/support/user/team/member/list`

**功能**: 获取团队成员列表，支持分页和搜索

**请求**:
```typescript
type GetMemberListRequest = {
  searchText?: string;    // 搜索关键词
  status?: 'active' | 'leave' | 'waiting';  // 成员状态
  offset?: number;
  limit?: number;
};
```

**响应**:
```typescript
type GetMemberListResponse = {
  total: number;
  list: {
    tmbId: string;
    userId: string;
    memberName: string;
    avatar: string;
    role: 'owner' | 'admin' | 'member';
    status: 'active' | 'leave' | 'waiting';
    createTime: Date;
    lastActiveTime?: Date;
  }[];
};
```

**业务逻辑**:
1. 验证调用者属于该团队
2. 根据搜索条件筛选
3. 分页返回

---

### 3.2 管理员更新成员名称

**端点**: `PUT /api/support/user/team/member/updateNameByManager`

**功能**: 管理员修改团队成员的显示名称

**请求**:
```typescript
type UpdateNameByManagerRequest = {
  tmbId: string;          // 目标成员 ID
  memberName: string;     // 新名称
};
```

**响应**: `{ success: true }`

**权限**: 需要 `admin` 或 `owner` 角色

---

### 3.3 成员更新自己名称

**端点**: `PUT /api/support/user/team/member/updateName`

**功能**: 成员修改自己在团队中的显示名称

**请求**:
```typescript
type UpdateNameRequest = {
  memberName: string;
};
```

**响应**: `{ success: true }`

---

### 3.4 更新邀请结果

**端点**: `PUT /api/support/user/team/member/updateInvite`

**功能**: 处理邀请的接受/拒绝

**请求**:
```typescript
type UpdateInviteRequest = {
  tmbId: string;
  status: 'accept' | 'reject';
};
```

**响应**: `{ success: true }`

---

### 3.5 恢复成员

**端点**: `POST /api/support/user/team/member/restore`

**功能**: 恢复已删除的成员

**请求**:
```typescript
type RestoreMemberRequest = {
  tmbId: string;
};
```

**响应**: `{ success: true }`

**权限**: 需要 `admin` 或 `owner` 角色

---

### 3.6 离开团队

**端点**: `DELETE /api/support/user/team/member/leave`

**功能**: 成员主动离开团队

**请求**: 无

**响应**: `{ success: true }`

**业务逻辑**:
1. 验证不是 owner（owner 不能离开）
2. 更新成员状态为 leave
3. 清理该成员的协作者权限
4. 记录操作日志

---

## 4. Phase 5B-3: 邀请链接 (5 个 API)

### 4.1 创建邀请链接

**端点**: `POST /api/support/user/team/invitationLink/create`

**功能**: 创建团队邀请链接

**请求**:
```typescript
type CreateInvitationLinkRequest = {
  maxUsage?: number;      // 最大使用次数，0 表示不限
  expireDays?: number;    // 有效天数，默认 7 天
};
```

**响应**:
```typescript
type CreateInvitationLinkResponse = {
  linkId: string;
  link: string;           // 完整邀请链接
  expireTime: Date;
  maxUsage: number;
};
```

**权限**: 需要 `admin` 或 `owner` 角色

---

### 4.2 邀请链接列表

**端点**: `GET /api/support/user/team/invitationLink/list`

**功能**: 获取团队的邀请链接列表

**响应**:
```typescript
type GetInvitationLinksResponse = {
  list: {
    linkId: string;
    link: string;
    expireTime: Date;
    maxUsage: number;
    usedCount: number;
    status: 'active' | 'expired' | 'disabled';
    createTime: Date;
    creatorName: string;
  }[];
};
```

---

### 4.3 接受邀请

**端点**: `POST /api/support/user/team/invitationLink/accept`

**功能**: 用户通过邀请链接加入团队

**请求**:
```typescript
type AcceptInvitationRequest = {
  linkId: string;
};
```

**响应**:
```typescript
type AcceptInvitationResponse = {
  teamId: string;
  teamName: string;
};
```

**业务逻辑**:
1. 验证链接有效性（未过期、未禁用、未达使用上限）
2. 检查用户是否已在团队中
3. 检查团队成员数是否达上限
4. 创建团队成员记录
5. 更新链接使用计数
6. 记录操作日志

---

### 4.4 获取邀请信息

**端点**: `GET /api/support/user/team/invitationLink/info`

**功能**: 获取邀请链接对应的团队信息（用于展示邀请页面）

**请求**:
```typescript
type GetInvitationInfoRequest = {
  linkId: string;
};
```

**响应**:
```typescript
type GetInvitationInfoResponse = {
  teamName: string;
  teamAvatar: string;
  memberCount: number;
  inviterName: string;
  isValid: boolean;
  invalidReason?: string;  // 如果无效，说明原因
};
```

---

### 4.5 禁用邀请链接

**端点**: `PUT /api/support/user/team/invitationLink/forbid`

**功能**: 禁用/启用邀请链接

**请求**:
```typescript
type ForbidInvitationLinkRequest = {
  linkId: string;
  forbid: boolean;
};
```

**响应**: `{ success: true }`

**权限**: 需要 `admin` 或 `owner` 角色

---

## 5. 数据模型

### 5.1 邀请链接 Schema

**位置**: `src/packages/service/support_user/team/invitationLink/schema.ts`

```typescript
const InvitationLinkSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },
  creatorTmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member',
    required: true
  },
  linkId: {
    type: String,
    required: true,
    unique: true,
    default: () => nanoid(12)
  },

  // 限制
  maxUsage: {
    type: Number,
    default: 0           // 0 表示不限
  },
  usedCount: {
    type: Number,
    default: 0
  },
  expireTime: {
    type: Date,
    required: true
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'disabled'],
    default: 'active'
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: false }
});

// 索引
InvitationLinkSchema.index({ teamId: 1, createTime: -1 });
InvitationLinkSchema.index({ linkId: 1 }, { unique: true });
InvitationLinkSchema.index({ expireTime: 1 });
```

---

## 6. 实现任务

### 6.1 文件结构

```
pages/api/support/user/team/
├── create.ts                        # 补全空壳
├── plan/
│   └── getTeamPlans.ts             # 新建
├── member/
│   ├── list.ts                      # 补全空壳
│   ├── updateNameByManager.ts       # 新建
│   ├── updateName.ts                # 新建
│   ├── updateInvite.ts              # 新建
│   ├── restore.ts                   # 新建
│   └── leave.ts                     # 新建
└── invitationLink/
    ├── create.ts                    # 新建
    ├── list.ts                      # 新建
    ├── accept.ts                    # 新建
    ├── info.ts                      # 新建
    └── forbid.ts                    # 新建

src/packages/service/support_user/team/
└── invitationLink/
    ├── schema.ts                    # 新建
    └── controller.ts                # 新建
```

### 6.2 开发清单

**Phase 5B-1 (团队基础)**:
- [ ] 补全团队创建 API
- [ ] 实现团队套餐查询 API

**Phase 5B-2 (团队成员)**:
- [ ] 补全成员列表 API
- [ ] 实现管理员更新成员名称 API
- [ ] 实现成员更新自己名称 API
- [ ] 实现更新邀请结果 API
- [ ] 实现恢复成员 API
- [ ] 实现离开团队 API

**Phase 5B-3 (邀请链接)**:
- [ ] 创建邀请链接 Schema
- [ ] 实现创建邀请链接 API
- [ ] 实现邀请链接列表 API
- [ ] 实现接受邀请 API
- [ ] 实现获取邀请信息 API
- [ ] 实现禁用邀请链接 API
- [ ] 编写单元测试

---

## 7. 测试用例

### 7.1 创建团队

```typescript
describe('POST /api/support/user/team/create', () => {
  it('should create team', async () => {
    const res = await authenticatedRequest
      .post('/api/support/user/team/create')
      .send({ name: 'My Team' });

    expect(res.status).toBe(200);
    expect(res.body.data.teamId).toBeDefined();
  });

  it('should reject when exceed limit', async () => {
    // 假设免费版只能创建 1 个团队
    await createTeam('Team 1');

    const res = await authenticatedRequest
      .post('/api/support/user/team/create')
      .send({ name: 'Team 2' });

    expect(res.status).toBe(403);
  });
});
```

### 7.2 邀请链接

```typescript
describe('Invitation Link Flow', () => {
  it('should create and use invitation link', async () => {
    // 1. 创建邀请链接
    const createRes = await adminRequest
      .post('/api/support/user/team/invitationLink/create')
      .send({ expireDays: 7 });

    expect(createRes.status).toBe(200);
    const { linkId } = createRes.body.data;

    // 2. 获取邀请信息
    const infoRes = await request
      .get(`/api/support/user/team/invitationLink/info?linkId=${linkId}`);

    expect(infoRes.body.data.isValid).toBe(true);

    // 3. 接受邀请
    const acceptRes = await newUserRequest
      .post('/api/support/user/team/invitationLink/accept')
      .send({ linkId });

    expect(acceptRes.status).toBe(200);
  });
});
```

---

*最后更新: 2025-11-25*

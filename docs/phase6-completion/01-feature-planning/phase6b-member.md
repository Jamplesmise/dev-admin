# Phase 6B - 分组/组织成员与微信登录

> 子阶段: Phase 6B
> API 数量: 4 个
> 优先级: P1-P2
> 预估时间: 1-2 天
> 创建时间: 2025-11-26
> **状态: ✅ 已完成**
> **完成时间: 2025-11-26**

---

## 1. 功能概述

### 1.1 目标

完善分组和组织的成员查询功能，实现微信扫码登录的轮询接口。

### 1.2 API 清单

| 序号 | 接口 | 方法 | 路径 | 优先级 | 认证 |
|------|------|------|------|--------|------|
| 1 | 分组成员列表 | GET | `/api/support/user/team/group/members` | P1 | 需要 |
| 2 | 更改分组所有者 | PUT | `/api/support/user/team/group/changeOwner` | P2 | 需要 |
| 3 | 组织成员列表 | GET | `/api/support/user/team/org/members` | P1 | 需要 |
| 4 | 微信登录结果 | POST | `/api/support/user/account/login/wx/getResult` | P1 | **不需要** |

> **注意**: 微信登录结果 API 是登录流程本身，**不需要**添加 authMiddleware。其他 API 都需要认证中间件。
> 详见 [API 认证中间件修复报告](../../troubleshooting/02-api-auth-fix-report.md)

---

## 2. API 详细规范

### 2.1 分组成员列表 API

#### `GET /api/support/user/team/group/members`

**功能**: 获取指定分组的成员列表

**请求参数** (Query):
```typescript
{
  groupId: string;  // 必填，分组 ID
}
```

**响应数据**:
```typescript
Array<{
  tmbId: string;                       // 团队成员 ID
  name: string;                        // 成员名称
  avatar: string;                      // 成员头像
  role: 'owner' | 'admin' | 'member';  // 分组内角色
}>
```

**实现要点**:
1. 查询 `group_members` 表
2. 关联查询 `team_members` 获取名称和头像
3. 按角色排序（owner > admin > member）

---

### 2.2 更改分组所有者 API

#### `PUT /api/support/user/team/group/changeOwner`

**功能**: 将分组所有权转让给另一个成员

**请求参数** (Body):
```typescript
{
  groupId: string;   // 必填，分组 ID
  tmbId: string;     // 必填，新所有者的团队成员 ID
}
```

**响应数据**: 无

**实现要点**:
1. 验证当前用户是分组 owner
2. 验证新所有者是分组成员
3. 更新分组成员角色（旧 owner -> member，新成员 -> owner）
4. 事务操作确保一致性

---

### 2.3 组织成员列表 API

#### `GET /api/support/user/team/org/members`

**功能**: 分页获取组织成员列表

**请求参数** (Query):
```typescript
{
  pageNum: number;        // 必填，页码（从 1 开始）
  pageSize: number;       // 必填，每页数量
  orgPath?: string;       // 可选，组织路径
}
```

**响应数据**:
```typescript
type PaginationResponse<TeamMemberItemType> = {
  pageNum: number;
  pageSize: number;
  total: number;
  data: Array<{
    userId: string;
    tmbId: string;
    teamId: string;
    memberName: string;
    avatar: string;
    role: 'owner' | 'admin' | 'member';
    status: 'active' | 'waiting' | 'inactive';
    contact?: string;
    createTime: Date;
    permission: TeamPermission;
    orgs?: string[];  // 所属组织路径列表
  }>;
}
```

**实现要点**:
1. 根据 orgPath 查找组织 ID
2. 查询 `org_members` 表获取成员 tmbId 列表
3. 关联查询 `team_members` 获取详细信息
4. 支持分页

---

### 2.4 微信登录结果 API

#### `POST /api/support/user/account/login/wx/getResult`

**功能**: 轮询获取微信扫码登录结果

**请求参数** (Body):
```typescript
{
  code: string;              // 必填，微信授权码
  inviterId?: string;        // 可选，邀请者 ID
  bd_vid?: string;           // 可选，百度访问 ID
  msclkid?: string;          // 可选，微软点击 ID
  fastgpt_sem?: string;      // 可选，FastGPT SEM 参数
  sourceDomain?: string;     // 可选，来源域名
}
```

**响应数据**:
```typescript
type LoginSuccessResponse = {
  user: {
    _id: string;
    username: string;
    avatar: string;
    // ... 其他用户字段
  };
  token: string;  // JWT 认证令牌
}
```

**实现要点**:
1. 从 Redis 获取扫码结果（与 checkStatus 共用 key）
2. 如果已扫码，根据 openId 查找或创建用户
3. 新用户自动创建默认团队
4. 记录营销追踪参数
5. 生成 JWT token

---

## 3. 任务分解

### 3.1 分组成员列表 (6B-1) ✅

```
[6B-1] 分组成员列表 API
├── [x] 创建 pages/api/support/user/team/group/members.ts
├── [x] 查询 group_members 表
├── [x] 关联查询成员详情
├── [x] 按角色排序
└── [x] 编写单元测试 (17 个测试用例)
```

### 3.2 更改分组所有者 (6B-2) ✅

```
[6B-2] 更改分组所有者 API
├── [x] 创建 pages/api/support/user/team/group/changeOwner.ts
├── [x] 验证当前用户权限
├── [x] 验证新所有者资格
├── [x] 事务更新角色
├── [x] 添加审计日志
└── [x] 编写单元测试 (含在 groupMember 测试中)
```

### 3.3 组织成员列表 (6B-3) ✅

```
[6B-3] 组织成员列表 API
├── [x] 创建 pages/api/support/user/team/org/members.ts
├── [x] 支持 orgPath 参数
├── [x] 实现分页查询
├── [x] 关联查询成员详情
└── [x] 编写单元测试 (11 个测试用例)
```

### 3.4 微信登录结果 (6B-4) ✅

```
[6B-4] 微信登录结果 API
├── [x] 创建 pages/api/support/user/account/login/wx/getResult.ts
├── [x] 从 Redis/MongoDB 获取扫码状态
├── [x] 实现用户查找/创建逻辑
├── [x] 记录营销追踪参数
├── [x] 生成 JWT token
└── [x] 编写单元测试 (11 个测试用例)
```

---

## 4. 新增文件清单

```
pages/api/support/user/
├── team/
│   ├── group/
│   │   ├── members.ts                           # 分组成员
│   │   └── changeOwner.ts                       # 更改所有者
│   └── org/
│       └── members.ts                           # 组织成员
└── account/login/wx/
    └── getResult.ts                             # 微信登录结果

test/api/phase6/
├── groupMember.api.test.ts                      # 分组成员测试
├── orgMember.api.test.ts                        # 组织成员测试
└── wxLogin.api.test.ts                          # 微信登录测试
```

---

## 5. 与现有代码的关系

### 5.1 复用现有 Schema

- `MemberGroupSchema`: 分组基本信息
- `GroupMemberSchema`: 分组成员关系
- `OrgSchema`: 组织基本信息
- `OrgMemberSchema`: 组织成员关系
- `TeamMemberSchema`: 团队成员详情

### 5.2 复用现有服务

- `getGlobalRedisConnection`: Redis 连接
- `authMiddleware`: 认证中间件
- `generateToken`: JWT 生成

### 5.3 与 checkStatus 的关系

`getResult` 和已有的 `checkStatus` 功能类似，区别在于：
- `checkStatus`: 仅检查扫码状态
- `getResult`: 检查状态 + 完成登录流程

可以考虑：
1. **方案一**: `getResult` 内部调用 `checkStatus` 逻辑
2. **方案二**: 两个接口共用底层服务，返回不同数据

---

## 6. 验收标准

- [x] 分组成员列表返回正确的成员和角色
- [x] 分组所有者可成功转让
- [x] 转让后旧所有者变为普通成员
- [x] 组织成员列表支持分页
- [x] 组织成员列表支持 orgPath 筛选
- [x] 微信登录结果正确返回用户信息和 token
- [x] 新用户自动创建默认团队
- [x] 所有 API 通过认证中间件保护（微信登录除外）
- [x] 单元测试覆盖率 ≥ 80%

---

## 7. 测试结果

### 7.1 测试统计

| 测试文件 | 测试用例数 | 通过数 | 状态 |
|---------|----------|--------|------|
| groupMember.api.test.ts | 17 | 17 | ✅ |
| orgMember.api.test.ts | 11 | 11 | ✅ |
| wxLogin.api.test.ts | 11 | 11 | ✅ |
| **总计** | **39** | **39** | **✅ 全部通过** |

### 7.2 测试覆盖场景

**分组成员 API (members + changeOwner)**:
- 正常流程：返回成员列表、包含名称头像、按角色排序
- 参数验证：groupId 必填、格式验证
- 权限验证：未认证拒绝、跨团队拒绝
- 边界条件：分组不存在、空分组
- 所有者转让：成功转让、权限验证、数据验证

**组织成员 API**:
- 正常流程：分页列表、支持分页、orgPath 筛选、成员详情
- 参数验证：pageNum/pageSize 默认值、边界验证
- 权限验证：未认证拒绝
- 边界条件：组织不存在、不传 orgPath

**微信登录 API**:
- 正常流程：已有用户登录、新用户自动创建、默认团队创建
- 参数验证：code 必填
- 错误处理：扫码不存在、已过期、未确认
- 安全性：JWT 格式验证、payload 内容验证
- 无认证：不带认证也能正常工作

---

## 8. 实现说明

### 8.1 技术要点

1. **ObjectId 类型处理**: MongoDB 聚合查询需要使用 `mongoose.Types.ObjectId()` 转换字符串 ID
2. **分页参数验证**: 先验证再设默认值，避免 `Number('0') || 1` 的逻辑问题
3. **事务操作**: changeOwner 使用 MongoDB 事务确保角色交换的原子性
4. **JWT 生成**: 包含 userId、teamId、tmbId 三个关键字段

### 8.2 文件列表

**API 文件**:
- `pages/api/support/user/team/group/members.ts`
- `pages/api/support/user/team/group/changeOwner.ts`
- `pages/api/support/user/team/org/members.ts`
- `pages/api/support/user/account/login/wx/getResult.ts`

**类型定义**:
- `src/packages/global/support_user_team/group/api.d.ts` - GetGroupMembersQuery, PutChangeGroupOwnerBody
- `src/packages/global/support_user_team/org/api.d.ts` - GetOrgMembersQuery, PaginatedResponse
- `src/packages/global/support_user/auth/type.d.ts` - GetWxLoginResultRequest, GetWxLoginResultResponse

**测试文件**:
- `test/api/phase6/groupMember.api.test.ts`
- `test/api/phase6/orgMember.api.test.ts`
- `test/api/phase6/wxLogin.api.test.ts`

---

*创建时间: 2025-11-26*
*完成时间: 2025-11-26*

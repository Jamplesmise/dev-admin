# Phase 6A - 团队协作者与用户搜索

> 子阶段: Phase 6A
> API 数量: 5 个
> 优先级: P1
> 状态: ✅ **已完成**
> 完成时间: 2025-11-26
> 创建时间: 2025-11-26

---

## 1. 功能概述

### 1.1 目标

实现团队级别的协作者权限管理和统一用户搜索功能，这是协作者选择 UI 的核心依赖。

### 1.2 API 清单

| 序号 | 接口 | 方法 | 路径 | 优先级 | 状态 |
|------|------|------|------|--------|------|
| 1 | 用户搜索 | GET | `/api/support/user/search` | P1 | ✅ 完成 |
| 2 | 团队协作者列表 | GET | `/api/support/user/team/collaborator/list` | P1 | ✅ 完成 |
| 3 | 更新协作者权限 | POST | `/api/support/user/team/collaborator/update` | P1 | ✅ 完成 |
| 4 | 更新单个协作者 | PUT | `/api/support/user/team/collaborator/updateOne` | P2 | ✅ 完成 |
| 5 | 删除协作者 | DELETE | `/api/support/user/team/collaborator/delete` | P1 | ✅ 完成 |

---

## 2. API 详细规范

### 2.1 用户搜索 API

#### `GET /api/support/user/search`

**功能**: 统一搜索用户、组织、分组，用于协作者选择等场景

**请求参数** (Query):
```typescript
{
  searchKey: string;              // 必填，搜索关键词
  members?: boolean;              // 可选，是否搜索成员，默认 true
  orgs?: boolean;                 // 可选，是否搜索组织，默认 true
  groups?: boolean;               // 可选，是否搜索分组，默认 true
}
```

**响应数据**:
```typescript
type SearchResult = {
  members: Array<{
    userId: string;
    tmbId: string;
    memberName: string;
    avatar: string;
    role: 'owner' | 'admin' | 'member';
    status: 'active' | 'waiting' | 'inactive';
    contact?: string;
    createTime: Date;
  }>;
  orgs: Array<{
    _id: string;
    teamId: string;
    pathId: string;
    path: string;
    name: string;
    avatar: string;
    description?: string;
    total: number;
  }>;
  groups: Array<{
    _id: string;
    teamId: string;
    name: string;
    avatar: string;
    updateTime: Date;
  }>;
}
```

**实现要点**:
1. 使用 MongoDB 正则搜索，支持模糊匹配
2. 限制返回结果数量（如每类最多 20 条）
3. 只返回当前团队的数据
4. 搜索字段：成员名称、组织名称、分组名称

---

### 2.2 团队协作者列表 API

#### `GET /api/support/user/team/collaborator/list`

**功能**: 获取团队级别的协作者权限列表

**请求参数**: 无（从认证信息获取 teamId）

**响应数据**:
```typescript
type CollaboratorListType = {
  clbs: Array<{
    teamId: string;
    permission: Permission;       // 权限对象
    name: string;
    avatar: string;
    tmbId?: string;               // 个人协作者
    groupId?: string;             // 分组协作者
    orgId?: string;               // 组织协作者
  }>;
  parentClbs?: Array<CollaboratorItemDetailType>;  // 父级继承的协作者
}
```

**实现要点**:
1. 复用现有 `collaborator` Schema
2. 筛选 `resourceType: 'team'` 的记录
3. 关联查询成员/分组/组织名称和头像

---

### 2.3 更新协作者权限 API

#### `POST /api/support/user/team/collaborator/update`

**功能**: 批量更新团队协作者权限

**请求参数** (Body):
```typescript
type UpdateClbPermissionProps = {
  collaborators: Array<{
    permission: number;           // 权限值（位运算）
    tmbId?: string;
    groupId?: string;
    orgId?: string;
  }>;
}
```

**响应数据**: 无

**实现要点**:
1. 权限验证：只有 owner/admin 可以操作
2. 批量 upsert 操作
3. 不能修改 owner 的权限

---

### 2.4 更新单个协作者权限 API

#### `PUT /api/support/user/team/collaborator/updateOne`

**功能**: 更新单个协作者的权限

**请求参数** (Body):
```typescript
{
  permission: number;             // 新的权限值
  tmbId?: string;
  orgId?: string;
  groupId?: string;
}
```

**响应数据**: 无

**实现要点**:
1. 权限验证
2. 单条 update 操作
3. 记录操作审计日志

---

### 2.5 删除协作者 API

#### `DELETE /api/support/user/team/collaborator/delete`

**功能**: 删除团队协作者

**请求参数** (Query):
```typescript
{
  tmbId?: string;
  groupId?: string;
  orgId?: string;
}
```

**响应数据**: 无

**实现要点**:
1. 权限验证
2. 不能删除 owner
3. 物理删除记录

---

## 3. 数据模型

### 3.1 复用现有 Schema

团队协作者可以复用现有的 `CollaboratorSchema`，新增 `resourceType: 'team'`：

```typescript
// src/packages/service/support_permission/collaborator/schema.ts
const CollaboratorSchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, required: true },
  resourceType: {
    type: String,
    enum: ['app', 'dataset', 'team'],  // 新增 'team'
    required: true
  },
  resourceId: { type: Schema.Types.ObjectId },  // team 类型时可为空

  // 协作者标识（三选一）
  tmbId: { type: Schema.Types.ObjectId },
  groupId: { type: Schema.Types.ObjectId },
  orgId: { type: Schema.Types.ObjectId },

  permission: { type: Number, required: true },

  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});
```

---

## 4. 任务分解

### 4.1 用户搜索 (6A-1) ✅

```
[6A-1] 用户搜索 API
├── [x] 创建 pages/api/support/user/search.ts
├── [x] 实现成员搜索（正则匹配 memberName）
├── [x] 实现组织搜索（正则匹配 name）
├── [x] 实现分组搜索（正则匹配 name）
├── [x] 限制返回数量（每类最多 20 条）
├── [x] 添加认证中间件
└── [x] 编写单元测试（11 个测试用例）
```

### 4.2 团队协作者列表 (6A-2) ✅

```
[6A-2] 团队协作者列表 API
├── [x] 创建 pages/api/support/user/team/collaborator/list.ts
├── [x] 复用 CollaboratorSchema（扩展支持 team 类型）
├── [x] 实现查询逻辑（resourceType: 'team'）
├── [x] 关联查询名称和头像
├── [x] 添加权限验证
└── [x] 编写单元测试（4 个测试用例）
```

### 4.3 更新协作者权限 (6A-3) ✅

```
[6A-3] 更新协作者权限 API
├── [x] 创建 pages/api/support/user/team/collaborator/update.ts
├── [x] 实现批量 upsert 逻辑（使用 bulkWrite）
├── [x] 添加 owner 保护
├── [x] 添加权限验证（owner/admin 可操作）
└── [x] 编写单元测试（9 个测试用例）
```

### 4.4 更新单个协作者 (6A-4) ✅

```
[6A-4] 更新单个协作者 API
├── [x] 创建 pages/api/support/user/team/collaborator/updateOne.ts
├── [x] 实现单条 update 逻辑
├── [x] 添加 owner 权限保护
└── [x] 编写单元测试（3 个测试用例）
```

### 4.5 删除协作者 (6A-5) ✅

```
[6A-5] 删除协作者 API
├── [x] 创建 pages/api/support/user/team/collaborator/delete.ts
├── [x] 实现删除逻辑（物理删除）
├── [x] 添加 owner 保护
└── [x] 编写单元测试（5 个测试用例）
```

---

## 5. 新增/修改文件清单

### 5.1 API 文件（已创建）

```
pages/api/support/user/
├── search.ts                                    # 用户搜索 ✅
└── team/collaborator/
    ├── list.ts                                  # 协作者列表 ✅
    ├── update.ts                                # 批量更新 ✅
    ├── updateOne.ts                             # 单个更新 ✅
    └── delete.ts                                # 删除 ✅
```

### 5.2 Schema 修改（已完成）

```
src/packages/global/support/permission/collaborator/
└── constant.ts                                  # 新增 'team' 资源类型 ✅

src/packages/service/support_permission/collaborator/
└── schema.ts                                    # resourceId 改为可选（team 类型时）✅
```

### 5.3 测试文件（已创建）

```
test/api/phase6/
├── userSearch.api.test.ts                       # 用户搜索测试 (11 tests) ✅
└── teamCollaborator.api.test.ts                 # 团队协作者测试 (21 tests) ✅
```

---

## 6. 权限说明

### 6.1 权限位定义

```typescript
const PermissionBits = {
  read: 0b100,    // 4 - 读取权限
  write: 0b010,   // 2 - 写入权限
  manage: 0b001   // 1 - 管理权限
};

// 组合示例
// 只读: 4 (0b100)
// 读写: 6 (0b110)
// 全部: 7 (0b111)
```

### 6.2 操作权限要求

| 操作 | 要求 |
|------|------|
| 查看协作者列表 | 团队成员 |
| 添加/更新协作者 | owner 或 admin |
| 删除协作者 | owner 或 admin |
| 修改 owner 权限 | 禁止 |

---

## 7. 验收标准

- [x] 用户搜索返回正确的成员/组织/分组列表
- [x] 搜索结果限制在当前团队范围内
- [x] 协作者列表正确显示名称和头像
- [x] 权限位运算正确（0-7 范围验证）
- [x] owner 权限不可被修改或删除
- [x] 所有 API 通过认证中间件保护
- [x] 单元测试覆盖率 ≥ 80%（32 个测试全部通过）

---

## 8. 测试结果

```
✓ test/api/phase6/teamCollaborator.api.test.ts (21 tests)
✓ test/api/phase6/userSearch.api.test.ts (11 tests)

Test Files  2 passed (2)
Tests       32 passed (32)
Duration    ~40s
```

---

*创建时间: 2025-11-26*
*完成时间: 2025-11-26*

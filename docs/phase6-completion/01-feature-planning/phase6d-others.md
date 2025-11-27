# Phase 6D - 数据同步与其他功能

> 子阶段: Phase 6D
> API 数量: 11 个
> 优先级: P2-P3
> 创建时间: 2025-11-26

---

## 1. 功能概述

### 1.1 目标

完成数据同步、用户管理扩展、团队标签等剩余功能，实现 100% 接口覆盖率。

### 1.2 API 清单

| 分组 | 接口 | 方法 | 路径 | 优先级 |
|------|------|------|------|--------|
| **6D-1: 用户管理** | | | | |
| | 成员同步 | POST | `/api/support/user/sync` | P2 |
| | 成员导出 | GET | `/api/support/user/team/member/export` | P2 |
| | 更新通知账户 | PUT | `/api/support/user/team/updateNotificationAccount` | P2 |
| **6D-2: 团队标签** | | | | |
| | 团队标签列表 | GET | `/api/support/user/team/tag/list` | P2 |
| | 异步加载标签 | GET | `/api/support/user/team/tag/async` | P3 |
| | 令牌获取应用 | GET | `/api/support/user/team/tag/getAppsByTeamTokens` | P3 |
| **6D-3: 数据集同步** | | | | |
| | 数据集同步 | POST | `/api/core/dataset/datasetSync` | P2 |
| | 更改数据集所有者 | POST | `/api/core/dataset/changeOwner` | P2 |
| | 外部文件集合 | POST | `/api/core/dataset/collection/create/externalFileUrl` | P3 |
| **6D-4: 其他** | | | | |
| | 推广记录列表 | POST | `/api/support/activity/promotion/getPromotions` | P2 |
| | 模板类型列表 | GET | `/api/core/app/template/getTemplateTypes` | P3 |

---

## 2. API 详细规范

### 2.1 成员同步 API

#### `POST /api/support/user/sync`

**功能**: 从外部系统同步用户信息

**请求参数** (Body):
```typescript
{
  users: Array<{
    externalId: string;      // 外部系统用户 ID
    username: string;        // 用户名
    email?: string;          // 邮箱
    phone?: string;          // 手机号
    avatar?: string;         // 头像 URL
    department?: string;     // 部门路径，如 "公司/技术部/后端组"
  }>;
  syncMode: 'incremental' | 'full';  // 增量/全量同步
}
```

**响应数据**:
```typescript
{
  created: number;    // 新创建用户数
  updated: number;    // 更新用户数
  skipped: number;    // 跳过用户数
  errors: Array<{
    externalId: string;
    reason: string;
  }>;
}
```

**实现要点**:
1. 验证调用方权限（需要团队管理员）
2. 根据 externalId 查找或创建用户
3. 全量同步时，不在列表中的成员标记为 inactive
4. 自动创建不存在的部门结构
5. 记录同步日志

---

### 2.2 成员导出 API

#### `GET /api/support/user/team/member/export`

**功能**: 导出团队成员列表为 CSV/Excel

**请求参数** (Query):
```typescript
{
  format?: 'csv' | 'xlsx';  // 导出格式，默认 csv
}
```

**响应数据**: 文件流（Content-Type: text/csv 或 application/vnd.openxmlformats...）

**CSV 字段**:
```
用户名,邮箱,手机号,角色,状态,所属部门,加入时间
```

**实现要点**:
1. 查询所有团队成员
2. 关联查询用户详情和组织信息
3. 生成 CSV/Excel 文件
4. 设置正确的响应头

---

### 2.3 更新通知账户 API

#### `PUT /api/support/user/team/updateNotificationAccount`

**功能**: 更新团队通知账户配置

**请求参数** (Body):
```typescript
{
  emailNotification?: {
    enabled: boolean;
    email: string;
  };
  smsNotification?: {
    enabled: boolean;
    phone: string;
  };
  webhookNotification?: {
    enabled: boolean;
    url: string;
    secret?: string;
  };
}
```

**响应数据**: 无

**实现要点**:
1. 验证当前用户是团队 owner/admin
2. 验证邮箱/手机号/URL 格式
3. 更新团队设置

---

### 2.4 团队标签列表 API

#### `GET /api/support/user/team/tag/list`

**功能**: 获取团队自定义标签列表

**请求参数**: 无

**响应数据**:
```typescript
Array<{
  _id: string;
  teamId: string;
  key: string;           // 标签键
  label: string;         // 显示名称
  type: 'single' | 'multi';  // 单选/多选
  options: Array<{
    value: string;
    label: string;
    color?: string;
  }>;
  createTime: Date;
}>
```

**实现要点**:
1. 查询 `team_tags` 表
2. 按创建时间排序

---

### 2.5 异步加载标签 API

#### `GET /api/support/user/team/tag/async`

**功能**: 分页异步加载标签（用于大量标签场景）

**请求参数** (Query):
```typescript
{
  page?: number;      // 页码，默认 1
  pageSize?: number;  // 每页数量，默认 20
  keyword?: string;   // 搜索关键词
}
```

**响应数据**:
```typescript
{
  list: Array<TeamTagType>;
  total: number;
  hasMore: boolean;
}
```

---

### 2.6 令牌获取应用 API

#### `GET /api/support/user/team/tag/getAppsByTeamTokens`

**功能**: 根据团队令牌获取关联的应用列表

**请求参数** (Query):
```typescript
{
  tokens: string;  // 逗号分隔的令牌列表
}
```

**响应数据**:
```typescript
Array<{
  appId: string;
  appName: string;
  avatar: string;
  teamId: string;
}>
```

**实现要点**:
1. 解析令牌列表
2. 验证令牌有效性
3. 查询令牌关联的应用
4. 返回应用基本信息

---

### 2.7 数据集同步 API

#### `POST /api/core/dataset/datasetSync`

**功能**: 触发数据集同步任务

**请求参数** (Body):
```typescript
{
  datasetId: string;      // 必填，数据集 ID
  syncMode?: 'manual' | 'auto';  // 同步模式
}
```

**响应数据**:
```typescript
{
  taskId: string;         // 同步任务 ID
  status: 'queued' | 'running';
}
```

**实现要点**:
1. 验证数据集权限
2. 检查是否有进行中的同步任务
3. 创建同步任务记录
4. 触发异步同步流程

---

### 2.8 更改数据集所有者 API

#### `POST /api/core/dataset/changeOwner`

**功能**: 转让数据集所有权

**请求参数** (Body):
```typescript
{
  datasetId: string;      // 必填，数据集 ID
  targetTmbId: string;    // 必填，新所有者的 tmbId
}
```

**响应数据**: 无

**实现要点**:
1. 验证当前用户是数据集 owner
2. 验证目标用户是团队成员
3. 更新数据集 tmbId
4. 更新相关协作者记录
5. 记录操作审计日志

---

### 2.9 外部文件集合 API

#### `POST /api/core/dataset/collection/create/externalFileUrl`

**功能**: 从外部 URL 创建数据集集合

**请求参数** (Body):
```typescript
{
  datasetId: string;       // 必填，数据集 ID
  externalFileUrl: string; // 必填，外部文件 URL
  name?: string;           // 集合名称，默认从 URL 提取
  metadata?: Record<string, any>;  // 自定义元数据
}
```

**响应数据**:
```typescript
{
  collectionId: string;
}
```

**实现要点**:
1. 验证数据集权限
2. 验证 URL 格式和可访问性
3. 创建集合记录
4. 触发异步文件下载和处理

---

### 2.10 推广记录列表 API

#### `POST /api/support/activity/promotion/getPromotions`

**功能**: 分页获取推广记录

**请求参数** (Body):
```typescript
{
  pageNum: number;        // 页码
  pageSize: number;       // 每页数量
  status?: 'pending' | 'completed' | 'expired';  // 筛选状态
  dateRange?: {
    start: Date;
    end: Date;
  };
}
```

**响应数据**:
```typescript
{
  list: Array<{
    _id: string;
    promoterId: string;      // 推广人 ID
    promoterName: string;    // 推广人名称
    inviteeId: string;       // 被邀请人 ID
    inviteeName: string;     // 被邀请人名称
    rewardAmount: number;    // 奖励金额（分）
    status: 'pending' | 'completed' | 'expired';
    createTime: Date;
    completeTime?: Date;
  }>;
  total: number;
  pageNum: number;
  pageSize: number;
}
```

**实现要点**:
1. 分页查询 `promotion_records` 表
2. 关联查询用户名称
3. 支持状态筛选
4. 支持时间范围筛选

---

### 2.11 模板类型列表 API

#### `GET /api/core/app/template/getTemplateTypes`

**功能**: 获取应用模板分类列表

**请求参数**: 无

**响应数据**:
```typescript
Array<{
  _id: string;
  key: string;           // 类型标识
  label: string;         // 显示名称
  icon?: string;         // 图标
  order: number;         // 排序
  children?: Array<{
    _id: string;
    key: string;
    label: string;
    parentKey: string;
  }>;
}>
```

**实现要点**:
1. 查询 `template_types` 表
2. 构建树形结构
3. 按 order 字段排序

---

## 3. 数据模型

### 3.1 团队标签 Schema (新增)

```typescript
// src/packages/service/support_user/team/tag/schema.ts
const TeamTagSchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, required: true },
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['single', 'multi'],
    default: 'single'
  },
  options: [{
    value: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String }
  }],
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

TeamTagSchema.index({ teamId: 1 });
TeamTagSchema.index({ teamId: 1, key: 1 }, { unique: true });
```

### 3.2 模板类型 Schema (新增)

```typescript
// src/packages/service/core/app/template/schema.ts
const TemplateTypeSchema = new Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  icon: { type: String },
  parentKey: { type: String },  // 父类型 key，null 表示顶级
  order: { type: Number, default: 0 },
  createTime: { type: Date, default: Date.now }
});

TemplateTypeSchema.index({ key: 1 }, { unique: true });
TemplateTypeSchema.index({ parentKey: 1 });
```

### 3.3 团队通知设置 (扩展现有 Schema)

```typescript
// 在 TeamSchema 中添加字段
{
  notificationConfig: {
    email: {
      enabled: { type: Boolean, default: false },
      address: { type: String }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      phone: { type: String }
    },
    webhook: {
      enabled: { type: Boolean, default: false },
      url: { type: String },
      secret: { type: String }
    }
  }
}
```

---

## 4. 任务分解

### 4.1 用户管理 (6D-1)

```
[6D-1-1] 成员同步 API
├── [ ] 创建 pages/api/support/user/sync.ts
├── [ ] 实现增量/全量同步逻辑
├── [ ] 自动创建部门结构
├── [ ] 记录同步日志
└── [ ] 编写单元测试

[6D-1-2] 成员导出 API
├── [ ] 创建 pages/api/support/user/team/member/export.ts
├── [ ] 实现 CSV 生成
├── [ ] 实现 Excel 生成（可选）
├── [ ] 设置正确响应头
└── [ ] 编写单元测试

[6D-1-3] 更新通知账户 API
├── [ ] 创建 pages/api/support/user/team/updateNotificationAccount.ts
├── [ ] 扩展 TeamSchema
├── [ ] 实现验证和更新逻辑
└── [ ] 编写单元测试
```

### 4.2 团队标签 (6D-2)

```
[6D-2-1] 团队标签列表 API
├── [ ] 创建 src/packages/service/support_user/team/tag/schema.ts
├── [ ] 创建 pages/api/support/user/team/tag/list.ts
└── [ ] 编写单元测试

[6D-2-2] 异步加载标签 API
├── [ ] 创建 pages/api/support/user/team/tag/async.ts
├── [ ] 实现分页和搜索
└── [ ] 编写单元测试

[6D-2-3] 令牌获取应用 API
├── [ ] 创建 pages/api/support/user/team/tag/getAppsByTeamTokens.ts
├── [ ] 实现令牌解析
├── [ ] 查询关联应用
└── [ ] 编写单元测试
```

### 4.3 数据集同步 (6D-3)

```
[6D-3-1] 数据集同步 API
├── [ ] 创建 pages/api/core/dataset/datasetSync.ts
├── [ ] 实现同步任务创建
├── [ ] 添加重复同步检查
└── [ ] 编写单元测试

[6D-3-2] 更改数据集所有者 API
├── [ ] 创建 pages/api/core/dataset/changeOwner.ts
├── [ ] 实现所有权转让
├── [ ] 更新协作者记录
├── [ ] 记录审计日志
└── [ ] 编写单元测试

[6D-3-3] 外部文件集合 API
├── [ ] 创建 pages/api/core/dataset/collection/create/externalFileUrl.ts
├── [ ] 实现 URL 验证
├── [ ] 创建集合记录
└── [ ] 编写单元测试
```

### 4.4 其他 (6D-4)

```
[6D-4-1] 推广记录列表 API
├── [ ] 创建 pages/api/support/activity/promotion/getPromotions.ts
├── [ ] 实现分页查询
├── [ ] 实现状态和时间筛选
└── [ ] 编写单元测试

[6D-4-2] 模板类型列表 API
├── [ ] 创建 src/packages/service/core/app/template/schema.ts
├── [ ] 创建 pages/api/core/app/template/getTemplateTypes.ts
├── [ ] 实现树形结构查询
└── [ ] 编写单元测试
```

---

## 5. 新增文件清单

```
src/packages/service/
├── support_user/team/tag/
│   └── schema.ts                                # 团队标签 Schema
└── core/app/template/
    └── schema.ts                                # 模板类型 Schema

pages/api/
├── support/
│   ├── user/
│   │   ├── sync.ts                              # 成员同步
│   │   └── team/
│   │       ├── member/
│   │       │   └── export.ts                    # 成员导出
│   │       ├── updateNotificationAccount.ts     # 通知设置
│   │       └── tag/
│   │           ├── list.ts                      # 标签列表
│   │           ├── async.ts                     # 异步加载
│   │           └── getAppsByTeamTokens.ts       # 令牌应用
│   └── activity/promotion/
│       └── getPromotions.ts                     # 推广记录
└── core/
    ├── dataset/
    │   ├── datasetSync.ts                       # 数据集同步
    │   ├── changeOwner.ts                       # 更改所有者
    │   └── collection/create/
    │       └── externalFileUrl.ts               # 外部文件
    └── app/template/
        └── getTemplateTypes.ts                  # 模板类型

test/api/phase6/
├── userSync.api.test.ts                         # 成员同步测试
├── memberExport.api.test.ts                     # 成员导出测试
├── teamTag.api.test.ts                          # 团队标签测试
├── datasetSync.api.test.ts                      # 数据集同步测试
├── promotion.api.test.ts                        # 推广记录测试
└── templateType.api.test.ts                     # 模板类型测试
```

---

## 6. 与现有代码的关系

### 6.1 已有推广相关

已有实现:
- `GET /api/support/activity/promotion/getPromotion`: 获取单条推广详情

新增:
- `POST /api/support/activity/promotion/getPromotions`: 分页列表查询

### 6.2 数据集相关

已有实现:
- `DatasetSchema`: 数据集基本信息
- `DatasetCollectionSchema`: 集合信息
- 多个数据集 CRUD API

新增:
- 数据集同步 API
- 数据集所有者转让 API
- 外部 URL 创建集合 API

### 6.3 应用模板相关

已有实现:
- `GET /api/core/app/template/list`: 模板列表

新增:
- `GET /api/core/app/template/getTemplateTypes`: 模板分类列表

---

## 7. 验收标准

### 6D-1: 用户管理
- [ ] 成员同步支持增量/全量模式
- [ ] 同步自动创建不存在的部门
- [ ] 成员导出生成有效的 CSV 文件
- [ ] 通知设置支持邮件/短信/Webhook

### 6D-2: 团队标签
- [ ] 标签列表正确返回所有标签
- [ ] 异步加载支持分页和搜索
- [ ] 令牌获取应用验证令牌有效性

### 6D-3: 数据集同步
- [ ] 同步任务创建成功
- [ ] 防止重复创建同步任务
- [ ] 数据集所有者转让成功
- [ ] 外部 URL 创建集合成功

### 6D-4: 其他
- [ ] 推广记录支持分页和筛选
- [ ] 模板类型返回正确的树形结构

### 通用
- [ ] 所有 API 通过认证中间件保护
- [ ] 单元测试覆盖率 ≥ 80%

---

*创建时间: 2025-11-26*

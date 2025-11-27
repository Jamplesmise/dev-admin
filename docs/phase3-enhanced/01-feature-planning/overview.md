# Phase 3 - 增强功能规划概览

> 阶段: Phase 3 - 增强功能
> 优先级: P2
> 预计工期: 1 周
> 接口数量: 13 个
> 最后更新: 2025-11-23

---

## 1. 模块概览

| 模块 | 接口数 | 说明 | 依赖 |
|------|--------|------|------|
| 聊天设置 | 7 | 收藏应用、个性化设置 | - |
| 应用评估 | 6 | AI 应用质量评估 | - |

---

## 2. 聊天设置模块 (7 接口)

### 功能说明

提供用户个性化的聊天设置，包括收藏应用管理、首页配置等 Pro 功能。

### 接口清单

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取设置详情 | GET | `/api/core/chat/setting/detail` | 获取用户聊天设置 |
| 更新设置 | POST | `/api/core/chat/setting/update` | 更新聊天设置 |
| 获取收藏列表 | GET | `/api/core/chat/setting/favourite/list` | 获取收藏的应用 |
| 添加/更新收藏 | POST | `/api/core/chat/setting/favourite/update` | 收藏应用 |
| 调整收藏顺序 | PUT | `/api/core/chat/setting/favourite/order` | 拖拽排序 |
| 更新收藏标签 | PUT | `/api/core/chat/setting/favourite/tags` | 设置标签 |
| 删除收藏 | DELETE | `/api/core/chat/setting/favourite/delete` | 取消收藏 |

### 数据模型

```typescript
// 用户聊天设置
type ChatSettingSchema = {
  _id: ObjectId;
  tmbId: ObjectId;            // 团队成员 ID
  teamId: ObjectId;

  // 首页设置
  homeEnabled: boolean;       // 是否启用首页
  homeWelcome: string;        // 欢迎语
  homeBackground?: string;    // 背景图

  // 默认设置
  defaultAppId?: ObjectId;    // 默认应用
  sidebarCollapsed: boolean;  // 侧边栏折叠

  createTime: Date;
  updateTime: Date;
}

// 收藏应用
type FavouriteAppSchema = {
  _id: ObjectId;
  tmbId: ObjectId;
  teamId: ObjectId;
  appId: ObjectId;

  // 排序和分类
  order: number;
  tags: string[];

  // 自定义
  customName?: string;        // 自定义名称
  customIcon?: string;        // 自定义图标

  createTime: Date;
}
```

### 前端组件

```
pageComponents/chat/
├── ChatSetting/
│   ├── index.tsx
│   ├── HomepageSetting/
│   └── FavouriteList/
└── constants.ts              # ChatSidebarPaneEnum
```

### Pro 功能标识

以下功能仅在 `feConfigs.isPlus = true` 时可用：
- 首页面板 (HOME)
- 收藏应用 (FAVORITE_APPS)

---

## 3. 应用评估模块 (6 接口)

### 功能说明

提供 AI 应用的质量评估能力，支持批量测试和结果分析。

### 接口清单

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取评估列表 | POST | `/api/core/app/evaluation/list` | 评估任务列表 |
| 删除评估 | DELETE | `/api/core/app/evaluation/delete` | 删除评估任务 |
| 获取评估项目 | POST | `/api/core/app/evaluation/listItems` | 评估项目列表 |
| 删除评估项目 | DELETE | `/api/core/app/evaluation/deleteItem` | 删除单个项目 |
| 重试评估项目 | POST | `/api/core/app/evaluation/retryItem` | 重新执行评估 |
| 更新评估项目 | POST | `/api/core/app/evaluation/updateItem` | 更新评估结果 |

### 数据模型

```typescript
// 评估任务
type EvaluationSchema = {
  _id: ObjectId;
  teamId: ObjectId;
  tmbId: ObjectId;
  appId: ObjectId;

  // 评估配置
  name: string;
  description?: string;

  // 评估数据集
  datasetId?: ObjectId;       // 关联数据集
  testCases: TestCase[];      // 测试用例

  // 评估指标
  metrics: EvaluationMetric[];

  // 状态
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;           // 0-100

  // 结果统计
  totalItems: number;
  passedItems: number;
  failedItems: number;
  avgScore: number;

  createTime: Date;
  completeTime?: Date;
}

type TestCase = {
  input: string;              // 输入问题
  expectedOutput?: string;    // 期望输出
  context?: string;           // 上下文
}

type EvaluationMetric = {
  name: string;               // 指标名称
  weight: number;             // 权重
  threshold: number;          // 阈值
}

// 评估项目
type EvaluationItemSchema = {
  _id: ObjectId;
  evaluationId: ObjectId;

  // 测试用例
  input: string;
  expectedOutput?: string;
  context?: string;

  // 实际结果
  actualOutput?: string;
  responseTime?: number;      // 响应时间(ms)
  tokenUsage?: number;

  // 评分
  scores: {
    metric: string;
    score: number;
    reason?: string;
  }[];
  totalScore: number;
  passed: boolean;

  // 状态
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;

  createTime: Date;
  completeTime?: Date;
}
```

### 前端组件

```
pageComponents/app/detail/
├── Evaluation/
│   ├── index.tsx
│   ├── EvaluationList.tsx
│   ├── EvaluationDetail.tsx
│   └── CreateEvaluationModal.tsx
```

### API Client

```typescript
// web/core/app/api/evaluation.ts
export const getEvaluations = (data) =>
  POST('/api/core/app/evaluation/list', data);

export const deleteEvaluation = (data) =>
  DELETE('/api/core/app/evaluation/delete', data);

export const getEvaluationItems = (data) =>
  POST('/api/core/app/evaluation/listItems', data);

export const deleteEvaluationItem = (data) =>
  DELETE('/api/core/app/evaluation/deleteItem', data);

export const retryEvaluationItem = (data) =>
  POST('/api/core/app/evaluation/retryItem', data);

export const updateEvaluationItem = (data) =>
  POST('/api/core/app/evaluation/updateItem', data);
```

---

## 4. 开发计划

### 时间安排

```
Week 1:
├── Day 1-2: 聊天设置模块
│   ├── Day 1: 基础设置 (2 接口) + Schema
│   └── Day 2: 收藏功能 (5 接口)
│
├── Day 3-5: 应用评估模块
│   ├── Day 3: Schema + 列表 (2 接口)
│   ├── Day 4: 项目管理 (3 接口)
│   └── Day 5: 评估执行 + 测试
```

---

## 5. 验收标准

### 聊天设置

- [ ] 设置读取/保存正常
- [ ] 收藏应用 CRUD 正常
- [ ] 收藏排序功能正常
- [ ] 标签管理正常
- [ ] 与前端 Pro 标识联动

### 应用评估

- [ ] 评估任务创建/删除正常
- [ ] 评估项目列表正常
- [ ] 重试功能正常
- [ ] 评估执行逻辑正确
- [ ] 评分计算正确

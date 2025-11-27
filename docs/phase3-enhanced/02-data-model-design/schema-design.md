# Phase 3 - 数据模型设计

> 阶段: Phase 3 - 增强功能
> 最后更新: 2025-11-23

---

## 1. Schema 汇总

| Collection | 模块 | 状态 | 说明 |
|------------|------|------|------|
| `chat_settings` | 聊天设置 | 需新建 | 用户聊天设置 |
| `favourite_apps` | 聊天设置 | 需新建 | 收藏应用 |
| `evaluations` | 应用评估 | 需新建 | 评估任务 |
| `evaluation_items` | 应用评估 | 需新建 | 评估项目 |

---

## 2. 聊天设置 Schema

### 2.1 用户聊天设置 (chat_settings)

**位置**: `packages/service/core/chat/setting/schema.ts` (新建)

```typescript
import { Schema, model, models } from 'mongoose';

const ChatSettingSchema = new Schema({
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member',
    required: true
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'team',
    required: true
  },

  // 首页设置
  homeEnabled: {
    type: Boolean,
    default: false
  },
  homeWelcome: {
    type: String,
    default: '',
    maxlength: 500
  },
  homeBackground: String,

  // 默认设置
  defaultAppId: {
    type: Schema.Types.ObjectId,
    ref: 'app'
  },
  sidebarCollapsed: {
    type: Boolean,
    default: false
  },

  // 其他偏好
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    fontSize: {
      type: Number,
      default: 14,
      min: 12,
      max: 20
    },
    codeTheme: {
      type: String,
      default: 'github'
    }
  }
}, {
  timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});

// 索引 - 每个团队成员只有一个设置
ChatSettingSchema.index({ teamId: 1, tmbId: 1 }, { unique: true });

export const MongoChatSetting = models['chat_setting'] || model('chat_setting', ChatSettingSchema);
```

### 2.2 收藏应用 (favourite_apps)

**位置**: `packages/service/core/chat/favourite/schema.ts` (新建)

```typescript
import { Schema, model, models } from 'mongoose';

const FavouriteAppSchema = new Schema({
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member',
    required: true
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'team',
    required: true
  },
  appId: {
    type: Schema.Types.ObjectId,
    ref: 'app',
    required: true
  },

  // 排序
  order: {
    type: Number,
    default: 0
  },

  // 分类标签
  tags: [{
    type: String,
    maxlength: 20
  }],

  // 自定义显示
  customName: {
    type: String,
    maxlength: 50
  },
  customIcon: String
}, {
  timestamps: { createdAt: 'createTime', updatedAt: false }
});

// 索引
FavouriteAppSchema.index({ teamId: 1, tmbId: 1, order: 1 });
FavouriteAppSchema.index({ teamId: 1, tmbId: 1, appId: 1 }, { unique: true });

export const MongoFavouriteApp = models['favourite_app'] || model('favourite_app', FavouriteAppSchema);
```

---

## 3. 应用评估 Schema

### 3.1 评估任务 (evaluations)

**位置**: `packages/service/core/app/evaluation/schema.ts` (新建)

```typescript
import { Schema, model, models } from 'mongoose';

// 测试用例子文档
const TestCaseSchema = new Schema({
  input: {
    type: String,
    required: true,
    maxlength: 5000
  },
  expectedOutput: {
    type: String,
    maxlength: 10000
  },
  context: {
    type: String,
    maxlength: 5000
  }
}, { _id: false });

// 评估指标子文档
const MetricSchema = new Schema({
  name: {
    type: String,
    required: true,
    enum: ['accuracy', 'relevance', 'completeness', 'coherence', 'custom']
  },
  weight: {
    type: Number,
    default: 1,
    min: 0,
    max: 10
  },
  threshold: {
    type: Number,
    default: 0.6,
    min: 0,
    max: 1
  },
  customPrompt: String     // 自定义评估 prompt
}, { _id: false });

const EvaluationSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'team',
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team.member',
    required: true
  },
  appId: {
    type: Schema.Types.ObjectId,
    ref: 'app',
    required: true
  },

  // 基本信息
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },

  // 评估配置
  datasetId: {
    type: Schema.Types.ObjectId,
    ref: 'dataset'
  },
  testCases: [TestCaseSchema],
  metrics: [MetricSchema],

  // 评估模型配置
  evaluatorModel: {
    type: String,
    default: 'gpt-4'
  },

  // 状态
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // 结果统计
  totalItems: {
    type: Number,
    default: 0
  },
  passedItems: {
    type: Number,
    default: 0
  },
  failedItems: {
    type: Number,
    default: 0
  },
  avgScore: {
    type: Number,
    default: 0
  },

  // 错误信息
  error: String,

  // 时间
  startTime: Date,
  completeTime: Date
}, {
  timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});

// 索引
EvaluationSchema.index({ teamId: 1, appId: 1, createTime: -1 });
EvaluationSchema.index({ status: 1 });

export const MongoEvaluation = models['evaluation'] || model('evaluation', EvaluationSchema);
```

### 3.2 评估项目 (evaluation_items)

**位置**: `packages/service/core/app/evaluation/itemSchema.ts` (新建)

```typescript
import { Schema, model, models } from 'mongoose';

// 评分详情子文档
const ScoreDetailSchema = new Schema({
  metric: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  reason: String
}, { _id: false });

const EvaluationItemSchema = new Schema({
  evaluationId: {
    type: Schema.Types.ObjectId,
    ref: 'evaluation',
    required: true
  },

  // 测试用例
  input: {
    type: String,
    required: true
  },
  expectedOutput: String,
  context: String,

  // 实际结果
  actualOutput: String,
  responseTime: Number,       // 毫秒
  tokenUsage: {
    prompt: Number,
    completion: Number,
    total: Number
  },

  // 评分
  scores: [ScoreDetailSchema],
  totalScore: {
    type: Number,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  },

  // 状态
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  error: String,
  retryCount: {
    type: Number,
    default: 0
  },

  // 时间
  startTime: Date,
  completeTime: Date
}, {
  timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' }
});

// 索引
EvaluationItemSchema.index({ evaluationId: 1, status: 1 });
EvaluationItemSchema.index({ evaluationId: 1, createTime: 1 });

export const MongoEvaluationItem = models['evaluation_item'] || model('evaluation_item', EvaluationItemSchema);
```

---

## 4. 关系图

```
┌─────────────────────────────────────────────────────────────┐
│                      聊天设置系统                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      1:1      ┌────────────────┐        │
│   │ TeamMember   │──────────────>│  ChatSetting   │        │
│   └──────────────┘               └────────────────┘        │
│          │                                                  │
│          │ 1:N                                             │
│          ▼                                                  │
│   ┌──────────────┐      N:1      ┌────────────────┐        │
│   │ FavouriteApp │──────────────>│      App       │        │
│   └──────────────┘               └────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      应用评估系统                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐      N:1      ┌────────────────┐        │
│   │  Evaluation  │──────────────>│      App       │        │
│   └──────────────┘               └────────────────┘        │
│          │                                                  │
│          │ 1:N                                             │
│          ▼                                                  │
│   ┌──────────────────┐                                     │
│   │ EvaluationItem   │                                     │
│   └──────────────────┘                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 索引策略

| Collection | 索引 | 用途 |
|------------|------|------|
| chat_settings | `{teamId, tmbId}` unique | 用户设置查询 |
| favourite_apps | `{teamId, tmbId, order}` | 收藏列表排序 |
| favourite_apps | `{teamId, tmbId, appId}` unique | 防重复收藏 |
| evaluations | `{teamId, appId, createTime}` | 评估列表查询 |
| evaluation_items | `{evaluationId, status}` | 按状态筛选 |

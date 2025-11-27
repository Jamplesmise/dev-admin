# Phase 3 - 详细开发计划

> 阶段: Phase 3 - 增强功能
> 预计工期: 1 周 (5 天)
> 接口数量: 13 个
> 最后更新: 2025-11-23

---

## 1. 开发顺序

```
Week 1:
├── Day 1: 聊天设置-基础 (2 接口) + Schema
├── Day 2: 聊天设置-收藏 (5 接口)
├── Day 3: 应用评估-任务管理 (2 接口) + Schema
├── Day 4: 应用评估-项目管理 (4 接口)
└── Day 5: 评估执行逻辑 + 集成测试
```

---

## 2. 聊天设置模块 (Day 1-2)

### Day 1: 基础设置

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 创建 ChatSetting Schema | 1h | Schema 文件 |
| 创建 FavouriteApp Schema | 1h | Schema 文件 |
| 实现获取设置详情 | 2h | `detail.ts` |
| 实现更新设置 | 2h | `update.ts` |
| 编写基础测试 | 2h | 测试用例 |

### Day 2: 收藏功能

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 实现获取收藏列表 | 1.5h | `favourite/list.ts` |
| 实现添加/更新收藏 | 1.5h | `favourite/update.ts` |
| 实现调整收藏顺序 | 1.5h | `favourite/order.ts` |
| 实现更新收藏标签 | 1h | `favourite/tags.ts` |
| 实现删除收藏 | 1h | `favourite/delete.ts` |
| 修改前端 API 路径 | 0.5h | 前端适配 |
| 编写测试 | 2h | 测试用例 |

### 产出文件

```
packages/service/core/chat/
├── setting/
│   ├── schema.ts
│   └── controller.ts
└── favourite/
    ├── schema.ts
    └── controller.ts

projects/app/src/pages/api/core/chat/setting/
├── detail.ts
├── update.ts
└── favourite/
    ├── list.ts
    ├── update.ts
    ├── order.ts
    ├── tags.ts
    └── delete.ts

test/cases/chatSetting/
├── setting.test.ts
└── favourite.test.ts
```

---

## 3. 应用评估模块 (Day 3-5)

### Day 3: 任务管理

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 创建 Evaluation Schema | 1.5h | Schema 文件 |
| 创建 EvaluationItem Schema | 1.5h | Schema 文件 |
| 创建 Evaluation Controller | 2h | 业务逻辑 |
| 实现获取评估列表 | 1.5h | `list.ts` |
| 实现删除评估 | 1.5h | `delete.ts` |

### Day 4: 项目管理

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 实现获取评估项目 | 1.5h | `listItems.ts` |
| 实现删除评估项目 | 1h | `deleteItem.ts` |
| 实现重试评估项目 | 2h | `retryItem.ts` |
| 实现更新评估项目 | 1.5h | `updateItem.ts` |
| 修改前端 API 路径 | 0.5h | 前端适配 |
| 编写测试 | 2h | 测试用例 |

### Day 5: 评估执行

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 实现评估执行引擎 | 3h | 执行逻辑 |
| 实现评分计算逻辑 | 2h | 评分算法 |
| 集成测试 | 2h | 集成测试 |
| Bug 修复 | 1h | 修复 |

### 产出文件

```
packages/service/core/app/evaluation/
├── schema.ts
├── itemSchema.ts
├── controller.ts
└── executor.ts

projects/app/src/pages/api/core/app/evaluation/
├── list.ts
├── delete.ts
├── listItems.ts
├── deleteItem.ts
├── retryItem.ts
└── updateItem.ts

test/cases/evaluation/
├── task.test.ts
├── items.test.ts
└── executor.test.ts
```

---

## 4. 评估执行引擎设计

### 执行流程

```
1. 创建评估任务
   ├── 解析测试用例
   ├── 创建评估项目
   └── 更新任务状态为 running

2. 执行评估项目（并发控制）
   ├── 调用应用 API 获取回答
   ├── 调用评估模型打分
   └── 更新项目结果

3. 汇总评估结果
   ├── 计算通过率
   ├── 计算平均分
   └── 更新任务状态为 completed
```

### 评分算法

```typescript
// 评分 Prompt 模板
const scorePrompt = `
请评估以下 AI 助手的回答质量。

问题: {{input}}
期望答案: {{expectedOutput}}
实际答案: {{actualOutput}}

请从以下维度评分（0-1 分）：
1. accuracy（准确性）：答案是否准确
2. relevance（相关性）：答案是否切题
3. completeness（完整性）：答案是否完整
4. coherence（连贯性）：答案是否通顺

请按 JSON 格式返回：
{
  "scores": [
    { "metric": "accuracy", "score": 0.8, "reason": "..." },
    ...
  ]
}
`;

// 计算总分
function calculateTotalScore(
  scores: ScoreDetail[],
  metrics: EvaluationMetric[]
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const metric of metrics) {
    const score = scores.find(s => s.metric === metric.name);
    if (score) {
      weightedSum += score.score * metric.weight;
      totalWeight += metric.weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// 判断是否通过
function isPassed(
  scores: ScoreDetail[],
  metrics: EvaluationMetric[]
): boolean {
  for (const metric of metrics) {
    const score = scores.find(s => s.metric === metric.name);
    if (score && score.score < metric.threshold) {
      return false;
    }
  }
  return true;
}
```

---

## 5. 每日 Checkin

| 日期 | 计划任务 | 实际完成 | 问题 |
|------|----------|----------|------|
| Day 1 | 聊天设置基础 (2 接口) | - | - |
| Day 2 | 聊天设置收藏 (5 接口) | - | - |
| Day 3 | 评估任务管理 (2 接口) | - | - |
| Day 4 | 评估项目管理 (4 接口) | - | - |
| Day 5 | 评估执行 + 测试 | - | - |

---

## 6. 交付检查清单

### Phase 3 完成标准

- [ ] 13 个 API 全部实现
- [ ] 聊天设置保存/读取正常
- [ ] 收藏应用管理正常
- [ ] 评估任务创建/执行正常
- [ ] 评分计算正确
- [ ] 测试覆盖率 ≥ 80%

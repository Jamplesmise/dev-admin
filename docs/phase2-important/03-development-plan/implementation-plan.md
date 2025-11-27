# Phase 2 - 详细开发计划

> 阶段: Phase 2 - 重要功能
> 预计工期: 1.5 周 (7.5 天)
> 接口数量: 16 个
> 最后更新: 2025-11-23

---

## 1. 开发顺序

```
Week 1 (后半周):
├── Day 1: 成员分组模块 (4 接口)
├── Day 2: 协作者管理-应用 (3 接口)
├── Day 3: 协作者管理-数据集 (3 接口)
│
Week 2 (前半周):
├── Day 1: 发票管理模块 (4 接口)
└── Day 2: 应用日志模块 (2 接口)
```

---

## 2. 成员分组模块 (Day 1)

### 任务清单

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 研究现有 Schema 和 Controller | 1h | 理解代码 |
| 实现获取分组列表 | 1.5h | `list.ts` |
| 实现创建分组 | 1.5h | `create.ts` |
| 实现更新分组 | 1h | `update.ts` |
| 实现删除分组 | 1.5h | `delete.ts` |
| 修改前端 API 路径 | 0.5h | 前端适配 |
| 编写单元测试 | 2h | 测试用例 |

### 产出文件

```
projects/app/src/pages/api/support/user/team/group/
├── list.ts
├── create.ts
├── update.ts
└── delete.ts

test/cases/group/
├── list.test.ts
└── crud.test.ts
```

### 验收标准

- [ ] 分组列表正确返回（含成员数量）
- [ ] 创建分组成功
- [ ] 更新分组名称/成员正常
- [ ] 删除分组（含成员关系清理）
- [ ] 操作记录到审计日志

---

## 3. 协作者管理模块 (Day 2-3)

### Day 2: 应用协作者

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 创建 Collaborator Schema | 1.5h | Schema 文件 |
| 创建 Collaborator Controller | 2h | 业务逻辑 |
| 实现获取协作者列表 | 1.5h | `list.ts` |
| 实现更新协作者 | 1.5h | `update.ts` |
| 实现删除协作者 | 1h | `delete.ts` |
| 编写测试 | 1.5h | 测试用例 |

### Day 3: 数据集协作者

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 复用协作者基础设施 | 0.5h | - |
| 实现数据集协作者列表 | 1.5h | `list.ts` |
| 实现数据集协作者更新 | 1.5h | `update.ts` |
| 实现数据集协作者删除 | 1h | `delete.ts` |
| 实现权限计算逻辑 | 2h | 权限服务 |
| 修改前端 API 路径 | 1h | 前端适配 |
| 编写测试 | 1.5h | 测试用例 |

### 产出文件

```
packages/service/support/permission/collaborator/
├── schema.ts
├── controller.ts
└── utils.ts

projects/app/src/pages/api/core/app/collaborator/
├── list.ts
├── update.ts
└── delete.ts

projects/app/src/pages/api/core/dataset/collaborator/
├── list.ts
├── update.ts
└── delete.ts

test/cases/collaborator/
├── app.test.ts
├── dataset.test.ts
└── permission.test.ts
```

### 验收标准

- [ ] 协作者列表正确返回（按成员/分组/组织）
- [ ] 添加协作者（支持三种类型）
- [ ] 更新协作者权限
- [ ] 删除协作者
- [ ] 权限计算正确（并集）
- [ ] 资源访问权限校验正确

---

## 4. 发票管理模块 (Week 2, Day 1)

### 任务清单

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 创建 Invoice Schema | 1h | Schema 文件 |
| 创建 Invoice Controller | 1.5h | 业务逻辑 |
| 实现待开票列表 | 1.5h | `unInvoiceList.ts` |
| 实现提交开票申请 | 2h | `submit.ts` |
| 实现发票记录查询 | 1h | `records.ts` |
| 实现发票下载 | 1h | `downloadFile.ts` |
| 修改前端 API 路径 | 0.5h | 前端适配 |
| 编写测试 | 1.5h | 测试用例 |

### 产出文件

```
packages/service/support/wallet/invoice/
├── schema.ts
└── controller.ts

projects/app/src/pages/api/support/wallet/bill/invoice/
├── unInvoiceList.ts
├── submit.ts
├── records.ts
└── downloadFile.ts

test/cases/invoice/
├── submit.test.ts
└── records.test.ts
```

### 验收标准

- [ ] 正确获取待开票账单
- [ ] 提交开票申请（含验证）
- [ ] 发票记录分页查询
- [ ] 发票文件下载
- [ ] 状态流转正确

---

## 5. 应用日志模块 (Week 2, Day 2)

### 任务清单

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 分析现有聊天数据结构 | 1h | 理解数据 |
| 实现统计聚合逻辑 | 2h | 聚合查询 |
| 实现获取总体数据 | 1.5h | `getTotalData.ts` |
| 实现获取图表数据 | 2h | `getChartData.ts` |
| 修改前端 API 路径 | 0.5h | 前端适配 |
| 编写测试 | 1.5h | 测试用例 |

### 产出文件

```
projects/app/src/pages/api/core/app/logs/
├── getTotalData.ts
└── getChartData.ts

test/cases/appLogs/
└── stats.test.ts
```

### 聚合查询示例

```typescript
// 获取总体数据
const totalData = await MongoChat.aggregate([
  { $match: { appId, createTime: { $gte: startTime, $lte: endTime } } },
  {
    $group: {
      _id: null,
      totalChats: { $sum: 1 },
      totalMessages: { $sum: '$messageCount' },
      totalTokens: { $sum: '$totalTokens' },
      avgResponseTime: { $avg: '$avgResponseTime' }
    }
  }
]);

// 获取图表数据（按天）
const chartData = await MongoChat.aggregate([
  { $match: { appId, createTime: { $gte: startTime, $lte: endTime } } },
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createTime' } },
      chats: { $sum: 1 },
      messages: { $sum: '$messageCount' },
      tokens: { $sum: '$totalTokens' }
    }
  },
  { $sort: { _id: 1 } }
]);
```

### 验收标准

- [ ] 总体数据统计正确
- [ ] 图表数据按时间聚合正确
- [ ] 支持自定义时间范围
- [ ] 查询性能可接受（< 2s）

---

## 6. 前端适配清单

| 文件 | 修改内容 |
|------|----------|
| `web/support/user/team/group/api.ts` | `/proApi` → `/api` |
| `web/core/app/api/collaborator.ts` | `/proApi` → `/api` |
| `web/core/dataset/api/collaborator.ts` | `/proApi` → `/api` |
| `web/support/wallet/bill/invoice/api.ts` | `/proApi` → `/api` |
| `web/core/app/api/log.ts` | `/proApi` → `/api` |

---

## 7. 每日 Checkin

| 日期 | 计划任务 | 实际完成 | 问题 |
|------|----------|----------|------|
| Day 1 | 成员分组 (4 接口) | - | - |
| Day 2 | 应用协作者 (3 接口) | - | - |
| Day 3 | 数据集协作者 (3 接口) | - | - |
| Day 4 | 发票管理 (4 接口) | - | - |
| Day 5 | 应用日志 (2 接口) | - | - |

---

## 8. 交付检查清单

### Phase 2 完成标准

- [ ] 16 个 API 全部实现
- [ ] 分组管理功能可用
- [ ] 协作者权限控制正确
- [ ] 发票流程完整
- [ ] 日志图表展示正常
- [ ] 测试覆盖率 ≥ 80%
- [ ] 代码已通过 Review

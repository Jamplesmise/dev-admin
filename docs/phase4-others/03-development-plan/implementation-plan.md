# Phase 4 - 详细开发计划

> 阶段: Phase 4 - 其他功能
> 预计工期: 0.5 周 (2.5 天)
> 接口数量: 5 个
> 最后更新: 2025-11-23

---

## 1. 开发顺序

```
Day 1 (上午): 模型协作者 (2 接口)
Day 1 (下午): 推广数据 (1 接口)
Day 2 (上午): 运营广告 (1 接口)
Day 2 (下午): 工单系统 (1 接口)
Day 3 (半天): 集成测试 + Bug 修复
```

---

## 2. 详细任务

### Day 1 上午: 模型协作者 (2 接口)

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 扩展 Collaborator Schema | 0.5h | 类型扩展 |
| 实现获取模型协作者列表 | 1h | `list.ts` |
| 实现更新模型协作者 | 1h | `update.ts` |
| 编写测试 | 0.5h | 测试用例 |

**产出文件**:
```
projects/app/src/pages/api/system/model/collaborator/
├── list.ts
└── update.ts

test/cases/modelCollaborator/collaborator.test.ts
```

### Day 1 下午: 推广数据 (1 接口)

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 创建 PromotionRecord Schema | 0.5h | Schema 文件 |
| 创建推广控制器 | 1h | Controller |
| 实现获取推广数据 | 1h | `getPromotionData.ts` |
| 编写测试 | 0.5h | 测试用例 |

**产出文件**:
```
packages/service/support/promotion/
├── schema.ts
└── controller.ts

projects/app/src/pages/api/support/activity/promotion/getPromotionData.ts

test/cases/promotion/data.test.ts
```

### Day 2 上午: 运营广告 (1 接口)

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 创建 OperationalAd Schema | 0.5h | Schema 文件 |
| 创建广告控制器 | 0.5h | Controller |
| 实现获取运营广告 | 1h | `getOperationalAd.ts` |
| 编写测试 | 0.5h | 测试用例 |

**产出文件**:
```
packages/service/support/advertisement/
├── schema.ts
└── controller.ts

projects/app/src/pages/api/support/user/inform/getOperationalAd.ts

test/cases/advertisement/ad.test.ts
```

### Day 2 下午: 工单系统 (1 接口)

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 创建 WorkOrder Schema | 0.5h | Schema 文件 |
| 创建工单控制器 | 0.5h | Controller |
| 实现创建工单 | 1h | `create.ts` |
| 修改前端 API 路径 | 0.5h | 前端适配 |
| 编写测试 | 0.5h | 测试用例 |

**产出文件**:
```
packages/service/support/workorder/
├── schema.ts
└── controller.ts

projects/app/src/pages/api/common/workorder/create.ts

test/cases/workorder/create.test.ts
```

### Day 3: 集成测试

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 端到端测试 | 1.5h | E2E 测试 |
| Bug 修复 | 1h | 修复 |
| 文档更新 | 0.5h | 文档 |

---

## 3. 每日 Checkin

| 日期 | 计划任务 | 实际完成 | 问题 |
|------|----------|----------|------|
| Day 1 上午 | 模型协作者 (2 接口) | - | - |
| Day 1 下午 | 推广数据 (1 接口) | - | - |
| Day 2 上午 | 运营广告 (1 接口) | - | - |
| Day 2 下午 | 工单系统 (1 接口) | - | - |
| Day 3 | 集成测试 + Bug 修复 | - | - |

---

## 4. 前端适配清单

| 文件 | 修改内容 |
|------|----------|
| 相关 API 调用文件 | `/proApi` → `/api` |

---

## 5. 交付检查清单

### Phase 4 完成标准

- [ ] 5 个 API 全部实现
- [ ] 模型协作者管理正常
- [ ] 推广数据统计正确
- [ ] 广告获取正常
- [ ] 工单创建成功
- [ ] 测试覆盖率 ≥ 80%

---

## 6. 整体项目完成检查

### 全部 Phase 完成后

- [ ] **Phase 1**: 19 个接口 ✓
- [ ] **Phase 2**: 16 个接口 ✓
- [ ] **Phase 3**: 13 个接口 ✓
- [ ] **Phase 4**: 5 个接口 ✓
- [ ] **总计**: 53 个接口

### 最终验收

- [ ] 所有 API 功能正常
- [ ] 整体测试覆盖率 ≥ 80%
- [ ] 无 P0/P1 级别 Bug
- [ ] 前端所有 Pro 功能可用
- [ ] 性能指标达标
- [ ] 文档完整

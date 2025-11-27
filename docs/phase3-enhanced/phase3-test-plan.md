# Phase 3 增强功能测试计划

> 版本: v1.0
> 创建日期: 2025-11-24
> 状态: 待执行

---

## 1. 测试范围

### 1.1 聊天设置模块 (7 接口)

| 接口 | 路径 | 测试类型 |
|------|------|----------|
| 获取设置详情 | GET `/api/core/chat/setting/detail` | 单元测试 + API 测试 |
| 更新设置 | POST `/api/core/chat/setting/update` | 单元测试 + API 测试 |
| 获取收藏列表 | GET `/api/core/chat/setting/favourite/list` | 单元测试 + API 测试 |
| 添加/更新收藏 | POST `/api/core/chat/setting/favourite/update` | 单元测试 + API 测试 |
| 调整收藏顺序 | PUT `/api/core/chat/setting/favourite/order` | 单元测试 + API 测试 |
| 更新收藏标签 | PUT `/api/core/chat/setting/favourite/tags` | 单元测试 + API 测试 |
| 删除收藏 | DELETE `/api/core/chat/setting/favourite/delete` | 单元测试 + API 测试 |

### 1.2 应用评估模块 (6 接口)

| 接口 | 路径 | 测试类型 |
|------|------|----------|
| 获取评估列表 | POST `/api/core/app/evaluation/list` | 单元测试 + API 测试 |
| 删除评估 | DELETE `/api/core/app/evaluation/delete` | 单元测试 + API 测试 |
| 获取评估项目 | POST `/api/core/app/evaluation/listItems` | 单元测试 + API 测试 |
| 删除评估项目 | DELETE `/api/core/app/evaluation/deleteItem` | 单元测试 + API 测试 |
| 重试评估项目 | POST `/api/core/app/evaluation/retryItem` | 单元测试 + API 测试 |
| 更新评估项目 | POST `/api/core/app/evaluation/updateItem` | 单元测试 + API 测试 |

---

## 2. 测试策略

### 2.1 测试分层

```
┌─────────────────────────────────────────────────┐
│                  API 集成测试                     │
│    test/api/phase3/*.api.test.ts                │
│    验证完整请求-响应流程                           │
├─────────────────────────────────────────────────┤
│                  单元测试                         │
│    test/cases/chatSetting/*.test.ts             │
│    test/cases/evaluation/*.test.ts              │
│    验证 Controller 业务逻辑                       │
├─────────────────────────────────────────────────┤
│                  Schema 验证                     │
│    验证 Mongoose Model 约束                      │
└─────────────────────────────────────────────────┘
```

### 2.2 测试环境

- **数据库**: MongoDB 测试实例 (`fastgpt-test`)
- **测试框架**: Vitest
- **测试数据**: testDataFactory 生成

---

## 3. 详细测试用例

### 3.1 聊天设置 - 基础设置

#### TC-CS-001: 获取设置详情 (首次)
- **前置条件**: 用户首次访问，无设置记录
- **输入**: GET `/api/core/chat/setting/detail` + auth headers
- **预期**: 返回默认设置
  - `homeEnabled = false`
  - `sidebarCollapsed = false`
  - `preferences.theme = 'system'`
  - `preferences.fontSize = 14`

#### TC-CS-002: 获取设置详情 (已存在)
- **前置条件**: 用户已有设置记录
- **输入**: GET `/api/core/chat/setting/detail` + auth headers
- **预期**: 返回用户保存的设置

#### TC-CS-003: 更新首页设置
- **输入**: POST `{ homeEnabled: true, homeWelcome: "欢迎" }`
- **预期**: 返回更新后的设置

#### TC-CS-004: 更新偏好设置
- **输入**: POST `{ preferences: { theme: 'dark', fontSize: 16 } }`
- **预期**: 返回更新后的偏好

#### TC-CS-005: 欢迎语超长验证
- **输入**: POST `{ homeWelcome: 'a'.repeat(501) }`
- **预期**: 返回错误 "欢迎语长度不能超过 500 个字符"

#### TC-CS-006: 字体大小范围验证
- **输入**: POST `{ preferences: { fontSize: 30 } }`
- **预期**: 返回错误

#### TC-CS-007: 无效主题验证
- **输入**: POST `{ preferences: { theme: 'invalid' } }`
- **预期**: 返回错误

#### TC-CS-008: 未认证访问
- **输入**: 不提供 auth headers
- **预期**: 返回 403 或错误

### 3.2 聊天设置 - 收藏功能

#### TC-FAV-001: 获取空收藏列表
- **前置条件**: 无收藏记录
- **预期**: 返回空数组 `[]`

#### TC-FAV-002: 添加收藏
- **输入**: POST `{ appId, customName: '我的应用', tags: ['工作'] }`
- **预期**: 创建收藏记录，order 自动分配

#### TC-FAV-003: 重复收藏
- **前置条件**: 已收藏该应用
- **输入**: POST `{ appId, customName: '新名称' }`
- **预期**: 更新现有记录，不创建新记录

#### TC-FAV-004: 获取收藏列表 (含应用信息)
- **前置条件**: 有收藏记录
- **预期**: 返回收藏列表，包含 `app` 字段

#### TC-FAV-005: 调整收藏顺序 - 向后移动
- **前置条件**: 3 个收藏，order 分别为 0, 1, 2
- **输入**: 将 order=0 的收藏移到 order=2
- **预期**:
  - 目标收藏 order=2
  - 原 order=1,2 的收藏 order 各减 1

#### TC-FAV-006: 调整收藏顺序 - 向前移动
- **前置条件**: 3 个收藏
- **输入**: 将 order=2 的收藏移到 order=0
- **预期**: 正确调整所有相关收藏的 order

#### TC-FAV-007: 更新收藏标签
- **输入**: PUT `{ favouriteId, tags: ['新标签1', '新标签2'] }`
- **预期**: 标签更新成功

#### TC-FAV-008: 标签长度验证
- **输入**: PUT `{ tags: ['a'.repeat(21)] }`
- **预期**: 返回错误

#### TC-FAV-009: 删除收藏
- **输入**: DELETE `?favouriteId=xxx`
- **预期**: 删除成功

#### TC-FAV-010: 删除不存在的收藏
- **输入**: DELETE `?favouriteId=invalid`
- **预期**: 返回错误

### 3.3 应用评估 - 任务管理

#### TC-EVAL-001: 获取空评估列表
- **前置条件**: 无评估任务
- **预期**: `{ list: [], total: 0 }`

#### TC-EVAL-002: 获取评估列表
- **前置条件**: 有评估任务
- **预期**: 返回任务列表，包含 `app` 信息

#### TC-EVAL-003: 分页查询
- **前置条件**: 15 个评估任务
- **输入**: `{ pageNum: 1, pageSize: 10 }`
- **预期**: `list.length = 10`, `total = 15`

#### TC-EVAL-004: 按状态筛选
- **前置条件**: pending 和 completed 状态的任务各 1 个
- **输入**: `{ status: 'pending' }`
- **预期**: 只返回 pending 状态的任务

#### TC-EVAL-005: 删除评估任务
- **前置条件**: 有评估任务和关联的评估项目
- **输入**: DELETE `{ evaluationId }`
- **预期**:
  - 任务删除成功
  - 关联的评估项目同时删除

#### TC-EVAL-006: 删除不存在的任务
- **预期**: 返回错误

### 3.4 应用评估 - 项目管理

#### TC-ITEM-001: 获取评估项目列表
- **前置条件**: 有评估项目
- **预期**: 返回项目列表

#### TC-ITEM-002: 按状态筛选项目
- **输入**: `{ status: 'completed' }`
- **预期**: 只返回已完成的项目

#### TC-ITEM-003: 删除评估项目
- **预期**: 删除成功

#### TC-ITEM-004: 重试评估项目
- **前置条件**: 项目状态为 failed
- **预期**:
  - 状态重置为 pending
  - retryCount + 1
  - 清除 error, actualOutput 等结果字段

#### TC-ITEM-005: 超过最大重试次数
- **前置条件**: retryCount = 3
- **预期**: 返回错误

#### TC-ITEM-006: 更新评估项目评分
- **输入**: `{ scores: [...], passed: true }`
- **预期**:
  - 评分更新
  - totalScore 自动计算

#### TC-ITEM-007: 权限验证
- **前置条件**: 评估任务属于其他团队
- **预期**: 返回权限错误

---

## 4. 测试数据

### 4.1 测试账户

```javascript
// 由 testDataFactory.createTestContext() 生成
{
  teamId: 'test-team-id',
  tmbId: 'test-tmb-id',
  userId: 'test-user-id',
  auth: { teamId: '...', tmbId: '...' }
}
```

### 4.2 测试应用

```javascript
// 由 testDataFactory.createApp() 生成
{
  _id: ObjectId,
  teamId,
  tmbId,
  name: '测试应用',
  type: 'simple'
}
```

---

## 5. 执行计划

### 5.1 测试命令

```bash
# 运行所有 Phase 3 测试
npx vitest run test/api/phase3/

# 运行单个测试文件
npx vitest run test/api/phase3/chatSetting.api.test.ts
npx vitest run test/api/phase3/evaluation.api.test.ts

# 运行并显示详细输出
npx vitest run test/api/phase3/ --reporter=verbose
```

### 5.2 验收标准

- [ ] 所有测试用例通过
- [ ] 代码覆盖率 ≥ 80%
- [ ] 无 ESLint 错误
- [ ] API 响应格式符合规范

---

## 6. 风险与依赖

### 6.1 依赖

- MongoDB 测试实例可用
- testDataFactory 正确实现 Phase 3 相关方法
- 路径别名配置正确 (`@/api/core/...`)

### 6.2 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据库连接失败 | 测试无法执行 | 检查 TEST_MONGODB_URI |
| Model 冲突 | 测试失败 | 使用 connectionMongo 共享连接 |
| 路径别名错误 | 导入失败 | 检查 vitest.config.ts |

---

## 7. 后续步骤

1. 执行测试计划中的所有测试用例
2. 修复发现的问题
3. 确保测试通过后再提交代码
4. 创建 PR 合并到 main 分支

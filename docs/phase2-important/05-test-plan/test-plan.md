# Phase 2 - 测试计划

> 创建日期: 2025-11-24
> 阶段: Phase 2 - 重要功能
> 测试环境: 本机 MongoDB

---

## 1. 测试范围

### 1.1 模块与接口清单

| 模块 | 接口 | 方法 | 路径 | 测试类型 |
|------|------|------|------|----------|
| **成员分组** | 获取分组列表 | POST | `/api/support/user/team/group/list` | 单元+集成 |
| | 创建分组 | POST | `/api/support/user/team/group/create` | 单元+集成 |
| | 更新分组 | PUT | `/api/support/user/team/group/update` | 单元+集成 |
| | 删除分组 | DELETE | `/api/support/user/team/group/delete` | 单元+集成 |
| **协作者-应用** | 获取协作者列表 | GET | `/api/core/app/collaborator/list` | 单元+集成 |
| | 更新协作者 | POST | `/api/core/app/collaborator/update` | 单元+集成 |
| | 删除协作者 | DELETE | `/api/core/app/collaborator/delete` | 单元+集成 |
| **协作者-数据集** | 获取协作者列表 | GET | `/api/core/dataset/collaborator/list` | 单元+集成 |
| | 更新协作者 | POST | `/api/core/dataset/collaborator/update` | 单元+集成 |
| | 删除协作者 | DELETE | `/api/core/dataset/collaborator/delete` | 单元+集成 |
| **发票管理** | 获取待开票列表 | GET | `/api/support/wallet/bill/invoice/unInvoiceList` | 单元+集成 |
| | 提交开票申请 | POST | `/api/support/wallet/bill/invoice/submit` | 单元+集成 |
| | 获取发票记录 | GET | `/api/support/wallet/bill/invoice/records` | 单元+集成 |
| | 下载发票文件 | GET | `/api/support/wallet/bill/invoice/downloadFile` | 单元 |
| **应用日志** | 获取总体数据 | GET | `/api/core/app/logs/getTotalData` | 单元+集成 |
| | 获取图表数据 | POST | `/api/core/app/logs/getChartData` | 单元+集成 |

### 1.2 测试目标

- **单元测试覆盖率**: ≥ 80%
- **集成测试**: 全部 16 个 API
- **性能基准**: 响应时间 < 2s

---

## 2. 测试环境配置

### 2.1 数据库配置

```bash
# 测试数据库 URI
TEST_MONGODB_URI=mongodb://myusername:mypassword@localhost:27017/fastgpt-test?authSource=admin
```

### 2.2 测试工具链

| 工具 | 版本 | 用途 |
|------|------|------|
| Vitest | latest | 测试框架 |
| MongoDB | 6.x | 数据库 |
| mongoose | 9.0.0 | ODM |

### 2.3 测试数据工厂扩展

需要在 `test/utils/db.ts` 中添加以下工厂方法：

- `createMemberGroup()` - 创建成员分组
- `createGroupMember()` - 创建分组成员关系
- `createCollaborator()` - 创建协作者
- `createInvoice()` - 创建发票记录
- `createApp()` - 创建应用（用于协作者测试）
- `createDataset()` - 创建数据集（用于协作者测试）
- `createChat()` - 创建聊天记录（用于日志测试）

---

## 3. 单元测试计划

### 3.1 成员分组模块 (`test/cases/group/`)

#### 3.1.1 `crud.test.ts` - CRUD 操作测试

| 测试用例 | 描述 | 预期结果 |
|----------|------|----------|
| `创建分组 - 正常` | 创建名称为"前端组"的分组 | 成功，返回分组 ID |
| `创建分组 - 名称为空` | 名称为空字符串 | 抛出错误 |
| `创建分组 - 名称超长` | 名称超过 50 字符 | 抛出错误 |
| `创建分组 - 重复名称` | 同一团队创建同名分组 | 抛出错误 |
| `获取分组列表 - 正常` | 查询团队分组列表 | 返回分组数组，含成员数量 |
| `获取分组列表 - 空结果` | 团队无分组 | 返回空数组 |
| `更新分组 - 修改名称` | 修改分组名称 | 成功更新 |
| `更新分组 - 修改成员` | 添加/移除分组成员 | 成功更新 |
| `更新分组 - 不存在的分组` | 更新不存在的分组 ID | 抛出错误 |
| `删除分组 - 正常` | 删除空分组 | 成功删除 |
| `删除分组 - 有成员` | 删除有成员的分组 | 成功删除（级联删除成员关系） |
| `删除分组 - 不存在` | 删除不存在的分组 | 抛出错误 |

#### 3.1.2 `list.test.ts` - 列表查询测试

| 测试用例 | 描述 | 预期结果 |
|----------|------|----------|
| `分组列表包含成员数量` | 验证返回的 memberCount 字段 | 数量正确 |
| `分组列表按创建时间排序` | 验证排序顺序 | 最新创建的在前 |
| `分组列表支持分页` | 传入 offset/limit | 正确分页 |

### 3.2 协作者管理模块 (`test/cases/collaborator/`)

#### 3.2.1 `app.test.ts` - 应用协作者测试

| 测试用例 | 描述 | 预期结果 |
|----------|------|----------|
| `获取协作者列表 - 按成员` | 获取应用的成员协作者 | 返回协作者列表 |
| `获取协作者列表 - 按分组` | 获取应用的分组协作者 | 返回协作者列表 |
| `获取协作者列表 - 按组织` | 获取应用的组织协作者 | 返回协作者列表 |
| `添加协作者 - 成员` | 添加成员为协作者 | 成功添加 |
| `添加协作者 - 分组` | 添加分组为协作者 | 成功添加 |
| `添加协作者 - 组织` | 添加组织为协作者 | 成功添加 |
| `更新协作者权限` | 修改协作者权限 | 成功更新 |
| `删除协作者` | 移除协作者 | 成功删除 |
| `删除协作者 - 不存在` | 删除不存在的协作者 | 抛出错误 |

#### 3.2.2 `dataset.test.ts` - 数据集协作者测试

| 测试用例 | 描述 | 预期结果 |
|----------|------|----------|
| `获取协作者列表` | 获取数据集的协作者 | 返回协作者列表 |
| `添加协作者` | 添加成员/分组/组织 | 成功添加 |
| `更新协作者权限` | 修改协作者权限 | 成功更新 |
| `删除协作者` | 移除协作者 | 成功删除 |

#### 3.2.3 `permission.test.ts` - 权限计算测试

| 测试用例 | 描述 | 预期结果 |
|----------|------|----------|
| `权限位 - 只读` | permission = 4 (0b100) | hasRead = true |
| `权限位 - 读写` | permission = 6 (0b110) | hasRead & hasWrite = true |
| `权限位 - 全部` | permission = 7 (0b111) | 全部 true |
| `权限合并 - 多身份` | 成员+分组权限合并 | 取并集 |
| `权限检查 - 无权限` | 无协作者记录 | permission = 0 |

### 3.3 发票管理模块 (`test/cases/invoice/`)

#### 3.3.1 `submit.test.ts` - 发票申请测试

| 测试用例 | 描述 | 预期结果 |
|----------|------|----------|
| `提交发票 - 普票` | type = normal | 成功创建 |
| `提交发票 - 专票` | type = special，含银行信息 | 成功创建 |
| `提交发票 - 账单不存在` | billIds 含无效 ID | 抛出错误 |
| `提交发票 - 账单已开票` | billIds 含已开票账单 | 抛出错误 |
| `提交发票 - 金额计算` | 验证 totalAmount | 等于账单金额之和 |
| `提交发票 - 标记账单状态` | 验证账单 invoiced 字段 | 更新为 true |

#### 3.3.2 `records.test.ts` - 发票记录测试

| 测试用例 | 描述 | 预期结果 |
|----------|------|----------|
| `获取发票记录 - 正常` | 查询发票列表 | 返回分页结果 |
| `获取发票记录 - 状态筛选` | status = completed | 仅返回已完成 |
| `获取发票记录 - 时间筛选` | startTime/endTime | 时间范围内 |
| `获取发票记录 - 分页` | offset/limit | 正确分页 |

#### 3.3.3 `unInvoiceList.test.ts` - 待开票列表测试

| 测试用例 | 描述 | 预期结果 |
|----------|------|----------|
| `获取待开票列表 - 正常` | 查询未开票账单 | 返回账单数组 |
| `获取待开票列表 - 时间筛选` | startTime/endTime | 时间范围内 |
| `获取待开票列表 - 排除已开票` | invoiced = true 的不返回 | 正确过滤 |
| `获取待开票列表 - 仅成功支付` | status != SUCCESS 不返回 | 正确过滤 |

### 3.4 应用日志模块 (`test/cases/appLogs/`)

#### 3.4.1 `stats.test.ts` - 统计数据测试

| 测试用例 | 描述 | 预期结果 |
|----------|------|----------|
| `获取总体数据 - 正常` | 查询应用统计 | 返回统计对象 |
| `获取总体数据 - 时间筛选` | startTime/endTime | 时间范围内聚合 |
| `获取总体数据 - 无数据` | 应用无聊天记录 | 返回零值 |
| `获取图表数据 - 按天` | chartType = daily | 返回每日数据 |
| `获取图表数据 - 按小时` | chartType = hourly | 返回每小时数据 |
| `获取图表数据 - 多指标` | metrics = ['chats', 'messages'] | 返回多个数据集 |
| `获取图表数据 - 空区间补零` | 无数据的时间点 | data = 0 |

---

## 4. 集成测试计划

### 4.1 成员分组集成测试 (`test/integration/group.integration.test.ts`)

| 测试场景 | 步骤 | 验证点 |
|----------|------|--------|
| 完整 CRUD 流程 | 创建→查询→更新→删除 | 每步数据库状态正确 |
| 分组成员管理 | 创建分组→添加成员→查询→移除成员 | 成员关系正确 |
| 并发创建分组 | 同时创建多个分组 | 无冲突，数据完整 |
| 团队数据隔离 | 不同团队的分组互不影响 | 隔离正确 |

### 4.2 协作者集成测试 (`test/integration/collaborator.integration.test.ts`)

| 测试场景 | 步骤 | 验证点 |
|----------|------|--------|
| 应用协作者完整流程 | 创建应用→添加协作者→查询→更新权限→删除 | 数据库状态正确 |
| 数据集协作者完整流程 | 创建数据集→添加协作者→查询→更新权限→删除 | 数据库状态正确 |
| 多类型协作者 | 同一资源添加成员+分组+组织协作者 | 全部正确存储 |
| 权限计算集成 | 用户同时属于成员和分组协作者 | 权限正确合并 |
| 删除资源级联 | 删除应用后协作者记录 | 协作者应被清理（如果有此逻辑） |

### 4.3 发票集成测试 (`test/integration/invoice.integration.test.ts`)

| 测试场景 | 步骤 | 验证点 |
|----------|------|--------|
| 发票申请完整流程 | 创建账单→查询待开票→提交发票→查询记录 | 状态流转正确 |
| 账单状态更新 | 提交发票后验证账单 invoiced 字段 | 更新为 true |
| 事务回滚 | 模拟发票创建失败 | 账单状态不变 |
| 金额计算 | 多个账单合并开票 | totalAmount = sum(bills.price) |

### 4.4 应用日志集成测试 (`test/integration/appLogs.integration.test.ts`)

| 测试场景 | 步骤 | 验证点 |
|----------|------|--------|
| 统计数据聚合 | 创建聊天记录→查询统计 | 聚合结果正确 |
| 图表数据生成 | 创建不同时间的记录→查询图表 | 按时间分组正确 |
| 大数据量测试 | 创建 1000 条记录 | 响应时间 < 2s |
| 空数据处理 | 无聊天记录的应用 | 返回零值，不报错 |

---

## 5. 测试执行顺序

```
Phase 2 测试执行流程
│
├── Step 1: 扩展测试数据工厂
│   └── 添加 MemberGroup, Collaborator, Invoice, App, Dataset, Chat 工厂方法
│
├── Step 2: 单元测试 (Mock MongoDB)
│   ├── test/cases/group/crud.test.ts
│   ├── test/cases/group/list.test.ts
│   ├── test/cases/collaborator/app.test.ts
│   ├── test/cases/collaborator/dataset.test.ts
│   ├── test/cases/collaborator/permission.test.ts
│   ├── test/cases/invoice/submit.test.ts
│   ├── test/cases/invoice/records.test.ts
│   ├── test/cases/invoice/unInvoiceList.test.ts
│   └── test/cases/appLogs/stats.test.ts
│
├── Step 3: 集成测试 (真实 MongoDB)
│   ├── test/integration/group.integration.test.ts
│   ├── test/integration/collaborator.integration.test.ts
│   ├── test/integration/invoice.integration.test.ts
│   └── test/integration/appLogs.integration.test.ts
│
└── Step 4: 汇总报告
    ├── 测试覆盖率报告
    └── 问题清单
```

---

## 6. 测试命令

```bash
# 运行 Phase 2 单元测试
pnpm test test/cases/group test/cases/collaborator test/cases/invoice test/cases/appLogs

# 运行 Phase 2 集成测试
pnpm test test/integration/group test/integration/collaborator test/integration/invoice test/integration/appLogs

# 运行全部测试并生成覆盖率
pnpm test --coverage

# 运行单个测试文件
npx vitest run test/cases/group/crud.test.ts
```

---

## 7. 验收标准

### 7.1 必须通过

- [ ] 所有 16 个 API 的单元测试通过
- [ ] 所有集成测试通过
- [ ] 无严重 Bug (P0/P1)

### 7.2 质量指标

| 指标 | 目标 | 优先级 |
|------|------|--------|
| 单元测试覆盖率 | ≥ 80% | P0 |
| 集成测试通过率 | 100% | P0 |
| API 响应时间 | < 2s | P1 |
| 无数据库连接泄漏 | 0 | P0 |

---

## 8. 测试产出文件

```
test/
├── cases/
│   ├── group/
│   │   ├── crud.test.ts        # 分组 CRUD 单元测试
│   │   └── list.test.ts        # 分组列表单元测试
│   ├── collaborator/
│   │   ├── app.test.ts         # 应用协作者单元测试
│   │   ├── dataset.test.ts     # 数据集协作者单元测试
│   │   └── permission.test.ts  # 权限计算单元测试
│   ├── invoice/
│   │   ├── submit.test.ts      # 发票申请单元测试
│   │   ├── records.test.ts     # 发票记录单元测试
│   │   └── unInvoiceList.test.ts # 待开票列表单元测试
│   └── appLogs/
│       └── stats.test.ts       # 应用统计单元测试
│
├── integration/
│   ├── group.integration.test.ts       # 分组集成测试
│   ├── collaborator.integration.test.ts # 协作者集成测试
│   ├── invoice.integration.test.ts     # 发票集成测试
│   └── appLogs.integration.test.ts     # 应用日志集成测试
│
└── utils/
    └── db.ts                   # 测试数据工厂 (需扩展)
```

---

## 9. 风险与依赖

### 9.1 依赖项

| 依赖 | 状态 | 影响 |
|------|------|------|
| MongoDB 连接 | 需要本机运行 | 集成测试依赖 |
| Bill Schema | 已存在 | 发票测试依赖 |
| Chat Schema | 需创建 | 应用日志测试依赖 |

### 9.2 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Chat Schema 未实现 | 应用日志测试无法进行 | 先使用 Mock 数据 |
| 认证中间件占位 | 无法测试权限校验 | 跳过权限相关测试 |
| 外部 API Mock | 发票下载需要文件服务 | 使用 Mock 文件 |

---

## 10. API 集成测试执行指南 (2025-11-24 更新)

### 10.1 当前测试状态

| 测试文件 | 测试用例数 | 通过 | 状态 |
|----------|-----------|------|------|
| `test/api/phase2/group.api.test.ts` | 23 | 23 | ✅ 全部通过 |
| `test/api/phase2/appCollaborator.api.test.ts` | ~12 | 部分 | ⏳ 进行中 |
| `test/api/phase2/datasetCollaborator.api.test.ts` | ~12 | 部分 | ⏳ 进行中 |
| `test/api/phase2/invoice.api.test.ts` | ~20 | 部分 | ⏳ 进行中 |
| `test/api/phase2/appLogs.api.test.ts` | ~10 | 部分 | ⏳ 进行中 |
| `test/integration/*.test.ts` | 73 | 73 | ✅ 全部通过 |

### 10.2 快速运行测试

```bash
# 运行成员分组测试 (推荐，已稳定)
npx vitest run test/api/phase2/group.api.test.ts --reporter=verbose

# 运行全部 Phase 2 API 测试
npx vitest run test/api/phase2/ --pool=forks --poolOptions.forks.singleFork

# 运行全部集成测试 (73 tests)
npx vitest run test/integration/ --pool=forks --poolOptions.forks.singleFork

# 运行单个测试用例
npx vitest run test/api/phase2/group.api.test.ts -t "应该返回空列表当没有分组时"
```

### 10.3 测试辅助函数使用

#### callApi - 调用 API Handler

```typescript
import { callApi, expectSuccess, expectError, createTestContext } from '../../utils/apiTestHelper';
import type { AuthHeaders } from '../../utils/apiTestHelper';

// 导入 API handler
import listHandler from '@/api/support/user/team/group/list';

// 调用 API
const response = await callApi(listHandler, {
  method: 'GET',
  auth: {
    teamId: 'your-team-id',
    tmbId: 'your-member-id',
    userId: 'your-user-id'
  },
  query: { searchKey: '关键词' }  // GET 请求参数
  // body: { name: '新分组' }     // POST/PUT 请求参数
});

// 断言成功响应
const data = expectSuccess<{ _id: string; name: string }[]>(response);
expect(data).toHaveLength(2);

// 断言失败响应
expectError(response);
```

#### createTestContext - 创建测试上下文

```typescript
import { createTestContext } from '../../utils/apiTestHelper';
import { testDataFactory, connectTestDB, disconnectTestDB, clearAllTestCollections } from '../../utils/db';

describe('API 测试', () => {
  let teamId: string;
  let tmbId: string;
  let auth: AuthHeaders;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearAllTestCollections();
    const context = await createTestContext(testDataFactory);
    teamId = context.teamId;
    tmbId = context.tmbId;
    auth = context.auth;
  });

  it('测试用例', async () => {
    // 使用 auth, teamId, tmbId
  });
});
```

#### testDataFactory - 测试数据工厂

```typescript
import { testDataFactory } from '../../utils/db';

// 创建成员分组 (已对齐 API Model)
const group = await testDataFactory.createMemberGroup({
  teamId: teamId,
  name: '前端组',
  avatar: 'https://example.com/avatar.png'  // 可选
});

// 创建分组成员 (已对齐 API Model)
await testDataFactory.createGroupMember({
  teamId: teamId,
  groupId: group._id.toString(),
  tmbId: tmbId,
  role: 'member'  // 可选，默认 'member'
});

// 创建协作者 (需对齐)
await testDataFactory.createCollaborator({
  teamId: teamId,
  resourceId: 'app-id',
  resourceType: 'app',  // 'app' | 'dataset'
  tmbId: tmbId,         // 成员协作者
  permission: 4         // read=4, write=2, manage=1
});

// 创建应用 (需对齐)
const app = await testDataFactory.createApp({
  teamId: teamId,
  tmbId: tmbId,
  name: '测试应用',
  type: 'simple'
});

// 创建数据集 (需对齐)
const dataset = await testDataFactory.createDataset({
  teamId: teamId,
  tmbId: tmbId,
  name: '测试数据集'
});
```

### 10.4 API 源码位置快速索引

| 模块 | API 文件路径 | Schema 文件路径 |
|------|-------------|-----------------|
| 成员分组 | `src/api/support/user/team/group/` | `src/packages/service/support_permission/memberGroup/` |
| 应用协作者 | `src/api/core/app/collaborator/` | `src/packages/service/support_permission/collaborator/` |
| 数据集协作者 | `src/api/core/dataset/collaborator/` | (同上) |
| 发票管理 | `src/api/support/wallet/bill/invoice/` | `src/packages/service/support_wallet/invoice/` |
| 应用日志 | `src/api/core/app/logs/` | `src/packages/service/core/chat/` |

### 10.5 已修复的关键问题

1. **Mongoose 9.x 中间件签名变更**
   - 文件: `src/packages/service/common/mongo/index.ts`
   - 修复: 移除 pre/post 钩子中的 `next` 参数

2. **ObjectId 类型不匹配**
   - 文件: `src/api/support/user/team/group/update.ts`
   - 修复: bulkWrite 操作中使用 `new Types.ObjectId()` 转换

3. **测试数据与 API 连接不一致**
   - 文件: `test/utils/db.ts`
   - 修复: 使用 `connectionMongo` 替代本地 mongoose

4. **数据工厂集合名称不匹配**
   - 文件: `test/utils/db.ts`
   - 修复: `createMemberGroup` 和 `createGroupMember` 改为动态导入 API Models

### 10.6 已修复问题 (2025-11-24)

| 问题 | 影响 | 状态 | 修复方案 |
|------|------|------|----------|
| 发票测试枚举值不匹配 | 16 测试失败 | ✅ 已修复 | 更新为 `standard`/`wx`/`success` |
| 账单测试枚举值不匹配 | 24 测试失败 | ✅ 已修复 | 更新为 `extraDatasetSize`/`extraPoints`/`canceled` |
| 集合名称不一致 | 多测试失败 | ✅ 已修复 | 统一使用 API 集合名 (`team_bills`/`team_orgs`/`operationLogs`) |
| getTestModels 集合名错误 | 查询返回空 | ✅ 已修复 | 更新 Bill→`team_bills`, Org→`team_orgs`, OperationLog→`operationLogs` |
| createOrg 缺少 pathId | 组织创建失败 | ✅ 已修复 | 添加 pathId 参数和 getNanoid 默认值 |

### 10.7 权限位速查

```typescript
// 权限常量定义
const PermissionBits = {
  read:   0b100,  // 4 - 读取权限
  write:  0b010,  // 2 - 写入权限
  manage: 0b001   // 1 - 管理权限
};

// 组合权限
const readOnly = 4;       // 0b100 - 只读
const readWrite = 6;      // 0b110 - 读+写
const fullAccess = 7;     // 0b111 - 全部权限

// 权限检查
const hasRead = (perm: number) => (perm & 4) !== 0;
const hasWrite = (perm: number) => (perm & 2) !== 0;
const hasManage = (perm: number) => (perm & 1) !== 0;
```

---

## 11. 测试执行结果

### 11.1 测试通过统计 (2025-11-24)

| 测试套件 | 测试用例数 | 状态 |
|----------|-----------|------|
| 审计日志集成测试 | 20 | ✅ 通过 |
| 组织架构集成测试 | 21 | ✅ 通过 |
| 账单集成测试 | 24 | ✅ 通过 |
| 成员分组集成测试 | 21 | ✅ 通过 |
| 协作者集成测试 | 10 | ✅ 通过 |
| 发票集成测试 | 16 | ✅ 通过 |
| 应用日志集成测试 | 16 | ✅ 通过 |
| **总计** | **128** | **✅ 全部通过** |

### 11.2 运行命令

```bash
# 运行全部集成测试 (推荐)
npx vitest run test/integration/ --pool=forks --poolOptions.forks.singleFork

# 运行 Phase 2 核心测试
npx vitest run test/integration/group.integration.test.ts \
  test/integration/collaborator.integration.test.ts \
  test/integration/invoice.integration.test.ts \
  test/integration/appLogs.integration.test.ts \
  --pool=forks --poolOptions.forks.singleFork

# 运行单个测试文件
npx vitest run test/integration/invoice.integration.test.ts --pool=forks --poolOptions.forks.singleFork
```

### 11.3 下一步行动

1. **运行 API 测试** (当前为集成测试)
   ```bash
   npx vitest run test/api/phase2/ --pool=forks --poolOptions.forks.singleFork
   ```

2. **补全边界条件测试**
   - 检查每个 API 的错误场景测试
   - 添加权限边界测试

3. **合并代码到 main 分支**
   ```bash
   git add .
   git commit -m "test: 修复 Phase 2 集成测试 128 项通过"
   git push origin phase2-important
   ```

---

*最后更新: 2025-11-24*

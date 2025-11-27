# Phase 1 - 详细开发计划

> 阶段: Phase 1 - 核心功能
> 预计工期: 2 周
> 接口数量: 19 个
> 最后更新: 2025-11-23

---

## 1. 开发顺序

按依赖关系和复杂度排序：

```
Week 1:
├── Day 1-2: 操作日志模块 (1 接口) ← 最简单，验证架构
├── Day 3-5: 组织架构模块 (7 接口) ← 后续功能依赖
│
Week 2:
├── Day 1-3: 支付账单模块 (5 接口) ← 商业核心
└── Day 4-5: 用户认证模块 (6 接口) ← 用户体验
```

---

## 2. 模块开发计划

### 2.1 操作日志模块 (Day 1-2)

**目标**: 实现审计日志查询功能

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 阅读现有 Schema 代码 | 1h | 理解文档 |
| 创建 API 路由文件 | 2h | `list.ts` |
| 实现分页查询逻辑 | 2h | 分页查询 |
| 添加成员信息关联 | 1h | 用户名/头像 |
| 添加权限检查 | 1h | 权限校验 |
| 修改前端 API 路径 | 1h | 前端适配 |
| 编写单元测试 | 2h | 测试用例 |

**产出文件**:
```
projects/app/src/pages/api/support/user/audit/list.ts
test/cases/audit/list.test.ts
```

**验收标准**:
- [ ] 能正确返回分页日志
- [ ] 支持按成员、事件类型、时间筛选
- [ ] 包含成员名称和头像
- [ ] 权限检查正常工作

---

### 2.2 组织架构模块 (Day 3-5)

**目标**: 实现组织架构 CRUD 和成员管理

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 研究现有 Schema 和 Controller | 2h | 理解代码 |
| 实现获取组织列表 | 2h | `list.ts` |
| 实现创建组织 | 2h | `create.ts` |
| 实现更新组织 | 1h | `update.ts` |
| 实现删除组织 | 2h | `delete.ts` |
| 实现移动组织 | 2h | `move.ts` |
| 实现成员管理 | 3h | `updateMembers.ts`, `deleteMember.ts` |
| 修改前端 API 路径 | 1h | 前端适配 |
| 编写单元测试 | 3h | 测试用例 |

**产出文件**:
```
projects/app/src/pages/api/support/user/team/org/
├── list.ts
├── create.ts
├── update.ts
├── delete.ts
├── move.ts
├── updateMembers.ts
└── deleteMember.ts

test/cases/org/
├── list.test.ts
├── crud.test.ts
└── members.test.ts
```

**验收标准**:
- [ ] 组织树形结构正确返回
- [ ] 创建/更新/删除正常工作
- [ ] 移动组织后路径正确更新
- [ ] 成员管理功能正常
- [ ] 操作记录到审计日志

---

### 2.3 支付账单模块 (Week 2, Day 1-3)

**目标**: 实现订单创建和支付流程

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 创建 Bill Schema | 2h | Schema 文件 |
| 创建 Bill Controller | 3h | 业务逻辑 |
| 集成微信支付 SDK | 4h | 支付对接 |
| 集成支付宝 SDK | 4h | 支付对接 |
| 实现创建账单 | 3h | `create.ts` |
| 实现账单列表 | 2h | `list.ts` |
| 实现支付状态查询 | 2h | `checkPayResult.ts` |
| 实现更新支付方式 | 1h | `updatePayment.ts` |
| 实现支付回调 | 3h | 回调处理 |
| 实现订阅更新逻辑 | 2h | 订阅升级 |
| 修改前端 API 路径 | 1h | 前端适配 |
| 编写测试 | 3h | 测试用例 |

**产出文件**:
```
packages/service/support/wallet/bill/
├── schema.ts
├── controller.ts
└── payment/
    ├── wechat.ts
    └── alipay.ts

projects/app/src/pages/api/support/wallet/bill/
├── create.ts
├── list.ts
├── balanceConversion.ts
└── pay/
    ├── checkPayResult.ts
    ├── updatePayment.ts
    ├── wxNotify.ts        # 微信回调
    └── alipayNotify.ts    # 支付宝回调

test/cases/bill/
├── create.test.ts
├── list.test.ts
└── payment.test.ts
```

**验收标准**:
- [ ] 能创建订单并生成二维码
- [ ] 支付状态轮询正常
- [ ] 支付成功后订阅更新
- [ ] 账单列表正确展示
- [ ] 支付操作记录到审计日志

---

### 2.4 用户认证模块 (Week 2, Day 4-5)

**目标**: 实现 OAuth 和增强认证功能

| 任务 | 预计时间 | 输出 |
|------|----------|------|
| 创建 OAuth 相关 Schema | 2h | Schema 文件 |
| 实现 GitHub OAuth | 2h | `oauth.ts` |
| 实现 Google OAuth | 2h | `oauth.ts` |
| 实现微信扫码登录 | 3h | `getQR.ts`, `checkStatus.ts` |
| 实现快速登录 | 1h | `fastLogin.ts` |
| 实现 SSO 框架 | 2h | `sso.ts` |
| 实现图片验证码 | 2h | `getImgCaptcha.ts` |
| 实现联系方式更新 | 1h | `updateContact.ts` |
| 修改前端 API 路径 | 1h | 前端适配 |
| 编写测试 | 2h | 测试用例 |

**产出文件**:
```
packages/service/support/user/oauth/schema.ts
packages/service/support/user/captcha/schema.ts
packages/service/support/user/wxLogin/schema.ts

projects/app/src/pages/api/support/user/account/
├── login/
│   ├── oauth.ts
│   ├── fastLogin.ts
│   └── wx/
│       ├── getQR.ts
│       └── checkStatus.ts
├── sso.ts
├── updateContact.ts
└── captcha/
    └── getImgCaptcha.ts

test/cases/auth/
├── oauth.test.ts
├── wxLogin.test.ts
└── captcha.test.ts
```

**验收标准**:
- [ ] OAuth 登录流程正常
- [ ] 微信扫码登录正常
- [ ] 验证码生成和校验正常
- [ ] 联系方式更新正常
- [ ] 登录操作记录到审计日志

---

## 3. 前端适配清单

需要修改的前端 API 调用文件：

| 文件 | 修改内容 |
|------|----------|
| `web/support/user/team/operantionLog/api.ts` | `/proApi` → `/api` |
| `web/support/user/team/org/api.ts` | `/proApi` → `/api` |
| `web/support/wallet/bill/api.ts` | `/proApi` → `/api` |
| `web/support/user/api.ts` | 部分接口路径 |

---

## 4. 测试计划

### 单元测试

| 模块 | 测试文件 | 覆盖率目标 |
|------|----------|------------|
| 操作日志 | `audit/*.test.ts` | 80% |
| 组织架构 | `org/*.test.ts` | 80% |
| 支付账单 | `bill/*.test.ts` | 85% |
| 用户认证 | `auth/*.test.ts` | 80% |

### 集成测试

| 场景 | 测试内容 |
|------|----------|
| 组织管理流程 | 创建→添加成员→移动→删除 |
| 支付流程 | 创建订单→支付→更新订阅 |
| 登录流程 | OAuth 授权→创建用户→登录 |

---

## 5. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 支付对接延期 | 延期 3 天 | 先实现模拟支付 |
| OAuth 配置缺失 | 功能不可用 | 提前准备测试账号 |
| 数据库性能 | 查询慢 | 提前添加索引 |

---

## 6. 每日 Checkin

### Week 1

| 日期 | 计划任务 | 实际完成 | 问题 |
|------|----------|----------|------|
| Day 1 | 操作日志-研究&创建 | - | - |
| Day 2 | 操作日志-测试&前端 | - | - |
| Day 3 | 组织架构-列表&创建 | - | - |
| Day 4 | 组织架构-更新&删除&移动 | - | - |
| Day 5 | 组织架构-成员&测试 | - | - |

### Week 2

| 日期 | 计划任务 | 实际完成 | 问题 |
|------|----------|----------|------|
| Day 1 | 支付-Schema&Controller | - | - |
| Day 2 | 支付-微信&支付宝对接 | - | - |
| Day 3 | 支付-API&测试 | - | - |
| Day 4 | 认证-OAuth&微信 | - | - |
| Day 5 | 认证-SSO&验证码&测试 | - | - |

---

## 7. 交付检查清单

### Phase 1 完成标准

- [ ] 19 个 API 全部实现并可用
- [ ] 所有单元测试通过
- [ ] 测试覆盖率 ≥ 80%
- [ ] 前端功能全部可用
- [ ] 无 P0/P1 级别 Bug
- [ ] 代码已通过 Review
- [ ] 文档已更新

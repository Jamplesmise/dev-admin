# FastGPT Pro 后端接口实现规划

> 编写日期: 2025-11-23
> 状态: 待审核

---

## 一、项目背景

FastGPT 采用**代理模式**处理 Pro 功能：前端通过 `/proApi/` 路由调用商业版 API，由 `projects/app/src/pages/api/proApi/[...path].ts` 转发到外部 Pro 服务（`PRO_URL` 环境变量配置）。

**现状分析**:
- 前端 UI: **100% 完成**（所有 Pro 功能界面已实现）
- 后端接口: **0% 完成**（全部依赖外部 Pro 服务）
- 共需实现 **53 个 API 端点**

---

## 二、接口分类汇总

| 模块 | 接口数量 | 优先级 | 复杂度 |
|------|---------|--------|--------|
| 支付账单 (Bill) | 5 | P0 | 高 |
| 发票管理 (Invoice) | 4 | P1 | 中 |
| 组织架构 (Org) | 7 | P0 | 中 |
| 成员分组 (Group) | 4 | P1 | 低 |
| 操作日志 (Audit) | 1 | P0 | 低 |
| 协作者管理 (Collaborator) | 6 | P1 | 中 |
| 聊天设置 (Chat Setting) | 7 | P2 | 中 |
| 应用评估 (Evaluation) | 6 | P2 | 高 |
| 应用日志 (App Logs) | 2 | P1 | 中 |
| 用户认证 (Auth) | 6 | P0 | 高 |
| 其他 | 5 | P3 | 低 |

---

## 三、详细实现规划

### Phase 1: 核心功能 (P0) - 预计 2 周

#### 1.1 操作日志模块 (1 接口)

**已有基础**:
- Schema: `packages/service/support/user/audit/schema.ts`
- 类型: `packages/global/support/user/audit/type.d.ts`
- 常量: `packages/global/support/user/audit/constants.ts`
- 支持 66+ 种操作事件类型

**需实现接口**:

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取操作日志 | POST | `/api/support/user/audit/list` | 分页查询操作日志 |

**请求参数**:
```typescript
type GetAuditLogsRequest = {
  pageNum: number;
  pageSize: number;
  tmbIds?: string[];      // 按成员筛选
  events?: string[];      // 按事件类型筛选
  startTime?: Date;       // 开始时间
  endTime?: Date;         // 结束时间
}
```

**实现文件**:
```
projects/app/src/pages/api/support/user/audit/list.ts
```

---

#### 1.2 组织架构模块 (7 接口)

**需实现接口**:

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取组织列表 | POST | `/api/support/user/team/org/list` | 支持搜索和树形结构 |
| 创建组织 | POST | `/api/support/user/team/org/create` | 创建部门/组织 |
| 删除组织 | DELETE | `/api/support/user/team/org/delete` | 删除组织（含子组织处理） |
| 移动组织 | PUT | `/api/support/user/team/org/move` | 调整组织层级 |
| 更新组织 | PUT | `/api/support/user/team/org/update` | 更新组织名称等 |
| 更新组织成员 | PUT | `/api/support/user/team/org/updateMembers` | 添加成员到组织 |
| 删除组织成员 | DELETE | `/api/support/user/team/org/deleteMember` | 从组织移除成员 |

**数据模型设计**:
```typescript
type OrgSchema = {
  _id: ObjectId;
  teamId: ObjectId;           // 所属团队
  name: string;               // 组织名称
  parentId?: ObjectId;        // 父组织 ID
  path: string;               // 路径（如 /root/dept1/dept2）
  order: number;              // 排序
  memberCount: number;        // 成员数量（冗余字段）
  createTime: Date;
  updateTime: Date;
}

type OrgMemberSchema = {
  _id: ObjectId;
  orgId: ObjectId;
  tmbId: ObjectId;            // 团队成员 ID
  createTime: Date;
}
```

**实现文件**:
```
packages/service/support/user/team/org/schema.ts        # 数据模型
packages/service/support/user/team/org/controller.ts    # 业务逻辑
projects/app/src/pages/api/support/user/team/org/
  ├── list.ts
  ├── create.ts
  ├── delete.ts
  ├── move.ts
  ├── update.ts
  ├── updateMembers.ts
  └── deleteMember.ts
```

---

#### 1.3 支付账单模块 (5 接口)

**需实现接口**:

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建账单 | POST | `/api/support/wallet/bill/create` | 创建支付订单 |
| 获取账单列表 | POST | `/api/support/wallet/bill/list` | 分页查询账单 |
| 检查支付结果 | GET | `/api/support/wallet/bill/pay/checkPayResult` | 轮询支付状态 |
| 更新支付方式 | PUT | `/api/support/wallet/bill/pay/updatePayment` | 切换支付方式 |
| 余额转换 | GET | `/api/support/wallet/bill/balanceConversion` | 余额换算 |

**数据模型设计**:
```typescript
type BillSchema = {
  _id: ObjectId;
  oderId: string;             // 订单号
  teamId: ObjectId;
  tmbId: ObjectId;            // 创建人
  type: BillTypeEnum;         // standard | extraDatasetSize | extraPoints

  // 支付信息
  price: number;              // 金额（分）
  payment: PaymentEnum;       // wx | alipay | balance | bank
  status: BillStatusEnum;     // pending | success | failed | canceled

  // 订阅信息（如果是订阅类型）
  subLevel?: StandardSubLevelEnum;
  subMode?: SubModeEnum;

  // 支付凭证
  qrCode?: string;            // 支付二维码
  transactionId?: string;     // 第三方交易号

  createTime: Date;
  payTime?: Date;
  expireTime: Date;           // 订单过期时间
}
```

**实现文件**:
```
packages/service/support/wallet/bill/schema.ts
packages/service/support/wallet/bill/controller.ts
packages/global/support/wallet/bill/type.d.ts          # 已存在
packages/global/support/wallet/bill/constants.ts       # 已存在
projects/app/src/pages/api/support/wallet/bill/
  ├── create.ts
  ├── list.ts
  └── pay/
      ├── checkPayResult.ts
      └── updatePayment.ts
```

**第三方支付集成**:
- 微信支付: Native 支付 (二维码)
- 支付宝: 当面付 (二维码)
- 需要配置环境变量: `WX_PAY_*`, `ALIPAY_*`

---

#### 1.4 用户认证增强 (6 接口)

**需实现接口**:

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| OAuth 登录 | POST | `/api/support/user/account/login/oauth` | 第三方 OAuth 登录 |
| 快速登录 | POST | `/api/support/user/account/login/fastLogin` | 一键登录 |
| 微信二维码 | GET | `/api/support/user/account/login/wx/getQR` | 获取微信扫码登录二维码 |
| SSO 单点登录 | GET | `/api/support/user/account/sso` | 企业 SSO 接入 |
| 更新联系方式 | PUT | `/api/support/user/account/updateContact` | 更新手机/邮箱 |
| 图片验证码 | GET | `/api/support/user/account/captcha/getImgCaptcha` | 获取图片验证码 |

**实现文件**:
```
projects/app/src/pages/api/support/user/account/
  ├── login/
  │   ├── oauth.ts
  │   ├── fastLogin.ts
  │   └── wx/
  │       └── getQR.ts
  ├── sso.ts
  ├── updateContact.ts
  └── captcha/
      └── getImgCaptcha.ts
```

---

### Phase 2: 重要功能 (P1) - 预计 1.5 周

#### 2.1 成员分组模块 (4 接口)

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取分组列表 | POST | `/api/support/user/team/group/list` |
| 创建分组 | POST | `/api/support/user/team/group/create` |
| 删除分组 | DELETE | `/api/support/user/team/group/delete` |
| 更新分组 | PUT | `/api/support/user/team/group/update` |

**数据模型**:
```typescript
type GroupSchema = {
  _id: ObjectId;
  teamId: ObjectId;
  name: string;
  description?: string;
  members: ObjectId[];        // 成员 tmbId 列表
  createTime: Date;
}
```

---

#### 2.2 协作者管理模块 (6 接口)

**应用协作者** (3 接口):

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取列表 | GET | `/api/core/app/collaborator/list` |
| 更新协作者 | POST | `/api/core/app/collaborator/update` |
| 删除协作者 | DELETE | `/api/core/app/collaborator/delete` |

**数据集协作者** (3 接口):

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取列表 | GET | `/api/core/dataset/collaborator/list` |
| 更新协作者 | POST | `/api/core/dataset/collaborator/update` |
| 删除协作者 | DELETE | `/api/core/dataset/collaborator/delete` |

**数据模型**:
```typescript
type CollaboratorSchema = {
  _id: ObjectId;
  resourceId: ObjectId;       // 应用或数据集 ID
  resourceType: 'app' | 'dataset';
  tmbId?: ObjectId;           // 成员
  groupId?: ObjectId;         // 分组
  orgId?: ObjectId;           // 组织
  permission: number;         // 权限位
  createTime: Date;
}
```

---

#### 2.3 发票管理模块 (4 接口)

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取待开票列表 | GET | `/api/support/wallet/bill/invoice/unInvoiceList` |
| 提交开票申请 | POST | `/api/support/wallet/bill/invoice/submit` |
| 获取发票记录 | GET | `/api/support/wallet/bill/invoice/records` |
| 下载发票 | GET | `/api/support/wallet/bill/invoice/downloadFile` |

---

#### 2.4 应用日志分析 (2 接口)

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取总体数据 | GET | `/api/core/app/logs/getTotalData` |
| 获取图表数据 | POST | `/api/core/app/logs/getChartData` |

---

### Phase 3: 增强功能 (P2) - 预计 1 周

#### 3.1 聊天设置模块 (7 接口)

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取设置详情 | GET | `/api/core/chat/setting/detail` |
| 更新设置 | POST | `/api/core/chat/setting/update` |
| 获取收藏应用 | GET | `/api/core/chat/setting/favourite/list` |
| 更新收藏应用 | POST | `/api/core/chat/setting/favourite/update` |
| 调整收藏顺序 | PUT | `/api/core/chat/setting/favourite/order` |
| 更新收藏标签 | PUT | `/api/core/chat/setting/favourite/tags` |
| 删除收藏应用 | DELETE | `/api/core/chat/setting/favourite/delete` |

---

#### 3.2 应用评估模块 (6 接口)

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取评估列表 | POST | `/api/core/app/evaluation/list` |
| 删除评估 | DELETE | `/api/core/app/evaluation/delete` |
| 获取评估项目 | POST | `/api/core/app/evaluation/listItems` |
| 删除评估项目 | DELETE | `/api/core/app/evaluation/deleteItem` |
| 重试评估项目 | POST | `/api/core/app/evaluation/retryItem` |
| 更新评估项目 | POST | `/api/core/app/evaluation/updateItem` |

---

### Phase 4: 其他功能 (P3) - 预计 0.5 周

#### 4.1 其他接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 模型协作者列表 | GET | `/api/system/model/collaborator/list` |
| 更新模型协作者 | POST | `/api/system/model/collaborator/update` |
| 获取推广数据 | GET | `/api/support/activity/promotion/getPromotionData` |
| 获取运营广告 | GET | `/api/support/user/inform/getOperationalAd` |
| 创建工单 | POST | `/api/common/workorder/create` |

---

## 四、技术方案

### 4.1 架构选择

**方案 A: 本地实现** (推荐)
- 直接在 `projects/app/src/pages/api/` 下实现所有接口
- 移除 `/proApi/` 代理，前端改为直接调用 `/api/`
- 优点: 代码统一、部署简单、便于调试
- 缺点: 需要修改前端 API 调用路径

**方案 B: 独立 Pro 服务**
- 新建 `projects/pro/` NestJS 服务
- 保持 `/proApi/` 代理架构
- 优点: 架构清晰、可独立部署、便于商业化
- 缺点: 增加运维复杂度

**建议**: 采用**方案 A**，在现有架构基础上实现，后续如有商业化需求再抽离。

### 4.2 数据库设计

**新增 Collections**:

| Collection | 用途 |
|------------|------|
| `organizations` | 组织架构 |
| `organization_members` | 组织成员关系 |
| `groups` | 成员分组 |
| `collaborators` | 资源协作者 |
| `bills` | 支付账单 |
| `invoices` | 发票记录 |
| `chat_settings` | 聊天设置 |
| `app_evaluations` | 应用评估 |
| `app_evaluation_items` | 评估项目 |

### 4.3 权限控制

利用现有的权限系统:
```typescript
// packages/service/support/permission/teamLimit.ts
const CommonPerList = {
  owner: ~0 >>> 0,    // 全 1 - 所有者权限
  read: 0b100,        // 4 - 读取权限
  write: 0b010,       // 2 - 写入权限
  manage: 0b001       // 1 - 管理权限
}
```

### 4.4 前端适配

需要修改的前端 API 调用文件:
```
projects/app/src/web/support/wallet/bill/api.ts          # /proApi → /api
projects/app/src/web/support/user/team/org/api.ts        # /proApi → /api
projects/app/src/web/support/user/team/group/api.ts      # /proApi → /api
projects/app/src/web/core/app/api/collaborator.ts        # /proApi → /api
projects/app/src/web/core/dataset/api/collaborator.ts    # /proApi → /api
projects/app/src/web/core/chat/api.ts                    # /proApi → /api
projects/app/src/web/core/app/api/evaluation.ts          # /proApi → /api
projects/app/src/web/core/app/api/log.ts                 # /proApi → /api
projects/app/src/web/support/user/api.ts                 # 部分接口
```

---

## 五、实施计划

### 里程碑

| 阶段 | 内容 | 工期 | 交付物 |
|------|------|------|--------|
| M1 | Phase 1 核心功能 | 2 周 | 19 个接口 |
| M2 | Phase 2 重要功能 | 1.5 周 | 16 个接口 |
| M3 | Phase 3 增强功能 | 1 周 | 13 个接口 |
| M4 | Phase 4 其他功能 | 0.5 周 | 5 个接口 |

**总计**: 约 5 周，53 个接口

### 开发顺序建议

```
Week 1:
  - 操作日志模块 (1 接口) ← 最简单，用于验证架构
  - 组织架构模块 (7 接口) ← 其他功能依赖

Week 2:
  - 支付账单模块 (5 接口) ← 商业核心
  - 用户认证增强 (6 接口)

Week 3:
  - 成员分组模块 (4 接口)
  - 协作者管理模块 (6 接口)

Week 4:
  - 发票管理模块 (4 接口)
  - 应用日志分析 (2 接口)
  - 聊天设置模块 (7 接口)

Week 5:
  - 应用评估模块 (6 接口)
  - 其他接口 (5 接口)
  - 集成测试 & Bug 修复
```

---

## 六、风险与依赖

### 风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 支付对接复杂度高 | 延期 1 周 | 先实现模拟支付，后接入真实支付 |
| 组织架构树形结构性能 | 大数据量卡顿 | 使用路径枚举 + 缓存 |
| 前端 API 路径修改遗漏 | 功能异常 | 全量搜索 `/proApi/` 引用 |

### 外部依赖

| 依赖 | 说明 |
|------|------|
| 微信支付商户号 | Native 支付需要 |
| 支付宝应用 | 当面付需要 |
| 短信服务 | 验证码发送 |
| 邮件服务 | 发票通知 |

---

## 七、验收标准

### 功能验收

- [ ] 所有 53 个 API 端点正常响应
- [ ] 前端 Pro 功能全部可用
- [ ] 权限控制正确生效
- [ ] 支付流程完整闭环

### 性能验收

- [ ] API 响应时间 < 500ms (P95)
- [ ] 组织架构查询 < 1s (1000 节点)
- [ ] 日志查询 < 2s (100万条)

### 测试覆盖

- [ ] 单元测试覆盖率 > 80%
- [ ] 接口测试 100% 覆盖
- [ ] E2E 测试核心流程

---

## 八、附录

### A. 现有类型定义文件

```
packages/global/support/wallet/bill/type.d.ts
packages/global/support/wallet/bill/constants.ts
packages/global/support/wallet/bill/api.d.ts
packages/global/support/user/audit/type.d.ts
packages/global/support/user/audit/constants.ts
packages/global/support/user/team/org/type.d.ts
```

### B. 前端组件位置

```
projects/app/src/pageComponents/account/team/OrgManage/
projects/app/src/pageComponents/account/team/GroupManage/
projects/app/src/pageComponents/account/team/Audit/
projects/app/src/pageComponents/account/bill/
projects/app/src/pageComponents/price/
projects/app/src/components/support/wallet/
```

### C. 参考文档

- [FastGPT 官方文档](https://doc.fastgpt.io)
- [微信支付 API](https://pay.weixin.qq.com/wiki/doc/apiv3/apis/)
- [支付宝开放平台](https://open.alipay.com/api)

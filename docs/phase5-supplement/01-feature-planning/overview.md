# Phase 5 - 补充功能规划概览

> 阶段: Phase 5 - 补充开发
> 优先级: P0-P2
> 接口数量: 24 个（缺失的 API）
> 最后更新: 2025-11-25
> **当前进度: Phase 5 全部完成 ✅ (5A + 5B + 5C)**

---

## 1. 背景说明

本阶段用于补充实现 FastGPT 官方 proApi 前端所需但 fastgpt-dev 尚未实现的 API 接口。

### 缺失类型分类

| 类型 | 数量 | 说明 |
|------|------|------|
| 完全缺失 | 17 | 文件不存在 |
| 空壳实现 | 7 | 有文件但无业务逻辑 |
| **合计** | **24** | |

---

## 2. 分阶段开发计划

为保持每个阶段独立且精简，将缺失功能按依赖关系和优先级划分为 **3 个子阶段**：

### Phase 5A: 用户认证补充 (3 个 API) ✅ 已完成

**目标**: 完善注册和验证码功能

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 发送验证码 | POST | `/api/support/user/inform/sendAuthCode` | ✅ 已完成 |
| 用户注册 | POST | `/api/support/user/account/register/emailAndPhone` | ✅ 已完成 |
| 找回密码 | POST | `/api/support/user/account/password/updateByCode` | ✅ 已完成 |

**依赖**: Redis（已实现）、验证码发送服务（已集成）

**完成内容**:
- 验证码服务（Redis 存储 + 60秒频率限制 + 每日上限）
- 短信服务（阿里云/腾讯云）
- 邮件服务（SMTP）
- 密码工具（PBKDF2 加密 + 强度验证）
- 单元测试 58 个 + API 测试 52 个，共 110 个测试全部通过

---

### Phase 5B: 团队与成员管理 (13 个 API) ✅ 已完成

**目标**: 完善团队管理核心功能

#### 5B-1: 团队基础 (2 个)

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 创建团队 | POST | `/api/support/user/team/create` | ✅ 已完成 |
| 获取团队套餐 | GET | `/api/support/user/team/plan/getTeamPlans` | ✅ 已完成 |

#### 5B-2: 团队成员 (6 个)

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 成员列表 | POST | `/api/support/user/team/member/list` | ✅ 已完成 |
| 管理员更新成员名称 | PUT | `/api/support/user/team/member/updateNameByManager` | ✅ 已完成 |
| 成员更新自己名称 | PUT | `/api/support/user/team/member/updateName` | ✅ 已完成 |
| 更新邀请结果 | PUT | `/api/support/user/team/member/updateInvite` | ✅ 已完成 |
| 恢复成员 | POST | `/api/support/user/team/member/restore` | ✅ 已完成 |
| 离开团队 | DELETE | `/api/support/user/team/member/leave` | ✅ 已完成 |

#### 5B-3: 邀请链接 (5 个)

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 创建邀请链接 | POST | `/api/support/user/team/invitationLink/create` | ✅ 已完成 |
| 邀请链接列表 | GET | `/api/support/user/team/invitationLink/list` | ✅ 已完成 |
| 接受邀请 | POST | `/api/support/user/team/invitationLink/accept` | ✅ 已完成 |
| 获取邀请信息 | GET | `/api/support/user/team/invitationLink/info` | ✅ 已完成 |
| 禁用邀请链接 | PUT | `/api/support/user/team/invitationLink/forbid` | ✅ 已完成 |

**完成内容**:
- 团队创建（含数量限制检查、owner 成员记录创建）
- 团队套餐查询（订阅信息、资源使用统计）
- 成员管理（列表、更新名称、恢复、离开）
- 邀请链接（创建、列表、接受、查询信息、禁用）
- 单元测试 17 个，全部通过

---

### Phase 5C: 通知与其他 (8 个 API) ✅ 已完成

**目标**: 完善用户通知和杂项功能

#### 5C-1: 用户通知 (4 个)

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 通知列表 | POST | `/api/support/user/inform/list` | ✅ 已完成 |
| 未读数量 | GET | `/api/support/user/inform/countUnread` | ✅ 已完成 |
| 标记已读 | GET | `/api/support/user/inform/read` | ✅ 已完成 |
| 系统消息模态框 | GET | `/api/support/user/inform/getSystemMsgModal` | ✅ 已完成 |

#### 5C-2: 空壳补全 (4 个)

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 用量统计 | POST | `/api/support/wallet/usage/getUsage` | ✅ 已完成 |
| 标签创建 | POST | `/api/core/dataset/tag/create` | ✅ 已完成 |
| 标签删除 | DELETE | `/api/core/dataset/tag/delete` | ✅ 已完成 |
| 团队聊天初始化 | POST | `/api/core/chat/initTeamChat` | ✅ 已完成 |

**完成内容**:
- 用户通知（列表、未读计数、标记已读、系统消息）
- 空壳补全（用量统计、数据集标签、团队聊天初始化）
- 单元测试 42 个，全部通过

---

## 3. 优先级矩阵

```
                    重要性
           高                    低
        ┌─────────────────────────────┐
紧急    │  Phase 5A (认证)           │
        │  Phase 5B-1 (团队基础)      │
        ├─────────────────────────────┤
        │  Phase 5B-2 (成员管理)      │
        │  Phase 5B-3 (邀请链接)      │
        ├─────────────────────────────┤
不紧急  │  Phase 5C-1 (用户通知)      │
        │  Phase 5C-2 (空壳补全)      │
        └─────────────────────────────┘
```

---

## 4. 可选功能（低优先级）

以下功能官方前端有调用但属于增值功能，可延后实现：

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 团队标签 | GET | `/api/support/user/team/tag/list` | 标签管理 |
| 发票抬头 | GET | `/api/support/user/team/invoiceAccount/getTeamInvoiceHeader` | 发票功能 |
| 优惠券兑换 | GET | `/api/support/wallet/coupon/redeem` | 营销功能 |
| 团队协作者列表 | GET | `/api/support/user/team/collaborator/list` | 权限管理 |
| 团队协作者更新 | POST | `/api/support/user/team/collaborator/update` | 权限管理 |
| 团队协作者单个更新 | PUT | `/api/support/user/team/collaborator/updateOne` | 权限管理 |

---

## 5. 开发建议

### 执行顺序

```
Phase 5A (认证) ──> Phase 5B-1 (团队基础) ──> Phase 5B-2 (成员)
                                           │
                                           ▼
                                     Phase 5B-3 (邀请)
                                           │
                                           ▼
                                     Phase 5C (通知+其他)
```

### 每个阶段独立验收

- **5A**: 可独立测试注册、验证码功能
- **5B-1**: 可独立测试团队创建
- **5B-2**: 可独立测试成员 CRUD
- **5B-3**: 可独立测试邀请链接流程
- **5C**: 可独立测试通知和杂项

---

## 6. 文件索引

```
docs/phase5-supplement/
├── 01-feature-planning/
│   ├── overview.md                    # 本文件
│   ├── phase5a-auth.md               # 认证补充规划
│   ├── phase5b-team.md               # 团队管理规划
│   └── phase5c-others.md             # 通知等杂项规划
├── 02-data-model-design/
│   └── schema-design.md              # 新增 Schema 设计
└── 03-development-plan/
    └── implementation-plan.md        # 实现计划
```

---

*最后更新: 2025-11-25*

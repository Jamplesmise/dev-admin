# Phase 5 - 补充功能实现计划

> 阶段: Phase 5 - 补充开发
> 最后更新: 2025-11-25
> 状态: **Phase 5A ✅ 已完成，Phase 5B ✅ 已完成，Phase 5C ✅ 已完成**

---

## 1. 开发阶段总览

| 子阶段 | 名称 | API 数量 | 优先级 | 依赖 | 状态 |
|--------|------|---------|--------|------|------|
| 5A | 用户认证补充 | 3 | P0 | Redis | ✅ 已完成 |
| 5B-1 | 团队基础 | 2 | P0 | 5A | ✅ 已完成 |
| 5B-2 | 团队成员 | 6 | P1 | 5B-1 | ✅ 已完成 |
| 5B-3 | 邀请链接 | 5 | P1 | 5B-1 | ✅ 已完成 |
| 5C-1 | 用户通知 | 4 | P1 | - | ✅ 已完成 |
| 5C-2 | 空壳补全 | 4 | P2 | - | ✅ 已完成 |

**总计**: 24 个 API（已完成 24 个）🎉

---

## 2. Phase 5A: 用户认证补充 ✅ 已完成

### 2.1 目标

完善用户注册和密码找回流程。

### 2.2 任务清单

```
[5A-1] 验证码服务
├── [x] 创建 Redis 验证码存储服务
├── [x] 实现频率限制逻辑（60秒间隔、每日10次上限）
├── [x] 集成短信发送（阿里云/腾讯云）
└── [x] 集成邮件发送（SMTP/nodemailer）

[5A-2] 发送验证码 API
├── [x] 创建 pages/api/support/user/inform/sendAuthCode.ts
├── [x] 实现参数验证
├── [x] 实现图形验证码校验
├── [x] 实现发送逻辑
└── [x] 添加单元测试（17 个测试）

[5A-3] 用户注册 API
├── [x] 创建 pages/api/support/user/account/register/emailAndPhone.ts
├── [x] 实现验证码校验
├── [x] 实现用户创建
├── [x] 实现默认团队创建（简化版）
└── [x] 添加单元测试（19 个测试）

[5A-4] 找回密码 API
├── [x] 创建 pages/api/support/user/account/password/updateByCode.ts
├── [x] 实现验证码校验
├── [x] 实现密码更新（PBKDF2 加密）
├── [x] 清除现有 Token
└── [x] 添加单元测试（16 个测试）
```

### 2.3 新增文件

```
pages/api/support/user/
├── inform/
│   └── sendAuthCode.ts                    ✅
└── account/
    ├── register/
    │   └── emailAndPhone.ts               ✅
    └── password/
        └── updateByCode.ts                ✅

src/packages/service/support_user/
├── auth/
│   ├── verificationCodeService.ts         ✅ Redis 实现
│   └── passwordUtils.ts                   ✅ PBKDF2 加密
└── notification/
    ├── smsService.ts                      ✅
    ├── emailService.ts                    ✅
    └── index.ts                           ✅

src/packages/global/support_user/auth/
└── verificationCode.ts                    ✅ 常量定义

test/unit/phase5a/
├── passwordUtils.test.ts                  ✅ 19 个测试
├── verificationCodeService.test.ts        ✅ 21 个测试
└── contactValidation.test.ts              ✅ 18 个测试

test/api/phase5a/
├── sendAuthCode.api.test.ts               ✅ 17 个测试
├── register.api.test.ts                   ✅ 19 个测试
└── updatePasswordByCode.api.test.ts       ✅ 16 个测试
```

### 2.4 环境变量

```bash
# 短信服务（阿里云示例）
SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=
SMS_SIGN_NAME=
SMS_TEMPLATE_CODE=

# 邮件服务
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### 2.5 测试统计

| 类型 | 测试文件 | 测试数 | 状态 |
|------|---------|--------|------|
| 单元测试 | passwordUtils.test.ts | 19 | ✅ 通过 |
| 单元测试 | verificationCodeService.test.ts | 21 | ✅ 通过 |
| 单元测试 | contactValidation.test.ts | 18 | ✅ 通过 |
| API测试 | sendAuthCode.api.test.ts | 17 | ✅ 通过 |
| API测试 | register.api.test.ts | 19 | ✅ 通过 |
| API测试 | updatePasswordByCode.api.test.ts | 16 | ✅ 通过 |
| **总计** | **6 个文件** | **110** | **✅ 全部通过** |

---

## 3. Phase 5B-1: 团队基础 ✅ 已完成

### 3.1 目标

实现团队创建和套餐查询。

### 3.2 任务清单

```
[5B1-1] 团队创建 API
├── [x] 补全 pages/api/support/user/team/create.ts
├── [x] 实现团队数量限制检查
├── [x] 实现团队创建
├── [x] 实现成员记录创建（owner）
├── [x] 实现默认订阅创建
└── [x] 添加单元测试（4 个测试）

[5B1-2] 团队套餐查询 API
├── [x] 创建 pages/api/support/user/team/plan/getTeamPlans.ts
├── [x] 获取订阅信息
├── [x] 统计资源使用
├── [x] 计算配额余量
└── [x] 添加单元测试（1 个测试）
```

### 3.3 新增文件

```
pages/api/support/user/team/
├── create.ts                        ✅ 补全
└── plan/
    └── getTeamPlans.ts              ✅ 新建
```

---

## 4. Phase 5B-2: 团队成员 ✅ 已完成

### 4.1 目标

完善团队成员管理功能。

### 4.2 任务清单

```
[5B2-1] 成员列表 API
├── [x] 补全 pages/api/support/user/team/member/list.ts
├── [x] 实现分页查询
├── [x] 实现搜索筛选
└── [x] 添加单元测试（2 个测试）

[5B2-2] 更新成员名称 API
├── [x] 创建 pages/api/support/user/team/member/updateNameByManager.ts
├── [x] 创建 pages/api/support/user/team/member/updateName.ts
├── [x] 实现权限校验
└── [x] 添加单元测试（4 个测试）

[5B2-3] 邀请结果处理 API
├── [x] 创建 pages/api/support/user/team/member/updateInvite.ts
├── [x] 实现接受/拒绝逻辑
└── [x] 添加单元测试

[5B2-4] 恢复成员 API
├── [x] 创建 pages/api/support/user/team/member/restore.ts
├── [x] 实现权限校验
├── [x] 实现状态更新
└── [x] 添加单元测试

[5B2-5] 离开团队 API
├── [x] 创建 pages/api/support/user/team/member/leave.ts
├── [x] 检查是否为 owner
├── [x] 清理协作者权限
└── [x] 添加单元测试（2 个测试）
```

### 4.3 新增文件

```
pages/api/support/user/team/member/
├── list.ts                          ✅ 补全
├── updateNameByManager.ts           ✅ 新建
├── updateName.ts                    ✅ 新建
├── updateInvite.ts                  ✅ 新建
├── restore.ts                       ✅ 新建
└── leave.ts                         ✅ 新建
```

---

## 5. Phase 5B-3: 邀请链接 ✅ 已完成

### 5.1 目标

实现完整的邀请链接功能。

### 5.2 任务清单

```
[5B3-1] Schema 创建
├── [x] 创建 src/packages/service/support_user/team/invitationLink/schema.ts
└── [x] 创建 Controller

[5B3-2] 创建邀请链接 API
├── [x] 创建 pages/api/support/user/team/invitationLink/create.ts
├── [x] 实现权限校验（owner/admin）
├── [x] 生成唯一链接 ID（nanoid）
└── [x] 添加单元测试（2 个测试）

[5B3-3] 邀请链接列表 API
├── [x] 创建 pages/api/support/user/team/invitationLink/list.ts
├── [x] 实现列表查询
└── [x] 添加单元测试（1 个测试）

[5B3-4] 接受邀请 API
├── [x] 创建 pages/api/support/user/team/invitationLink/accept.ts
├── [x] 验证链接有效性
├── [x] 创建成员记录
├── [x] 更新使用计数
└── [x] 添加单元测试

[5B3-5] 邀请信息查询 API
├── [x] 创建 pages/api/support/user/team/invitationLink/info.ts
├── [x] 返回团队基本信息
└── [x] 添加单元测试（1 个测试）

[5B3-6] 禁用邀请链接 API
├── [x] 创建 pages/api/support/user/team/invitationLink/forbid.ts
├── [x] 实现状态切换
└── [x] 添加单元测试（1 个测试）
```

### 5.3 新增文件

```
pages/api/support/user/team/invitationLink/
├── create.ts                        ✅
├── list.ts                          ✅
├── accept.ts                        ✅
├── info.ts                          ✅
└── forbid.ts                        ✅

src/packages/service/support_user/team/invitationLink/
├── schema.ts                        ✅
└── controller.ts                    ✅
```

### 5.4 测试统计

| 类型 | 测试文件 | 测试数 | 状态 |
|------|---------|--------|------|
| API测试 | team.api.test.ts | 17 | ✅ 通过 |
| **总计** | **1 个文件** | **17** | **✅ 全部通过** |

---

## 6. Phase 5C-1: 用户通知 ✅ 已完成

### 6.1 目标

实现用户站内通知系统。

### 6.2 任务清单

```
[5C1-1] Schema 创建
├── [x] 创建 user_informs Schema
├── [x] 创建 system_messages Schema
└── [x] 创建 Controller

[5C1-2] 通知列表 API
├── [x] 创建 pages/api/support/user/inform/list.ts
├── [x] 实现分页查询
├── [x] 实现类型筛选
└── [x] 添加单元测试（7 个测试）

[5C1-3] 未读计数 API
├── [x] 创建 pages/api/support/user/inform/countUnread.ts
├── [x] 实现分类计数
└── [x] 添加单元测试（3 个测试）

[5C1-4] 标记已读 API
├── [x] 创建 pages/api/support/user/inform/read.ts
├── [x] 支持单个/全部已读
└── [x] 添加单元测试（3 个测试）

[5C1-5] 系统消息模态框 API
├── [x] 创建 pages/api/support/user/inform/getSystemMsgModal.ts
├── [x] 查询有效系统消息
└── [x] 添加单元测试（4 个测试）
```

### 6.3 新增文件

```
pages/api/support/user/inform/
├── list.ts                              ✅
├── countUnread.ts                       ✅
├── read.ts                              ✅
└── getSystemMsgModal.ts                 ✅

src/packages/service/support_user/inform/
└── schema.ts                            ✅

src/packages/service/support/systemMessage/
└── schema.ts                            ✅

test/api/phase5c/
└── inform.api.test.ts                   ✅ 17 个测试
```

---

## 7. Phase 5C-2: 空壳补全 ✅ 已完成

### 7.1 目标

补全现有空壳 API 的业务逻辑。

### 7.2 任务清单

```
[5C2-1] 用量统计 API
├── [x] 补全 pages/api/support/wallet/usage/getUsage.ts
├── [x] 实现时间范围聚合
├── [x] 实现多维度分组
└── [x] 添加单元测试（7 个测试）

[5C2-2] 数据集标签 API
├── [x] 创建 dataset_tags Schema
├── [x] 补全 pages/api/core/dataset/tag/create.ts
├── [x] 补全 pages/api/core/dataset/tag/delete.ts
└── [x] 添加单元测试（10 个测试）

[5C2-3] 团队聊天初始化 API
├── [x] 补全 pages/api/core/chat/initTeamChat.ts
├── [x] 实现权限校验
├── [x] 实现会话创建/恢复
└── [x] 添加单元测试（8 个测试）
```

### 7.3 新增文件

```
src/packages/service/core/dataset/tag/
└── schema.ts                            ✅

test/api/phase5c/
├── usage.api.test.ts                    ✅ 7 个测试
├── datasetTag.api.test.ts               ✅ 10 个测试
└── initTeamChat.api.test.ts             ✅ 8 个测试
```

### 7.4 测试统计

| 类型 | 测试文件 | 测试数 | 状态 |
|------|---------|--------|------|
| API测试 | inform.api.test.ts | 17 | ✅ 通过 |
| API测试 | usage.api.test.ts | 7 | ✅ 通过 |
| API测试 | datasetTag.api.test.ts | 10 | ✅ 通过 |
| API测试 | initTeamChat.api.test.ts | 8 | ✅ 通过 |
| **总计** | **4 个文件** | **42** | **✅ 全部通过** |

---

## 8. 执行顺序

```
Week 1:
├── Day 1-2: Phase 5A (验证码 + 注册 + 找回密码)
└── Day 3: Phase 5B-1 (团队创建 + 套餐查询)

Week 2:
├── Day 1-2: Phase 5B-2 (成员管理 6 个 API)
└── Day 3: Phase 5B-3 (邀请链接 5 个 API)

Week 3:
├── Day 1: Phase 5C-1 (用户通知 4 个 API)
├── Day 2: Phase 5C-2 (空壳补全 4 个 API)
└── Day 3: 集成测试 + 文档更新
```

---

## 9. 验收标准

### 9.1 功能验收

- [x] 24 个 API 全部实现 ✅ 已完成 24/24
- [x] 验证码发送正常（短信/邮件）✅ Phase 5A 完成
- [x] 用户注册流程完整 ✅ Phase 5A 完成
- [x] 团队创建和管理正常 ✅ Phase 5B 完成
- [x] 邀请链接流程完整 ✅ Phase 5B 完成
- [x] 通知系统功能正常 ✅ Phase 5C 完成

### 9.2 质量验收

- [x] Phase 5A 测试通过 ✅ 110 个测试全部通过
- [x] Phase 5B 测试通过 ✅ 17 个测试全部通过
- [x] Phase 5C 测试通过 ✅ 42 个测试全部通过
- [ ] 单元测试覆盖率 ≥ 70%
- [ ] ESLint 检查通过
- [ ] 构建成功
- [ ] API 响应时间 < 500ms

### 9.3 文档验收

- [x] Phase 5A 文档更新 ✅
- [x] Phase 5B 文档更新 ✅
- [x] Phase 5C 文档更新 ✅
- [ ] API 文档完整
- [ ] Schema 设计文档同步
- [ ] 环境变量文档更新

---

## 10. 风险与依赖

### 10.1 外部依赖

| 依赖 | 说明 | 风险 |
|------|------|------|
| 短信服务 | 阿里云/腾讯云 | 需要企业认证 |
| 邮件服务 | SMTP 服务器 | 可能被标记垃圾邮件 |
| Redis | 验证码存储 | 已部署，低风险 |

### 10.2 风险应对

1. **短信服务未就绪**: 先实现邮箱注册，短信后续补充
2. **测试数据准备**: 编写 Seed 脚本生成测试数据
3. **并发问题**: 邀请链接使用计数需要原子操作

---

## 11. 里程碑

| 里程碑 | 完成标准 | 目标日期 | 状态 |
|--------|---------|---------|------|
| M1 | 5A 完成，可注册新用户 | Week 1 Day 2 | ✅ 已完成 (2025-11-25) |
| M2 | 5B 完成，团队管理完整 | Week 2 Day 3 | ✅ 已完成 (2025-11-25) |
| M3 | 5C 完成，通知与空壳补全 | Week 3 Day 2 | ✅ 已完成 (2025-11-25) |
| M4 | 集成测试通过，文档完成 | Week 3 Day 3 | ⏳ 进行中 |

---

## 12. Phase 5 完成总结

### 12.1 API 实现统计

| 阶段 | API 数量 | 测试数 | 完成日期 |
|------|---------|--------|---------|
| Phase 5A | 3 | 110 | 2025-11-25 |
| Phase 5B | 13 | 17 | 2025-11-25 |
| Phase 5C | 8 | 42 | 2025-11-25 |
| **总计** | **24** | **169** | |

### 12.2 新增文件清单

**Phase 5B 新增文件:**
```
pages/api/support/user/team/
├── create.ts                        (补全)
├── list.ts                          (新建)
├── switch.ts                        (新建)
├── plan/
│   └── getTeamPlans.ts              (新建)
├── member/
│   ├── list.ts                      (补全)
│   ├── updateName.ts                (新建)
│   ├── updateNameByManager.ts       (新建)
│   ├── updateInvite.ts              (新建)
│   ├── restore.ts                   (新建)
│   └── leave.ts                     (新建)
└── invitationLink/
    ├── create.ts                    (新建)
    ├── list.ts                      (新建)
    ├── accept.ts                    (新建)
    ├── info.ts                      (新建)
    └── forbid.ts                    (新建)

src/packages/service/support_user/team/
├── teamSchema.ts                    (新建)
├── teamMemberSchema.ts              (新建)
└── invitationLink/
    ├── schema.ts                    (新建)
    └── controller.ts                (新建)

test/api/phase5/
└── team.api.test.ts                 (新建, 17 个测试)
```

---

*最后更新: 2025-11-25*

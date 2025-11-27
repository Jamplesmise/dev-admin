# FastGPT Pro 后端开发项目

> 项目启动日期: 2025-11-23
> 文档状态: 开发中
> 最后更新: 2025-11-26

---

## 项目概述

本项目为 FastGPT 商业版后端接口独立实现，提供支付、组织架构、操作日志、协作者管理等 Pro 功能的完整后端服务。

## 开发进度总览

| 指标 | 数值 |
|------|------|
| 官方 proApi 需求 | 53 个 |
| 已实现（完整） | 74 个 |
| 部分实现 | 0 个 |
| 空壳/未实现 | 0 个 |
| **当前覆盖率** | **100%** |

> 注：Phase 6 已完成，达到 100% 覆盖率目标

## 开发阶段

| 阶段 | 名称 | 接口数 | 状态 |
|------|------|--------|------|
| Phase 1 | 核心功能 | 19 | ✅ 已完成 |
| Phase 2 | 重要功能 | 16 | ✅ 已完成 |
| Phase 3 | 增强功能 | 13 | ✅ 已完成 |
| Phase 4 | 其他功能 | 5 | ✅ 已完成 |
| Phase 5 | 补充功能 | 24 | ✅ 已完成 |
| Phase 6 | 完善收尾 | 11 | ✅ 已完成 |

**Phase 6 子阶段**:

| 子阶段 | 名称 | 接口数 | 状态 |
|--------|------|--------|--------|
| 6D-1 | 成员管理补充 | 3 | ✅ 已完成 |
| 6D-2 | 团队标签 | 3 | ✅ 已完成 |
| 6D-3 | 数据集扩展 | 3 | ✅ 已完成 |
| 6D-4 | 其他功能 | 2 | ✅ 已完成 |

---

## 目录结构

```
fastgpt-dev/
├── docs/
│   ├── 00-project-overview.md           # 项目总览
│   ├── phase1-core/                     # 阶段1: 核心功能
│   │   ├── 01-feature-planning/         # 功能规划
│   │   ├── 02-data-model-design/        # 数据模型设计
│   │   ├── 03-development-plan/         # 详细开发计划
│   │   └── 04-dev-test-log/             # 开发测试日志
│   ├── phase2-important/                # 阶段2: 重要功能
│   ├── phase3-enhanced/                 # 阶段3: 增强功能
│   └── phase4-others/                   # 阶段4: 其他功能
├── src/
│   ├── packages/
│   │   ├── global/                      # 全局类型定义
│   │   └── service/                     # 服务层代码
│   └── api/                             # API 接口实现
└── README.md
```

---

## 各阶段功能概览

### Phase 1: 核心功能 (P0) - 2 周

| 模块 | 接口数 | 说明 |
|------|--------|------|
| 操作日志 | 1 | 审计日志查询 |
| 组织架构 | 7 | 部门/组织树形管理 |
| 支付账单 | 5 | 微信/支付宝支付 |
| 用户认证 | 6 | OAuth/SSO/微信扫码 |

### Phase 2: 重要功能 (P1) - 1.5 周

| 模块 | 接口数 | 说明 |
|------|--------|------|
| 成员分组 | 4 | 分组 CRUD |
| 协作者管理 | 6 | 应用/数据集权限分配 |
| 发票管理 | 4 | 开票申请与下载 |
| 应用日志 | 2 | 图表分析数据 |

### Phase 3: 增强功能 (P2) - 1 周

| 模块 | 接口数 | 说明 |
|------|--------|------|
| 聊天设置 | 7 | 收藏应用、个性化设置 |
| 应用评估 | 6 | AI 应用质量评估 |

### Phase 4: 其他功能 (P3) - 0.5 周

| 模块 | 接口数 | 说明 |
|------|--------|------|
| 系统管理 | 3 | 模型协作者、推广数据 |
| 其他 | 2 | 运营广告、工单系统 |

---

## 技术栈

- **运行时**: Node.js >= 20
- **框架**: Next.js 14 (API Routes)
- **数据库**: MongoDB (Mongoose 9.x)
- **缓存**: Redis (ioredis)
- **类型系统**: TypeScript 5.x
- **测试框架**: Vitest

### 类型检查注意事项

> **禁止使用 `tsc --noEmit`**：Mongoose 类型系统会导致 TypeScript 编译器内存溢出 (OOM)，即使 4GB 内存也不够。

**正确的类型检查方式**（与 FastGPT 开源项目一致）：
```bash
pnpm test    # vitest 测试（隐式类型检查）
pnpm build   # Next.js 构建（自动类型检查）
pnpm lint    # ESLint 检查
```

详见 [CLAUDE.md](../.claude/CLAUDE.md) 第七节"测试与类型检查"。

---

## 文档索引

### Phase 1 - 核心功能
- [功能规划 - 操作日志](phase1-core/01-feature-planning/audit-log-module.md)
- [功能规划 - 组织架构](phase1-core/01-feature-planning/organization-module.md)
- [功能规划 - 支付账单](phase1-core/01-feature-planning/payment-bill-module.md)
- [功能规划 - 用户认证](phase1-core/01-feature-planning/user-auth-module.md)
- [数据模型设计](phase1-core/02-data-model-design/schema-overview.md)
- [详细开发计划](phase1-core/03-development-plan/implementation-plan.md)

### Phase 2 - 重要功能
- [功能规划概览](phase2-important/01-feature-planning/overview.md)
- [数据模型设计](phase2-important/02-data-model-design/schema-design.md)
- [详细开发计划](phase2-important/03-development-plan/implementation-plan.md)

### Phase 3 - 增强功能
- [功能规划概览](phase3-enhanced/01-feature-planning/overview.md)
- [数据模型设计](phase3-enhanced/02-data-model-design/schema-design.md)
- [详细开发计划](phase3-enhanced/03-development-plan/implementation-plan.md)

### Phase 4 - 其他功能
- [功能规划概览](phase4-others/01-feature-planning/overview.md)
- [数据模型设计](phase4-others/02-data-model-design/schema-design.md)
- [详细开发计划](phase4-others/03-development-plan/implementation-plan.md)

### Phase 5 - 补充功能
- [功能规划概览](phase5-supplement/01-feature-planning/overview.md)
- [5A - 用户认证补充](phase5-supplement/01-feature-planning/phase5a-auth.md)
- [5B - 团队与成员管理](phase5-supplement/01-feature-planning/phase5b-team.md)
- [5C - 通知与其他](phase5-supplement/01-feature-planning/phase5c-others.md)
- [数据模型设计](phase5-supplement/02-data-model-design/schema-design.md)
- [实现计划](phase5-supplement/03-development-plan/implementation-plan.md)

### Phase 6 - 完善收尾 (进行中)
- [功能规划概览](phase6-completion/01-feature-planning/overview.md)
- [数据模型设计](phase6-completion/02-data-model-design/schema-design.md)
- [实现计划](phase6-completion/03-development-plan/implementation-plan.md)

### 差距分析报告
- [ProAPI 差距分析](.claude/design/proapi-gap-analysis.md)

---

## 参考资源

- [FastGPT 官方文档](https://doc.fastgpt.io)
- [FastGPT 源代码](/home/sinocare/dev/FastGPT)

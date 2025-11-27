# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供项目开发指导。

## 输出要求

1. 输出语言：中文
2. 输出的设计文档位置：`.claude/design/`，以 Markdown 文件为主
3. 输出 Plan 时，均需写入 `.claude/plan/` 目录下

---

## 一、项目概述

FastGPT Pro 后端服务 - 为 FastGPT 商业版提供支付、组织架构、操作日志、协作者管理等 Pro 功能的独立后端 API 服务。

| 属性 | 值 |
|------|-----|
| **项目类型** | 后端 API 服务 (纯 API，无前端) |
| **项目性质** | FastGPT 商业版后端扩展 |
| **与官方 FastGPT 关系** | 独立服务，通过 API 集成 |
| **参考项目** | https://github.com/labring/FastGPT |

### 核心功能模块

| 阶段 | 模块 | 接口数 | 说明 |
|------|------|--------|------|
| Phase 1 | 用户认证 | 6 | OAuth/SSO/微信扫码登录 |
| Phase 1 | 组织架构 | 7 | 部门/组织树形管理 |
| Phase 1 | 支付账单 | 5 | 微信/支付宝支付 |
| Phase 1 | 操作日志 | 1 | 审计日志查询 |
| Phase 2 | 成员分组 | 4 | 分组 CRUD |
| Phase 2 | 协作者管理 | 6 | 应用/数据集权限分配 |
| Phase 2 | 发票管理 | 4 | 开票申请与下载 |
| Phase 2 | 应用日志 | 2 | 图表分析数据 |
| Phase 3 | 聊天设置 | 7 | 收藏应用、个性化设置 |
| Phase 3 | 应用评估 | 6 | AI 应用质量评估 |
| Phase 4 | 系统管理 | 3 | 模型协作者、推广数据 |
| Phase 4 | 其他服务 | 2 | 运营广告、工单系统 |

**总计**: 53 个 API 接口

### 项目边界

**做什么**: Pro 功能后端 API（认证、支付、组织、权限、日志、发票）

**不做什么**: 前端 UI、工作流引擎、知识库、模型调用（这些由官方 FastGPT 提供）

---

## 二、技术栈

**环境要求**: Node.js >=20, pnpm (或 npm)

### 核心框架

| 框架 | 版本 | 用途 |
|------|------|------|
| Next.js | ^14.2.32 | API 路由框架 |
| TypeScript | ^5.1.3 | 类型系统 |
| Mongoose | ^9.0.0 | MongoDB ORM |
| ioredis | ^5.8.2 | Redis 客户端 |

### 数据库

| 数据库 | 用途 |
|--------|------|
| MongoDB | 主数据存储 |
| Redis | Session 缓存、Token 存储 |

### 主要依赖

```json
{
  "dependencies": {
    "next": "^14.2.32",
    "mongoose": "^9.0.0",
    "ioredis": "^5.8.2",
    "jsonwebtoken": "^9.0.2",
    "cookie": "^1.0.2",
    "dayjs": "^1.11.10",
    "nanoid": "^5.0.4"
  }
}
```

---

## 三、项目结构

> **重要**: 本项目是**单体 Next.js 应用**，不是 Monorepo。
> `src/packages/` 是普通代码目录，通过 tsconfig paths 别名模拟包导入。

```
fastgpt-dev/
├── pages/
│   └── api/                        # API 路由 (Next.js 约定)
│       ├── core/
│       │   ├── app/                # 应用相关 API
│       │   │   ├── collaborator/   # 应用协作者
│       │   │   ├── evaluation/     # 应用评估
│       │   │   └── logs/           # 应用日志
│       │   ├── chat/               # 聊天相关 API
│       │   │   └── setting/        # 聊天设置
│       │   └── dataset/            # 数据集相关 API
│       │       ├── collaborator/   # 数据集协作者
│       │       └── tag/            # 数据集标签
│       ├── support/
│       │   ├── user/               # 用户相关 API
│       │   │   ├── account/        # 账户、登录
│       │   │   └── team/           # 团队管理
│       │   ├── wallet/             # 钱包、账单
│       │   └── activity/           # 活动、推广
│       ├── system/                 # 系统管理 API
│       └── common/                 # 公共 API
│
├── src/
│   └── packages/                   # 代码模块 (非 npm 包)
│       ├── global/                 # 类型定义、常量
│       │   ├── common/             # 公共类型
│       │   ├── core/               # 核心业务类型
│       │   ├── support/            # 支持模块类型
│       │   └── support_user/       # 用户模块类型
│       │
│       └── service/                # 业务逻辑、数据库操作
│           ├── common/             # 公共服务
│           │   ├── middle/         # 中间件 (authMiddleware)
│           │   ├── mongo/          # MongoDB 连接
│           │   └── redis/          # Redis 连接
│           ├── core/               # 核心业务服务
│           │   └── chat/           # 聊天服务
│           ├── support/            # 支持模块服务
│           └── type/               # 服务层类型
│
├── test/                           # 测试文件
├── docs/                           # 开发文档
├── package.json
├── tsconfig.json
└── vitest.config.mts
```

### 路径别名配置 (tsconfig.json)

```json
{
  "paths": {
    "@/*": ["src/*"],
    "@fastgpt/global/*": ["src/packages/global/*"],
    "@fastgpt/service/*": ["src/packages/service/*"]
  }
}
```

### 模块职责划分

| 模块 | 路径 | 职责 | 禁止 |
|------|------|------|------|
| **global** | `src/packages/global/` | 类型定义、常量、纯工具函数 | 禁止数据库操作、HTTP 调用 |
| **service** | `src/packages/service/` | 数据库操作、业务逻辑、中间件 | 禁止 React/前端代码 |
| **api** | `pages/api/` | HTTP 路由、请求处理 | 禁止直接数据库操作 |

### 调用链路

```
HTTP 请求
    ↓
pages/api/*.ts          # 路由层：参数验证、响应格式化
    ↓
src/packages/service/   # 服务层：业务逻辑、数据库操作
    ↓
src/packages/global/    # 类型层：类型定义、常量
```

---

## 四、开发命令

```bash
# 安装依赖
pnpm install

# 开发
pnpm dev                    # 启动开发服务器 (默认 3000 端口)
PORT=3001 pnpm dev          # 指定端口

# 构建与检查
pnpm build                  # 构建项目
pnpm lint                   # ESLint 检查
pnpm format                 # Prettier 格式化

# 测试
pnpm test                   # 运行所有测试
pnpm test:watch             # 监听模式
```

---

## 五、接口契约

### 统一响应格式

```typescript
type ResponseType<T = any> = {
  code: number;        // HTTP 状态码或业务错误码
  statusText: string;  // 错误类型枚举值
  message: string;     // 错误消息
  data: T;             // 返回数据
}
```

### 认证方式

| 模式 | Header/Cookie | 说明 |
|------|---------------|------|
| Cookie Token | `token` cookie | Web 端用户登录 |
| Bearer Token | `Authorization: Bearer xxx` | API 调用 |

### 认证中间件

```typescript
// 使用方式
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import { authMiddleware } from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(req, res) {
  // req 中已注入 teamId, tmbId, userId
}

export default NextAPI(handler);
```

### 权限值定义（位运算）

```typescript
const PermissionBits = {
  read: 0b100,    // 4 - 读取权限
  write: 0b010,   // 2 - 写入权限
  manage: 0b001   // 1 - 管理权限
};

// 组合示例
// 只读: 4 (0b100)
// 读写: 6 (0b110)
// 全部: 7 (0b111)
```

---

## 六、代码规范

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| **文件名** | 小驼峰 | `userService.ts` |
| **变量/函数** | 小驼峰 | `getUserInfo` |
| **常量** | 全大写 + 下划线 | `MAX_RETRY_COUNT` |
| **类型** | 大驼峰 + Type 后缀 | `UserType` |
| **Schema** | 大驼峰 + SchemaType 后缀 | `ChatSettingSchemaType` |

### TypeScript 规范

- 优先使用 `type` 而非 `interface`
- 使用 `import type` 导入类型
- 启用 strict 模式，避免 any

### API 路由规范

```typescript
// pages/api/xxx.ts 标准模板
import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type RequestType = {
  // 请求参数类型
};

type ResponseType = {
  // 响应数据类型
};

async function handler(
  req: ApiRequestProps<RequestType>,
  _res: NextApiResponse
): Promise<ResponseType> {
  const teamId = getTeamIdFromReq(req);
  const { /* 参数 */ } = req.body;

  // 业务逻辑

  return { /* 响应数据 */ };
}

export default NextAPI(handler);
```

### 提交规范 (Conventional Commits)

```
<type>(<scope>): <subject>
```

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `refactor` | 重构 |
| `test` | 测试相关 |
| `chore` | 构建/工具变动 |

**示例**: `feat(auth): add OAuth login support`

---

## 七、测试

使用 Vitest，配置文件: `vitest.config.mts`

### 测试文件位置

- `test/` - 测试用例目录

### 类型检查策略

> **重要**: 不要使用 `tsc --noEmit` 进行全量类型检查，Mongoose 类型系统会导致内存溢出。

**推荐方式**:

| 方式 | 命令 | 说明 |
|------|------|------|
| 单元测试 | `pnpm test` | vitest 运行时隐式类型检查 |
| 构建检查 | `pnpm build` | Next.js 构建时自动类型检查 |
| 实时检查 | VS Code | IDE 增量类型检查（推荐） |

---

## 八、环境配置

### 环境变量 (.env.local)

```bash
# MongoDB
MONGODB_URI="mongodb://myusername:mypassword@localhost:27017/fastgpt?authSource=admin"

# Redis
REDIS_URL="redis://default:mypassword@127.0.0.1:6379"

# Token
TOKEN_KEY="your-secret-key"

# 其他
PRO_URL="http://localhost:3000"   # FastGPT Pro 服务地址
```

### Docker 开发环境

```bash
# 启动 MongoDB 和 Redis
docker run -d --name mongo -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=myusername \
  -e MONGO_INITDB_ROOT_PASSWORD=mypassword \
  mongo:latest

docker run -d --name redis -p 6379:6379 \
  redis:latest --requirepass mypassword
```

---

## 九、Agent 开发规范

### MVU 原则 (Minimum Viable Unit)

每个开发单元应满足:

| 约束 | 限制 |
|------|------|
| 改动文件数 | < 5 个 |
| 改动代码量 | < 200 行 |
| 独立可运行 | 是 |
| 独立可验证 | 是 |

### 开发流程

1. 功能实现前，优先阅读 `docs/` 下的功能规划文档
2. 采用"设计 → 测试 → 编码 → 验证"的工作模式
3. 每个 API 实现后，确保有对应的测试用例

### 上下文管理

- 1 会话 = 1 任务
- Context > 60% 时立即 /clear

---

## 十、关键路径速查

| 内容 | 路径 |
|------|------|
| API 路由 | `pages/api/` |
| 类型定义 | `src/packages/global/` |
| 业务逻辑 | `src/packages/service/` |
| 数据库 Schema | `src/packages/service/*/schema.ts` |
| 认证中间件 | `src/packages/service/common/middle/authMiddleware.ts` |
| MongoDB 连接 | `src/packages/service/common/mongo/index.ts` |
| Redis 连接 | `src/packages/service/common/redis/index.ts` |
| 测试文件 | `test/` |
| 功能文档 | `docs/` |
| 环境变量模板 | `.env.template` |

---

## 十一、分支与版本策略

| 分支 | 用途 |
|------|------|
| `main` | 主分支，保持稳定 |
| `phase1-core` | Phase 1 核心功能开发 |
| `phase2-important` | Phase 2 重要功能开发 |
| `phase3-enhanced` | Phase 3 增强功能开发 |
| `phase4-others` | Phase 4 其他功能开发 |

### 阶段完成后的提交流程

```bash
# 1. 确保测试通过
pnpm test

# 2. 提交到阶段分支
git add .
git commit -m "feat(phaseX): 完成 Phase X 功能开发"
git push origin <phase-branch>

# 3. 合并到 main
git checkout main
git merge <phase-branch>
git push origin main
```

---

## 十二、文档目录结构

```
docs/
├── 00-project-overview.md              # 项目总览
├── phase1-core/                        # 阶段1: 核心功能 (P0)
│   ├── 01-feature-planning/            # 功能规划
│   ├── 02-data-model-design/           # 数据模型设计
│   ├── 03-development-plan/            # 开发计划
│   └── 04-dev-test-log/                # 开发日志
├── phase2-important/                   # 阶段2: 重要功能 (P1)
├── phase3-enhanced/                    # 阶段3: 增强功能 (P2)
└── phase4-others/                      # 阶段4: 其他功能 (P3)
```

---

## 十三、与官方 FastGPT 的关系

本项目是 FastGPT 的**独立后端扩展服务**，不是 FastGPT 的 fork。

| 对比项 | 官方 FastGPT | 本项目 (fastgpt-dev) |
|--------|-------------|---------------------|
| 架构 | Monorepo (pnpm workspace) | 单体 Next.js 应用 |
| packages | 独立 npm 包 | 普通代码目录 + 别名 |
| 功能 | 完整平台（前端+后端+工作流） | 仅 Pro 功能后端 API |
| 部署 | 整体部署 | 可独立部署或集成 |

### 集成方式

本服务作为 FastGPT 的扩展后端，通过以下方式集成：
1. FastGPT 前端调用本服务的 API
2. 共享 MongoDB 数据库
3. 通过 Redis 共享 Session

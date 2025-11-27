# FastGPT 技术栈锁定文档

> 版本: 1.0.0
> 最后更新: 2024-11
> 变更需团队评审

---

## 一、强制使用 (版本号精确到 patch)

### 1.1 运行时环境

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | `>=20.0.0` | 主应用、Sandbox 服务必需 |
| pnpm | `>=9.15.9` | 包管理器，Monorepo 必需 |
| Bun | `latest` | MCP Server 运行时 |

### 1.2 核心框架

| 框架 | 版本 | 用途 |
|------|------|------|
| Next.js | `14.2.32` | 主应用 (前端 + API 路由) |
| React | `18.3.1` | UI 框架 |
| React DOM | `18.3.1` | React 渲染层 |
| TypeScript | `^5.1.3` | 类型系统 |
| NestJS | `^10.4.16` | Sandbox 服务框架 |
| Fastify | `^4.29.1` | Sandbox HTTP 服务 |

### 1.3 前端技术栈

| 库 | 版本 | 用途 |
|---|------|------|
| Chakra UI | `2.10.7` | UI 组件库 |
| @emotion/react | `11.11.1` | CSS-in-JS |
| @emotion/styled | `11.11.0` | 样式组件 |
| framer-motion | `9.1.7` | 动画库 |
| reactflow | `^11.7.4` | 工作流画布 |
| @tanstack/react-query | `^4.24.10` | 数据请求管理 |
| zustand | `^4.3.5` | 状态管理 |
| react-hook-form | `7.43.1` | 表单管理 |
| i18next | `23.16.8` | 国际化核心 |
| next-i18next | `15.4.2` | Next.js 国际化集成 |
| react-i18next | `14.1.2` | React 国际化绑定 |
| ahooks | `^3.9.5` | React Hooks 库 |
| use-context-selector | `^1.4.4` | Context 性能优化 |
| lodash | `^4.17.21` | 工具函数库 |
| dayjs | `^1.11.7` | 日期处理 |
| date-fns | `2.30.0` | 日期处理 (兼容) |

### 1.4 编辑器与渲染

| 库 | 版本 | 用途 |
|---|------|------|
| @monaco-editor/react | `^4.6.0` | 代码编辑器 |
| lexical | `0.12.6` | 富文本编辑器 |
| react-markdown | `^9.0.1` | Markdown 渲染 |
| react-syntax-highlighter | `^15.5.0` | 代码高亮 |
| mermaid | `^10.9.4` | 图表渲染 |
| echarts | `5.4.1` | 数据可视化 |
| recharts | `^2.15.0` | React 图表库 |

### 1.5 后端技术栈

| 库 | 版本 | 用途 |
|---|------|------|
| mongoose | `^8.10.1` | MongoDB ORM |
| pg | `^8.10.0` | PostgreSQL 客户端 |
| @zilliz/milvus2-sdk-node | `2.4.10` | Milvus 向量数据库 |
| ioredis | `^5.6.0` | Redis 客户端 |
| bullmq | `^5.52.2` | 任务队列 |
| axios | `^1.12.1` | HTTP 客户端 |
| jsonwebtoken | `^9.0.2` | JWT 认证 |
| minio | `^8.0.5` | 对象存储 |
| tiktoken | `1.0.17` | Token 计算 |
| zod | `^4.1.12` | 数据校验 |

### 1.6 AI/LLM 相关

| 库 | 版本 | 用途 |
|---|------|------|
| openai | `4.61.0` | OpenAI SDK |
| @modelcontextprotocol/sdk | `^1.12.1` | MCP 协议 |
| @node-rs/jieba | `2.0.1` | 中文分词 |

### 1.7 文档处理

| 库 | 版本 | 用途 |
|---|------|------|
| pdfjs-dist | `4.10.38` | PDF 解析 |
| mammoth | `^1.11.0` | Word 文档解析 |
| node-xlsx | `^0.24.0` | Excel 解析 |
| papaparse | `5.4.1` | CSV 解析 |
| cheerio | `1.0.0-rc.12` | HTML 解析 |
| turndown | `^7.1.2` | HTML 转 Markdown |

### 1.8 可观测性

| 库 | 版本 | 用途 |
|---|------|------|
| winston | `^3.17.0` | 日志框架 |
| pino | `^9.7.0` | 高性能日志 |
| @opentelemetry/api | `^1.9.0` | OpenTelemetry |
| @vercel/otel | `^1.13.0` | Vercel OTEL 集成 |

### 1.9 开发工具

| 工具 | 版本 | 用途 |
|------|------|------|
| ESLint | `^8.57.0` | 代码检查 |
| Prettier | `3.2.4` | 代码格式化 |
| Vitest | `^3.0.9` | 单元测试框架 |
| Jest | `^29.5.0` | Sandbox 测试框架 |
| Husky | `^8.0.3` | Git Hooks |
| lint-staged | `^13.3.0` | 暂存区检查 |

---

## 二、数据库要求

| 数据库 | 用途 | 说明 |
|--------|------|------|
| MongoDB | 主数据存储 | 应用数据、用户数据、工作流配置 |
| PostgreSQL + pgvector | 向量存储 | 知识库向量索引 (可选方案1) |
| Milvus | 向量存储 | 知识库向量索引 (可选方案2) |
| Redis | 缓存/队列 | Session、任务队列、限流 |

---

## 三、明确禁止

### 3.1 禁止引入的技术

| 类别 | 禁止项 | 理由 |
|------|--------|------|
| UI 框架 | Ant Design, Material UI, Tailwind CSS | 已使用 Chakra UI，保持统一 |
| 状态管理 | Redux, MobX, Jotai, Recoil | 已使用 Zustand + Context |
| CSS 方案 | CSS Modules, Styled Components | 已使用 Emotion |
| 数据请求 | SWR, Apollo Client | 已使用 React Query |
| 表单库 | Formik | 已使用 react-hook-form |
| 日期库 | Moment.js | 已废弃，使用 dayjs/date-fns |
| ORM | Prisma, TypeORM, Sequelize | MongoDB 使用 Mongoose |
| 运行时 | Deno | 使用 Node.js / Bun |

### 3.2 禁止的代码模式

| 模式 | 说明 |
|------|------|
| `any` 类型滥用 | 必须提供明确类型，必要时使用 `unknown` |
| `interface` 声明 | 优先使用 `type` 进行类型声明 |
| 默认导出组件 | 统一使用命名导出 |
| Class 组件 | 使用函数组件 + Hooks |
| 直接修改 State | 使用 Immer 或返回新对象 |

---

## 四、资源配置预算

### 4.1 开发环境

| 资源 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 4 核 | 8 核 |
| 内存 | 8 GB | 16 GB |
| 存储 | 20 GB SSD | 50 GB SSD |

### 4.2 生产环境 (单节点最低)

| 服务 | CPU | 内存 | 存储 |
|------|-----|------|------|
| FastGPT App | 2 核 | 4 GB | - |
| Sandbox | 1 核 | 1 GB | - |
| MongoDB | 2 核 | 4 GB | 50 GB |
| PostgreSQL/Milvus | 2 核 | 4 GB | 50 GB |
| Redis | 1 核 | 1 GB | 10 GB |

---

## 五、环境要求

### 5.1 Node.js 版本

```
>=20.0.0
```

### 5.2 浏览器支持

| 浏览器 | 版本 |
|--------|------|
| Chrome | 最新 2 个主版本 |
| Firefox | 最新 2 个主版本 |
| Safari | 最新 2 个主版本 |
| Edge | 最新 2 个主版本 |
| IE | 不支持 |

### 5.3 TypeScript 配置

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "jsx": "preserve"
  }
}
```

### 5.4 代码格式规范 (Prettier)

```javascript
{
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'none',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf'
}
```

### 5.5 ESLint 规则

- 基于 `next/core-web-vitals`
- 强制类型导入: `@typescript-eslint/consistent-type-imports`
- 忽略目录: `node_modules/`, `dist/`, `build/`, `coverage/`

---

## 六、Monorepo 包结构

```
packages/
├── @fastgpt/global    # 共享类型、常量、工具函数
├── @fastgpt/service   # 后端服务、数据库模型、工作流引擎
└── @fastgpt/web       # 前端组件、hooks、国际化

projects/
├── app/               # 主 NextJS 应用 (Next.js 14)
├── sandbox/           # 代码执行沙箱 (NestJS 10)
└── mcp_server/        # MCP 服务器 (Bun)
```

---

## 七、版本更新策略

| 依赖类型 | 更新频率 | 审批要求 |
|----------|----------|----------|
| 安全补丁 | 立即 | 技术负责人 |
| 小版本 (patch) | 每周 | PR Review |
| 中版本 (minor) | 每月评估 | 团队讨论 |
| 大版本 (major) | 谨慎评估 | 全员评审 + 测试 |

---

## 八、变更记录

| 日期 | 版本 | 变更内容 | 负责人 |
|------|------|----------|--------|
| 2024-11 | 1.0.0 | 初始版本 | - |

---

> **注意**: 本文档由团队共同维护，任何技术栈变更需提交 PR 并经过团队评审。

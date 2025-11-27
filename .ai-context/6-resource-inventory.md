# FastGPT 资源清单

> 版本: 1.0.0
> 最后更新: 2024-11
> 变更需团队评审

---

## 一、设计资源

### 1.1 UI/UX 设计

| 资源 | 说明 | 访问方式 |
|------|------|----------|
| Logo | 项目 Logo 和品牌素材 | `/.github/imgs/logo.svg` |
| 截图素材 | 产品截图 | `/.github/imgs/intro*.png` |
| 图标库 | 自定义 SVG 图标 | `packages/web/components/common/Icon/` |

### 1.2 主题与样式

| 资源 | 路径 | 说明 |
|------|------|------|
| Chakra UI 主题 | `packages/web/styles/theme.ts` | 全局主题配置 |
| 颜色变量 | `packages/web/styles/theme.ts` | 品牌色、语义色 |
| 组件样式 | `packages/web/components/` | 共享 UI 组件 |

---

## 二、API 文档

### 2.1 OpenAPI 规范

| 资源 | 路径/地址 | 说明 |
|------|-----------|------|
| OpenAPI 定义 | `packages/global/openapi/` | API 契约定义 |
| API 路由 | `projects/app/src/pages/api/` | NextJS API 路由 |
| API 类型 | `packages/global/openapi/type.ts` | 请求/响应类型 |

### 2.2 官方 API 文档

| 文档 | 地址 | 说明 |
|------|------|------|
| OpenAPI 介绍 | https://doc.fastgpt.io/docs/introduction/development/openapi/intro | API 接入指南 |
| 对话 API | https://doc.fastgpt.io/docs/introduction/development/openapi/chat | Chat Completions |
| 知识库 API | https://doc.fastgpt.io/docs/introduction/development/openapi/dataset | 知识库管理 |
| 应用 API | https://doc.fastgpt.io/docs/introduction/development/openapi/app | 应用管理 |
| 分享 API | https://doc.fastgpt.io/docs/introduction/development/openapi/share | 分享链接管理 |

### 2.3 内部 API 结构

```
packages/global/openapi/
├── api.ts                    # 通用 API 定义
├── index.ts                  # 导出入口
├── tag.ts                    # API 标签定义
├── type.ts                   # 类型定义
├── core/
│   ├── chat/                 # 对话相关 API
│   │   ├── index.ts
│   │   ├── setting/
│   │   └── favourite/
│   └── plugin/               # 插件相关 API
│       ├── admin/
│       ├── marketplace/
│       ├── team/
│       └── toolTag/
└── support/
    └── openapi/              # OpenAPI 支持
```

---

## 三、开发环境

### 3.1 本地开发 Docker 服务

执行命令: `cd deploy/dev && docker-compose up -d`

| 服务 | 端口 | 镜像 | 说明 |
|------|------|------|------|
| PostgreSQL (pgvector) | 5432 | `pgvector/pgvector:0.8.0-pg15` | 向量数据库 |
| MongoDB | 27017 | `mongo:5.0.18` | 主数据库 (副本集) |
| Redis | 6379 | `redis:7.2-alpine` | 缓存/队列 |
| MinIO | 9000/9001 | `minio/minio:RELEASE.2025-09-07T16-13-09Z` | 对象存储 |
| Sandbox | 3002 | `ghcr.io/labring/fastgpt-sandbox:v4.14.2` | 代码执行沙箱 |
| MCP Server | 3005 | `ghcr.io/labring/fastgpt-mcp_server:v4.14.2` | MCP 服务 |
| Plugin | 3003 | `ghcr.io/labring/fastgpt-plugin:v0.3.2` | 插件服务 |
| AI Proxy | 3010 | `ghcr.io/labring/aiproxy:v0.3.2` | 模型代理 |
| AI Proxy PG | - | `pgvector/pgvector:0.8.0-pg15` | AI Proxy 数据库 |

### 3.2 默认连接信息

| 服务 | 连接字符串 | 默认账号 |
|------|-----------|----------|
| MongoDB | `mongodb://myusername:mypassword@localhost:27017/fastgpt?authSource=admin&directConnection=true` | myusername / mypassword |
| PostgreSQL | `postgresql://username:password@localhost:5432/postgres` | username / password |
| Redis | `redis://default:mypassword@127.0.0.1:6379` | default / mypassword |
| MinIO | `http://localhost:9000` | minioadmin / minioadmin |
| MinIO Console | `http://localhost:9001` | minioadmin / minioadmin |

### 3.3 环境变量模板

| 文件 | 路径 | 说明 |
|------|------|------|
| 主应用 | `projects/app/.env.template` | FastGPT 主应用配置 |
| MCP Server | `projects/mcp_server/.env.template` | MCP 服务配置 |
| Marketplace | `projects/marketplace/.env.template` | 市场服务配置 |
| 文档站 | `document/.env.template` | 文档站配置 |

---

## 四、部署资源

### 4.1 Docker Compose 配置

| 方案 | 路径 | 说明 |
|------|------|------|
| 开发环境 | `deploy/dev/docker-compose.yml` | 本地开发 (国际) |
| 开发环境 (国内) | `deploy/dev/docker-compose.cn.yml` | 本地开发 (国内镜像) |
| 生产环境 (PG) | `deploy/docker/global/docker-compose.pg.yml` | pgvector 向量库 |
| 生产环境 (Milvus) | `deploy/docker/global/docker-compose.milvus.yml` | Milvus 向量库 |
| 生产环境 (Zilliz) | `deploy/docker/global/docker-compose.ziliiz.yml` | Zilliz Cloud |
| 生产环境 (OceanBase) | `deploy/docker/global/docker-compose.oceanbase.yml` | OceanBase 向量库 |

### 4.2 Dockerfile

| 服务 | 路径 | 说明 |
|------|------|------|
| FastGPT App | `projects/app/Dockerfile` | 主应用 |
| Sandbox | `projects/sandbox/Dockerfile` | 代码沙箱 |
| MCP Server | `projects/mcp_server/Dockerfile` | MCP 服务 |
| Marketplace | `projects/marketplace/Dockerfile` | 市场服务 |
| Document | `document/Dockerfile` | 文档站 |

### 4.3 Helm Chart

| 资源 | 路径 | 说明 |
|------|------|------|
| Helm 模板 | `deploy/helm/` | Kubernetes 部署 |

### 4.4 容器镜像仓库

| 镜像 | 地址 | 说明 |
|------|------|------|
| FastGPT | `ghcr.io/labring/fastgpt` | 主应用镜像 |
| Sandbox | `ghcr.io/labring/fastgpt-sandbox` | 沙箱镜像 |
| MCP Server | `ghcr.io/labring/fastgpt-mcp_server` | MCP 服务镜像 |
| Plugin | `ghcr.io/labring/fastgpt-plugin` | 插件服务镜像 |
| AI Proxy | `ghcr.io/labring/aiproxy` | 模型代理镜像 |

---

## 五、插件资源

### 5.1 模型插件

| 插件 | 路径 | 说明 |
|------|------|------|
| OCR (Surya) | `plugins/model/ocr-surya/` | OCR 识别服务 |
| PDF Marker | `plugins/model/pdf-marker/` | PDF 解析服务 |
| Rerank BGE | `plugins/model/rerank-bge/` | 重排序模型 |
| STT SenseVoice | `plugins/model/stt-sensevoice/` | 语音转文字 |
| TTS CosyVoice | `plugins/model/tts-cosevoice/` | 文字转语音 |

### 5.2 爬虫插件

| 插件 | 路径 | 说明 |
|------|------|------|
| Web Crawler | `plugins/webcrawler/` | 网页爬取服务 |

---

## 六、官方文档

### 6.1 用户文档

| 文档 | 地址 | 说明 |
|------|------|------|
| 官方文档首页 | https://doc.fastgpt.io/docs/introduction | 产品介绍 |
| 云服务 | https://doc.fastgpt.io/docs/introduction/cloud | 在线版使用 |
| 商业版 | https://doc.fastgpt.io/docs/introduction/commercial | 商业授权 |

### 6.2 开发文档

| 文档 | 地址 | 说明 |
|------|------|------|
| 开发指南 | https://doc.fastgpt.io/docs/introduction/development/intro | 开发入门 |
| 快速开始 | https://doc.fastgpt.io/docs/introduction/development/quick-start | 本地启动 |
| Docker 部署 | https://doc.fastgpt.io/docs/introduction/development/docker | Docker 部署 |
| Sealos 部署 | https://doc.fastgpt.io/docs/introduction/development/sealos | Sealos 一键部署 |
| 系统配置 | https://doc.fastgpt.io/docs/introduction/development/configuration | 配置说明 |

### 6.3 模型配置

| 文档 | 地址 | 说明 |
|------|------|------|
| 模型配置介绍 | https://doc.fastgpt.io/docs/introduction/development/modelConfig/intro | 模型接入概述 |
| AI Proxy | https://doc.fastgpt.io/docs/introduction/development/modelConfig/ai-proxy | AI Proxy 配置 |
| One API | https://doc.fastgpt.io/docs/introduction/development/modelConfig/one-api | One API 对接 |
| Ollama | https://doc.fastgpt.io/docs/introduction/development/custom-models/ollama | 本地 Ollama |
| Xinference | https://doc.fastgpt.io/docs/introduction/development/custom-models/xinference | Xinference 部署 |

### 6.4 功能指南

| 文档 | 地址 | 说明 |
|------|------|------|
| 工作流概述 | https://doc.fastgpt.io/docs/introduction/guide/dashboard/intro | 工作流入门 |
| AI 对话节点 | https://doc.fastgpt.io/docs/introduction/guide/dashboard/workflow/ai_chat | AI 对话 |
| 知识库搜索 | https://doc.fastgpt.io/docs/introduction/guide/dashboard/workflow/dataset_search | 知识库检索 |
| HTTP 请求 | https://doc.fastgpt.io/docs/introduction/guide/dashboard/workflow/http | HTTP 节点 |
| 代码沙箱 | https://doc.fastgpt.io/docs/introduction/guide/dashboard/workflow/sandbox | 代码执行 |
| MCP Server | https://doc.fastgpt.io/docs/introduction/guide/dashboard/mcp_server | MCP 服务 |
| MCP 工具 | https://doc.fastgpt.io/docs/introduction/guide/dashboard/mcp_tools | MCP 工具使用 |

### 6.5 知识库

| 文档 | 地址 | 说明 |
|------|------|------|
| RAG 介绍 | https://doc.fastgpt.io/docs/introduction/guide/knowledge_base/RAG | RAG 原理 |
| 数据集引擎 | https://doc.fastgpt.io/docs/introduction/guide/knowledge_base/dataset_engine | 索引引擎 |
| API 数据集 | https://doc.fastgpt.io/docs/introduction/guide/knowledge_base/api_dataset | 外部数据源 |
| 模板知识库 | https://doc.fastgpt.io/docs/introduction/guide/knowledge_base/template | 模板使用 |

---

## 七、在线服务

### 7.1 官方服务

| 服务 | 地址 | 说明 |
|------|------|------|
| FastGPT 国际版 | https://fastgpt.io/ | 在线 SaaS |
| 插件市场 | https://marketplace.fastgpt.cn | 官方插件市场 |
| 官方文档 | https://doc.fastgpt.io/ | 文档站 |

### 7.2 代码仓库

| 仓库 | 地址 | 说明 |
|------|------|------|
| GitHub | https://github.com/labring/FastGPT | 主仓库 |
| Issues | https://github.com/labring/FastGPT/issues | 问题反馈 |
| Releases | https://github.com/labring/FastGPT/releases | 版本发布 |

---

## 八、监控与可观测

### 8.1 日志系统

| 配置 | 环境变量 | 说明 |
|------|----------|------|
| 日志等级 | `LOG_LEVEL` | debug / info / warn / error |
| 存储日志等级 | `STORE_LOG_LEVEL` | 数据库操作日志 |
| 日志深度 | `LOG_DEPTH` | 日志层级深度 |

### 8.2 可观测性

| 服务 | 环境变量 | 说明 |
|------|----------|------|
| Signoz URL | `SIGNOZ_BASE_URL` | Signoz 服务地址 |
| 服务名称 | `SIGNOZ_SERVICE_NAME` | 上报服务名 |
| 日志等级 | `SIGNOZ_STORE_LEVEL` | Signoz 日志等级 |

### 8.3 相关文档

| 文档 | 地址 | 说明 |
|------|------|------|
| Signoz 集成 | https://doc.fastgpt.io/docs/introduction/development/signoz | 可观测性配置 |

---

## 九、测试资源

### 9.1 测试框架

| 框架 | 配置文件 | 说明 |
|------|----------|------|
| Vitest | `vitest.config.mts` | 主应用测试 |
| Jest | `projects/sandbox/package.json` | Sandbox 测试 |

### 9.2 测试目录

| 目录 | 路径 | 说明 |
|------|------|------|
| 主测试用例 | `test/cases/` | 核心功能测试 |
| App 测试 | `projects/app/test/` | 应用层测试 |
| Sandbox 测试 | `projects/sandbox/test/` | 沙箱测试 |

### 9.3 测试命令

```bash
pnpm test                    # 运行所有测试
pnpm test:workflow           # 仅运行工作流测试
npx vitest run test/cases/xxx.test.ts  # 运行单个测试
```

---

## 十、国际化资源

### 10.1 语言支持

| 语言 | 代码 | 状态 |
|------|------|------|
| 简体中文 | zh | 完整 |
| English | en | 完整 |
| 日本語 | ja | 完整 |

### 10.2 资源文件

| 资源 | 路径 | 说明 |
|------|------|------|
| i18n 配置 | `packages/web/i18n/` | 国际化资源 |
| 翻译生成 | `pnpm create:i18n` | 自动生成翻译 |

---

## 十一、安全配置

### 11.1 关键密钥 (需自行生成)

| 配置 | 环境变量 | 说明 |
|------|----------|------|
| Token 密钥 | `TOKEN_KEY` | JWT 签名密钥 |
| 文件 Token | `FILE_TOKEN_KEY` | 文件访问密钥 |
| AES 密钥 | `AES256_SECRET_KEY` | 加密密钥 |
| Root Key | `ROOT_KEY` | 最高权限密钥 |

### 11.2 安全配置

| 配置 | 环境变量 | 说明 |
|------|----------|------|
| IP 限流 | `USE_IP_LIMIT` | 启用 IP 限流 |
| 内网检查 | `CHECK_INTERNAL_IP` | 内网 IP 检测 |
| 密码锁定 | `PASSWORD_LOGIN_LOCK_SECONDS` | 密码错误锁定时长 |
| 密码过期 | `PASSWORD_EXPIRED_MONTH` | 密码过期月份 |
| 最大会话 | `MAX_LOGIN_SESSION` | 最大登录客户端数 |
| 跨域配置 | `ALLOWED_ORIGINS` | 允许的跨域来源 |

---

## 十二、变更记录

| 日期 | 版本 | 变更内容 | 负责人 |
|------|------|----------|--------|
| 2024-11 | 1.0.0 | 初始版本 | - |

---

> **注意**:
> 1. 本文档由团队共同维护，资源变更需同步更新
> 2. 敏感信息 (密钥、密码) 请勿提交到代码仓库
> 3. 测试环境账号仅供开发使用，生产环境需重新配置

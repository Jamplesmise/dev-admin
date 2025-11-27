# 5-initialization-actions.md

> 初始化清单 - 开发环境准备、首次运行验证、开发者账号配置

---

## 1. 环境要求

### 1.1 系统要求

| 组件 | 最低版本 | 推荐版本 | 备注 |
|------|----------|----------|------|
| **Node.js** | 20.0.0 | 20.x LTS | 使用 nvm 管理版本 |
| **pnpm** | 9.0.0 | 9.15.x | 必须使用 pnpm |
| **MongoDB** | 5.0 | 5.0.18 | 需要副本集模式 |
| **PostgreSQL** | 15 | 15 + pgvector 0.8.0 | 向量存储 |
| **Redis** | 7.0 | 7.2 | 缓存与会话 |
| **MinIO** | - | 最新版 | S3 兼容存储 |

### 1.2 可选组件

| 组件 | 用途 | 备注 |
|------|------|------|
| **Milvus** | 替代 PostgreSQL 作为向量库 | 大规模场景 |
| **OceanBase** | 替代 PostgreSQL 作为向量库 | 国产化场景 |
| **Docker** | 容器化部署 | 推荐使用 |
| **Bun** | MCP Server 运行时 | 仅 mcp_server 项目需要 |

---

## 2. 快速开始 (Docker 方式)

### 2.1 一键启动所有依赖服务

```bash
# 克隆仓库
git clone https://github.com/labring/FastGPT.git
cd FastGPT

# 启动基础设施 (MongoDB + PostgreSQL + Redis + MinIO)
cd deploy/docker/global
docker-compose -f docker-compose.pg.yml up -d mongo redis vectorDB fastgpt-minio

# 等待服务启动 (约 30 秒)
sleep 30

# 验证服务状态
docker-compose -f docker-compose.pg.yml ps
```

### 2.2 验证基础设施

```bash
# MongoDB (应返回 pong)
docker exec mongo mongo -u myusername -p mypassword --authenticationDatabase admin --eval "db.runCommand('ping')"

# PostgreSQL (应返回 accepting connections)
docker exec pg pg_isready -U username -d postgres

# Redis (应返回 PONG)
docker exec redis redis-cli -a mypassword ping

# MinIO (访问控制台)
# 浏览器打开: http://localhost:9001
# 账号: minioadmin / minioadmin
```

---

## 3. 本地开发环境配置

### 3.1 安装依赖

```bash
# 确保在项目根目录
cd /path/to/FastGPT

# 安装所有依赖 (会自动执行 postinstall 脚本)
pnpm install

# 如果 Chakra UI 类型生成失败，手动执行
pnpm gen:theme-typings
```

### 3.2 配置环境变量

```bash
# 复制环境变量模板
cp projects/app/.env.template projects/app/.env.local

# 编辑配置文件
vim projects/app/.env.local
```

### 3.3 必填环境变量

```bash
# ===== 数据库连接 =====
MONGODB_URI="mongodb://myusername:mypassword@localhost:27017/fastgpt?authSource=admin&directConnection=true"
PG_URL=postgresql://username:password@localhost:5432/postgres
REDIS_URL=redis://default:mypassword@127.0.0.1:6379

# ===== 安全密钥 (生产环境必须修改) =====
DEFAULT_ROOT_PSW=123456          # root 用户密码
TOKEN_KEY=fastgpt                # JWT 密钥
FILE_TOKEN_KEY=filetokenkey      # 文件访问密钥
AES256_SECRET_KEY=fastgptsecret  # 加密密钥
ROOT_KEY=fdafasd                 # 管理员 API 密钥

# ===== S3 存储 =====
S3_ENDPOINT=localhost
S3_PORT=9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_PUBLIC_BUCKET=fastgpt-public
S3_PRIVATE_BUCKET=fastgpt-private

# ===== 服务地址 =====
SANDBOX_URL=http://localhost:3002
FE_DOMAIN=http://localhost:3000
```

### 3.4 可选环境变量

```bash
# ===== AI 模型配置 (二选一) =====
# 方式1: 直接配置 OpenAI
OPENAI_BASE_URL=https://api.openai.com/v1
CHAT_API_KEY=sk-xxxx

# 方式2: 使用 AI Proxy (推荐)
AIPROXY_API_ENDPOINT=http://localhost:3010
AIPROXY_API_TOKEN=aiproxy

# ===== 向量库 (按优先级，配置一个即可) =====
# PostgreSQL (默认)
PG_URL=postgresql://username:password@localhost:5432/postgres

# 或 OceanBase
# OCEANBASE_URL=xxx

# 或 Milvus
# MILVUS_ADDRESS=localhost:19530
# MILVUS_TOKEN=xxx

# ===== 日志配置 =====
LOG_LEVEL=debug                  # debug, info, warn, error
STORE_LOG_LEVEL=warn

# ===== 安全限制 =====
USE_IP_LIMIT=false               # IP 限流
WORKFLOW_MAX_RUN_TIMES=500       # 工作流最大执行次数
WORKFLOW_MAX_LOOP_TIMES=50       # 循环最大次数
```

---

## 4. 启动开发服务器

### 4.1 启动主应用

```bash
# 方式1: 从根目录启动
pnpm dev

# 方式2: 单独启动主应用
cd projects/app && pnpm dev

# 访问地址: http://localhost:3000
# 默认账号: root / 123456 (取决于 DEFAULT_ROOT_PSW)
```

### 4.2 启动沙箱服务 (可选)

```bash
# 新开终端
cd projects/sandbox && pnpm dev

# 沙箱服务端口: 3002
```

### 4.3 启动 MCP Server (可选)

```bash
# 需要先安装 Bun
curl -fsSL https://bun.sh/install | bash

# 新开终端
cd projects/mcp_server && bun dev

# MCP Server 端口: 3005
```

---

## 5. 首次运行验证

### 5.1 健康检查清单

| 检查项 | 验证方法 | 预期结果 |
|--------|----------|----------|
| **首页加载** | 访问 `http://localhost:3000` | 显示登录页面 |
| **登录功能** | 使用 root 账号登录 | 成功进入工作台 |
| **创建应用** | 点击创建应用按钮 | 应用创建成功 |
| **知识库** | 创建知识库并上传文件 | 文件解析成功 |
| **对话测试** | 在应用中发起对话 | AI 正常响应 |

### 5.2 常见问题排查

```bash
# 问题1: MongoDB 连接失败
# 检查副本集是否初始化
docker exec mongo mongo -u myusername -p mypassword --authenticationDatabase admin --eval "rs.status()"

# 问题2: 向量化失败
# 检查 PostgreSQL pgvector 扩展
docker exec pg psql -U username -d postgres -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# 问题3: 文件上传失败
# 检查 MinIO 桶是否创建
# 访问 http://localhost:9001 手动创建 fastgpt-public 和 fastgpt-private 桶

# 问题4: AI 调用失败
# 检查 API Key 配置
curl -X POST http://localhost:3000/api/core/ai/model/test \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-3.5-turbo"}'
```

---

## 6. 测试环境配置

### 6.1 运行测试

```bash
# 运行所有测试 (使用内存 MongoDB)
pnpm test

# 运行单个测试文件
npx vitest run test/cases/xxx.test.ts

# 运行工作流测试
pnpm test:workflow

# 监视模式
npx vitest --watch
```

### 6.2 测试环境特殊配置

测试使用 `mongodb-memory-server` 作为内存数据库，无需配置真实数据库。

如果需要测试 AI 调用，创建 `projects/app/.env.local`:

```bash
# 测试时的 AI 配置
OPENAI_BASE_URL=https://api.openai.com/v1
CHAT_API_KEY=sk-xxxx
```

---

## 7. IDE 配置推荐

### 7.1 VS Code 推荐扩展

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "mongodb.mongodb-vscode"
  ]
}
```

### 7.2 VS Code 工作区设置

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## 8. Docker 完整部署

### 8.1 生产环境部署

```bash
cd deploy/docker/global

# 编辑配置 (修改密码和密钥)
vim docker-compose.pg.yml

# 启动所有服务
docker-compose -f docker-compose.pg.yml up -d

# 查看日志
docker-compose -f docker-compose.pg.yml logs -f fastgpt
```

### 8.2 服务端口映射

| 服务 | 内部端口 | 外部端口 | 说明 |
|------|----------|----------|------|
| FastGPT | 3000 | 3000 | 主应用 |
| Sandbox | 3000 | - | 内部服务 |
| MCP Server | 3000 | 3005 | MCP 协议 |
| MinIO Console | 9001 | 9001 | 存储管理 |
| MinIO API | 9000 | 9000 | S3 API |
| MongoDB | 27017 | - | 内部服务 |
| PostgreSQL | 5432 | - | 内部服务 |
| Redis | 6379 | - | 内部服务 |

---

## 9. 初始化脚本清单

### 9.1 数据库迁移脚本

升级版本时可能需要执行迁移脚本：

```bash
# 迁移脚本位置
projects/app/src/pages/api/admin/

# 调用方式 (需要 ROOT_KEY)
curl -X POST http://localhost:3000/api/admin/initv4141 \
  -H "rootkey: your_root_key"
```

### 9.2 常用初始化命令

```bash
# 生成国际化文件
pnpm create:i18n

# 初始化图标
pnpm initIcon

# 生成 Chakra UI 主题类型
pnpm gen:theme-typings

# 生成 OpenAPI 文档
pnpm api:gen
```

---

## 10. 文档更新记录

| 日期 | 版本 | 更新内容 | 更新人 |
|------|------|----------|--------|
| 2025-01-23 | 1.0 | 初始版本 | AI Assistant |

---

## 附录：快速检查脚本

```bash
#!/bin/bash
# check-env.sh - 开发环境检查脚本

echo "=== FastGPT 开发环境检查 ==="

# Node.js 版本
echo -n "Node.js: "
node -v

# pnpm 版本
echo -n "pnpm: "
pnpm -v

# MongoDB 连接
echo -n "MongoDB: "
mongo --eval "db.runCommand('ping')" 2>/dev/null && echo "OK" || echo "FAILED"

# PostgreSQL 连接
echo -n "PostgreSQL: "
pg_isready -h localhost -p 5432 && echo "OK" || echo "FAILED"

# Redis 连接
echo -n "Redis: "
redis-cli ping 2>/dev/null && echo "OK" || echo "FAILED"

# 环境变量文件
echo -n ".env.local: "
[ -f "projects/app/.env.local" ] && echo "EXISTS" || echo "MISSING"

echo "=== 检查完成 ==="
```

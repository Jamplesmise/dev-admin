# FastGPT Pro 后端部署指南

> 版本: v1.0
> 更新时间: 2025-11-25
> 目标: 在本地服务器部署测试环境

---

## 📋 部署前检查清单

### 当前代码状态

| 项目 | 状态 | 说明 |
|------|------|------|
| **测试通过率** | ✅ 100% (232/232) | 所有功能测试通过 |
| **代码质量** | ✅ 无错误 | ESLint + TypeScript 检查通过 |
| **Bug 数量** | ✅ 0 个 P0/P1 | 无阻塞性问题 |
| **API 完成度** | 🟢 90.6% (48/53) | 核心功能完整 |
| **文档完整性** | ✅ 完整 | 全部文档齐全 |

### 需要提交的代码

⚠️ **重要**: 在部署前，需要先提交最新修复到 Git

---

## 🚀 部署步骤

### Step 1: 提交代码到 Git

#### 1.1 查看当前修改

```bash
cd /home/sinocare/dev/fastgpt-dev
git status
```

#### 1.2 提交修复代码

```bash
# 添加所有修改
git add .

# 创建提交（包含详细信息）
git commit -m "$(cat <<'EOF'
fix(phase3-4): 完成测试修复，所有232个测试通过

修复内容:
- 工单系统: Controller返回完整数据，attachments字段升级
- 模型协作者: 修正测试用例数据格式
- 发票系统: 修正字段名对齐
- Phase 3: 完成聊天设置和评估系统测试

测试结果:
- Phase 1: 69/69 ✅
- Phase 2: 94/94 ✅
- Phase 3: 38/38 ✅
- Phase 4: 45/45 ✅
- 总计: 232/232 (100%)

详见: docs/phase4-others/07-test-fix-report.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# 查看提交
git log -1 --stat
```

#### 1.3 推送到远程仓库（如果需要）

```bash
# 推送到当前分支
git push origin phase3-enhanced

# 或合并到主分支（如果测试完成）
git checkout main
git merge phase3-enhanced
git push origin main
```

---

### Step 2: 准备部署服务器

#### 2.1 服务器环境要求

| 组件 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| **Node.js** | 20.x | 20.x LTS | 必须 ≥ 20 |
| **pnpm** | 9.15+ | latest | 包管理器 |
| **MongoDB** | 6.x | 6.x | 主数据库 |
| **PostgreSQL** | 14.x | 15.x | 向量数据库（可选） |
| **Redis** | 6.x | 7.x | 缓存/队列 |
| **Docker** | 20.x+ | latest | 容器运行（推荐） |

#### 2.2 检查服务器环境

```bash
# 在部署服务器上执行
node --version   # 应该 >= v20.x.x
pnpm --version   # 应该 >= 9.15.x
docker --version # 应该 >= 20.x.x
```

#### 2.3 安装必要工具（如果缺少）

```bash
# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
npm install -g pnpm@latest

# 安装 Docker（如果使用容器）
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

---

### Step 3: 克隆代码到部署服务器

#### 3.1 克隆仓库

```bash
# 在部署服务器上执行
cd /path/to/your/projects
git clone <your-repo-url> fastgpt-pro-backend
cd fastgpt-pro-backend

# 切换到正确的分支
git checkout phase3-enhanced
# 或
git checkout main
```

#### 3.2 验证代码完整性

```bash
# 查看最新提交
git log -1

# 验证文件完整性
ls -la src/packages/service/support/workorder/
ls -la docs/phase4-others/
```

---

### Step 4: 启动基础设施服务

#### 4.1 使用 Docker Compose（推荐）

```bash
cd deploy/docker/global

# 启动 MongoDB, Redis, PostgreSQL, MinIO
docker-compose -f docker-compose.pg.yml up -d mongo redis vectorDB fastgpt-minio

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 4.2 等待服务就绪

```bash
# 等待 MongoDB 启动（约 10-30 秒）
docker-compose logs mongo | grep "Waiting for connections"

# 等待 Redis 启动
docker-compose logs redis | grep "Ready to accept connections"

# 验证服务可访问
docker exec -it mongo mongosh --eval "db.adminCommand('ping')"
docker exec -it redis redis-cli ping
```

#### 4.3 服务连接信息

| 服务 | 地址 | 默认账号 | 默认密码 |
|------|------|----------|----------|
| **MongoDB** | `localhost:27017` | myusername | mypassword |
| **Redis** | `localhost:6379` | default | mypassword |
| **PostgreSQL** | `localhost:5432` | username | password |
| **MinIO** | `localhost:9001` | minioadmin | minioadmin |

---

### Step 5: 配置环境变量

#### 5.1 创建环境配置文件

```bash
cd projects/app

# 从模板创建配置
cp .env.template .env.local

# 编辑配置
vim .env.local
# 或
nano .env.local
```

#### 5.2 必填环境变量

```bash
# ========== 数据库配置 ==========
MONGODB_URI="mongodb://myusername:mypassword@localhost:27017/fastgpt?authSource=admin"
PG_URL="postgresql://username:password@localhost:5432/postgres"

# ========== Redis 配置 ==========
REDIS_URL="redis://default:mypassword@127.0.0.1:6379"

# ========== 安全配置 ==========
DEFAULT_ROOT_PSW="your-secure-password-here"  # 修改为强密码
TOKEN_KEY="your-random-token-key-here"        # 修改为随机字符串

# ========== 服务地址 ==========
SANDBOX_URL="http://localhost:3002"

# ========== 可选: MinIO (文件存储) ==========
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL="false"
MINIO_BUCKET_NAME="fastgpt"
```

#### 5.3 生成安全密钥

```bash
# 生成随机 TOKEN_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成随机 ROOT_PSW
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

---

### Step 6: 安装依赖

```bash
# 在项目根目录执行
cd /path/to/fastgpt-pro-backend

# 安装所有依赖（monorepo）
pnpm install

# 验证安装
pnpm list --depth=0
```

**预期输出**:
```
fastgpt-pro-backend
├── @fastgpt/global
├── @fastgpt/service
├── @fastgpt/web
└── ... (其他依赖)
```

---

### Step 7: 构建项目

```bash
# 构建所有包
pnpm build

# 验证构建产物
ls -la projects/app/.next/
ls -la projects/sandbox/dist/
```

**预期输出**:
```
projects/app/.next/
├── cache/
├── server/
├── static/
└── BUILD_ID

projects/sandbox/dist/
├── main.js
└── (其他编译文件)
```

---

### Step 8: 运行测试（可选但推荐）

#### 8.1 在部署服务器上运行测试

```bash
# 运行所有测试
pnpm test

# 或仅运行 API 测试
npx vitest run test/api/
```

**预期结果**:
```
✅ Test Files  14 passed (14)
✅ Tests      232 passed (232)
⏱️ Duration    ~15-20s
```

#### 8.2 如果测试失败

```bash
# 检查数据库连接
npx vitest run test/api/phase1/ --reporter=verbose

# 查看详细错误
npx vitest run test/api/ --reporter=verbose 2>&1 | tee test-output.log
```

---

### Step 9: 启动应用

#### 9.1 启动主应用（开发模式）

```bash
# 在终端 1: 启动主应用
cd projects/app
pnpm dev
```

**预期输出**:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
event - compiled client and server successfully
```

#### 9.2 启动 Sandbox 服务（开发模式）

```bash
# 在终端 2: 启动沙箱服务
cd projects/sandbox
pnpm dev
```

**预期输出**:
```
[Nest] 12345  - 2025/11/25 14:00:00     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 2025/11/25 14:00:00     LOG [InstanceLoader] SandboxModule dependencies initialized
[Nest] 12345  - 2025/11/25 14:00:00     LOG [NestApplication] Nest application successfully started
[Nest] 12345  - 2025/11/25 14:00:00     LOG Application is running on: http://localhost:3002
```

#### 9.3 使用 PM2 启动（生产模式）

```bash
# 安装 PM2
pnpm add -g pm2

# 构建项目
pnpm build

# 启动主应用
cd projects/app
pm2 start npm --name "fastgpt-app" -- start

# 启动 Sandbox
cd ../sandbox
pm2 start dist/main.js --name "fastgpt-sandbox"

# 查看状态
pm2 status
pm2 logs
```

---

### Step 10: 验证部署

#### 10.1 健康检查

```bash
# 检查主应用
curl http://localhost:3000/api/health
# 预期: {"status":"ok"}

# 检查 Sandbox
curl http://localhost:3002/health
# 预期: {"status":"ok"}
```

#### 10.2 测试 API 接口

```bash
# 测试推广系统 API（需要认证）
curl -X GET http://localhost:3000/api/support/activity/promotion/getPromotionData \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### 10.3 查看日志

```bash
# 开发模式: 直接在终端查看

# PM2 模式
pm2 logs fastgpt-app
pm2 logs fastgpt-sandbox

# Docker 模式
docker-compose logs -f
```

---

## 🔍 故障排查

### 问题 1: 数据库连接失败

**错误信息**:
```
MongoServerError: Authentication failed
```

**解决方案**:
```bash
# 检查 MongoDB 是否运行
docker ps | grep mongo

# 检查连接字符串
echo $MONGODB_URI

# 测试连接
docker exec -it mongo mongosh -u myusername -p mypassword --authenticationDatabase admin

# 重启 MongoDB
docker-compose restart mongo
```

### 问题 2: 端口占用

**错误信息**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案**:
```bash
# 查找占用进程
lsof -i :3000
# 或
netstat -tulpn | grep 3000

# 杀死进程
kill -9 <PID>

# 或更换端口
PORT=3001 pnpm dev
```

### 问题 3: 依赖安装失败

**错误信息**:
```
ENOENT: no such file or directory
```

**解决方案**:
```bash
# 清理缓存
pnpm store prune
rm -rf node_modules
rm -rf pnpm-lock.yaml

# 重新安装
pnpm install

# 如果还失败，使用 npm
npm install
```

### 问题 4: 构建失败

**错误信息**:
```
Type error: ...
```

**解决方案**:
```bash
# 检查 Node 版本
node --version  # 必须 >= 20.x

# 清理构建产物
rm -rf projects/app/.next
rm -rf projects/sandbox/dist

# 重新构建
pnpm build

# 查看详细错误
pnpm build 2>&1 | tee build.log
```

---

## 📊 性能优化建议

### 生产环境配置

#### 1. 数据库优化

```bash
# MongoDB 连接池配置
MONGODB_URI="mongodb://user:pass@localhost:27017/fastgpt?maxPoolSize=50&minPoolSize=10"

# Redis 连接池
REDIS_MAX_CONNECTIONS=50
```

#### 2. Node.js 优化

```bash
# 增加内存限制
NODE_OPTIONS="--max-old-space-size=4096"

# 启用生产模式
NODE_ENV=production
```

#### 3. PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'fastgpt-app',
    script: 'npm',
    args: 'start',
    cwd: './projects/app',
    instances: 2,  // 使用 CPU 核心数
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }, {
    name: 'fastgpt-sandbox',
    script: './dist/main.js',
    cwd: './projects/sandbox',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    }
  }]
}

// 启动
pm2 start ecosystem.config.js
```

---

## 🔐 安全检查清单

- [ ] 修改默认密码（ROOT_PSW, MongoDB, Redis）
- [ ] 使用强随机 TOKEN_KEY
- [ ] 配置防火墙规则
- [ ] 启用 HTTPS（生产环境）
- [ ] 限制数据库外部访问
- [ ] 定期备份数据
- [ ] 启用日志监控

---

## 📈 监控与日志

### 推荐监控工具

| 工具 | 用途 | 优先级 |
|------|------|--------|
| **PM2 Monitoring** | 进程监控 | P1 |
| **Prometheus** | 性能指标 | P2 |
| **Grafana** | 可视化面板 | P2 |
| **ELK Stack** | 日志聚合 | P3 |

### 日志配置

```bash
# PM2 日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

---

## 🎯 部署检查表

### 部署前

- [ ] 代码已提交到 Git
- [ ] 所有测试通过 (232/232)
- [ ] 文档已更新
- [ ] 环境变量已配置

### 部署中

- [ ] 服务器环境检查通过
- [ ] 基础设施启动成功
- [ ] 依赖安装完成
- [ ] 构建成功
- [ ] 应用启动成功

### 部署后

- [ ] 健康检查通过
- [ ] API 测试通过
- [ ] 性能测试通过（可选）
- [ ] 日志正常
- [ ] 监控配置完成

---

## 📞 获取帮助

### 文档参考

- [部署前测试计划](./pre-deployment-test-plan.md)
- [测试修复报告](./phase4-others/07-test-fix-report.md)
- [测试策略说明](./testing-strategy-explanation.md)

### 常见问题

参见各 Phase 目录下的 README.md：
- [Phase 1](./phase1-core/)
- [Phase 2](./phase2-important/)
- [Phase 3](./phase3-enhanced/)
- [Phase 4](./phase4-others/README.md)

---

**祝部署顺利！** 🚀

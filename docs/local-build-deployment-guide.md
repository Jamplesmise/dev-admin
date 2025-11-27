# FastGPT Pro 本地打包部署指南

> **文档版本**: v1.0.0
> **更新日期**: 2025-11-25
> **适用项目**: FastGPT Pro 后端 API 服务

---

## 📋 目录

- [1. 环境准备](#1-环境准备)
- [2. 项目配置](#2-项目配置)
- [3. 本地构建](#3-本地构建)
- [4. 部署方式](#4-部署方式)
- [5. 验证测试](#5-验证测试)
- [6. 故障排查](#6-故障排查)
- [7. 性能优化](#7-性能优化)

---

## 1. 环境准备

### 1.1 系统要求

| 组件 | 最低要求 | 推荐配置 |
|------|---------|---------|
| **操作系统** | Linux / macOS / Windows WSL2 | Ubuntu 20.04+ |
| **Node.js** | >= 20.0.0 | 24.4.1 LTS |
| **pnpm** | >= 9.15.0 | 最新版本 |
| **内存** | 4GB | 8GB+ |
| **磁盘空间** | 2GB | 5GB+ |

### 1.2 安装 Node.js

```bash
# 使用 nvm 安装 (推荐)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 验证版本
node --version  # 应该 >= 20.0.0
```

### 1.3 安装 pnpm

```bash
# 使用 npm 安装
npm install -g pnpm

# 验证版本
pnpm --version  # 应该 >= 9.15.0
```

### 1.4 数据库准备

#### MongoDB

```bash
# 确保 MongoDB 可访问
mongosh "mongodb://username:password@host:port/database" --eval "db.adminCommand('ping')"
```

**环境变量示例:**
```bash
MONGODB_URI="mongodb://root:password@localhost:27017/fastgpt?authSource=admin"
```

#### PostgreSQL (可选，用于向量存储)

```bash
# 测试连接
psql "postgresql://username:password@localhost:5432/postgres" -c "SELECT version();"
```

#### Redis (可选，用于缓存)

```bash
# 测试连接
redis-cli -h localhost -p 6379 -a password ping
```

---

## 2. 项目配置

### 2.1 克隆项目

```bash
cd /path/to/your/workspace
git clone <repository-url> fastgpt-pro
cd fastgpt-pro
```

### 2.2 安装依赖

```bash
pnpm install
```

**预计时间**: 2-5 分钟

### 2.3 配置环境变量

创建 `.env` 文件：

```bash
# 复制环境变量模板
cp .env.example .env

# 或手动创建
touch .env
```

**必填环境变量:**

```bash
# ===== 数据库配置 =====
MONGODB_URI="mongodb://root:password@localhost:27017/fastgpt?authSource=admin"

# ===== JWT Token 配置 =====
TOKEN_KEY="your-secret-key-change-in-production"

# ===== 运行环境 =====
NODE_ENV="production"
```

**可选环境变量:**

```bash
# PostgreSQL (向量存储)
PG_URL="postgresql://username:password@localhost:5432/postgres"

# Redis (缓存)
REDIS_URL="redis://default:password@localhost:6379"

# MongoDB Log (日志独立存储)
MONGODB_LOG_URI="mongodb://root:password@localhost:27017/fastgpt-log?authSource=admin"

# 跳过索引同步 (开发环境)
SYNC_INDEX="0"
```

### 2.4 验证配置

```bash
# 检查环境变量
cat .env

# 测试 MongoDB 连接
mongosh "$MONGODB_URI" --eval "db.runCommand({ ping: 1 })"
```

---

## 3. 本地构建

### 3.1 清理旧构建

```bash
# 清理 Next.js 缓存和旧构建
rm -rf .next
rm -rf node_modules/.cache
```

### 3.2 执行构建

```bash
pnpm build
```

**构建过程说明:**

```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types (SKIPPED)
✓ Collecting page data
✓ Generating static pages (54/54)
✓ Finalizing page optimization
```

**预计时间**: 1-2 分钟

**注意事项:**

1. **类型检查跳过**: 由于 Mongoose 类型系统会导致内存溢出，构建时跳过类型检查
2. **ESLint 跳过**: 构建时跳过 ESLint，通过 `pnpm lint` 单独运行
3. **内存限制**: 如果遇到内存问题，使用以下命令：

```bash
NODE_OPTIONS="--max-old-space-size=8192" pnpm build
```

### 3.3 构建输出

构建完成后，输出位于 `.next/standalone/` 目录：

```
.next/standalone/
├── node_modules/      # 生产依赖
├── pages/             # 编译后的页面
├── package.json       # 依赖清单
└── server.js          # 服务器入口
```

**输出体积**: 约 33MB

### 3.4 验证构建产物

```bash
# 检查输出目录
ls -lh .next/standalone/

# 检查依赖
cat .next/standalone/package.json

# 检查体积
du -sh .next/standalone/
```

---

## 4. 部署方式

### 4.1 方式一: Standalone 直接运行

**适用场景**: 快速测试、单服务器部署

#### 启动服务

```bash
cd .next/standalone
NODE_ENV=production node server.js
```

#### 使用环境变量文件

```bash
# 复制 .env 到 standalone 目录
cp ../../.env .

# 启动服务
NODE_ENV=production node server.js
```

#### 后台运行 (使用 PM2)

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
cd .next/standalone
pm2 start server.js --name fastgpt-pro --env production

# 查看日志
pm2 logs fastgpt-pro

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

#### 使用 systemd

创建服务文件 `/etc/systemd/system/fastgpt-pro.service`:

```ini
[Unit]
Description=FastGPT Pro API Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/fastgpt-pro/.next/standalone
Environment="NODE_ENV=production"
EnvironmentFile=/var/www/fastgpt-pro/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务:

```bash
sudo systemctl daemon-reload
sudo systemctl enable fastgpt-pro
sudo systemctl start fastgpt-pro
sudo systemctl status fastgpt-pro
```

---

### 4.2 方式二: Docker 部署

**适用场景**: 容器化部署、多环境隔离

#### Dockerfile

项目根目录已包含 `Dockerfile`：

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# 复制构建产物
COPY .next/standalone ./
COPY .env ./

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 启动服务
CMD ["node", "server.js"]
```

#### 构建镜像

```bash
# 确保已执行 pnpm build

# 构建 Docker 镜像
docker build -t fastgpt-pro:latest .

# 查看镜像
docker images | grep fastgpt-pro
```

#### 运行容器

```bash
# 运行容器
docker run -d \
  --name fastgpt-pro \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  fastgpt-pro:latest

# 查看日志
docker logs -f fastgpt-pro

# 查看状态
docker ps | grep fastgpt-pro
```

#### docker-compose 部署

项目根目录已包含 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  fastgpt-pro:
    image: fastgpt-pro:latest
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    depends_on:
      - mongodb
    networks:
      - fastgpt-network

  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    networks:
      - fastgpt-network

volumes:
  mongodb_data:

networks:
  fastgpt-network:
    driver: bridge
```

启动所有服务:

```bash
docker-compose up -d

# 查看日志
docker-compose logs -f fastgpt-pro

# 停止服务
docker-compose down
```

---

### 4.3 方式三: Nginx 反向代理

**适用场景**: 生产环境、负载均衡、SSL 终止

#### Nginx 配置

创建 `/etc/nginx/sites-available/fastgpt-pro`:

```nginx
upstream fastgpt_backend {
    server 127.0.0.1:3000;
    # 负载均衡 (多实例)
    # server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # 限制请求体大小
    client_max_body_size 10M;

    # 日志
    access_log /var/log/nginx/fastgpt-pro-access.log;
    error_log /var/log/nginx/fastgpt-pro-error.log;

    # API 代理
    location / {
        proxy_pass http://fastgpt_backend;
        proxy_http_version 1.1;

        # 请求头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
    }
}
```

启用配置:

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/fastgpt-pro /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### HTTPS 配置 (使用 Let's Encrypt)

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 5. 验证测试

### 5.1 服务健康检查

```bash
# 检查服务是否启动
curl http://localhost:3000/api/support/user/inform/getOperationalAd

# 预期响应
# {"code":200,"statusText":"","message":"","data":{"ads":[]}}
```

### 5.2 API 功能测试

#### 测试 1: 公开 API

```bash
curl -X GET http://localhost:3000/api/support/user/inform/getOperationalAd
```

**预期结果**: `{"code":200,"statusText":"","message":"","data":{"ads":[]}}`

#### 测试 2: 数据库写入

```bash
curl -X POST http://localhost:3000/api/common/workorder/create \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bug",
    "title": "测试工单",
    "description": "部署后功能测试",
    "contactEmail": "test@example.com"
  }'
```

**预期结果**: 返回包含 `_id` 和 `orderId` 的 JSON

#### 测试 3: 认证 API

```bash
curl -X POST http://localhost:3000/api/support/activity/promotion/getPromotionData \
  -H "Content-Type: application/json" \
  -d '{}'
```

**预期结果**: `{"code":500,"statusText":"error","message":"未登录或登录已过期","data":null}`

### 5.3 性能测试

```bash
# 使用 ab (Apache Bench)
ab -n 1000 -c 10 http://localhost:3000/api/support/user/inform/getOperationalAd

# 使用 wrk
wrk -t4 -c100 -d30s http://localhost:3000/api/support/user/inform/getOperationalAd
```

### 5.4 监控指标

```bash
# 查看进程状态
ps aux | grep node

# 查看内存占用
free -h

# 查看磁盘占用
df -h

# 查看端口监听
netstat -tlnp | grep 3000

# 查看日志 (如果使用 PM2)
pm2 logs fastgpt-pro --lines 100
```

---

## 6. 故障排查

### 6.1 构建失败

#### 问题 1: 内存溢出 (OOM)

**症状:**
```
FATAL ERROR: Ineffective mark-compacts near heap limit
Allocation failed - JavaScript heap out of memory
```

**解决方案:**

```bash
# 增加内存限制
NODE_OPTIONS="--max-old-space-size=8192" pnpm build
```

#### 问题 2: 类型检查错误

**症状:**
```
Type error: Cannot find module 'mongoose'
```

**解决方案:**

已配置跳过类型检查，如果仍然出错：

```javascript
// next.config.js
typescript: {
  ignoreBuildErrors: true,  // 确保此选项为 true
}
```

#### 问题 3: 路径解析错误

**症状:**
```
Module not found: Can't resolve '@fastgpt/global'
```

**解决方案:**

检查 `next.config.js` 的 webpack alias 配置：

```javascript
webpack: (config) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    '@fastgpt/global': path.resolve(__dirname, 'src/packages/global'),
    '@fastgpt/service': path.resolve(__dirname, 'src/packages/service'),
  };
  return config;
}
```

---

### 6.2 运行时错误

#### 问题 1: MongoDB 连接超时

**症状:**
```
MongooseError: Operation buffering timed out after 10000ms
```

**解决方案:**

1. 检查 MongoDB 连接字符串:
```bash
mongosh "$MONGODB_URI" --eval "db.runCommand({ ping: 1 })"
```

2. 检查防火墙:
```bash
sudo ufw status
sudo ufw allow 27017/tcp
```

3. 增加超时时间:
```javascript
// src/packages/service/common/mongo/index.ts
mongoose.connect(MONGO_URL, {
  serverSelectionTimeoutMS: 30000,  // 30秒
  socketTimeoutMS: 30000,
});
```

#### 问题 2: 端口被占用

**症状:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案:**

```bash
# 查找占用端口的进程
lsof -i :3000

# 或
netstat -tlnp | grep 3000

# 停止进程
kill -9 <PID>
```

#### 问题 3: 环境变量未加载

**症状:**
```
process.env.MONGODB_URI is undefined
```

**解决方案:**

1. 确保 `.env` 文件在正确位置:
```bash
ls -la .next/standalone/.env
```

2. 手动加载环境变量:
```bash
export $(cat .env | xargs)
node server.js
```

---

### 6.3 性能问题

#### 问题 1: 启动缓慢

**症状**: 服务启动超过 10 秒

**解决方案:**

1. 禁用开发模式特性:
```bash
NODE_ENV=production node server.js
```

2. 预热数据库连接:
```javascript
// 在应用启动时预连接
await mongoose.connect(MONGO_URL);
```

#### 问题 2: 响应时间过长

**症状**: API 响应超过 1 秒

**排查步骤:**

1. 检查数据库查询:
```javascript
// 添加查询日志
mongoose.set('debug', true);
```

2. 添加索引:
```bash
# 连接 MongoDB
mongosh "$MONGODB_URI"

# 查看慢查询
db.setProfilingLevel(2)
db.system.profile.find().sort({ts: -1}).limit(5)
```

3. 使用缓存:
```javascript
// 使用 Redis 缓存热点数据
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

---

## 7. 性能优化

### 7.1 生产环境配置

#### 环境变量优化

```bash
# .env.production
NODE_ENV=production

# 禁用调试日志
DEBUG=false

# 启用 gzip 压缩 (Next.js 默认启用)
COMPRESS=true

# 禁用索引同步 (生产环境应在部署前完成)
SYNC_INDEX=0
```

#### Next.js 配置优化

```javascript
// next.config.js
module.exports = {
  // 启用 SWC 压缩 (更快)
  swcMinify: true,

  // 启用 gzip 压缩
  compress: true,

  // 禁用 X-Powered-By 头
  poweredByHeader: false,

  // 生产优化
  productionBrowserSourceMaps: false,
}
```

### 7.2 数据库优化

#### MongoDB 索引

```javascript
// 为常用查询添加索引
db.work_orders.createIndex({ orderId: 1 }, { unique: true })
db.work_orders.createIndex({ status: 1, createTime: -1 })
db.work_orders.createIndex({ contactEmail: 1 })
```

#### 连接池配置

```javascript
mongoose.connect(MONGO_URL, {
  maxPoolSize: 50,      // 最大连接数
  minPoolSize: 10,      // 最小连接数
  maxIdleTimeMS: 10000, // 空闲连接超时
});
```

### 7.3 监控告警

#### PM2 监控

```bash
# 启用 PM2 监控
pm2 start server.js --name fastgpt-pro --max-memory-restart 500M

# 查看实时监控
pm2 monit
```

#### 日志管理

```bash
# PM2 日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 10
```

---

## 8. 附录

### 8.1 完整部署脚本

创建 `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "====== FastGPT Pro 部署脚本 ======"

# 1. 检查环境
echo "1. 检查环境..."
node --version || { echo "Node.js 未安装"; exit 1; }
pnpm --version || { echo "pnpm 未安装"; exit 1; }

# 2. 安装依赖
echo "2. 安装依赖..."
pnpm install

# 3. 构建项目
echo "3. 构建项目..."
rm -rf .next
NODE_OPTIONS="--max-old-space-size=8192" pnpm build

# 4. 验证构建
echo "4. 验证构建..."
if [ ! -d ".next/standalone" ]; then
  echo "构建失败: .next/standalone 目录不存在"
  exit 1
fi

# 5. 复制环境变量
echo "5. 复制环境变量..."
cp .env .next/standalone/

# 6. 测试启动
echo "6. 测试启动..."
cd .next/standalone
NODE_ENV=production timeout 10s node server.js &
sleep 5
curl -f http://localhost:3000/api/support/user/inform/getOperationalAd || { echo "服务启动失败"; exit 1; }

echo "====== 部署成功 ======"
echo "启动命令: cd .next/standalone && NODE_ENV=production node server.js"
```

使用方式:

```bash
chmod +x deploy.sh
./deploy.sh
```

### 8.2 环境变量完整清单

```bash
# ===== 必填 =====
MONGODB_URI="mongodb://root:password@localhost:27017/fastgpt?authSource=admin"
TOKEN_KEY="your-secret-key-32-characters-min"
NODE_ENV="production"

# ===== 可选 - 数据库 =====
MONGODB_LOG_URI="mongodb://root:password@localhost:27017/fastgpt-log?authSource=admin"
PG_URL="postgresql://username:password@localhost:5432/postgres"
REDIS_URL="redis://default:password@localhost:6379"

# ===== 可选 - 功能开关 =====
SYNC_INDEX="0"                    # 0=禁用索引同步, 1=启用
DEBUG="false"                     # true=开启调试日志
COMPRESS="true"                   # true=启用 gzip 压缩

# ===== 可选 - 服务配置 =====
PORT="3000"                       # 服务端口
HOST="0.0.0.0"                    # 监听地址

# ===== 可选 - 安全配置 =====
CORS_ORIGIN="*"                   # CORS 允许的源
RATE_LIMIT="100"                  # 请求速率限制 (每分钟)
```

### 8.3 参考资料

- [Next.js Standalone 文档](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [Mongoose 性能优化](https://mongoosejs.com/docs/guide.html#options)
- [PM2 文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx 反向代理配置](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

---

## 9. 快速参考

### 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器
pnpm lint             # 代码检查
pnpm test             # 运行测试

# 构建
pnpm build            # 生产构建
rm -rf .next          # 清理构建缓存

# 运行
cd .next/standalone
NODE_ENV=production node server.js

# PM2
pm2 start server.js --name fastgpt-pro
pm2 logs fastgpt-pro
pm2 restart fastgpt-pro
pm2 stop fastgpt-pro
pm2 delete fastgpt-pro

# Docker
docker build -t fastgpt-pro .
docker run -d -p 3000:3000 --env-file .env fastgpt-pro
docker logs -f fastgpt-pro
docker stop fastgpt-pro
docker rm fastgpt-pro
```

### 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 3000 | FastGPT Pro API | 主服务端口 |
| 27017 | MongoDB | 数据库 |
| 5432 | PostgreSQL | 向量数据库 (可选) |
| 6379 | Redis | 缓存 (可选) |

---

**文档维护**: 如有问题或建议，请联系开发团队或提交 Issue。

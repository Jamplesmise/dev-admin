# Docker 镜像构建与发布指南

> 版本: v1.0
> 更新时间: 2025-11-25
> 目标: 构建 Docker 镜像并发布到 GitHub Container Registry (GHCR)

---

## 📋 前置准备

### 1. 工具要求

| 工具 | 版本 | 用途 |
|------|------|------|
| **Docker** | ≥ 20.10 | 容器构建 |
| **Git** | latest | 版本控制 |
| **GitHub CLI** | latest | GitHub 操作（可选） |

### 2. GitHub 权限

- ✅ 拥有仓库的写入权限
- ✅ 已创建 GitHub Personal Access Token (PAT)
- ✅ Token 权限包含: `write:packages`, `read:packages`, `delete:packages`

---

## 🔐 Step 1: 创建 GitHub Personal Access Token

### 1.1 创建 Token

1. 访问 GitHub Settings: https://github.com/settings/tokens
2. 点击 **"Generate new token"** → **"Generate new token (classic)"**
3. 配置 Token:
   - **Note**: `FastGPT Docker Registry`
   - **Expiration**: `90 days` 或 `No expiration`
   - **Select scopes**:
     - ✅ `write:packages` (上传镜像)
     - ✅ `read:packages` (下载镜像)
     - ✅ `delete:packages` (删除镜像)
     - ✅ `repo` (访问私有仓库，如果需要)

4. 点击 **"Generate token"**
5. **立即复制 Token**（只显示一次）

### 1.2 保存 Token

```bash
# 将 Token 保存到环境变量
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 或保存到文件（注意权限）
echo "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" > ~/.github-token
chmod 600 ~/.github-token

# 使用时读取
export GITHUB_TOKEN=$(cat ~/.github-token)
```

---

## 🏗️ Step 2: 准备 Dockerfile

### 2.1 检查现有 Dockerfile

FastGPT 项目应该已有 Dockerfile，检查：

```bash
cd /home/sinocare/dev/fastgpt-dev

# 查找 Dockerfile
find . -name "Dockerfile*" -type f
```

**预期输出**:
```
./projects/app/Dockerfile
./projects/sandbox/Dockerfile
./Dockerfile  (如果有根目录 Dockerfile)
```

### 2.2 创建主应用 Dockerfile（如果不存在）

**位置**: `projects/app/Dockerfile`

```dockerfile
# ========== 阶段 1: 构建依赖 ==========
FROM node:20-alpine AS deps

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@latest

# 复制 package 文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/global/package.json ./packages/global/
COPY packages/service/package.json ./packages/service/
COPY packages/web/package.json ./packages/web/
COPY projects/app/package.json ./projects/app/

# 安装依赖（仅生产依赖）
RUN pnpm install --frozen-lockfile --prod

# ========== 阶段 2: 构建应用 ==========
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@latest

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./

# 复制源代码
COPY . .

# 构建 Next.js 应用
WORKDIR /app/projects/app
RUN pnpm build

# ========== 阶段 3: 生产镜像 ==========
FROM node:20-alpine AS runner

WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/projects/app/public ./public
COPY --from=builder /app/projects/app/.next/standalone ./
COPY --from=builder /app/projects/app/.next/static ./.next/static

# 设置权限
RUN chown -R nextjs:nodejs /app

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 启动命令
CMD ["node", "server.js"]
```

### 2.3 创建 Sandbox Dockerfile

**位置**: `projects/sandbox/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@latest

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./
COPY projects/sandbox/package.json ./projects/sandbox/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY projects/sandbox ./projects/sandbox

# 构建
WORKDIR /app/projects/sandbox
RUN pnpm build

# ========== 生产镜像 ==========
FROM node:20-alpine

WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# 复制构建产物
COPY --from=builder /app/projects/sandbox/dist ./dist
COPY --from=builder /app/projects/sandbox/node_modules ./node_modules

# 设置权限
RUN chown -R nestjs:nodejs /app

# 切换用户
USER nestjs

# 暴露端口
EXPOSE 3002

# 环境变量
ENV NODE_ENV=production
ENV PORT=3002

# 启动命令
CMD ["node", "dist/main.js"]
```

### 2.4 创建 .dockerignore

**位置**: `.dockerignore`

```
# Dependencies
node_modules
npm-debug.log
yarn-error.log
pnpm-debug.log

# Build output
.next
dist
build
out

# Development
.env.local
.env.development.local
.env.test.local
.env.production.local

# Testing
coverage
.nyc_output
test

# IDE
.idea
.vscode
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Git
.git
.gitignore
.gitattributes

# Documentation
docs
*.md
!README.md

# CI/CD
.github
.gitlab-ci.yml

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore
```

---

## 🔨 Step 3: 构建 Docker 镜像

### 3.1 设置镜像标签

```bash
# 设置基本信息
export GITHUB_USERNAME="your-github-username"
export REPO_NAME="fastgpt-pro-backend"
export VERSION="v1.0.0"  # 或使用 git tag

# 生成镜像标签
export IMAGE_TAG="ghcr.io/${GITHUB_USERNAME}/${REPO_NAME}"
```

### 3.2 构建主应用镜像

```bash
cd /home/sinocare/dev/fastgpt-dev

# 构建主应用
docker build \
  -t ${IMAGE_TAG}/app:${VERSION} \
  -t ${IMAGE_TAG}/app:latest \
  -f projects/app/Dockerfile \
  .

# 查看镜像
docker images | grep fastgpt
```

### 3.3 构建 Sandbox 镜像

```bash
# 构建 Sandbox
docker build \
  -t ${IMAGE_TAG}/sandbox:${VERSION} \
  -t ${IMAGE_TAG}/sandbox:latest \
  -f projects/sandbox/Dockerfile \
  .
```

### 3.4 测试镜像（本地）

```bash
# 测试主应用
docker run --rm \
  -p 3000:3000 \
  -e MONGODB_URI="mongodb://host.docker.internal:27017/fastgpt" \
  -e REDIS_URL="redis://host.docker.internal:6379" \
  ${IMAGE_TAG}/app:latest

# 访问 http://localhost:3000 验证

# 测试 Sandbox
docker run --rm \
  -p 3002:3002 \
  ${IMAGE_TAG}/sandbox:latest

# 访问 http://localhost:3002/health 验证
```

---

## 📤 Step 4: 登录 GitHub Container Registry

### 4.1 使用 Token 登录

```bash
# 方式 1: 使用环境变量
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# 方式 2: 交互式登录
docker login ghcr.io -u $GITHUB_USERNAME
# 输入密码: 粘贴 GitHub Token
```

**成功输出**:
```
Login Succeeded
```

### 4.2 验证登录

```bash
# 检查登录状态
docker info | grep Username

# 或查看配置
cat ~/.docker/config.json
```

---

## 🚀 Step 5: 推送镜像到 GHCR

### 5.1 推送主应用镜像

```bash
# 推送带版本号的镜像
docker push ${IMAGE_TAG}/app:${VERSION}

# 推送 latest 标签
docker push ${IMAGE_TAG}/app:latest
```

### 5.2 推送 Sandbox 镜像

```bash
# 推送带版本号的镜像
docker push ${IMAGE_TAG}/sandbox:${VERSION}

# 推送 latest 标签
docker push ${IMAGE_TAG}/sandbox:latest
```

### 5.3 推送进度示例

```
The push refers to repository [ghcr.io/username/fastgpt-pro-backend/app]
a1b2c3d4e5f6: Pushed
b2c3d4e5f6a7: Pushed
c3d4e5f6a7b8: Pushed
v1.0.0: digest: sha256:abcdef... size: 1234
latest: digest: sha256:abcdef... size: 1234
```

---

## 🔒 Step 6: 配置 Package 权限

### 6.1 设置 Package 可见性

1. 访问 GitHub Package 页面:
   ```
   https://github.com/users/YOUR_USERNAME/packages/container/REPO_NAME%2Fapp/settings
   ```

2. **Change package visibility**:
   - **Public**: 任何人都可以下载（推荐用于开源项目）
   - **Private**: 仅团队成员可下载

3. 点击 **"Change visibility"** 确认

### 6.2 配置访问权限（私有镜像）

如果是私有镜像，配置团队访问：

1. 进入 Package Settings
2. **Manage Actions access**:
   - 添加仓库: 允许哪些仓库的 GitHub Actions 访问
   - 添加团队: 允许哪些团队成员访问

---

## 📦 Step 7: 使用已发布的镜像

### 7.1 在其他机器上拉取镜像

```bash
# 登录 GHCR（首次需要）
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# 拉取镜像
docker pull ghcr.io/username/fastgpt-pro-backend/app:latest
docker pull ghcr.io/username/fastgpt-pro-backend/sandbox:latest

# 运行容器
docker run -d \
  --name fastgpt-app \
  -p 3000:3000 \
  -e MONGODB_URI="..." \
  -e REDIS_URL="..." \
  ghcr.io/username/fastgpt-pro-backend/app:latest
```

### 7.2 使用 Docker Compose

**创建**: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  app:
    image: ghcr.io/${GITHUB_USERNAME}/${REPO_NAME}/app:latest
    container_name: fastgpt-app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_URL=${REDIS_URL}
      - TOKEN_KEY=${TOKEN_KEY}
      - DEFAULT_ROOT_PSW=${DEFAULT_ROOT_PSW}
    restart: unless-stopped
    depends_on:
      - mongo
      - redis

  sandbox:
    image: ghcr.io/${GITHUB_USERNAME}/${REPO_NAME}/sandbox:latest
    container_name: fastgpt-sandbox
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  mongo:
    image: mongo:6
    container_name: fastgpt-mongo
    environment:
      - MONGO_INITDB_ROOT_USERNAME=myusername
      - MONGO_INITDB_ROOT_PASSWORD=mypassword
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: fastgpt-redis
    command: redis-server --requirepass mypassword
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
```

**使用**:

```bash
# 拉取镜像并启动
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 停止
docker-compose -f docker-compose.prod.yml down
```

---

## 🤖 Step 8: 自动化 CI/CD（GitHub Actions）

### 8.1 创建 GitHub Actions Workflow

**位置**: `.github/workflows/docker-publish.yml`

```yaml
name: Build and Push Docker Images

on:
  push:
    branches:
      - main
      - phase3-enhanced
    tags:
      - 'v*'
  pull_request:
    branches:
      - main

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels)
        id: meta-app
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/app
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push App image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./projects/app/Dockerfile
          push: true
          tags: ${{ steps.meta-app.outputs.tags }}
          labels: ${{ steps.meta-app.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Extract metadata for Sandbox
        id: meta-sandbox
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/sandbox
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push Sandbox image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./projects/sandbox/Dockerfile
          push: true
          tags: ${{ steps.meta-sandbox.outputs.tags }}
          labels: ${{ steps.meta-sandbox.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 8.2 触发自动构建

```bash
# 提交 workflow 文件
git add .github/workflows/docker-publish.yml
git commit -m "ci: add Docker build and publish workflow"
git push

# 或创建 tag 触发
git tag v1.0.0
git push origin v1.0.0
```

### 8.3 查看构建状态

访问: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`

---

## 📊 镜像管理

### 查看已发布的镜像

```bash
# 使用 GitHub CLI
gh api \
  -H "Accept: application/vnd.github+json" \
  /users/$GITHUB_USERNAME/packages/container/$REPO_NAME%2Fapp/versions

# 或访问网页
# https://github.com/users/YOUR_USERNAME/packages
```

### 删除旧版本镜像

```bash
# 1. 访问 Package 页面
# 2. 选择要删除的版本
# 3. 点击 "Delete version"

# 或使用 API
gh api \
  --method DELETE \
  -H "Accept: application/vnd.github+json" \
  /users/$GITHUB_USERNAME/packages/container/$REPO_NAME%2Fapp/versions/VERSION_ID
```

---

## 🔍 故障排查

### 问题 1: 推送被拒绝（权限不足）

**错误**:
```
denied: permission_denied: write_package
```

**解决**:
```bash
# 1. 检查 Token 权限
# 访问: https://github.com/settings/tokens
# 确保勾选 write:packages

# 2. 重新登录
docker logout ghcr.io
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
```

### 问题 2: 镜像构建失败

**错误**:
```
ERROR [builder 3/5] RUN pnpm build
```

**解决**:
```bash
# 1. 本地测试构建
docker build -f projects/app/Dockerfile . 2>&1 | tee build.log

# 2. 检查 Dockerfile 路径
# 3. 检查 .dockerignore 是否排除了必要文件

# 4. 增加构建日志详细度
docker build --progress=plain -f projects/app/Dockerfile .
```

### 问题 3: 镜像过大

**检查镜像大小**:
```bash
docker images | grep fastgpt
```

**优化方案**:
```dockerfile
# 1. 使用多阶段构建（已使用）
# 2. 清理缓存
RUN pnpm install --frozen-lockfile && pnpm cache clean

# 3. 使用 alpine 基础镜像（已使用）
# 4. 删除不必要的文件
RUN rm -rf /app/.git /app/docs /app/test
```

---

## 📋 完整流程检查表

### 准备阶段
- [ ] 创建 GitHub Personal Access Token
- [ ] 安装 Docker (≥ 20.10)
- [ ] 确认代码已提交到 Git

### 构建阶段
- [ ] 创建/检查 Dockerfile
- [ ] 创建 .dockerignore
- [ ] 本地构建镜像成功
- [ ] 本地测试镜像运行正常

### 发布阶段
- [ ] 登录 GHCR 成功
- [ ] 推送镜像成功
- [ ] 配置 Package 可见性
- [ ] 在其他机器验证拉取

### 自动化阶段（可选）
- [ ] 创建 GitHub Actions workflow
- [ ] 测试自动构建
- [ ] 配置自动部署

---

## 🎯 完整命令速查

```bash
# ========== 1. 设置变量 ==========
export GITHUB_USERNAME="your-username"
export REPO_NAME="fastgpt-pro-backend"
export VERSION="v1.0.0"
export IMAGE_TAG="ghcr.io/${GITHUB_USERNAME}/${REPO_NAME}"
export GITHUB_TOKEN="ghp_xxxxx"

# ========== 2. 构建镜像 ==========
cd /home/sinocare/dev/fastgpt-dev

docker build -t ${IMAGE_TAG}/app:${VERSION} -t ${IMAGE_TAG}/app:latest -f projects/app/Dockerfile .
docker build -t ${IMAGE_TAG}/sandbox:${VERSION} -t ${IMAGE_TAG}/sandbox:latest -f projects/sandbox/Dockerfile .

# ========== 3. 登录 GHCR ==========
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# ========== 4. 推送镜像 ==========
docker push ${IMAGE_TAG}/app:${VERSION}
docker push ${IMAGE_TAG}/app:latest
docker push ${IMAGE_TAG}/sandbox:${VERSION}
docker push ${IMAGE_TAG}/sandbox:latest

# ========== 5. 验证（在其他机器） ==========
docker pull ${IMAGE_TAG}/app:latest
docker pull ${IMAGE_TAG}/sandbox:latest
docker run -d -p 3000:3000 ${IMAGE_TAG}/app:latest
```

---

**文档完成！** 🎉

需要我帮你：
- 生成具体的环境变量配置？
- 创建 GitHub Actions workflow？
- 编写自动部署脚本？

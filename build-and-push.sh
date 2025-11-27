#!/bin/bash

# FastGPT Pro - Docker 镜像构建并推送到 GitHub Container Registry
# 使用方法: ./build-and-push.sh

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}FastGPT Pro - Docker Build & Push${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# ========== Step 1: 检查环境 ==========
echo -e "${YELLOW}[1/6] 检查环境...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}错误: Git 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker 版本: $(docker --version)${NC}"
echo -e "${GREEN}✓ Git 版本: $(git --version)${NC}"
echo ""

# ========== Step 2: 设置变量 ==========
echo -e "${YELLOW}[2/6] 设置变量...${NC}"

# 从 Git 获取信息
GIT_BRANCH=$(git branch --show-current)
GIT_COMMIT=$(git rev-parse --short HEAD)

# GitHub 用户名（可以从环境变量获取，或手动设置）
if [ -z "$GITHUB_USERNAME" ]; then
    read -p "请输入你的 GitHub 用户名: " GITHUB_USERNAME
    export GITHUB_USERNAME
fi

# 仓库名称
REPO_NAME="fastgpt-pro-backend"

# 版本号（从 git tag 获取，或使用分支名）
if git describe --tags --exact-match 2>/dev/null; then
    VERSION=$(git describe --tags --exact-match)
else
    VERSION="${GIT_BRANCH}-${GIT_COMMIT}"
fi

# 镜像标签
IMAGE_TAG="ghcr.io/${GITHUB_USERNAME}/${REPO_NAME}"

echo -e "${GREEN}✓ GitHub Username: ${GITHUB_USERNAME}${NC}"
echo -e "${GREEN}✓ Repository: ${REPO_NAME}${NC}"
echo -e "${GREEN}✓ Branch: ${GIT_BRANCH}${NC}"
echo -e "${GREEN}✓ Version: ${VERSION}${NC}"
echo -e "${GREEN}✓ Image Tag: ${IMAGE_TAG}${NC}"
echo ""

# ========== Step 3: 登录 GHCR ==========
echo -e "${YELLOW}[3/6] 登录 GitHub Container Registry...${NC}"

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}提示: 需要 GitHub Personal Access Token${NC}"
    echo -e "${YELLOW}创建 Token: https://github.com/settings/tokens${NC}"
    echo -e "${YELLOW}权限: write:packages, read:packages, delete:packages${NC}"
    echo ""
    read -sp "请输入 GitHub Token: " GITHUB_TOKEN
    export GITHUB_TOKEN
    echo ""
fi

echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 登录成功${NC}"
else
    echo -e "${RED}✗ 登录失败${NC}"
    exit 1
fi
echo ""

# ========== Step 4: 构建镜像 ==========
echo -e "${YELLOW}[4/6] 构建 Docker 镜像...${NC}"
echo -e "${YELLOW}这可能需要几分钟，请耐心等待...${NC}"
echo ""

docker build \
  -t ${IMAGE_TAG}:${VERSION} \
  -t ${IMAGE_TAG}:latest \
  -t ${IMAGE_TAG}:${GIT_BRANCH} \
  -f Dockerfile \
  .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 镜像构建成功${NC}"
else
    echo -e "${RED}✗ 镜像构建失败${NC}"
    exit 1
fi
echo ""

# ========== Step 5: 推送镜像 ==========
echo -e "${YELLOW}[5/6] 推送镜像到 GHCR...${NC}"

echo -e "推送版本标签: ${IMAGE_TAG}:${VERSION}"
docker push ${IMAGE_TAG}:${VERSION}

echo -e "推送 latest 标签: ${IMAGE_TAG}:latest"
docker push ${IMAGE_TAG}:latest

echo -e "推送分支标签: ${IMAGE_TAG}:${GIT_BRANCH}"
docker push ${IMAGE_TAG}:${GIT_BRANCH}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 镜像推送成功${NC}"
else
    echo -e "${RED}✗ 镜像推送失败${NC}"
    exit 1
fi
echo ""

# ========== Step 6: 完成 ==========
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}✓ 所有步骤完成！${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${YELLOW}镜像地址:${NC}"
echo -e "  ${IMAGE_TAG}:${VERSION}"
echo -e "  ${IMAGE_TAG}:latest"
echo -e "  ${IMAGE_TAG}:${GIT_BRANCH}"
echo ""
echo -e "${YELLOW}查看镜像:${NC}"
echo -e "  https://github.com/${GITHUB_USERNAME}?tab=packages"
echo ""
echo -e "${YELLOW}拉取镜像:${NC}"
echo -e "  docker pull ${IMAGE_TAG}:latest"
echo ""
echo -e "${YELLOW}运行容器:${NC}"
echo -e "  docker run -d -p 3000:3000 \\"
echo -e "    -e MONGODB_URI='mongodb://...' \\"
echo -e "    -e REDIS_URL='redis://...' \\"
echo -e "    ${IMAGE_TAG}:latest"
echo ""

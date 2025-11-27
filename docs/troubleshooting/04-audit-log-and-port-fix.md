# 审计日志优化与端口配置修复报告

**修复日期**: 2025-11-27
**分支**: fix/auth-and-team-list

---

## 一、问题概述

### 1.1 审计日志问题

1. **审计日志显示 ObjectId 而非真实名称**
   - 应用名、数据集名、成员名等显示为 MongoDB ObjectId
   - 影响观感，难以快速识别操作对象

2. **缺少团队/部门/群组成员变更的审计日志**
   - 邀请成员、成员离开没有日志记录
   - 部门添加/移除成员没有日志记录
   - 群组成员变更没有日志记录

3. **审计日志成员变更不够具体**
   - 日志只显示操作类型，不显示具体被操作的成员姓名

### 1.2 端口配置问题

- 项目默认端口需要统一为 3000

---

## 二、修复方案

### 2.1 新建名称查询服务

创建文件: `src/packages/service/support_permission/collaborator/nameQuery.ts`

提供以下查询函数：

| 函数 | 说明 |
|------|------|
| `getAppNameAndType(appId)` | 查询应用名称和类型 |
| `getDatasetNameAndType(datasetId)` | 查询数据集名称和类型 |
| `getMemberName(tmbId)` | 查询单个成员名称 |
| `getMemberNames(tmbIds)` | 批量查询成员名称 |
| `getGroupName(groupId)` | 查询单个群组名称 |
| `getGroupNames(groupIds)` | 批量查询群组名称 |
| `getOrgName(orgId)` | 查询单个部门名称 |
| `getOrgNames(orgIds)` | 批量查询部门名称 |

**使用示例**:
```typescript
import { getAppNameAndType, getMemberNames } from '@fastgpt/service/support_permission/collaborator/nameQuery';

const [appInfo, memberNames] = await Promise.all([
  getAppNameAndType(appId),
  getMemberNames(tmbIds)
]);

// appInfo = { name: "我的应用", type: "simple" }
// memberNames = ["张三", "李四"]
```

### 2.2 修复的 API 文件

#### 协作者管理 API（显示真实名称）

| 文件 | 修复内容 |
|------|---------|
| `pages/api/core/app/collaborator/update.ts` | 查询应用名、成员名、群组名、部门名 |
| `pages/api/core/app/collaborator/delete.ts` | 查询应用名、成员名、群组名、部门名 |
| `pages/api/core/dataset/collaborator/update.ts` | 查询数据集名、成员名、群组名、部门名 |
| `pages/api/core/dataset/collaborator/delete.ts` | 查询数据集名、成员名、群组名、部门名 |

#### 成员管理 API（新增审计日志）

| 文件 | 新增审计事件 | 说明 |
|------|-------------|------|
| `pages/api/support/user/team/member/invite.ts` | `JOIN_TEAM` | 记录被邀请成员的名称 |
| `pages/api/support/user/team/member/leave.ts` | `KICK_OUT_TEAM` | 记录离开成员的名称（标注"主动离开"） |

#### 部门成员管理 API（优化审计日志）

| 文件 | 审计事件 | 优化内容 |
|------|---------|---------|
| `pages/api/support/user/team/org/updateMembers.ts` | `CHANGE_DEPARTMENT` | 显示具体添加的成员名称，如"研发部（添加成员：张三、李四）" |
| `pages/api/support/user/team/org/deleteMember.ts` | `CHANGE_DEPARTMENT` | 显示具体移除的成员名称，如"研发部（移除成员：王五）" |

#### 群组成员管理 API（新增审计日志）

| 文件 | 审计事件 | 优化内容 |
|------|---------|---------|
| `pages/api/support/user/team/group/update.ts` | `CREATE_GROUP` | 显示具体的成员变更，如"测试群组（添加成员：张三；移除成员：李四）" |

### 2.3 端口配置更新

修改文件: `package.json`

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "start": "next start -p 3000"
  }
}
```

**Docker 配置验证**:
- `Dockerfile`: 已配置 `EXPOSE 3000` 和 `ENV PORT=3000`
- `docker-compose.yml`: 已配置端口映射 `3000:3000`

---

## 三、审计日志格式示例

### 3.1 协作者变更

```json
{
  "event": "UPDATE_APP_COLLABORATOR",
  "metadata": {
    "appName": "智能客服",
    "appType": "simple",
    "tmbList": ["张三", "李四"],
    "groupList": ["研发组"],
    "orgList": ["产品部"],
    "permission": "6"
  }
}
```

### 3.2 团队成员变更

**邀请成员**:
```json
{
  "event": "JOIN_TEAM",
  "metadata": {
    "memberName": "张三"
  }
}
```

**成员离开**:
```json
{
  "event": "KICK_OUT_TEAM",
  "metadata": {
    "memberName": "张三（主动离开）"
  }
}
```

### 3.3 部门成员变更

**添加成员到部门**:
```json
{
  "event": "CHANGE_DEPARTMENT",
  "metadata": {
    "departmentName": "研发部（添加成员：张三、李四）"
  }
}
```

**从部门移除成员**:
```json
{
  "event": "CHANGE_DEPARTMENT",
  "metadata": {
    "departmentName": "研发部（移除成员：王五）"
  }
}
```

### 3.4 群组成员变更

```json
{
  "event": "CREATE_GROUP",
  "metadata": {
    "groupName": "测试群组（添加成员：张三；移除成员：李四）"
  }
}
```

---

## 四、关键代码片段

### 4.1 名称查询服务核心逻辑

```typescript
// src/packages/service/support_permission/collaborator/nameQuery.ts

export async function getAppNameAndType(appId: string): Promise<{ name: string; type: string }> {
  try {
    const db = connectionMongo.connection.db;
    if (!db) {
      return { name: appId, type: 'app' };
    }
    const app = await db.collection(AppsCollectionName).findOne(
      { _id: new Types.ObjectId(appId) },
      { projection: { name: 1, type: 1 } }
    );
    if (app) {
      return { name: app.name || appId, type: app.type || 'app' };
    }
    return { name: appId, type: 'app' };
  } catch (error) {
    return { name: appId, type: 'app' };
  }
}
```

### 4.2 群组成员变更审计日志

```typescript
// pages/api/support/user/team/group/update.ts

if (toRemove.length > 0 || toAdd.length > 0) {
  const allTmbIds = [...toRemove, ...toAdd];
  const memberInfos = await MongoTeamMemberModel.find({
    _id: { $in: allTmbIds }
  }).lean();

  const tmbIdToName = new Map<string, string>();
  memberInfos.forEach((m) => {
    tmbIdToName.set(String(m._id), m.name || String(m._id));
  });

  const changes: string[] = [];
  if (toAdd.length > 0) {
    const addedNames = toAdd.map((id) => tmbIdToName.get(id) || id).join('、');
    changes.push(`添加成员：${addedNames}`);
  }
  if (toRemove.length > 0) {
    const removedNames = toRemove.map((id) => tmbIdToName.get(id) || id).join('、');
    changes.push(`移除成员：${removedNames}`);
  }

  await addAuditLog({
    teamId,
    tmbId: currentTmbId,
    event: AuditEventEnum.CREATE_GROUP,
    metadata: { groupName: `${existingGroup.name}（${changes.join('；')}）` }
  });
}
```

---

## 五、部署说明

### 5.1 开发环境

```bash
# 使用 pnpm 启动开发服务器（端口 3000）
pnpm dev
```

### 5.2 生产环境（Docker）

```bash
# 构建镜像
docker build -t fastgpt-pro .

# 运行容器（端口 3000）
docker run -p 3000:3000 fastgpt-pro
```

### 5.3 使用 docker-compose

```bash
docker-compose up -d
```

---

## 六、注意事项

1. **名称查询容错**: 如果查询失败，会返回原始 ID，不会影响审计日志记录
2. **批量操作性能**: 批量添加/移除成员时使用批量查询，减少数据库访问次数
3. **日志格式统一**: 所有成员名称使用中文顿号（、）分隔

---

## 七、修复文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/packages/service/support_permission/collaborator/nameQuery.ts` | 新增 | 名称查询服务 |
| `pages/api/core/app/collaborator/update.ts` | 修改 | 协作者审计日志显示真实名称 |
| `pages/api/core/app/collaborator/delete.ts` | 修改 | 协作者审计日志显示真实名称 |
| `pages/api/core/dataset/collaborator/update.ts` | 修改 | 协作者审计日志显示真实名称 |
| `pages/api/core/dataset/collaborator/delete.ts` | 修改 | 协作者审计日志显示真实名称 |
| `pages/api/support/user/team/member/invite.ts` | 修改 | 新增邀请成员审计日志 |
| `pages/api/support/user/team/member/leave.ts` | 修改 | 新增成员离开审计日志 |
| `pages/api/support/user/team/org/updateMembers.ts` | 修改 | 优化部门成员添加日志 |
| `pages/api/support/user/team/org/deleteMember.ts` | 修改 | 优化部门成员移除日志 |
| `pages/api/support/user/team/group/update.ts` | 修改 | 新增群组成员变更审计日志 |
| `package.json` | 修改 | 端口配置改为 3000 |

---

**文档维护者**: Claude Code
**最后更新**: 2025-11-27

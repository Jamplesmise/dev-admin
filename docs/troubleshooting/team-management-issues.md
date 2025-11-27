# 团队管理功能不可用问题诊断报告

**日期**: 2025-11-27
**状态**: ✅ 已修复
**最后更新**: 2025-11-27
**影响范围**: 成员、部门、群组、审计、权限相关功能

---

## 修复进度总览

### 第一阶段：API 返回格式修复

| 优先级 | 问题 | 状态 | 修复文件 |
|--------|-----|------|---------|
| **P0** | 群组列表返回格式严重不匹配 | ✅ 已修复 | `pages/api/support/user/team/group/list.ts` |
| **P0** | 缺失 `/team/member/invite` API | ✅ 已实现 | `pages/api/support/user/team/member/invite.ts` |
| **P0** | 缺失 Permission 基类和 TeamPermission | ✅ 已同步 | `src/packages/global/support/permission/*` |
| **P1** | 团队列表缺失字段 | ✅ 已修复 | `pages/api/support/user/team/list.ts` |
| **P1** | 成员列表缺失字段 | ✅ 已修复 | `pages/api/support/user/team/member/list.ts` |
| **P1** | 枚举值不匹配 | ✅ 已同步 | `src/packages/global/support_user_team/constant.ts` |
| **P1** | 部门列表缺失 permission | ✅ 已修复 | `pages/api/support/user/team/org/list.ts` |
| **P2** | 协作者 permission 格式错误 | ✅ 已修复 | `pages/api/support/user/team/collaborator/list.ts` |
| **P2** | 审计日志 SourceMemberType 不匹配 | ✅ 已修复 | `pages/api/support/user/audit/list.ts` |
| **P2** | 缺失 `/core/app/changeOwner` API | ✅ 已实现 | `pages/api/core/app/changeOwner.ts` |

### 第二阶段：权限检查逻辑重构

| 问题 | 状态 | 修复文件 |
|-----|------|---------|
| 创建 `getTeamMemberPermission` 函数 | ✅ 已实现 | `src/packages/service/support_permission/controller.ts` |
| 移除 `TeamMemberRoleEnum.admin` 引用 | ✅ 已修复 | 16 个 API 文件 |
| 移除 `TeamMemberRoleEnum.member` 引用 | ✅ 已修复 | 3 个 API 文件 |
| 移除 `TeamMemberStatusEnum.waiting` 引用 | ✅ 已修复 | 4 个 API 文件 |
| 废弃 `updateInvite` API | ✅ 已标记 | `pages/api/support/user/team/member/updateInvite.ts` |

### 第三阶段：邀请链接 API 返回格式修复

| 问题 | 状态 | 修复文件 |
|-----|------|---------|
| `create` API 返回对象导致 `[object Object]` | ✅ 已修复 | `pages/api/support/user/team/invitationLink/create.ts` |
| `list` API 返回格式不匹配 `InvitationType[]` | ✅ 已修复 | `pages/api/support/user/team/invitationLink/list.ts` |
| `info` API 返回格式不匹配 `InvitationInfoType` | ✅ 已修复 | `pages/api/support/user/team/invitationLink/info.ts` |
| `forbid` API 返回格式错误 | ✅ 已修复 | `pages/api/support/user/team/invitationLink/forbid.ts` |
| `accept` API 返回格式错误 | ✅ 已修复 | `pages/api/support/user/team/invitationLink/accept.ts` |
| Schema 缺少 `description` 字段 | ✅ 已修复 | `src/packages/service/support_user/team/invitationLink/schema.ts` |
| Redis `getAllKeysByPrefix` 双重前缀问题 | ✅ 已修复 | `src/packages/service/common/redis/index.ts` |

---

## 修复详情

### 1. 权限系统同步（P0）

从官方 FastGPT 同步了完整的权限系统：

**新增文件**：
- `src/packages/global/support/permission/type.ts` - 权限类型定义
- `src/packages/global/support/permission/constant.ts` - 权限常量
- `src/packages/global/support/permission/controller.ts` - Permission 基类
- `src/packages/global/support/permission/utils.ts` - 权限工具函数
- `src/packages/global/support/permission/collaborator.d.ts` - 协作者类型
- `src/packages/global/support/permission/user/constant.ts` - 团队权限常量
- `src/packages/global/support/permission/user/controller.ts` - TeamPermission 类
- `src/packages/global/support/permission/memberGroup/constant.ts` - 群组角色常量
- `src/packages/global/support/permission/memberGroup/type.d.ts` - 群组类型定义
- `src/packages/global/support/permission/memberGroup/api.d.ts` - 群组 API 类型
- `src/packages/global/support/permission/index.ts` - 导出索引

**辅助文件**：
- `src/packages/global/common/type/utils.d.ts` - RequireOnlyOne 类型
- `src/packages/global/common/type/pagination.d.ts` - 分页类型
- `src/packages/global/web/i18n/utils.ts` - i18n 简化版

### 2. 群组列表修复（P0 - 原导致闪退）

**修复内容**：
- 返回格式从简单对象改为完整的 `MemberGroupListItemType`
- 添加 `members`, `count`, `owner`, `permission` 字段
- `permission` 返回 `Permission` 类实例
- 请求方式支持 POST（`withMembers` 参数）

**修改前**：
```typescript
{
  _id, teamId, name, avatar, createTime, updateTime,
  memberCount: number  // ❌ 命名错误
}
```

**修改后**：
```typescript
{
  _id, teamId, name, avatar, updateTime,
  members: [{ tmbId, name, avatar }],
  count: number,
  owner: { tmbId, name, avatar },
  permission: Permission  // ✅ Permission 类实例
}
```

### 3. 团队列表修复（P1）

**修复内容**：
- 添加所有必需字段：`teamAvatar`, `memberName`, `balance`, `teamDomain`, `notificationAccount`
- `permission` 返回 `TeamPermission` 类实例
- 添加第三方账户信息：`lafAccount`, `openaiAccount`, `externalWorkflowVariables`

### 4. 成员列表修复（P1）

**修复内容**：
- 添加 `teamId`, `permission`, `orgs` 字段
- `permission` 返回 `TeamPermission` 类实例
- 支持 `withOrgs`, `withPermission` 参数
- 返回分页格式 `{ total, list }`

### 5. 枚举值同步（P1）

**修改文件**：`src/packages/global/support_user_team/constant.ts`

**修改内容**：
- `TeamMemberRoleEnum`：只保留 `owner`（删除 `admin`, `member`）
- `TeamMemberStatusEnum`：删除 `waiting` 状态
- 添加注释说明权限通过 `TeamPermission` 类计算

### 6. 部门列表修复（P1）

**修复内容**：
- 添加 `permission` 字段，返回 `TeamPermission` 类实例
- 根据用户是否为组织成员计算权限

### 7. 协作者列表修复（P2）

**修复内容**：
- 修改返回类型为 `CollaboratorListType`
- `permission` 从数字改为 `Permission` 类实例

### 8. 审计日志修复（P2）

**修改文件**：
- `src/packages/global/support_user_audit/type.d.ts`
- `pages/api/support/user/audit/list.ts`

**修改内容**：
- `SourceMemberType` 字段从 `{ tmbId, memberName, avatar }` 改为 `{ name, avatar, status }`
- 添加 `status` 字段，使用 `TeamMemberStatusEnum`

### 9. 新增 API

**`/team/member/invite`**：
- 根据用户名/邮箱邀请成员加入团队
- 返回 `{ invite, inValid, inTeam }` 分类结果

**`/core/app/changeOwner`**：
- 应用所有权转让
- 验证新所有者是有效的团队成员

### 10. 权限检查逻辑重构（第二阶段）

**问题背景**：
第一阶段修复后，枚举 `TeamMemberRoleEnum` 只保留了 `owner`，但原有代码中大量使用了 `admin` 和 `member` 值进行权限检查，导致编译错误。

**解决方案**：

1. **创建 `getTeamMemberPermission` 函数**
   ```typescript
   // src/packages/service/support_permission/controller.ts
   export const getTeamMemberPermission = async ({
     teamId,
     tmbId,
     role
   }: {
     teamId: string;
     tmbId: string;
     role: `${TeamMemberRoleEnum}`;
   }): Promise<TeamPermission> => {
     // owner 直接返回 owner 权限
     if (role === TeamMemberRoleEnum.owner) {
       return new TeamPermission({ isOwner: true });
     }
     // 其他角色通过协作者权限计算
     const teamPermission = await calculatePermission({...});
     return new TeamPermission({ role: teamPermission });
   };
   ```

2. **权限检查方式变更**

   **修改前**：
   ```typescript
   if (member.role !== TeamMemberRoleEnum.owner &&
       member.role !== TeamMemberRoleEnum.admin) {
     throw new Error('权限不足');
   }
   ```

   **修改后**：
   ```typescript
   const permission = await getTeamMemberPermission({
     teamId, tmbId,
     role: member.role as `${TeamMemberRoleEnum}`
   });
   if (!permission.isOwner && !permission.hasManagePer) {
     throw new Error('权限不足');
   }
   ```

3. **新成员不再设置 role 字段**

   **修改前**：
   ```typescript
   await MongoTeamMemberModel.create({
     teamId, userId, name,
     role: TeamMemberRoleEnum.member,  // ❌ 已删除
     status: TeamMemberStatusEnum.active
   });
   ```

   **修改后**：
   ```typescript
   await MongoTeamMemberModel.create({
     teamId, userId, name,
     status: TeamMemberStatusEnum.active
     // 普通成员不设置 role，权限通过协作者系统控制
   });
   ```

4. **废弃的 API**

   `updateInvite` API 已标记为废弃，因为 `waiting` 状态已被移除。邀请功能通过 `invitationLink` 系统实现。

**修改的文件列表**：

| 文件 | 修改内容 |
|------|---------|
| `invitationLink/create.ts` | 使用 `getTeamMemberPermission` 检查权限 |
| `invitationLink/forbid.ts` | 使用 `getTeamMemberPermission` 检查权限 |
| `invitationLink/accept.ts` | 移除 member role，新成员不设置 role |
| `invitationLink/info.ts` | 移除 waiting 状态引用 |
| `member/restore.ts` | 使用 `getTeamMemberPermission` 检查权限 |
| `member/updateNameByManager.ts` | 使用 `getTeamMemberPermission` 检查权限 |
| `member/export.ts` | 简化 role 映射，移除 admin/member |
| `member/updateInvite.ts` | 标记为废弃 |
| `collaborator/delete.ts` | 使用 `getTeamMemberPermission` 检查权限 |
| `collaborator/update.ts` | 使用 `getTeamMemberPermission` 检查权限 |
| `collaborator/updateOne.ts` | 使用 `getTeamMemberPermission` 检查权限 |
| `updateNotificationAccount.ts` | 动态导入 `getTeamMemberPermission` |
| `invoiceAccount/update.ts` | 动态导入 `getTeamMemberPermission` |
| `sync.ts` | 移除 member role，动态导入权限检查 |
| `plan/getTeamPlans.ts` | 移除 waiting 状态引用 |
| `dataset/changeOwner.ts` | 动态导入 `getTeamMemberPermission` |
| `dataset/datasetSync.ts` | 动态导入 `getTeamMemberPermission` |
| `dataset/collection/create/externalFileUrl.ts` | 动态导入 `getTeamMemberPermission` |
| `promotion/getPromotions.ts` | 动态导入 `getTeamMemberPermission` |

### 11. 邀请链接 API 返回格式修复（第三阶段）

**问题背景**：
前端创建邀请链接后，复制的链接显示为 `[object Object]`，而不是正确的 linkId。

**根本原因**：
前端 `postCreateInvitationLink` API 期望返回 `string` (linkId)，但后端返回的是对象 `{linkId, link, expireTime, maxUsage}`。

**解决方案**：

1. **`create` API 修复**
   - 请求参数从 `{maxUsage, expireDays}` 改为 `{description, expires, usedTimesLimit}`（匹配前端格式）
   - 返回值从对象改为 `string` (linkId)
   - 添加 `expires` 到天数的转换逻辑（'30m' | '7d' | '1y'）

2. **`list` API 修复**
   - 返回值从 `{list: [...]}` 改为 `InvitationType[]`（直接返回数组）
   - 字段映射：`maxUsage` → `usedTimesLimit`，`status` → `forbidden`，`expireTime` → `expires`

3. **`info` API 修复**
   - 返回值改为 `InvitationInfoType`（包含完整邀请链接信息 + teamAvatar, teamName）
   - 无效链接直接抛出错误，而不是返回空对象

4. **`forbid` API 修复**
   - `forbid` 参数改为可选（默认 true，表示禁用）
   - 返回值从 `{success: boolean}` 改为 `string`

5. **`accept` API 修复**
   - 返回值从 `{teamId, teamName}` 改为 `string` (teamId)

6. **Schema 修复**
   - 添加 `description` 字段到邀请链接 Schema

7. **Redis 前缀修复**
   - `getAllKeysByPrefix` 函数移除重复的前缀拼接
   - 原因：Redis 客户端配置了 `keyPrefix: 'fastgpt:'`，但函数又手动加了一次前缀

**前端期望的类型定义**：

```typescript
// 创建邀请链接请求
type InvitationLinkCreateType = {
  description: string;
  expires: '30m' | '7d' | '1y';
  usedTimesLimit: 1 | -1;
};

// 邀请链接列表项
type InvitationType = {
  _id: string;
  linkId: string;
  teamId: string;
  usedTimesLimit?: number;  // -1 表示无限制
  forbidden?: boolean;
  expires: Date;
  description: string;
  members: { tmbId, avatar, name }[];
};

// 邀请链接详情
type InvitationInfoType = InvitationType & {
  teamAvatar: string;
  teamName: string;
};
```

---

## 验证方法

### API 验证

```bash
# 测试团队列表
curl -X GET 'http://localhost:4000/api/support/user/team/list?status=active' \
  -H "Cookie: fastgpt_token=xxx"

# 测试群组列表
curl -X POST 'http://localhost:4000/api/support/user/team/group/list' \
  -H "Cookie: fastgpt_token=xxx" \
  -H "Content-Type: application/json" \
  -d '{"withMembers": true}'

# 测试成员列表
curl -X POST 'http://localhost:4000/api/support/user/team/member/list' \
  -H "Cookie: fastgpt_token=xxx" \
  -H "Content-Type: application/json" \
  -d '{"withPermission": true, "withOrgs": true}'

# 测试创建邀请链接（返回 linkId 字符串）
curl -X POST 'http://localhost:4000/api/support/user/team/invitationLink/create' \
  -H "Cookie: fastgpt_token=xxx" \
  -H "Content-Type: application/json" \
  -d '{"description": "测试邀请", "expires": "7d", "usedTimesLimit": -1}'

# 测试邀请链接列表（返回 InvitationType[]）
curl -X GET 'http://localhost:4000/api/support/user/team/invitationLink/list' \
  -H "Cookie: fastgpt_token=xxx"

# 测试邀请链接信息（无需认证）
curl -X GET 'http://localhost:4000/api/support/user/team/invitationLink/info?linkId=xxx'

# 测试禁用邀请链接
curl -X PUT 'http://localhost:4000/api/support/user/team/invitationLink/forbid' \
  -H "Cookie: fastgpt_token=xxx" \
  -H "Content-Type: application/json" \
  -d '{"linkId": "xxx"}'
```

### 前端验证

1. 登录后查看团队列表是否正常显示
2. 进入群组管理页面，确认不再闪退
3. 检查成员管理页面是否能正常加载
4. 检查权限控制按钮是否正确显示/隐藏
5. 检查部门管理功能
6. **邀请链接功能**：
   - 点击"邀请成员"按钮
   - 创建邀请链接，确认复制的链接格式正确（不是 `[object Object]`）
   - 邀请链接列表正常显示
   - 禁用/启用邀请链接功能正常

---

## 构建验证

所有修复已通过 `pnpm build` 验证：

```bash
$ pnpm build
# ... 构建成功，无错误
```

---

## 备注

1. **官方设计**：官方 `TeamMemberRoleEnum` 只有 `owner`，其他权限通过 `TeamPermission` 类的 role 位运算计算
2. **权限存储**：权限值存储在 `collaborators` 集合，通过 `tmbId` 关联，`resourceType: 'team'` 表示团队级别权限
3. **团队创建**：官方前端没有创建团队的 UI 入口，这是官方设计决定
4. **群组角色**：群组内的角色（owner/admin/member）与团队成员角色是独立的
5. **邀请机制**：官方已移除 `waiting` 状态，成员通过邀请链接加入后直接变为 `active` 状态
6. **权限检查**：使用 `getTeamMemberPermission` 函数统一检查权限，支持 `isOwner` 和 `hasManagePer` 两种判断
7. **邀请链接 API**：所有邀请链接 API 的返回格式已与前端期望对齐，create 返回 linkId 字符串，list 返回 InvitationType 数组
8. **Redis 前缀**：全局 Redis 连接配置了 `keyPrefix: 'fastgpt:'`，使用 `getGlobalRedisConnection()` 时无需手动添加前缀

---

## 历史问题记录

以下是修复前的问题诊断记录，保留用于参考：

<details>
<summary>点击展开历史诊断记录</summary>

### 原问题现象

团队管理的成员、部门、群组、审计、权限相关的功能几乎都不可用。数据能创建但前端不显示。

**特别严重**：群组页面点击直接闪退。

### 根本原因

Pro 服务返回的数据格式与官方 FastGPT 前端期望的格式不一致：

- `permission` 返回数字而非 `TeamPermission` 类实例
- `TeamMemberRoleEnum` 包含无效值 `admin`, `member`
- 群组列表缺少 `members`, `owner`, `permission` 字段
- 团队列表缺少多个必需字段

### API 覆盖率统计（修复前）

| 统计项 | 数量 |
|--------|------|
| 前端调用的 proApi 总数 | 113 |
| Pro 已实现 API 数量 | 115 |
| 前端需要但未实现 | 2 |

未实现的 API：
- `/core/app/changeOwner` - 已实现
- `/support/user/team/member/invite` - 已实现

</details>

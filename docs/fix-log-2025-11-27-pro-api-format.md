# Pro API 返回格式修复记录

**日期**: 2025-11-27
**问题**: Pro 功能前端显示不正常，邀请链接创建后不显示

---

## 问题分析

通过本地部署 FastGPT 主项目 + Pro API + fastgpt-plugin 三个服务进行联调，发现 Pro API 的返回格式与官方 FastGPT 前端期望的格式不一致。

### 服务配置
- FastGPT 主项目: `http://localhost:5050`
- Pro API: `http://localhost:5051`
- fastgpt-plugin: `http://localhost:5052`

---

## 修复内容

### 1. team/list API 返回格式修复

**文件**: `pages/api/support/user/team/list.ts`

**问题**: 返回字段与官方 `TeamTmbItemType` 不匹配

**修复前返回**:
```typescript
{
  teamId, tmbId, userId, teamName, avatar, role, status,
  defaultTeam, canWrite, permission: number
}
```

**修复后返回** (与官方一致):
```typescript
{
  userId, teamId, teamAvatar, teamName, memberName, avatar,
  balance, tmbId, teamDomain, role, status, notificationAccount,
  permission: {
    role, isOwner, hasManagePer, hasWritePer, hasReadPer,
    hasManageRole, hasWriteRole, hasReadRole,
    hasAppCreateRole, hasDatasetCreateRole, hasApikeyCreateRole,
    hasAppCreatePer, hasDatasetCreatePer, hasApikeyCreatePer
  },
  lafAccount, openaiAccount, externalWorkflowVariables
}
```

---

### 2. invitationLink/create API 返回格式修复

**文件**: `pages/api/support/user/team/invitationLink/create.ts`

**问题**: 返回对象，但官方期望返回 `string`（linkId）

**修复前**:
- 请求参数: `{ maxUsage, expireDays }`
- 返回: `{ linkId, link, expireTime, maxUsage }`

**修复后** (与官方一致):
- 请求参数: `{ description, expires: '30m' | '7d' | '1y', usedTimesLimit: 1 | -1 }`
- 返回: `string` (linkId)

---

### 3. invitationLink/list API 返回格式修复

**文件**: `pages/api/support/user/team/invitationLink/list.ts`

**问题**: 返回 `{ list: [...] }`，但官方期望返回 `InvitationType[]`

**修复前**:
```typescript
{
  list: [{
    linkId, link, expireTime, maxUsage, usedCount,
    status, createTime, creatorName
  }]
}
```

**修复后** (与官方一致):
```typescript
[{
  _id, linkId, teamId, usedTimesLimit, forbidden,
  expires, description,
  members: [{ tmbId, avatar, name }]
}]
```

---

### 4. InvitationLink Schema 更新

**文件**: `src/packages/service/support_user/team/invitationLink/schema.ts`

新增字段:
- `usedTimesLimit`: 使用次数限制 (-1 不限制，1 一次性)
- `expires`: 过期时间（官方字段名）
- `description`: 链接描述
- `members`: 已加入的成员 tmbId 列表
- `forbidden`: 是否禁用

---

### 5. InvitationLink Controller 更新

**文件**: `src/packages/service/support_user/team/invitationLink/controller.ts`

- 支持 `expireTime` 和 `description` 参数
- 创建时同时设置 `expires`, `usedTimesLimit`, `members`, `forbidden` 字段

---

## 官方类型参考

### TeamTmbItemType
来源: `FastGPT/packages/global/support/user/team/type.d.ts`

```typescript
type TeamTmbItemType = {
  userId: string;
  teamId: string;
  teamAvatar?: string;
  teamName: string;
  memberName: string;
  avatar: string;
  balance?: number;
  tmbId: string;
  teamDomain: string;
  role: `${TeamMemberRoleEnum}`;
  status: `${TeamMemberStatusEnum}`;
  notificationAccount?: string;
  permission: TeamPermission;
} & ThirdPartyAccountType;
```

### InvitationType
来源: `FastGPT/packages/service/support/user/team/invitationLink/type.ts`

```typescript
type InvitationType = {
  _id: string;
  linkId: string;
  teamId: string;
  usedTimesLimit?: number;
  forbidden?: boolean;
  expires: Date;
  description: string;
  members: {
    tmbId: string;
    avatar: string;
    name: string;
  }[];
};
```

### InvitationLinkCreateType
```typescript
type InvitationLinkCreateType = {
  description: string;
  expires: '30m' | '7d' | '1y';
  usedTimesLimit: 1 | -1;
};
```

---

### 6. audit/list API 返回格式修复

**文件**: `pages/api/support/user/audit/list.ts`

**问题**:
1. `SourceMemberType` 字段与官方不匹配
2. 前端显示 `【{{name}}】登录了系统` 而不是实际用户名

**根本原因**: 前端使用 i18n 翻译函数 `t(i18nData.content, metadata)` 渲染详情，模板 `【{{name}}】登录了系统` 中的 `{{name}}` 需要从 `metadata` 对象中获取，而不是从 `sourceMember` 中。

**修复前**:
```typescript
sourceMember: {
  tmbId: string;
  memberName: string;
  avatar?: string;
}
metadata: { ...原始metadata }
```

**修复后** (与官方一致):
```typescript
sourceMember: {
  name: string;
  avatar: string;
  status: string;
}
// 关键：将 name 注入到 metadata 中供前端模板渲染
metadata: {
  ...原始metadata,
  name: memberName  // 注入用户名
}
```

**代码修改**:
- MongoDB 聚合 `$project` 阶段改为使用 `name` 字段
- 结果映射时将 `sourceMember.name` 注入到 `metadata` 对象中
- 添加 `status` 字段 (默认 'active')

---

### 7. SourceMemberType 类型定义更新

**文件**: `src/packages/global/support_user_audit/type.d.ts`

**修复前**:
```typescript
export type SourceMemberType = {
  tmbId: string;
  memberName: string;
  avatar?: string;
};
```

**修复后** (与官方一致):
```typescript
export type SourceMemberType = {
  name: string;
  avatar: string;
  status: string;
};
```

---

### 8. group/list API 返回格式修复

**文件**: `pages/api/support/user/team/group/list.ts`

**问题**: 返回格式与官方 `MemberGroupListItemType<true>` 不匹配，导致前端报错 `Cannot read properties of undefined (reading 'map')`

**修复前**:
```typescript
{
  _id, teamId, name, avatar, createTime, updateTime,
  memberCount: number  // 错误字段名
}
```

**修复后** (与官方一致):
```typescript
{
  _id, teamId, name, avatar, updateTime,
  members: { tmbId, name, avatar }[],  // 成员数组
  count: number,                        // 成员数量
  owner?: { tmbId, name, avatar },      // 群组所有者
  permission: { role, isOwner, hasManagePer, hasWritePer, hasReadPer }
}
```

**代码修改**:
- 支持 `withMembers` 参数控制是否返回成员详情
- 返回 `members` 数组代替 `memberCount`
- 添加 `count`、`owner`、`permission` 字段

---

### 9. group/members API 返回格式修复

**文件**: `pages/api/support/user/team/group/members.ts`

**问题**: 返回字段 `memberName` 应为 `name`

**修复前**:
```typescript
{ tmbId, memberName, avatar, role }
```

**修复后** (与官方一致):
```typescript
{ tmbId, name, avatar, role }
```

---

### 10. org/list API 参数格式修复

**文件**: `pages/api/support/user/team/org/list.ts`

**问题**: 参数名与官方不匹配，导致前端一直显示"请求中"

**修复前**:
- 请求方式: GET (query 参数)
- 参数: `{ parentId?: string }`

**修复后** (与官方一致):
- 请求方式: POST (body 参数)
- 参数: `{ orgId?: string, withPermission?: boolean, searchKey?: string }`

---

### 11. org/create API 参数格式修复

**文件**: `pages/api/support/user/team/org/create.ts`

**问题**:
1. 参数名与官方不匹配
2. 缺少 ROOT 组织支持，导致创建的部门无法显示

**修复前**:
```typescript
{ parentId?: string, name: string, avatar?: string, description?: string }
// 当 parentId 为空时，创建 path = '' 的部门
```

**修复后** (与官方一致):
```typescript
{ orgId?: string, name: string, description?: string, avatar?: string }
// 当 orgId 为空时，自动创建 ROOT 组织（如果不存在）
// 然后将新部门创建为 ROOT 的子组织
```

**关键改动**:
- 添加 `getOrCreateRootOrg()` 函数，确保每个团队有一个 ROOT 组织（`path = ''`）
- 用户创建的"根级部门"实际是 ROOT 的子组织，`path = '/' + ROOT.pathId`
- 这样前端的 `.filter((org) => org.path !== '')` 过滤不会影响用户创建的部门

---

### 12. org/list API 逻辑修复

**文件**: `pages/api/support/user/team/org/list.ts`

**问题**: 当 `orgId` 为空时，返回 `path = ''` 的组织（ROOT），而前端会过滤掉它们

**修复后**:
- 当 `orgId` 为空时，获取 ROOT 组织的子组织（`path = '/' + ROOT.pathId`）
- 搜索时排除 ROOT 组织（`path !== ''`）

---

## 测试验证

1. 重启 Pro API 服务
2. 访问 FastGPT 前端 `http://localhost:5050`
3. 进入团队管理页面
4. 创建邀请链接，验证是否正常显示
5. 进入群组管理页面，创建群组，验证是否正常显示
6. 进入部门管理页面，验证部门列表是否正常加载，创建子部门是否成功

---

## 后续建议

1. 建立 API 返回格式校验机制，确保与官方类型一致
2. 在开发新 API 时，先查看官方 FastGPT 的类型定义
3. 考虑复用官方的类型定义文件，减少格式不一致的风险

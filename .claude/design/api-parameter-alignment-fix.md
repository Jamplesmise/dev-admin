# API 参数对齐修复记录

## 修复日期: 2025-11-27

## 问题描述

前端使用的 HTTP 请求方法和参数格式与后端 API 实现不一致，导致各种 500 错误。

## 前端请求规则

根据 `FastGPT/projects/app/src/web/common/api/request.ts` 的实现：

```typescript
data: ['POST', 'PUT'].includes(method) ? data : undefined,
params: !['POST', 'PUT'].includes(method) ? data : undefined,
```

- **POST/PUT**: 参数放在 `body` (req.body)
- **GET/DELETE**: 参数放在 `query` (req.query)

---

## 一、组织管理 (Org) API 修复

### 1. org/create.ts
- **问题**: 参数名 `parentId` 与前端不匹配
- **前端期望**: `{ name, description?, avatar?, orgId? }`
- **修复**: `parentId` -> `orgId`

### 2. org/delete.ts
- **问题**: 前端用 DELETE + query，后端只支持 body
- **前端期望**: DELETE `/api/.../delete?orgId=xxx`
- **修复**: 支持 `req.query.orgId || req.body.orgId`

### 3. org/move.ts
- **问题**: 参数名 `targetParentId` 与前端不匹配
- **前端期望**: `{ orgId, targetOrgId? }`
- **修复**: `targetParentId` -> `targetOrgId`

### 4. org/updateMembers.ts
- **问题**: 参数格式不匹配
- **前端期望**: `{ orgId?, members: [{ tmbId }] }`
- **原后端**: `{ orgId?, tmbIds: string[] }`
- **修复**: 改为 `members: [{ tmbId }]` 格式

### 5. org/deleteMember.ts
- **问题**: DELETE 方法应从 query 获取参数
- **前端期望**: DELETE `/api/.../deleteMember?orgId=xxx&tmbId=xxx`
- **修复**: 从 `req.body` 改为 `req.query`

### 6. org/list.ts
- **问题**: 前端过滤 `path !== ''` 导致根级组织不显示
- **修复**: 根级查询时返回 `path: '/'` 兼容前端 bug

---

## 二、团队成员 (Member) API 修复

### 1. member/delete.ts
- **问题**:
  - DELETE 方法应从 query 获取参数
  - 参数名 `memberId` 与前端不匹配
  - 功能未实现
- **前端期望**: DELETE `/api/.../delete?tmbId=xxx`
- **修复**:
  - `memberId` -> `tmbId`
  - 从 `req.body` 改为 `req.query`
  - 完整实现删除逻辑

### 2. member/updateNameByManager.ts
- **问题**: 参数名 `memberName` 与前端不匹配
- **前端期望**: `{ tmbId, name }`
- **修复**: `memberName` -> `name`

### 3. member/updateName.ts
- **问题**: 参数名 `memberName` 与前端不匹配
- **前端期望**: `{ name }`
- **修复**: `memberName` -> `name`

### 4. member/count.ts
- **问题**: 返回格式不匹配
- **前端期望**: `{ count: number }`
- **原后端**: `{ total, active, forbidden, leave }`
- **修复**: 简化返回 `{ count }`

### 5. member/list.ts
- **问题**: 定义了 `groupId` 参数但未实现过滤逻辑，也没有返回 `groupRole`
- **前端期望**:
  - 传入 `groupId` 时按群组过滤成员
  - 返回 `groupRole` 字段 (owner/admin/member)
- **修复**:
  - 实现 `groupId` 过滤逻辑
  - 返回 `groupRole` 字段

---

## 三、分组 (Group) API 修复

### 1. group/members.ts
- **问题**: 返回字段名与前端不匹配
- **前端期望**: `{ tmbId, name, avatar, role }`
- **原后端**: `{ tmbId, memberName, avatar, role }`
- **修复**:
  - `memberName` -> `name`
  - 排序代码中的 `a.memberName` -> `a.name`

### 2. group/create.ts
- **问题**: 创建分组时没有自动将创建者添加为 owner
- **前端期望**: 创建分组后，创建者应自动成为 owner，分组应显示所有者信息
- **修复**:
  - 创建分组后自动将创建者添加为 owner
  - 如果有初始成员列表，将其他成员（排除创建者）添加为 member

### 3. type.d.ts
- **问题**: `GroupMemberItemType` 类型定义
- **前端期望**: `name` 字段
- **原定义**: `memberName` 字段
- **修复**: 更新类型定义

---

## API 参数格式总结

### Org API

| API | 方法 | 参数位置 | 参数格式 |
|-----|------|---------|---------|
| list | POST | body | `{orgId, withPermission?, searchKey?}` |
| create | POST | body | `{name, description?, avatar?, orgId?}` |
| delete | DELETE | query | `{orgId}` |
| update | PUT | body | `{orgId, name?, avatar?, description?}` |
| move | PUT | body | `{orgId, targetOrgId?}` |
| updateMembers | PUT | body | `{orgId?, members:[{tmbId}]}` |
| members | GET | query | `{pageNum, pageSize, orgPath?}` |
| deleteMember | DELETE | query | `{orgId, tmbId}` |

### Member API

| API | 方法 | 参数位置 | 参数格式 |
|-----|------|---------|---------|
| list | POST | body | `{searchKey?, status?, withOrgs?, ...}` |
| count | GET | query | 无 |
| delete | DELETE | query | `{tmbId}` |
| updateName | PUT | body | `{name}` |
| updateNameByManager | PUT | body | `{tmbId, name}` |
| restore | POST | body | `{tmbId}` |
| leave | DELETE | query | 无 |

### Group API

| API | 方法 | 参数位置 | 参数格式 |
|-----|------|---------|---------|
| list | POST | body | `{searchKey?, withMembers?}` |
| create | POST | body | `{name, avatar?, memberIdList?}` |
| delete | DELETE | query | `{groupId}` |
| update | PUT | body | `{groupId, name?, avatar?, memberList?}` |
| members | GET | query | `{groupId}` |
| changeOwner | PUT | body | `{groupId, tmbId}` |

---

## 四、权限相关修复

### 1. search.ts
- **问题**: 空搜索词时报错 "搜索关键词不能为空"
- **前端行为**: 权限页面加载时传 `searchKey=` 空字符串
- **修复**: 允许空搜索，返回所有成员/部门/群组

### 2. collaborator/updateOne.ts 和 collaborator/update.ts
- **问题**: 权限值验证只允许 0-7，但团队权限是 6 位（最大 63）
- **前端传值**: `12` = `read(4) + appCreate(8)`
- **团队权限位定义** (与官方 FastGPT 一致):
  - `manage`: 0b000001 = 1
  - `write`: 0b000010 = 2
  - `read`: 0b000100 = 4
  - `appCreate`: 0b001000 = 8
  - `datasetCreate`: 0b010000 = 16
  - `apikeyCreate`: 0b100000 = 32
- **修复**: 权限验证改为 0-63

### 3. audit/list.ts
- **问题**: 返回的 `metadata` 中没有 `name` 字段
- **前端行为**: 使用 `{{name}}` 模板替换操作人名字，如 `[{{name}}] 登录了系统`
- **原后端**: `metadata` 不包含 `name`，导致显示 `[{{name}}]` 未替换
- **修复**: 在返回时将 `sourceMember.name` 合并到 `metadata.name`

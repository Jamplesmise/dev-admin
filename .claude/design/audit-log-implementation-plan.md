# 审计日志实现计划

## 当前状态

- 已实现 API 总数: **117 个**
- 已记录审计日志的 API: **1 个** (仅登录)
- 需要添加审计日志的 API: **约 35 个**

---

## 需要添加审计日志的 API 列表

### 一、团队管理 (Team) - 13 个

| 事件类型 | API 路径 | 状态 |
|----------|----------|------|
| LOGIN | 登录相关 API | ✅ 已实现 |
| CREATE_INVITATION_LINK | `/team/invitationLink/create` | ⏳ 待添加 |
| JOIN_TEAM | `/team/invitationLink/accept` | ⏳ 待添加 |
| CHANGE_MEMBER_NAME | `/team/member/updateName`, `/team/member/updateNameByManager` | ⏳ 待添加 |
| KICK_OUT_TEAM | `/team/member/delete` | ⏳ 待添加 |
| RECOVER_TEAM_MEMBER | `/team/member/restore` | ⏳ 待添加 |
| CREATE_DEPARTMENT | `/team/org/create` | ⏳ 待添加 |
| CHANGE_DEPARTMENT | `/team/org/update` | ⏳ 待添加 |
| DELETE_DEPARTMENT | `/team/org/delete` | ⏳ 待添加 |
| RELOCATE_DEPARTMENT | `/team/org/move` | ⏳ 待添加 |
| CREATE_GROUP | `/team/group/create` | ⏳ 待添加 |
| DELETE_GROUP | `/team/group/delete` | ⏳ 待添加 |
| ASSIGN_PERMISSION | `/team/collaborator/update`, `/team/collaborator/updateOne` | ⏳ 待添加 |

### 二、应用管理 (App) - 预留，由官方 FastGPT 处理

| 事件类型 | 说明 | 状态 |
|----------|------|------|
| CREATE_APP | 创建应用 | 官方处理 |
| UPDATE_APP_INFO | 更新应用信息 | 官方处理 |
| MOVE_APP | 移动应用 | 官方处理 |
| DELETE_APP | 删除应用 | 官方处理 |
| UPDATE_APP_COLLABORATOR | `/app/collaborator/update` | ⏳ 待添加 |
| DELETE_APP_COLLABORATOR | `/app/collaborator/delete` | ⏳ 待添加 |
| TRANSFER_APP_OWNERSHIP | `/app/changeOwner` | ⏳ 待添加 |

### 三、数据集管理 (Dataset) - 预留，由官方 FastGPT 处理

| 事件类型 | 说明 | 状态 |
|----------|------|------|
| UPDATE_DATASET_COLLABORATOR | `/dataset/collaborator/update` | ⏳ 待添加 |
| DELETE_DATASET_COLLABORATOR | `/dataset/collaborator/delete` | ⏳ 待添加 |
| TRANSFER_DATASET_OWNERSHIP | `/dataset/changeOwner` | ⏳ 待添加 |

### 四、账户相关 (Account) - 7 个

| 事件类型 | API 路径 | 状态 |
|----------|----------|------|
| CHANGE_PASSWORD | `/account/password/updateByCode` | ⏳ 待添加 |
| CHANGE_MEMBER_NAME_ACCOUNT | `/account/updateContact` | ⏳ 待添加 |
| CREATE_INVOICE | `/wallet/bill/invoice/submit` | ⏳ 待添加 |
| SET_INVOICE_HEADER | `/team/invoiceAccount/update` | ⏳ 待添加 |

### 五、评估相关 (Evaluation) - 3 个

| 事件类型 | API 路径 | 状态 |
|----------|----------|------|
| CREATE_EVALUATION | `/app/evaluation/create` | ⏳ 待添加 |
| DELETE_EVALUATION | `/app/evaluation/delete` | ⏳ 待添加 |

---

## 实现方式

### 1. 创建审计日志工具函数

```typescript
// src/packages/service/support_user_audit/utils.ts
import { MongoOperationLog } from './schema';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

export async function addAuditLog<T extends AuditEventEnum>({
  teamId,
  tmbId,
  event,
  metadata
}: {
  teamId: string;
  tmbId: string;
  event: T;
  metadata?: AuditEventParamsType[T];
}) {
  return MongoOperationLog.create({
    teamId,
    tmbId,
    event,
    metadata: metadata || {}
  });
}
```

### 2. 在各 API 中调用

```typescript
// 示例：group/create.ts
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

// 在创建群组成功后
await addAuditLog({
  teamId,
  tmbId,
  event: AuditEventEnum.CREATE_GROUP,
  metadata: { groupName: name }
});
```

---

## 优先级排序

### P0 - 必须实现 (已有 API，高频使用)
1. ✅ LOGIN - 登录
2. ⏳ CREATE_GROUP - 创建群组
3. ⏳ DELETE_GROUP - 删除群组
4. ⏳ CREATE_DEPARTMENT - 创建部门
5. ⏳ DELETE_DEPARTMENT - 删除部门
6. ⏳ KICK_OUT_TEAM - 踢出成员
7. ⏳ ASSIGN_PERMISSION - 分配权限

### P1 - 重要 (安全审计)
8. ⏳ CREATE_INVITATION_LINK - 创建邀请链接
9. ⏳ JOIN_TEAM - 加入团队
10. ⏳ CHANGE_PASSWORD - 修改密码
11. ⏳ UPDATE_APP_COLLABORATOR - 更新应用协作者
12. ⏳ UPDATE_DATASET_COLLABORATOR - 更新数据集协作者

### P2 - 一般
13. ⏳ CHANGE_MEMBER_NAME - 修改成员名称
14. ⏳ RECOVER_TEAM_MEMBER - 恢复成员
15. ⏳ CHANGE_DEPARTMENT - 修改部门
16. ⏳ RELOCATE_DEPARTMENT - 移动部门
17. ⏳ CREATE_INVOICE - 创建发票
18. ⏳ SET_INVOICE_HEADER - 设置发票抬头

---

## 工作量估计

- 创建工具函数: 1 个文件
- 需要修改的 API 文件: 约 25 个
- 每个文件改动: 5-10 行代码
- 总代码量: 约 200 行


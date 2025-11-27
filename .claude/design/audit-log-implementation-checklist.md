# 审计日志实现清单

## 实现进度总览

- [x] **Step 0**: 创建审计日志工具函数
- [x] **Step 1-7**: P0 优先级 API (7个)
- [x] **Step 8-12**: P1 优先级 API (4个已完成, 1个跳过)
- [x] **Step 13-17**: P2 优先级 API (5个已完成)
- [x] **Step 18-25**: P2 优先级 API (8个已完成)

---

## Step 0: 创建审计日志工具函数

**文件**: `src/packages/service/support_user_audit/utils.ts`

**状态**: ✅ 已完成

---

## P0 优先级 - 必须实现 (7个)

### Step 1: CREATE_GROUP - 创建群组

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/group/create.ts` |
| **事件类型** | `AuditEventEnum.CREATE_GROUP` |
| **metadata** | `{ groupName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 2: DELETE_GROUP - 删除群组

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/group/delete.ts` |
| **事件类型** | `AuditEventEnum.DELETE_GROUP` |
| **metadata** | `{ groupName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 3: CREATE_DEPARTMENT - 创建部门

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/org/create.ts` |
| **事件类型** | `AuditEventEnum.CREATE_DEPARTMENT` |
| **metadata** | `{ departmentName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 4: DELETE_DEPARTMENT - 删除部门

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/org/delete.ts` |
| **事件类型** | `AuditEventEnum.DELETE_DEPARTMENT` |
| **metadata** | `{ departmentName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 5: KICK_OUT_TEAM - 踢出成员

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/member/delete.ts` |
| **事件类型** | `AuditEventEnum.KICK_OUT_TEAM` |
| **metadata** | `{ memberName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 6: ASSIGN_PERMISSION - 分配权限 (update)

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/collaborator/update.ts` |
| **事件类型** | `AuditEventEnum.ASSIGN_PERMISSION` |
| **metadata** | `{ objectName: string, permission: string }` |
| **状态** | ✅ 已完成 |

---

### Step 7: ASSIGN_PERMISSION - 分配权限 (updateOne)

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/collaborator/updateOne.ts` |
| **事件类型** | `AuditEventEnum.ASSIGN_PERMISSION` |
| **metadata** | `{ objectName: string, permission: string }` |
| **状态** | ✅ 已完成 |

---

## P1 优先级 - 重要 (5个)

### Step 8: CREATE_INVITATION_LINK - 创建邀请链接

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/invitationLink/create.ts` |
| **事件类型** | `AuditEventEnum.CREATE_INVITATION_LINK` |
| **metadata** | `{ link: string }` |
| **状态** | ✅ 已完成 |

---

### Step 9: JOIN_TEAM - 加入团队

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/invitationLink/accept.ts` |
| **事件类型** | `AuditEventEnum.JOIN_TEAM` |
| **metadata** | `{ link: string }` |
| **状态** | ✅ 已完成 |

---

### Step 10: CHANGE_PASSWORD - 修改密码

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/account/password/updateByCode.ts` |
| **事件类型** | `AuditEventEnum.CHANGE_PASSWORD` |
| **metadata** | `{}` |
| **状态** | ⏭️ 跳过 (该 API 无认证，无 teamId/tmbId) |

---

### Step 11: UPDATE_APP_COLLABORATOR - 更新应用协作者

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/core/app/collaborator/update.ts` |
| **事件类型** | `AuditEventEnum.UPDATE_APP_COLLABORATOR` |
| **metadata** | `{ appName, appType, tmbList, groupList, orgList, permission }` |
| **状态** | ✅ 已完成 |

---

### Step 12: UPDATE_DATASET_COLLABORATOR - 更新数据集协作者

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/core/dataset/collaborator/update.ts` |
| **事件类型** | `AuditEventEnum.UPDATE_DATASET_COLLABORATOR` |
| **metadata** | `{ datasetName, datasetType, tmbList, groupList, orgList, permission }` |
| **状态** | ✅ 已完成 |

---

## P2 优先级 - 一般 (13个)

### Step 13: CHANGE_MEMBER_NAME - 修改成员名称 (自己)

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/member/updateName.ts` |
| **事件类型** | `AuditEventEnum.CHANGE_MEMBER_NAME` |
| **metadata** | `{ memberName: string, newName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 14: CHANGE_MEMBER_NAME - 修改成员名称 (管理员)

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/member/updateNameByManager.ts` |
| **事件类型** | `AuditEventEnum.CHANGE_MEMBER_NAME` |
| **metadata** | `{ memberName: string, newName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 15: RECOVER_TEAM_MEMBER - 恢复成员

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/member/restore.ts` |
| **事件类型** | `AuditEventEnum.RECOVER_TEAM_MEMBER` |
| **metadata** | `{ memberName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 16: CHANGE_DEPARTMENT - 修改部门

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/org/update.ts` |
| **事件类型** | `AuditEventEnum.CHANGE_DEPARTMENT` |
| **metadata** | `{ departmentName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 17: RELOCATE_DEPARTMENT - 移动部门

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/org/move.ts` |
| **事件类型** | `AuditEventEnum.RELOCATE_DEPARTMENT` |
| **metadata** | `{ departmentName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 18: DELETE_APP_COLLABORATOR - 删除应用协作者

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/core/app/collaborator/delete.ts` |
| **事件类型** | `AuditEventEnum.DELETE_APP_COLLABORATOR` |
| **metadata** | `{ appName, appType, itemName, itemValueName }` |
| **状态** | ✅ 已完成 |

---

### Step 19: DELETE_DATASET_COLLABORATOR - 删除数据集协作者

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/core/dataset/collaborator/delete.ts` |
| **事件类型** | `AuditEventEnum.DELETE_DATASET_COLLABORATOR` |
| **metadata** | `{ datasetName, datasetType, itemName, itemValueName }` |
| **状态** | ✅ 已完成 |

---

### Step 20: TRANSFER_APP_OWNERSHIP - 转移应用所有权

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/core/app/changeOwner.ts` |
| **事件类型** | `AuditEventEnum.TRANSFER_APP_OWNERSHIP` |
| **metadata** | `{ appName: string, newOwnerName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 21: TRANSFER_DATASET_OWNERSHIP - 转移数据集所有权

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/core/dataset/changeOwner.ts` |
| **事件类型** | `AuditEventEnum.TRANSFER_DATASET_OWNERSHIP` |
| **metadata** | `{ datasetName: string, newOwnerName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 22: CREATE_INVOICE - 创建发票

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/wallet/bill/invoice/submit.ts` |
| **事件类型** | `AuditEventEnum.CREATE_INVOICE` |
| **metadata** | `{ amount: number }` |
| **状态** | ✅ 已完成 |

---

### Step 23: SET_INVOICE_HEADER - 设置发票抬头

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/support/user/team/invoiceAccount/update.ts` |
| **事件类型** | `AuditEventEnum.SET_INVOICE_HEADER` |
| **metadata** | `{ headerName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 24: CREATE_EVALUATION - 创建评估

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/core/app/evaluation/create.ts` |
| **事件类型** | `AuditEventEnum.CREATE_EVALUATION` |
| **metadata** | `{ appName: string }` |
| **状态** | ✅ 已完成 |

---

### Step 25: DELETE_EVALUATION - 删除评估

| 项目 | 内容 |
|------|------|
| **API 文件** | `pages/api/core/app/evaluation/delete.ts` |
| **事件类型** | `AuditEventEnum.DELETE_EVALUATION` |
| **metadata** | `{ evaluationId: string }` |
| **状态** | ✅ 已完成 |

---

## 实现统计

| 优先级 | 总数 | 已完成 | 跳过 | 待实现 |
|--------|------|--------|------|--------|
| P0 | 7 | 7 | 0 | 0 |
| P1 | 5 | 4 | 1 | 0 |
| P2 | 13 | 13 | 0 | 0 |
| **合计** | **25** | **24** | **1** | **0** |

---

## 已修改文件列表

1. `src/packages/service/support_user_audit/utils.ts` - 新建工具函数
2. `pages/api/support/user/team/group/create.ts` - 添加 CREATE_GROUP 日志
3. `pages/api/support/user/team/group/delete.ts` - 添加 DELETE_GROUP 日志
4. `pages/api/support/user/team/org/create.ts` - 添加 CREATE_DEPARTMENT 日志
5. `pages/api/support/user/team/org/delete.ts` - 添加 DELETE_DEPARTMENT 日志
6. `pages/api/support/user/team/org/update.ts` - 添加 CHANGE_DEPARTMENT 日志
7. `pages/api/support/user/team/org/move.ts` - 添加 RELOCATE_DEPARTMENT 日志
8. `pages/api/support/user/team/member/delete.ts` - 添加 KICK_OUT_TEAM 日志
9. `pages/api/support/user/team/member/restore.ts` - 添加 RECOVER_TEAM_MEMBER 日志
10. `pages/api/support/user/team/member/updateName.ts` - 添加 CHANGE_MEMBER_NAME 日志
11. `pages/api/support/user/team/member/updateNameByManager.ts` - 添加 CHANGE_MEMBER_NAME 日志
12. `pages/api/support/user/team/collaborator/update.ts` - 添加 ASSIGN_PERMISSION 日志
13. `pages/api/support/user/team/collaborator/updateOne.ts` - 添加 ASSIGN_PERMISSION 日志
14. `pages/api/support/user/team/invitationLink/create.ts` - 添加 CREATE_INVITATION_LINK 日志
15. `pages/api/support/user/team/invitationLink/accept.ts` - 添加 JOIN_TEAM 日志
16. `pages/api/core/app/collaborator/update.ts` - 添加 UPDATE_APP_COLLABORATOR 日志
17. `pages/api/core/dataset/collaborator/update.ts` - 添加 UPDATE_DATASET_COLLABORATOR 日志
18. `pages/api/core/app/collaborator/delete.ts` - 添加 DELETE_APP_COLLABORATOR 日志
19. `pages/api/core/dataset/collaborator/delete.ts` - 添加 DELETE_DATASET_COLLABORATOR 日志
20. `pages/api/core/app/changeOwner.ts` - 添加 TRANSFER_APP_OWNERSHIP 日志
21. `pages/api/core/dataset/changeOwner.ts` - 添加 TRANSFER_DATASET_OWNERSHIP 日志
22. `pages/api/support/wallet/bill/invoice/submit.ts` - 添加 CREATE_INVOICE 日志
23. `pages/api/support/user/team/invoiceAccount/update.ts` - 添加 SET_INVOICE_HEADER 日志
24. `pages/api/core/app/evaluation/create.ts` - 添加 CREATE_EVALUATION 日志
25. `pages/api/core/app/evaluation/delete.ts` - 添加 DELETE_EVALUATION 日志

---

## 注意事项

1. **审计日志应在操作成功后记录**，不要在操作前记录
2. **metadata 中的 name 字段**会被前端用于模板替换 `{{name}}`
3. **不要阻塞主流程**：审计日志记录失败不应影响主业务 (工具函数已处理)
4. **敏感信息处理**：密码修改等不记录具体内容，只记录事件发生

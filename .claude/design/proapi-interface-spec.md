# FastGPT Pro API 接口规范文档

**生成时间**: 2025-11-26
**文档用途**: 记录本项目待实现的 proApi 接口详细规范
**数据来源**: FastGPT 官方项目前端代码

---

## 一、待实现接口清单（27 个）

| 序号 | API 路径 | 方法 | 功能描述 | 优先级 |
|------|----------|------|----------|--------|
| 1 | `/api/support/user/sync` | POST | 同步第三方系统成员 | P2 |
| 2 | `/api/support/user/search` | GET | 搜索用户/组织/分组 | P1 |
| 3 | `/api/support/user/team/member/export` | GET | 导出成员列表为CSV | P2 |
| 4 | `/api/support/user/team/updateNotificationAccount` | PUT | 更新团队通知账户 | P2 |
| 5 | `/api/support/user/account/login/wx/getResult` | POST | 获取微信扫码登录结果 | P1 |
| 6 | `/api/support/user/team/collaborator/list` | GET | 获取团队协作者列表 | P1 |
| 7 | `/api/support/user/team/collaborator/update` | POST | 批量更新团队协作者权限 | P1 |
| 8 | `/api/support/user/team/collaborator/updateOne` | PUT | 更新单个协作者权限 | P2 |
| 9 | `/api/support/user/team/collaborator/delete` | DELETE | 删除团队协作者 | P1 |
| 10 | `/api/support/user/team/group/members` | GET | 获取分组成员列表 | P1 |
| 11 | `/api/support/user/team/group/changeOwner` | PUT | 更改分组所有者 | P2 |
| 12 | `/api/support/user/team/org/members` | GET | 获取组织成员列表（分页） | P1 |
| 13 | `/api/support/user/team/tag/list` | GET | 获取团队标签列表 | P2 |
| 14 | `/api/support/user/team/tag/async` | GET | 按域名异步加载团队标签 | P3 |
| 15 | `/api/support/user/team/tag/getAppsByTeamTokens` | GET | 通过团队令牌获取应用列表 | P3 |
| 16 | `/api/support/user/team/invoiceAccount/getTeamInvoiceHeader` | GET | 获取团队发票抬头信息 | P2 |
| 17 | `/api/support/user/team/invoiceAccount/update` | POST | 更新团队发票抬头信息 | P2 |
| 18 | `/api/support/wallet/coupon/redeem` | GET | 兑换优惠券 | P2 |
| 19 | `/api/core/chat/setting/favourite/tags` | PUT | 更新收藏应用的标签 | P2 |
| 20 | `/api/core/app/evaluation/create` | POST | 创建应用评估（文件上传） | P1 |
| 21 | `/api/core/app/template/getTemplateTypes` | GET | 获取应用模板类型列表 | P3 |
| 22 | `/api/core/dataset/datasetSync` | POST | 触发数据集同步 | P2 |
| 23 | `/api/core/dataset/changeOwner` | POST | 更改数据集所有者 | P2 |
| 24 | `/api/core/dataset/collection/create/externalFileUrl` | POST | 通过外部URL创建数据集集合 | P3 |
| 25 | `/api/support/activity/promotion/getPromotions` | POST | 获取推广记录列表（分页） | P2 |

---

## 二、详细接口规范

### 2.1 用户搜索 API

#### `GET /api/support/user/search`

**功能**: 统一搜索用户、组织、分组，用于协作者选择等场景

**请求参数** (Query):
```typescript
{
  searchKey: string;              // 必填，搜索关键词
  members?: boolean;              // 可选，是否搜索成员，默认 true
  orgs?: boolean;                 // 可选，是否搜索组织，默认 true
  groups?: boolean;               // 可选，是否搜索分组，默认 true
}
```

**响应数据**:
```typescript
type SearchResult = {
  members: Array<{
    userId: string;               // 用户 ID
    tmbId: string;                // 团队成员 ID
    memberName: string;           // 成员名称
    avatar: string;               // 头像 URL
    role: TeamMemberRoleEnum;     // 角色: 'owner' | 'admin' | 'member'
    status: TeamMemberStatusEnum; // 状态: 'active' | 'waiting' | 'inactive'
    contact?: string;             // 联系方式
    createTime: Date;             // 加入时间
    updateTime?: Date;            // 更新时间
  }>;
  orgs: Array<{
    _id: string;                  // 组织 ID
    teamId: string;               // 团队 ID
    pathId: string;               // 路径 ID
    path: string;                 // 组织路径
    name: string;                 // 组织名称
    avatar: string;               // 组织头像
    description?: string;         // 组织描述
    updateTime: Date;             // 更新时间
    total: number;                // 成员+子组织总数
  }>;
  groups: Array<{
    _id: string;                  // 分组 ID
    teamId: string;               // 团队 ID
    name: string;                 // 分组名称
    avatar: string;               // 分组头像
    updateTime: Date;             // 更新时间
  }>;
}
```

**类型定义来源**: `packages/global/support/user/api.d.ts`

---

### 2.2 成员同步 API

#### `POST /api/support/user/sync`

**功能**: 从第三方系统（如企业微信、钉钉）同步成员数据

**请求参数**: 无

**响应数据**: 无（成功返回空）

---

### 2.3 成员导出 API

#### `GET /api/support/user/team/member/export`

**功能**: 导出团队成员列表为 CSV 格式

**请求参数**: 无

**响应数据**:
```typescript
{
  csv: string;  // CSV 格式的成员数据
}
```

---

### 2.4 更新通知账户 API

#### `PUT /api/support/user/team/updateNotificationAccount`

**功能**: 更新团队的通知接收账户（邮箱或手机）

**请求参数** (Body):
```typescript
{
  account: string;      // 必填，新的通知账户（邮箱或手机号）
  verifyCode: string;   // 必填，验证码
}
```

**响应数据**: 无

---

### 2.5 微信登录结果 API

#### `POST /api/support/user/account/login/wx/getResult`

**功能**: 轮询获取微信扫码登录结果

**请求参数** (Body):
```typescript
type WxLoginProps = {
  code: string;              // 必填，微信授权码（从二维码扫描获取）
  inviterId?: string;        // 可选，邀请者 ID
  bd_vid?: string;           // 可选，百度访问 ID（营销追踪）
  msclkid?: string;          // 可选，微软点击 ID（营销追踪）
  fastgpt_sem?: string;      // 可选，FastGPT SEM 参数
  sourceDomain?: string;     // 可选，来源域名
}
```

**响应数据**:
```typescript
type LoginSuccessResponse = {
  user: {
    _id: string;
    username: string;
    avatar: string;
    // ... 其他用户字段
  };
  token: string;  // JWT 认证令牌
}
```

**类型定义来源**: `packages/global/support/user/api.d.ts`

---

### 2.6 团队协作者列表 API

#### `GET /api/support/user/team/collaborator/list`

**功能**: 获取团队级别的协作者权限列表，用于团队权限管理

**请求参数**: 无

**响应数据**:
```typescript
type CollaboratorListType = {
  clbs: Array<{
    teamId: string;                    // 团队 ID
    permission: Permission;            // 权限对象（包含读/写/管理位运算值）
    name: string;                      // 协作者名称
    avatar: string;                    // 协作者头像
    // 以下三个字段只会有一个存在
    tmbId?: string;                    // 团队成员 ID（个人协作者）
    groupId?: string;                  // 分组 ID（分组协作者）
    orgId?: string;                    // 组织 ID（组织协作者）
  }>;
  parentClbs?: Array<CollaboratorItemDetailType>;  // 父级继承的协作者
}
```

**Permission 类型**:
```typescript
type PermissionValueType = number;  // 位运算值: read=4, write=2, manage=1
// 示例: 7 = 读+写+管理, 6 = 读+写, 4 = 只读
```

**类型定义来源**: `packages/global/support/permission/collaborator.d.ts`

---

### 2.7 更新团队协作者 API

#### `POST /api/support/user/team/collaborator/update`

**功能**: 批量更新团队协作者权限

**请求参数** (Body):
```typescript
type UpdateClbPermissionProps = {
  collaborators: Array<{
    permission: PermissionValueType;   // 权限值（位运算）
    // 以下三个字段只需提供一个
    tmbId?: string;                    // 团队成员 ID
    groupId?: string;                  // 分组 ID
    orgId?: string;                    // 组织 ID
  }>;
}
```

**响应数据**: 无

---

### 2.8 更新单个协作者权限 API

#### `PUT /api/support/user/team/collaborator/updateOne`

**功能**: 更新单个协作者的权限

**请求参数** (Body):
```typescript
{
  permission: PermissionValueType;     // 必填，新的权限值
  // 以下三个字段只需提供一个
  tmbId?: string;                      // 团队成员 ID
  orgId?: string;                      // 组织 ID
  groupId?: string;                    // 分组 ID
}
```

**响应数据**: 无

---

### 2.9 删除团队协作者 API

#### `DELETE /api/support/user/team/collaborator/delete`

**功能**: 删除团队协作者

**请求参数** (Query):
```typescript
type DeletePermissionQuery = {
  // 以下三个字段只需提供一个
  tmbId?: string;                      // 团队成员 ID
  groupId?: string;                    // 分组 ID
  orgId?: string;                      // 组织 ID
}
```

**响应数据**: 无

---

### 2.10 获取分组成员 API

#### `GET /api/support/user/team/group/members`

**功能**: 获取指定分组的成员列表

**请求参数** (Query):
```typescript
{
  groupId: string;  // 必填，分组 ID
}
```

**响应数据**:
```typescript
Array<{
  tmbId: string;                       // 团队成员 ID
  name: string;                        // 成员名称
  avatar: string;                      // 成员头像
  role: GroupMemberRole;               // 分组内角色: 'owner' | 'admin' | 'member'
}>
```

**类型定义来源**: `packages/global/support/permission/memberGroup/type.d.ts`

---

### 2.11 更改分组所有者 API

#### `PUT /api/support/user/team/group/changeOwner`

**功能**: 将分组所有权转让给另一个成员

**请求参数** (Body):
```typescript
{
  groupId: string;   // 必填，分组 ID
  tmbId: string;     // 必填，新所有者的团队成员 ID
}
```

**响应数据**: 无

---

### 2.12 获取组织成员（分页） API

#### `GET /api/support/user/team/org/members`

**功能**: 分页获取组织成员列表

**请求参数** (Query):
```typescript
{
  pageNum: number;        // 必填，页码（从 1 开始）
  pageSize: number;       // 必填，每页数量
  orgPath?: string;       // 可选，组织路径（如 "/团队/部门1/小组A"）
}
```

**响应数据**:
```typescript
type PaginationResponse<TeamMemberItemType> = {
  pageNum: number;
  pageSize: number;
  total: number;
  data: Array<{
    userId: string;
    tmbId: string;
    teamId: string;
    memberName: string;
    avatar: string;
    role: TeamMemberRoleEnum;
    status: TeamMemberStatusEnum;
    contact?: string;
    createTime: Date;
    updateTime?: Date;
    permission: TeamPermission;
    orgs?: string[];  // 所属组织路径列表
  }>;
}
```

---

### 2.13 获取团队标签列表 API

#### `GET /api/support/user/team/tag/list`

**功能**: 获取团队的标签列表

**请求参数**: 无

**响应数据**:
```typescript
Array<{
  _id: string;           // 标签记录 ID
  teamId: string;        // 团队 ID
  label: string;         // 标签显示名
  key: string;           // 标签唯一标识
  createTime: Date;      // 创建时间
  updateTime?: Date;     // 更新时间
}>
```

**类型定义来源**: `packages/global/support/user/team/type.d.ts`

---

### 2.14 异步加载团队标签 API

#### `GET /api/support/user/team/tag/async`

**功能**: 按域名异步加载团队标签

**请求参数** (Query):
```typescript
{
  domain: string;  // 必填，域名
}
```

**响应数据**:
```typescript
Array<{
  label: string;   // 标签显示名
  key: string;     // 标签唯一标识
}>
```

---

### 2.15 通过令牌获取应用 API

#### `GET /api/support/user/team/tag/getAppsByTeamTokens`

**功能**: 通过团队令牌获取可访问的应用列表

**请求参数** (Query):
```typescript
type AuthTeamTagTokenProps = {
  teamId: string;      // 必填，团队 ID
  authToken: string;   // 必填，认证令牌
}
```

**响应数据**:
```typescript
Array<{
  _id: string;
  parentId: string | null;
  tmbId: string;
  name: string;
  avatar: string;
  intro: string;
  type: AppTypeEnum;
  updateTime: Date;
  permission: AppPermission;
  // ... 其他应用字段
}>
```

**类型定义来源**: `packages/global/support/user/team/tag.d.ts`

---

### 2.16 获取团队发票抬头 API

#### `GET /api/support/user/team/invoiceAccount/getTeamInvoiceHeader`

**功能**: 获取团队的发票抬头信息

**请求参数**: 无

**响应数据**:
```typescript
type TeamInvoiceHeaderType = {
  teamName: string;              // 公司/团队名称
  unifiedCreditCode: string;     // 统一社会信用代码（税号）
  companyAddress?: string;       // 公司地址
  companyPhone?: string;         // 公司电话
  bankName?: string;             // 开户银行
  bankAccount?: string;          // 银行账号
  needSpecialInvoice: boolean;   // 是否需要增值税专用发票
  contactPhone: string;          // 联系电话
  emailAddress: string;          // 接收发票的邮箱
}
```

**类型定义来源**: `packages/global/support/user/team/type.d.ts`

---

### 2.17 更新团队发票抬头 API

#### `POST /api/support/user/team/invoiceAccount/update`

**功能**: 更新团队的发票抬头信息

**请求参数** (Body):
```typescript
type TeamInvoiceHeaderType = {
  teamName: string;              // 必填，公司/团队名称
  unifiedCreditCode: string;     // 必填，统一社会信用代码（税号）
  companyAddress?: string;       // 可选，公司地址
  companyPhone?: string;         // 可选，公司电话
  bankName?: string;             // 可选，开户银行
  bankAccount?: string;          // 可选，银行账号
  needSpecialInvoice: boolean;   // 必填，是否需要增值税专用发票
  contactPhone: string;          // 必填，联系电话
  emailAddress: string;          // 必填，接收发票的邮箱
}
```

**响应数据**: 无

---

### 2.18 兑换优惠券 API

#### `GET /api/support/wallet/coupon/redeem`

**功能**: 使用优惠券代码兑换优惠

**请求参数** (Query):
```typescript
{
  key: string;  // 必填，优惠券代码
}
```

**响应数据**: 无（成功返回空，失败抛出异常）

---

### 2.19 更新收藏应用标签 API

#### `PUT /api/core/chat/setting/favourite/tags`

**功能**: 批量更新收藏应用的标签

**请求参数** (Body):
```typescript
Array<{
  id: string;              // 收藏应用 ID
  tags: Array<string>;     // 新的标签 ID 列表
}>
```

**响应数据**: `null`

---

### 2.20 创建应用评估 API

#### `POST /api/core/app/evaluation/create`

**功能**: 创建新的应用评估任务（支持文件上传）

**请求参数** (FormData):
```typescript
// Content-Type: multipart/form-data
{
  file: File;          // 必填，评估数据文件（CSV/Excel）
  data: string;        // 必填，JSON 字符串，包含以下字段：
  // {
  //   name: string;      // 评估名称
  //   evalModel: string; // 评估使用的模型
  //   appId: string;     // 被评估的应用 ID
  // }
}
```

**特殊配置**:
- 超时时间: 600000ms (10分钟)
- 支持上传进度监听

**响应数据**: 无

**前端调用示例**:
```typescript
const formData = new FormData();
formData.append('file', file, encodeURIComponent(file.name));
formData.append('data', JSON.stringify({ name, evalModel, appId }));

POST('/proApi/core/app/evaluation/create', formData, {
  timeout: 600000,
  headers: { 'Content-Type': 'multipart/form-data; charset=utf-8' }
});
```

---

### 2.21 获取模板类型列表 API

#### `GET /api/core/app/template/getTemplateTypes`

**功能**: 获取应用模板的类型/分类列表

**请求参数**: 无

**响应数据**:
```typescript
Array<{
  typeId: string;      // 类型 ID
  typeName: string;    // 类型名称
  typeAvatar?: string; // 类型图标
  // ... 其他字段
}>
```

---

### 2.22 数据集同步 API

#### `POST /api/core/dataset/datasetSync`

**功能**: 触发数据集同步任务

**请求参数** (Body):
```typescript
type PostDatasetSyncParams = {
  datasetId: string;   // 必填，数据集 ID
}
```

**特殊配置**:
- 超时时间: 600000ms (10分钟)

**响应数据**: 无

**类型定义来源**: `packages/global/core/dataset/api.d.ts`

---

### 2.23 更改数据集所有者 API

#### `POST /api/core/dataset/changeOwner`

**功能**: 将数据集所有权转让给另一个用户

**请求参数** (Body):
```typescript
{
  datasetId: string;   // 必填，数据集 ID
  ownerId: string;     // 必填，新所有者的团队成员 ID
}
```

**响应数据**: 无

---

### 2.24 创建外部文件URL集合 API

#### `POST /api/core/dataset/collection/create/externalFileUrl`

**功能**: 通过外部文件 URL 创建数据集集合

**请求参数** (Body):
```typescript
type ExternalFileCreateDatasetCollectionParams = {
  datasetId: string;          // 必填，数据集 ID
  externalFileUrl: string;    // 必填，外部文件 URL
  externalFileId?: string;    // 可选，外部文件 ID
  filename?: string;          // 可选，文件名
  parentId?: string;          // 可选，父集合 ID
  metadata?: Record<string, any>;  // 可选，元数据
  tags?: string[];            // 可选，标签列表
  // ... 分块设置字段
}
```

**特殊配置**:
- 超时时间: 360000ms (6分钟)

**响应数据**:
```typescript
{
  collectionId: string;  // 新创建的集合 ID
}
```

**类型定义来源**: `packages/global/core/dataset/api.d.ts`

---

### 2.25 获取推广记录列表 API

#### `POST /api/support/activity/promotion/getPromotions`

**功能**: 分页获取用户的推广记录

**请求参数** (Body):
```typescript
type PaginationProps = {
  pageNum: number;    // 必填，页码（从 1 开始）
  pageSize: number;   // 必填，每页数量
}
```

**响应数据**:
```typescript
type PaginationResponse<PromotionRecordType> = {
  pageNum: number;
  pageSize: number;
  total: number;
  data: Array<{
    _id: string;              // 记录 ID
    type: string;             // 推广类型
    createTime: Date;         // 创建时间
    amount: number;           // 推广金额/积分
  }>;
}
```

**类型定义来源**: `projects/app/src/global/support/api/userRes.d.ts`

---

## 三、公共类型定义

### 3.1 分页请求类型

```typescript
type PaginationProps<T = {}> = {
  pageNum: number;     // 页码，从 1 开始
  pageSize: number;    // 每页数量
} & T;
```

### 3.2 分页响应类型

```typescript
type PaginationResponse<T> = {
  pageNum: number;
  pageSize: number;
  total: number;
  data: T[];
}
```

### 3.3 权限值类型

```typescript
type PermissionValueType = number;

// 权限位定义
const PermissionBits = {
  read: 0b100,    // 4 - 读取权限
  write: 0b010,   // 2 - 写入权限
  manage: 0b001   // 1 - 管理权限
};

// 组合示例
// 只读: 4 (0b100)
// 读写: 6 (0b110)
// 全部: 7 (0b111)
```

### 3.4 团队成员角色枚举

```typescript
enum TeamMemberRoleEnum {
  owner = 'owner',     // 所有者
  admin = 'admin',     // 管理员
  member = 'member'    // 普通成员
}
```

### 3.5 团队成员状态枚举

```typescript
enum TeamMemberStatusEnum {
  active = 'active',       // 活跃
  waiting = 'waiting',     // 等待确认
  inactive = 'inactive'    // 已禁用/已删除
}
```

### 3.6 分组成员角色枚举

```typescript
enum GroupMemberRole {
  owner = 'owner',     // 组长
  admin = 'admin',     // 管理员
  member = 'member'    // 普通成员
}
```

---

## 四、实现优先级

### P1 - 高优先级（9 个）

影响核心功能，建议优先实现：

1. `GET /api/support/user/search` - 协作者选择依赖
2. `GET /api/support/user/team/collaborator/list` - 团队权限管理
3. `POST /api/support/user/team/collaborator/update` - 团队权限管理
4. `DELETE /api/support/user/team/collaborator/delete` - 团队权限管理
5. `GET /api/support/user/team/group/members` - 分组管理
6. `GET /api/support/user/team/org/members` - 组织管理
7. `POST /api/core/app/evaluation/create` - 应用评估
8. `POST /api/support/user/account/login/wx/getResult` - 微信登录

### P2 - 中优先级（14 个）

增强功能，可在 P1 完成后实现：

1. `POST /api/support/user/sync`
2. `GET /api/support/user/team/member/export`
3. `PUT /api/support/user/team/updateNotificationAccount`
4. `PUT /api/support/user/team/collaborator/updateOne`
5. `PUT /api/support/user/team/group/changeOwner`
6. `GET /api/support/user/team/tag/list`
7. `GET /api/support/user/team/invoiceAccount/getTeamInvoiceHeader`
8. `POST /api/support/user/team/invoiceAccount/update`
9. `GET /api/support/wallet/coupon/redeem`
10. `PUT /api/core/chat/setting/favourite/tags`
11. `POST /api/core/dataset/datasetSync`
12. `POST /api/core/dataset/changeOwner`
13. `POST /api/support/activity/promotion/getPromotions`

### P3 - 低优先级（4 个）

可延后实现：

1. `GET /api/support/user/team/tag/async`
2. `GET /api/support/user/team/tag/getAppsByTeamTokens`
3. `GET /api/core/app/template/getTemplateTypes`
4. `POST /api/core/dataset/collection/create/externalFileUrl`

---

*文档生成时间: 2025-11-26*
*数据来源: FastGPT 官方项目 (/home/sinocare/dev/FastGPT)*

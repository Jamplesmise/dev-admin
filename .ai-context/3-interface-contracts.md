# 3-interface-contracts.md

> FastGPT 接口契约规范文档
> 版本: 1.0.0 | 更新时间: 2025-01-23

---

## 一、统一响应格式

### 1.1 标准响应结构

所有 API 响应遵循统一的 JSON 结构：

```typescript
interface ResponseType<T = any> {
  code: number;        // HTTP 状态码或业务错误码
  statusText: string;  // 错误类型枚举值（成功时为空）
  message: string;     // 错误消息（成功时为空）
  data: T;             // 返回数据
}
```

### 1.2 成功响应

```json
{
  "code": 200,
  "statusText": "",
  "message": "",
  "data": {
    "id": "xxx",
    "name": "example"
  }
}
```

### 1.3 失败响应

```json
{
  "code": 506000,
  "statusText": "openapiUnExist",
  "message": "API key not exist",
  "data": null
}
```

### 1.4 分页响应

```typescript
// 分页请求参数
interface PaginationParams {
  pageSize: number;     // 每页数量
  pageNum?: number;     // 页码（从 1 开始）
  offset?: number;      // 偏移量（与 pageNum 二选一）
}

// 分页响应数据
interface PaginatedResponse<T> {
  list: T[];            // 数据列表
  total: number;        // 总数量
}
```

**示例**：
```json
{
  "code": 200,
  "statusText": "",
  "message": "",
  "data": {
    "list": [
      { "id": "1", "name": "item1" },
      { "id": "2", "name": "item2" }
    ],
    "total": 100
  }
}
```

---

## 二、错误码体系

### 2.1 错误码规则

| 码段范围 | 模块 | 说明 |
|---------|------|------|
| 400-599 | HTTP | 标准 HTTP 状态码 |
| 500xxx | 团队(Team) | 团队相关错误 |
| 501xxx | 数据集(Dataset) | 知识库相关错误 |
| 502xxx | 应用(App) | 应用相关错误 |
| 503xxx | 用户(User) | 用户相关错误 |
| 504xxx | 聊天(Chat) | 对话相关错误 |
| 505xxx | 外链(OutLink) | 分享链接相关错误 |
| 506xxx | OpenAPI | API Key 相关错误 |
| 507xxx | 通用(Common) | 通用业务错误 |
| 508xxx | 插件(Plugin) | 插件相关错误 |
| 509xxx | 系统(System) | 系统限制错误 |

### 2.2 HTTP 标准错误码

```typescript
const ERROR_CODE = {
  400: 'Bad Request',          // 请求参数错误
  401: 'Unauthorized',         // 未登录
  403: 'Forbidden',            // 无权限
  404: 'Not Found',            // 资源不存在
  405: 'Method Not Allowed',   // 请求方法不允许
  429: 'Too Many Requests',    // 请求频率超限
  500: 'Internal Server Error' // 服务器内部错误
}
```

### 2.3 业务错误码详表

#### 团队模块 (500xxx)

| 错误码 | statusText | 说明 |
|-------|------------|------|
| 500000 | teamOverSize | 团队成员数量超限 |
| 500001 | aiPointsNotEnough | AI 积分不足 |
| 500010 | unPermission | 无操作权限 |
| 500020 | datasetAmountNotEnough | 知识库数量超限 |
| 500021 | appAmountNotEnough | 应用数量超限 |
| 500030 | teamMemberOverSize | 团队成员超限 |
| 500031 | canNotRemoveOwner | 不能移除所有者 |

#### 数据集模块 (501xxx)

| 错误码 | statusText | 说明 |
|-------|------------|------|
| 501000 | unExistDataset | 知识库不存在 |
| 501001 | unAuthDataset | 无知识库权限 |
| 501002 | unExistCollection | 集合不存在 |
| 501003 | unExistDatasetData | 数据不存在 |
| 501005 | unExistFile | 文件不存在 |
| 501010 | invalidVectorModelOrQAModel | 无效的向量/QA模型 |
| 501011 | datasetIsRebuilding | 知识库正在重建 |

#### 应用模块 (502xxx)

| 错误码 | statusText | 说明 |
|-------|------------|------|
| 502000 | appUnExist | 应用不存在 |
| 502001 | unAuthApp | 无应用权限 |
| 502002 | invalidAppType | 无效的应用类型 |
| 502003 | invalidPluginType | 无效的插件类型 |
| 502004 | appNameIsUsed | 应用名称已被使用 |

#### 用户模块 (503xxx)

| 错误码 | statusText | 说明 |
|-------|------------|------|
| 503000 | notUser | 用户不存在 |
| 503001 | userExist | 用户已存在 |
| 503002 | account_psw_error | 账号或密码错误 |
| 503003 | tokenExpiredNeedRefresh | Token 过期需刷新 |
| 503004 | repeatLog | 重复登录 |

#### 聊天模块 (504xxx)

| 错误码 | statusText | 说明 |
|-------|------------|------|
| 504000 | unAuthChat | 无对话权限 |

#### 外链模块 (505xxx)

| 错误码 | statusText | 说明 |
|-------|------------|------|
| 505000 | outlinkUnExist | 外链不存在 |
| 505001 | unAuthLink | 无外链权限 |
| 505002 | linkUnInvalid | 外链已失效 |
| 505003 | linkLimitExpired | 外链已过期 |

#### OpenAPI 模块 (506xxx)

| 错误码 | statusText | 说明 |
|-------|------------|------|
| 506000 | openapiUnExist | API Key 不存在 |
| 506001 | openapiUnAuth | API Key 无权限 |
| 506002 | openapiExceedLimit | API Key 使用超限 |

#### 通用模块 (507xxx)

| 错误码 | statusText | 说明 |
|-------|------------|------|
| 507000 | invalidParams | 参数无效 |
| 507001 | invalidResource | 资源无效 |
| 507002 | fileNotFound | 文件未找到 |
| 507003 | missingParams | 缺少必要参数 |
| 507004 | paramsTooLong | 参数过长 |
| 507005 | resourceDuplicated | 资源重复 |

#### 插件模块 (508xxx)

| 错误码 | statusText | 说明 |
|-------|------------|------|
| 508000 | pluginUnExist | 插件不存在 |
| 508001 | pluginUnAuth | 无插件权限 |

#### 系统模块 (509xxx)

| 错误码 | statusText | 说明 |
|-------|------------|------|
| 509000 | communityVersionNumLimit | 社区版数量限制 |
| 509001 | licenseError | License 错误 |
| 509002 | licenseAppAmountLimit | License 应用数量限制 |
| 509003 | licenseDatasetAmountLimit | License 知识库数量限制 |

### 2.4 预定义特殊错误枚举

```typescript
enum ERROR_ENUM {
  unAuthorization = 'unAuthorization',      // 403 - 未授权
  insufficientQuota = 'insufficientQuota',  // 510 - 配额不足
  unAuthModel = 'unAuthModel',              // 511 - 模型未授权
  unAuthFile = 'unAuthFile',                // 513 - 文件未授权
  unAuthApiKey = 'unAuthApiKey',            // 514 - API Key 无效
  tooManyRequest = 'tooManyRequest'         // 429 - 请求过频
}
```

---

## 三、认证鉴权方式

### 3.1 认证模式

FastGPT 支持以下五种认证模式：

| 模式 | 枚举值 | 场景 | 优先级 |
|------|-------|------|-------|
| Cookie Token | token | Web 端用户登录 | 1 |
| Root Key | root | 系统管理员操作 | 2 |
| API Key | apikey | OpenAPI 调用 | 3 |
| 外链认证 | outLink | 分享链接访问 | 4 |
| 团队域名 | teamDomain | 团队专属域名 | 5 |

### 3.2 请求头格式

```typescript
interface ReqHeaderAuthType {
  cookie?: string;        // 包含 fastgpt_token
  token?: string;         // Bearer token
  authorization?: string; // "Bearer {apikey}" 或 "Bearer fastgpt-xxx"
  rootkey?: string;       // Root 密钥
  userid?: string;        // 用户 ID（特殊场景）
}
```

### 3.3 Cookie Token 认证（Web 端）

**Token 名称**: `fastgpt_token`

**Cookie 设置**:
```
Set-Cookie: fastgpt_token={jwt_token}; Path=/; HttpOnly; Max-Age=604800; Samesite=Strict;
```

**有效期**: 7 天（604800 秒）

**安全配置**:
- `HttpOnly`: 防止 XSS 攻击
- `Samesite=Strict`: 防止 CSRF 攻击

### 3.4 API Key 认证（OpenAPI）

**请求头格式**:
```
Authorization: Bearer fastgpt-{apikey1}-{apikey2}[-{appId}]
```

**格式说明**:
- `fastgpt-`: 固定前缀
- `{apikey1}-{apikey2}`: API Key 拆分存储
- `[-{appId}]`: 可选，绑定特定应用

**示例**:
```bash
curl -X POST https://api.fastgpt.com/api/v1/chat/completions \
  -H "Authorization: Bearer fastgpt-abc123-def456" \
  -H "Content-Type: application/json" \
  -d '{"messages": [...]}'
```

### 3.5 Root Key 认证（管理员）

**请求头格式**:
```
rootkey: {ROOT_KEY}
```

**配置**: 通过环境变量 `ROOT_KEY` 设置

**使用场景**: 系统级管理操作

### 3.6 认证响应类型

```typescript
interface AuthResponseType<T extends Permission = Permission> {
  userId: string;              // 用户 ID
  teamId: string;              // 团队 ID
  tmbId: string;               // 团队成员 ID
  authType?: AuthUserTypeEnum; // 认证类型
  appId?: string;              // 应用 ID（API Key 绑定时）
  apikey?: string;             // API Key
  isRoot: boolean;             // 是否 Root 权限
  permission: T;               // 权限对象
}
```

---

## 四、权限体系

### 4.1 权限值定义（位运算）

```typescript
const CommonPerList = {
  owner: ~0 >>> 0,    // 全 1 (0xFFFFFFFF) - 所有者权限
  read: 0b100,        // 4 - 读取权限
  write: 0b010,       // 2 - 写入权限
  manage: 0b001       // 1 - 管理权限
}
```

### 4.2 角色与权限映射

| 角色 | 角色值 | 包含权限 | 权限值 |
|------|-------|---------|-------|
| read | 0b100 | 读取 | 0b100 (4) |
| write | 0b010 | 读取 + 写入 | 0b110 (6) |
| manage | 0b001 | 读取 + 写入 + 管理 | 0b111 (7) |
| owner | ~0 | 全部 | 0xFFFFFFFF |

### 4.3 权限类型枚举

```typescript
enum PermissionTypeEnum {
  private = 'private',         // 仅所有者可见
  public = 'public',           // 完全公开
  clbPrivate = 'clbPrivate',   // 仅协作者可见
  publicRead = 'publicRead',   // 团队可读
  publicWrite = 'publicWrite'  // 团队可读写
}
```

### 4.4 资源类型

```typescript
enum PerResourceTypeEnum {
  team = 'team',       // 团队
  app = 'app',         // 应用
  dataset = 'dataset', // 知识库
  model = 'model'      // 模型
}
```

### 4.5 权限检查示例

```typescript
// 权限类
class Permission {
  role: number;
  isOwner: boolean;
  hasManagePer: boolean;
  hasWritePer: boolean;
  hasReadPer: boolean;

  // 检查是否拥有指定权限
  checkPer(perm: number): boolean {
    if (perm === OwnerPermissionVal) {
      return this.permission === OwnerPermissionVal;
    }
    return (this.permission & perm) === perm;
  }
}

// 使用示例
const permission = new Permission(0b110); // write 角色
permission.hasReadPer;  // true
permission.hasWritePer; // true
permission.hasManagePer; // false
```

---

## 五、API 版本管理

### 5.1 版本策略

| 类型 | 当前版本 | 说明 |
|------|---------|------|
| OpenAPI 规范 | 3.1.0 | OpenAPI/Swagger 规范版本 |
| API 文档 | 0.1.0 | FastGPT API 文档版本 |
| 应用版本 | 4.14.1 | FastGPT 应用版本 |

### 5.2 路由规范

**基础路径**: `/api`

**路由格式**: `/api/{module}/{resource}[/{action}]`

**模块划分**:
- `/api/core/` - 核心功能（chat、app、dataset）
- `/api/support/` - 支撑服务（openapi、user、team）
- `/api/admin/` - 管理后台
- `/api/v1/` - OpenAPI 兼容接口

### 5.3 主要 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/chat/completions` | POST | 对话补全（兼容 OpenAI） |
| `/api/core/chat/init` | GET | 初始化对话 |
| `/api/core/app/list` | GET | 获取应用列表 |
| `/api/core/dataset/list` | GET | 获取知识库列表 |
| `/api/support/openapi/health` | GET | 健康检查 |

### 5.4 向后兼容承诺

1. **Breaking Change 规则**:
   - 主版本号变更时可能包含破坏性变更
   - 次版本号变更保持向后兼容
   - 废弃的 API 保留至少 2 个主版本

2. **废弃通知**:
   - 响应头 `Deprecation: true`
   - 响应头 `Sunset: {date}` 标注停用日期

---

## 六、请求规范

### 6.1 Content-Type

| 类型 | 场景 |
|------|------|
| `application/json` | 默认（JSON 数据） |
| `multipart/form-data` | 文件上传 |
| `text/event-stream` | SSE 流式响应 |

### 6.2 通用请求参数

```typescript
// 列表查询通用参数
interface ListQueryParams {
  pageSize?: number;    // 每页数量，默认 10
  pageNum?: number;     // 页码，从 1 开始
  searchKey?: string;   // 搜索关键词
}

// ID 参数
interface IdParams {
  id: string;           // MongoDB ObjectId
}
```

### 6.3 SSE 流式响应

**请求头**:
```
Accept: text/event-stream
```

**响应格式**:
```
data: {"content": "Hello"}

data: {"content": " World"}

data: [DONE]
```

---

## 七、安全规范

### 7.1 敏感信息过滤

系统自动过滤响应中的敏感信息：
- API Key
- 数据库连接字符串
- 内部服务地址

### 7.2 请求频率限制

| 接口类型 | 限制 | 窗口 |
|---------|------|------|
| 普通 API | 100 次 | 1 分钟 |
| Chat API | 按 API Key 配额 | - |
| 文件上传 | 10 次 | 1 分钟 |

### 7.3 CORS 配置

默认允许的来源由环境变量 `CORS_ORIGIN` 配置。

---

## 八、错误处理最佳实践

### 8.1 前端错误处理

```typescript
async function apiRequest<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const result = await response.json();

  if (result.code !== 200) {
    // 特殊错误处理
    if (result.statusText === 'unAuthorization') {
      // 清除登录状态，跳转登录页
      router.push('/login');
    }

    // 显示错误消息
    toast.error(result.message || '请求失败');
    throw new Error(result.message);
  }

  return result.data;
}
```

### 8.2 后端错误抛出

```typescript
import { ERROR_ENUM } from '@fastgpt/global/common/error/errorCode';

// 抛出预定义错误
throw ERROR_ENUM.unAuthorization;

// 抛出业务错误码
throw { code: 502000, message: '应用不存在' };

// 抛出自定义错误
throw new Error('自定义错误消息');
```

---

## 九、关键文件索引

| 功能 | 文件路径 |
|------|---------|
| 响应格式 | `packages/service/common/response/index.ts` |
| 错误码枚举 | `packages/global/common/error/errorCode.ts` |
| 错误码分类 | `packages/global/common/error/code/*.ts` |
| 认证逻辑 | `packages/service/support/permission/auth/common.ts` |
| OpenAPI 认证 | `packages/service/support/openapi/auth.ts` |
| 权限常量 | `packages/global/support/permission/constant.ts` |
| 权限控制器 | `packages/global/support/permission/controller.ts` |
| API 规范 | `packages/global/openapi/` |
| API 中间件 | `packages/service/common/middle/entry.ts` |
| 应用 API | `projects/app/src/pages/api/` |

---

## 十、变更日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| 1.0.0 | 2025-01-23 | 初始版本 |

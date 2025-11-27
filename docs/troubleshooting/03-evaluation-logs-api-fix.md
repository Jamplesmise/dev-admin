# 评估和日志 API 修复报告

**日期**: 2025-11-27
**分支**: `fix/evaluation-and-logs-api`
**状态**: 已完成

## 问题概述

在与官方 FastGPT 前端集成测试时，发现以下 API 存在兼容性问题：

1. **日志 API** (`/api/core/app/logs/*`) - 返回格式与前端期望不匹配，导致 `LogChart.tsx` 页面崩溃
2. **评估 API** (`/api/core/app/evaluation/*`) - 参数格式、状态枚举、文件上传处理等问题

---

## 日志 API 修复

### 问题 1: getTotalData 返回格式错误

**错误现象**: `TypeError: Cannot read properties of undefined (reading 'toLocaleString')` at `LogChart.tsx:920`

**原因**: 前端期望的格式与我们返回的格式不匹配

| 字段 | 前端期望 | 我们原来返回 |
|------|----------|--------------|
| 用户数 | `totalUsers` | `totalChats` |
| 对话数 | `totalChats` | `totalMessages` |
| 积分数 | `totalPoints` | `totalTokens` |

**修复**: 重写 `pages/api/core/app/logs/getTotalData.ts`

```typescript
// 修复后返回格式
type getTotalDataResponse = {
  totalUsers: number;   // 独立用户数
  totalChats: number;   // 对话数
  totalPoints: number;  // 消耗积分
};
```

### 问题 2: getChartData 返回格式错误

**原因**: 前端期望 `{ userData, chatData, appData }` 结构，我们返回 `{ labels, datasets }`

**修复**: 重写 `pages/api/core/app/logs/getChartData.ts`

```typescript
// 修复后返回格式
type getChartDataResponse = {
  userData: Array<{ date: string; userCount: number }>;
  chatData: Array<{ date: string; chatCount: number }>;
  appData: Array<{ appId: string; appName: string; chatCount: number }>;
};
```

### 新增文件

- `src/packages/global/core/app/logs/api.d.ts` - API 类型定义
- `src/packages/service/core/app/logs/schema.ts` - `app_chat_logs` 集合 Schema

---

## 评估 API 修复

### 问题 1: create API 无法处理文件上传

**错误现象**: `appId 不能为空`

**原因**: 前端使用 `multipart/form-data` 上传 CSV 文件，数据在 `data` 字段中以 JSON 字符串形式传递

```javascript
// 前端发送格式
const formData = new FormData();
formData.append('file', file, encodeURIComponent(file.name));
formData.append('data', JSON.stringify({ name, evalModel, appId }));
```

**修复**:
1. 安装 `multer` 依赖处理文件上传
2. 禁用 Next.js 默认 body parser
3. 使用 multer 解析 `multipart/form-data`
4. 从 `data` 字段解析 JSON 获取参数
5. 解析 CSV 文件提取测试用例

```typescript
// pages/api/core/app/evaluation/create.ts
export const config = {
  api: {
    bodyParser: false  // 禁用默认 body parser
  }
};

// 使用 multer 处理
const { file, data } = await uploadModel.getUploadFile<CreateEvalFormData>(req, res);
```

### 问题 2: CSV 解析失败

**错误现象**: `CSV 文件格式错误：缺少必需的 *q 或 q 列`

**原因**:
1. 未处理 BOM（字节顺序标记）
2. 未支持 Tab 分隔符
3. 表头匹配区分大小写

**修复**:
- 移除 UTF-8 BOM
- 自动检测分隔符（逗号或 Tab）
- 表头匹配忽略大小写

### 问题 3: list API 要求 appId

**错误现象**: `appId 不能为空`

**原因**: 官方 FastGPT 的评估列表是团队级别的，不按 appId 过滤

**修复**: 移除 `appId` 必填验证，改为可选参数

```typescript
// 修复前
if (!appId) {
  throw new Error('appId 不能为空');
}

// 修复后
const { searchKey, pageNum, pageSize } = req.body;
// searchKey 可选，用于搜索过滤
```

### 问题 4: 状态枚举格式不匹配

**原因**: 官方使用数字枚举，我们使用字符串枚举

```typescript
// 官方格式
enum EvaluationStatusEnum {
  queuing = 0,
  evaluating = 1,
  completed = 2
}

// 我们原来的格式
enum EvaluationStatusEnum {
  pending = 'pending',
  running = 'running',
  completed = 'completed',
  // ...
}
```

**修复**: 更新 `constant.ts` 和 `schema.ts` 使用数字枚举

### 问题 5: 参数名称不一致

| 官方参数名 | 我们原来的参数名 |
|-----------|-----------------|
| `evalId` | `evaluationId` |
| `evalItemId` | `itemId` |

**修复**: 更新所有评估 API 的参数名称

### 新增文件

- `src/packages/service/common/file/multer.ts` - 文件上传处理工具
- `src/packages/global/core/app/evaluation/api.d.ts` - API 类型定义
- `src/packages/global/common/type.d.ts` - 通用分页类型

---

## 修改文件清单

### 日志模块
| 文件 | 操作 | 说明 |
|------|------|------|
| `pages/api/core/app/logs/getTotalData.ts` | 重写 | 修复返回格式 |
| `pages/api/core/app/logs/getChartData.ts` | 重写 | 修复返回格式 |
| `src/packages/global/core/app/logs/api.d.ts` | 新增 | API 类型定义 |
| `src/packages/service/core/app/logs/schema.ts` | 新增 | 日志 Schema |

### 评估模块
| 文件 | 操作 | 说明 |
|------|------|------|
| `pages/api/core/app/evaluation/create.ts` | 重写 | 支持文件上传 |
| `pages/api/core/app/evaluation/list.ts` | 修改 | 移除 appId 必填 |
| `pages/api/core/app/evaluation/listItems.ts` | 修改 | 参数名更新 |
| `pages/api/core/app/evaluation/delete.ts` | 修改 | 参数名更新 |
| `pages/api/core/app/evaluation/deleteItem.ts` | 修改 | 参数名更新 |
| `pages/api/core/app/evaluation/retryItem.ts` | 修改 | 参数名更新 |
| `pages/api/core/app/evaluation/updateItem.ts` | 修改 | 参数名更新 |
| `src/packages/global/core/app/evaluation/constant.ts` | 修改 | 状态枚举改为数字 |
| `src/packages/global/core/app/evaluation/type.d.ts` | 修改 | 类型定义更新 |
| `src/packages/global/core/app/evaluation/api.d.ts` | 新增 | API 类型定义 |
| `src/packages/service/core/app/evaluation/schema.ts` | 修改 | status 改为 Number |
| `src/packages/service/core/app/evaluation/itemSchema.ts` | 修改 | 添加 variables, history |
| `src/packages/service/core/app/evaluation/controller.ts` | 修改 | 参数名更新 |

### 公共模块
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/packages/service/common/file/multer.ts` | 新增 | 文件上传工具 |
| `src/packages/global/common/type.d.ts` | 新增 | 通用分页类型 |
| `package.json` | 修改 | 添加 multer 依赖 |

---

## 依赖变更

```json
{
  "dependencies": {
    "multer": "^2.0.2"
  },
  "devDependencies": {
    "@types/multer": "^2.0.0"
  }
}
```

---

## 测试验证

1. **日志页面**: LogChart.tsx 不再崩溃，数据正常显示
2. **评估创建**: 可以上传 CSV 文件创建评估任务
3. **评估列表**: 正常显示团队级别的评估列表
4. **评估详情**: 各项操作（重试、更新、删除）正常工作

---

## 经验总结

1. **与官方前端集成前，务必仔细对比 API 契约**
   - 检查请求参数名称和类型
   - 检查响应数据结构
   - 检查枚举值格式（字符串 vs 数字）

2. **文件上传 API 需要特殊处理**
   - 禁用 Next.js 默认 body parser
   - 使用 multer 处理 multipart/form-data
   - 注意 FormData 中 JSON 数据的解析

3. **CSV 解析需要考虑多种情况**
   - BOM 字节顺序标记
   - 不同分隔符（逗号、Tab）
   - 大小写不敏感的表头匹配

# Phase 2 - 重要功能规划概览

> 阶段: Phase 2 - 重要功能
> 优先级: P1
> 预计工期: 1.5 周
> 接口数量: 16 个
> 最后更新: 2025-11-23

---

## 1. 模块概览

| 模块 | 接口数 | 说明 | 依赖 |
|------|--------|------|------|
| 成员分组 | 4 | 分组 CRUD | Phase 1 组织架构 |
| 协作者管理 | 6 | 应用/数据集权限 | Phase 1 组织架构 |
| 发票管理 | 4 | 开票与下载 | Phase 1 支付账单 |
| 应用日志 | 2 | 图表分析 | - |

---

## 2. 成员分组模块 (4 接口)

### 功能说明
允许团队创建自定义分组，便于权限批量分配。

### 接口清单

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取分组列表 | POST | `/api/support/user/team/group/list` |
| 创建分组 | POST | `/api/support/user/team/group/create` |
| 更新分组 | PUT | `/api/support/user/team/group/update` |
| 删除分组 | DELETE | `/api/support/user/team/group/delete` |

### 数据模型

```typescript
type GroupSchema = {
  _id: ObjectId;
  teamId: ObjectId;
  name: string;
  description?: string;
  avatar?: string;
  members: ObjectId[];        // 成员 tmbId 列表
  createTime: Date;
  updateTime: Date;
}
```

### 前端组件
- `pageComponents/account/team/GroupManage/index.tsx`

---

## 3. 协作者管理模块 (6 接口)

### 功能说明
为应用和数据集分配协作者权限，支持按成员、分组、组织分配。

### 接口清单

**应用协作者 (3 接口)**:

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取协作者列表 | GET | `/api/core/app/collaborator/list` |
| 更新协作者 | POST | `/api/core/app/collaborator/update` |
| 删除协作者 | DELETE | `/api/core/app/collaborator/delete` |

**数据集协作者 (3 接口)**:

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取协作者列表 | GET | `/api/core/dataset/collaborator/list` |
| 更新协作者 | POST | `/api/core/dataset/collaborator/update` |
| 删除协作者 | DELETE | `/api/core/dataset/collaborator/delete` |

### 数据模型

```typescript
type CollaboratorSchema = {
  _id: ObjectId;
  teamId: ObjectId;
  resourceId: ObjectId;       // 应用或数据集 ID
  resourceType: 'app' | 'dataset';

  // 协作者类型（三选一）
  tmbId?: ObjectId;           // 单个成员
  groupId?: ObjectId;         // 分组
  orgId?: ObjectId;           // 组织

  permission: number;         // 权限位 (read|write|manage)
  createTime: Date;
}
```

### 权限位定义

```typescript
const PermissionBits = {
  read: 0b100,    // 4 - 读取
  write: 0b010,   // 2 - 写入
  manage: 0b001   // 1 - 管理
};

// 组合示例
// 只读: 4 (0b100)
// 读写: 6 (0b110)
// 全部: 7 (0b111)
```

### 前端组件
- `pageComponents/account/team/PermissionManage/index.tsx`
- `web/core/app/api/collaborator.ts`
- `web/core/dataset/api/collaborator.ts`

---

## 4. 发票管理模块 (4 接口)

### 功能说明
提供发票申请、记录查询和下载功能。

### 接口清单

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取待开票列表 | GET | `/api/support/wallet/bill/invoice/unInvoiceList` |
| 提交开票申请 | POST | `/api/support/wallet/bill/invoice/submit` |
| 获取发票记录 | GET | `/api/support/wallet/bill/invoice/records` |
| 下载发票文件 | GET | `/api/support/wallet/bill/invoice/downloadFile` |

### 数据模型

```typescript
type InvoiceSchema = {
  _id: ObjectId;
  teamId: ObjectId;
  tmbId: ObjectId;            // 申请人

  // 关联账单
  billIds: ObjectId[];
  totalAmount: number;        // 开票金额

  // 发票信息
  type: 'normal' | 'special'; // 普票/专票
  title: string;              // 发票抬头
  taxNumber: string;          // 税号

  // 专票额外字段
  bankName?: string;
  bankAccount?: string;
  address?: string;
  phone?: string;

  // 状态
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  rejectReason?: string;

  // 发票文件
  invoiceUrl?: string;        // 电子发票 URL

  createTime: Date;
  completeTime?: Date;
}
```

### 前端组件
- `pageComponents/account/bill/InvoiceTable.tsx`

---

## 5. 应用日志模块 (2 接口)

### 功能说明
提供应用使用的统计分析和图表数据。

### 接口清单

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取总体数据 | GET | `/api/core/app/logs/getTotalData` |
| 获取图表数据 | POST | `/api/core/app/logs/getChartData` |

### 请求/响应

**获取总体数据**:
```typescript
// Request
type GetTotalDataRequest = {
  appId: string;
  startTime?: string;
  endTime?: string;
}

// Response
type GetTotalDataResponse = {
  totalChats: number;
  totalMessages: number;
  totalTokens: number;
  avgResponseTime: number;
  satisfactionRate: number;
}
```

**获取图表数据**:
```typescript
// Request
type GetChartDataRequest = {
  appId: string;
  chartType: 'daily' | 'hourly';
  startTime: string;
  endTime: string;
  metrics: ('chats' | 'messages' | 'tokens')[];
}

// Response
type GetChartDataResponse = {
  labels: string[];           // 时间标签
  datasets: {
    metric: string;
    data: number[];
  }[];
}
```

### 前端组件
- `pageComponents/app/detail/Logs/index.tsx`
- `web/core/app/api/log.ts`

---

## 6. 开发计划

### 时间安排

```
Week 1 (3 天):
├── Day 1: 成员分组模块 (4 接口)
├── Day 2-3: 协作者管理模块 (6 接口)
│
Week 2 (2 天):
├── Day 1: 发票管理模块 (4 接口)
└── Day 2: 应用日志模块 (2 接口)
```

### 依赖关系

```
Phase 1 组织架构 ──┬──> 成员分组
                  └──> 协作者管理

Phase 1 支付账单 ────> 发票管理

无依赖 ──────────────> 应用日志
```

---

## 7. 验收标准

- [ ] 16 个 API 全部实现
- [ ] 分组创建/成员管理正常
- [ ] 协作者权限控制正确
- [ ] 发票申请流程完整
- [ ] 图表数据展示正确
- [ ] 测试覆盖率 ≥ 80%

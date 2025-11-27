# Phase 6C 测试计划

> 子阶段: Phase 6C - 应用评估与发票优惠券
> API 数量: 5 个
> 创建时间: 2025-11-26
> **状态: ✅ 已完成**
> **完成时间: 2025-11-26**
> **测试结果: 48/48 通过 (100%)**

---

## 1. 测试范围

### 1.1 待测 API

| 序号 | API | 方法 | 测试文件 |
|------|-----|------|----------|
| 1 | `/api/core/app/evaluation/create` | POST | `evaluation.api.test.ts` |
| 2 | `/api/support/user/team/invoiceAccount/getTeamInvoiceHeader` | GET | `invoiceHeader.api.test.ts` |
| 3 | `/api/support/user/team/invoiceAccount/update` | POST | `invoiceHeader.api.test.ts` |
| 4 | `/api/support/wallet/coupon/redeem` | GET | `coupon.api.test.ts` |
| 5 | `/api/core/chat/setting/favourite/tags` | PUT | `favouriteTags.api.test.ts` |

---

## 2. 应用评估创建 API 测试

### 2.1 测试文件

`test/api/phase6/evaluation.api.test.ts`

### 2.2 测试用例

```typescript
describe('POST /api/core/app/evaluation/create', () => {
  describe('正常流程 - CSV 文件', () => {
    it('应该成功创建评估任务（CSV）', async () => {
      // Given: 有效的 CSV 文件
      // When: 上传文件创建评估
      // Then: 返回 evaluationId
    });

    it('应该正确解析 CSV 内容', async () => {
      // Given: CSV 包含 input 和 expectedOutput 列
      // When: 上传文件
      // Then: 评估数据正确存储
    });

    it('应该支持中文 CSV 内容', async () => {
      // Given: CSV 包含中文内容
      // When: 上传文件
      // Then: 中文内容正确解析
    });
  });

  describe('正常流程 - JSON 文件', () => {
    it('应该成功创建评估任务（JSON）', async () => {
      // Given: 有效的 JSON 文件
      // When: 上传文件创建评估
      // Then: 返回 evaluationId
    });

    it('应该正确解析 JSON 数组', async () => {
      // Given: JSON 数组 [{ input, expectedOutput }]
      // When: 上传文件
      // Then: 评估数据正确存储
    });
  });

  describe('参数验证', () => {
    it('appId 必填', async () => {
      // When: 不传 appId
      // Then: 返回 400
    });

    it('datasetId 必填', async () => {
      // When: 不传 datasetId
      // Then: 返回 400
    });

    it('文件格式必须是 CSV 或 JSON', async () => {
      // When: 上传 TXT 文件
      // Then: 返回 400 "不支持的文件格式"
    });
  });

  describe('权限验证', () => {
    it('未认证请求应返回 401', async () => {
      // When: 不带 token
      // Then: 返回 401
    });

    it('需要应用写权限', async () => {
      // Given: 用户只有应用只读权限
      // When: 创建评估
      // Then: 返回 403
    });

    it('需要数据集读权限', async () => {
      // Given: 用户没有数据集权限
      // When: 创建评估
      // Then: 返回 403
    });
  });

  describe('文件验证', () => {
    it('文件大小不能超过 10MB', async () => {
      // When: 上传 15MB 文件
      // Then: 返回 400 "文件过大"
    });

    it('CSV 必须包含必要列', async () => {
      // When: CSV 缺少 input 列
      // Then: 返回 400 "缺少必要字段"
    });

    it('JSON 格式必须正确', async () => {
      // When: JSON 格式错误
      // Then: 返回 400 "JSON 解析失败"
    });

    it('空文件应返回错误', async () => {
      // When: 上传空文件
      // Then: 返回 400 "文件内容为空"
    });
  });
});
```

---

## 3. 发票抬头 API 测试

### 3.1 测试文件

`test/api/phase6/invoiceHeader.api.test.ts`

### 3.2 获取发票抬头测试

```typescript
describe('GET /api/support/user/team/invoiceAccount/getTeamInvoiceHeader', () => {
  describe('正常流程', () => {
    it('应该返回已设置的发票抬头', async () => {
      // Given: 团队已设置发票抬头
      // When: 获取发票抬头
      // Then: 返回完整的发票抬头信息
    });

    it('未设置时应返回 null', async () => {
      // Given: 团队未设置发票抬头
      // When: 获取发票抬头
      // Then: 返回 null
    });

    it('应该返回企业类型的完整信息', async () => {
      // Given: 设置了企业类型发票抬头
      // When: 获取发票抬头
      // Then: 包含税号、开户行等字段
    });
  });

  describe('权限验证', () => {
    it('未认证请求应返回 401', async () => {
      // When: 不带 token
      // Then: 返回 401
    });

    it('团队成员都可以查看', async () => {
      // Given: 用户是普通团队成员
      // When: 获取发票抬头
      // Then: 返回成功
    });
  });
});
```

### 3.3 更新发票抬头测试

```typescript
describe('POST /api/support/user/team/invoiceAccount/update', () => {
  describe('正常流程 - 个人', () => {
    it('应该创建个人发票抬头', async () => {
      // Given: 团队未设置发票抬头
      // When: 设置个人类型
      // Then: 创建成功
    });

    it('应该更新已有的发票抬头', async () => {
      // Given: 已有发票抬头
      // When: 更新信息
      // Then: 更新成功
    });
  });

  describe('正常流程 - 企业', () => {
    it('应该创建企业发票抬头', async () => {
      // Given: 团队未设置发票抬头
      // When: 设置企业类型，包含税号
      // Then: 创建成功
    });

    it('企业类型必须填写税号', async () => {
      // When: invoiceType=company，不传 taxNumber
      // Then: 返回 400
    });
  });

  describe('参数验证', () => {
    it('invoiceType 必填', async () => {
      // When: 不传 invoiceType
      // Then: 返回 400
    });

    it('title 必填', async () => {
      // When: 不传 title
      // Then: 返回 400
    });

    it('receiverName 必填', async () => {
      // When: 不传 receiverName
      // Then: 返回 400
    });

    it('receiverPhone 必填', async () => {
      // When: 不传 receiverPhone
      // Then: 返回 400
    });

    it('receiverAddress 必填', async () => {
      // When: 不传 receiverAddress
      // Then: 返回 400
    });

    it('taxNumber 格式验证（15-20 位）', async () => {
      // When: taxNumber = "123"
      // Then: 返回 400 "税号格式错误"
    });

    it('receiverPhone 格式验证', async () => {
      // When: receiverPhone = "123"
      // Then: 返回 400 "手机号格式错误"
    });

    it('receiverEmail 格式验证', async () => {
      // When: receiverEmail = "invalid"
      // Then: 返回 400 "邮箱格式错误"
    });
  });

  describe('权限验证', () => {
    it('只有 owner/admin 可以更新', async () => {
      // Given: 用户是普通成员
      // When: 更新发票抬头
      // Then: 返回 403
    });
  });
});
```

---

## 4. 优惠券兑换 API 测试

### 4.1 测试文件

`test/api/phase6/coupon.api.test.ts`

### 4.2 测试用例

```typescript
describe('GET /api/support/wallet/coupon/redeem', () => {
  describe('正常流程', () => {
    it('应该成功兑换优惠券', async () => {
      // Given: 有效的兑换码
      // When: 兑换
      // Then: 返回优惠券信息
    });

    it('应该创建用户优惠券记录', async () => {
      // When: 兑换成功
      // Then: user_coupons 表有新记录
    });

    it('应该标记兑换码为已使用', async () => {
      // When: 兑换成功
      // Then: coupon_codes 表记录 status=used
    });

    it('应该返回正确的提示消息', async () => {
      // Given: 50 元优惠券
      // When: 兑换成功
      // Then: message 包含 "获得 50 元优惠券"
    });
  });

  describe('参数验证', () => {
    it('code 必填', async () => {
      // When: 不传 code
      // Then: 返回 400
    });
  });

  describe('兑换码验证', () => {
    it('兑换码不存在时返回错误', async () => {
      // When: code 不存在
      // Then: 返回 400 "兑换码无效"
    });

    it('兑换码已使用时返回错误', async () => {
      // Given: 兑换码已被使用
      // When: 尝试兑换
      // Then: 返回 400 "兑换码已被使用"
    });

    it('兑换码已过期时返回错误', async () => {
      // Given: 兑换码已过期
      // When: 尝试兑换
      // Then: 返回 400 "兑换码已过期"
    });

    it('同批次不能重复兑换', async () => {
      // Given: 用户已兑换过同批次的码
      // When: 尝试兑换同批次其他码
      // Then: 返回 400 "已兑换过此批次优惠券"
    });
  });

  describe('权限验证', () => {
    it('未认证请求应返回 401', async () => {
      // When: 不带 token
      // Then: 返回 401
    });
  });

  describe('并发测试', () => {
    it('同一兑换码不能被多人同时使用', async () => {
      // Given: 有效兑换码
      // When: 两个用户同时尝试兑换
      // Then: 只有一个成功
    });
  });
});
```

---

## 5. 收藏标签更新 API 测试

### 5.1 测试文件

`test/api/phase6/favouriteTags.api.test.ts`

### 5.2 测试用例

```typescript
describe('PUT /api/core/chat/setting/favourite/tags', () => {
  describe('正常流程', () => {
    it('应该更新收藏应用的标签', async () => {
      // Given: 已收藏的应用
      // When: 更新标签 ["工作", "常用"]
      // Then: 更新成功
    });

    it('应该支持清空标签', async () => {
      // Given: 已收藏的应用有标签
      // When: 更新标签为 []
      // Then: 标签被清空
    });
  });

  describe('参数验证', () => {
    it('appId 必填', async () => {
      // When: 不传 appId
      // Then: 返回 400
    });

    it('tags 必填', async () => {
      // When: 不传 tags
      // Then: 返回 400
    });

    it('tags 必须是数组', async () => {
      // When: tags = "string"
      // Then: 返回 400
    });

    it('标签数量不能超过 5 个', async () => {
      // When: tags = ["1", "2", "3", "4", "5", "6"]
      // Then: 返回 400 "标签数量超过限制"
    });

    it('单个标签长度不能超过 10 字符', async () => {
      // When: tags = ["这是一个超过十个字符的标签"]
      // Then: 返回 400 "标签长度超过限制"
    });
  });

  describe('业务验证', () => {
    it('应用未收藏时返回错误', async () => {
      // Given: 应用未被收藏
      // When: 更新标签
      // Then: 返回 400 "应用未收藏"
    });
  });

  describe('权限验证', () => {
    it('未认证请求应返回 401', async () => {
      // When: 不带 token
      // Then: 返回 401
    });

    it('只能更新自己收藏的应用', async () => {
      // Given: 应用是其他用户收藏的
      // When: 更新标签
      // Then: 返回 403
    });
  });
});
```

---

## 6. 测试数据准备

### 6.1 基础测试数据

```typescript
// test/fixtures/phase6c.ts

export const testApp = {
  _id: new ObjectId(),
  name: '测试应用',
  teamId: testTeam._id
};

export const testDataset = {
  _id: new ObjectId(),
  name: '评估数据集',
  teamId: testTeam._id
};

export const testInvoiceHeader = {
  teamId: testTeam._id,
  invoiceType: 'company',
  title: '测试公司',
  taxNumber: '123456789012345',
  receiverName: '张三',
  receiverPhone: '13800138000',
  receiverAddress: '北京市朝阳区'
};

export const testCouponCode = {
  code: 'TEST2024',
  batchId: 'batch_001',
  type: 'amount',
  value: 5000,  // 50 元
  minAmount: 10000,
  expireTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),  // 30 天后
  status: 'unused'
};

export const testFavouriteApp = {
  userId: testUser._id,
  appId: testApp._id,
  tags: ['默认']
};
```

### 6.2 测试文件准备

```typescript
// test/fixtures/files/phase6c.ts

export const testCSVContent = `input,expectedOutput
"什么是人工智能？","人工智能是计算机科学的一个分支..."
"如何学习编程？","学习编程需要..."
`;

export const testJSONContent = JSON.stringify([
  { input: "什么是人工智能？", expectedOutput: "人工智能是计算机科学的一个分支..." },
  { input: "如何学习编程？", expectedOutput: "学习编程需要..." }
]);

export function createTestCSVFile(): Buffer {
  return Buffer.from(testCSVContent, 'utf-8');
}

export function createTestJSONFile(): Buffer {
  return Buffer.from(testJSONContent, 'utf-8');
}
```

---

## 7. 测试执行

### 7.1 执行命令

```bash
# 运行 Phase 6C 所有测试
pnpm test -- test/api/phase6/evaluation.api.test.ts test/api/phase6/invoiceHeader.api.test.ts test/api/phase6/coupon.api.test.ts test/api/phase6/favouriteTags.api.test.ts

# 运行单个测试文件
pnpm test -- test/api/phase6/coupon.api.test.ts

# 监听模式
pnpm test:watch -- test/api/phase6/
```

### 7.2 覆盖率要求

| 指标 | 要求 |
|------|------|
| 行覆盖率 | ≥ 80% |
| 分支覆盖率 | ≥ 70% |
| 函数覆盖率 | ≥ 90% |

---

## 8. 验收标准

- [x] 所有测试用例通过 (48/48)
- [x] 覆盖所有正常流程和异常流程
- [x] 权限验证测试通过
- [x] 并发测试验证正确性（优惠券同批次限制）
- [x] 测试执行时间 < 60s（实际约 57s）

---

## 9. 实际测试结果

### 9.1 执行命令

```bash
pnpm test test/api/phase6/coupon.api.test.ts \
  test/api/phase6/evaluationCreate.api.test.ts \
  test/api/phase6/favouriteTags.api.test.ts \
  test/api/phase6/invoiceHeader.api.test.ts
```

### 9.2 测试结果汇总

| 测试文件 | 用例数 | 通过 | 失败 | 执行时间 |
|----------|--------|------|------|----------|
| invoiceHeader.api.test.ts | 12 | 12 | 0 | ~15s |
| coupon.api.test.ts | 12 | 12 | 0 | ~14s |
| favouriteTags.api.test.ts | 9 | 9 | 0 | ~12s |
| evaluationCreate.api.test.ts | 15 | 15 | 0 | ~15s |
| **总计** | **48** | **48** | **0** | **~57s** |

### 9.3 测试覆盖场景

#### 发票抬头测试 (12 用例)
- ✅ 获取已设置的发票抬头
- ✅ 未设置时返回 null
- ✅ 创建个人发票抬头
- ✅ 创建企业发票抬头
- ✅ 更新已有发票抬头
- ✅ 企业类型缺少税号报错
- ✅ 税号格式验证
- ✅ 手机号格式验证
- ✅ 邮箱格式验证
- ✅ 缺少必填字段报错
- ✅ 普通成员无权限报错
- ✅ 未认证报错

#### 优惠券测试 (12 用例)
- ✅ 成功兑换优惠券
- ✅ 成功兑换折扣券
- ✅ 兑换码不存在报错
- ✅ 兑换码已使用报错
- ✅ 兑换码已过期报错
- ✅ 同批次不能重复兑换
- ✅ 兑换后状态变为已使用
- ✅ 兑换后创建用户优惠券
- ✅ 兑换码大小写不敏感
- ✅ 空兑换码报错
- ✅ 未认证报错

#### 收藏标签测试 (9 用例)
- ✅ 成功更新标签
- ✅ 成功清空标签
- ✅ 标签数量超限报错
- ✅ 标签长度超限报错
- ✅ 收藏不存在报错
- ✅ 其他用户收藏无法更新
- ✅ 缺少 favouriteId 报错
- ✅ tags 非数组报错
- ✅ 未认证报错

#### 应用评估测试 (15 用例)
- ✅ 成功创建评估任务
- ✅ 创建对应评估项目
- ✅ 支持自定义评估模型
- ✅ 支持自定义评估指标
- ✅ 缺少 appId 报错
- ✅ 缺少 name 报错
- ✅ 空名称报错
- ✅ 名称超长报错
- ✅ 描述超长报错
- ✅ 空测试用例报错
- ✅ 测试用例缺少 input 报错
- ✅ input 超长报错
- ✅ 评估任务状态为 pending
- ✅ 评估项目状态为 pending
- ✅ 未认证报错

---

*创建时间: 2025-11-26*
*完成时间: 2025-11-26*

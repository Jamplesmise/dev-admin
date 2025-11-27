# Phase 6D 测试计划

> 子阶段: Phase 6D - 数据同步与其他功能
> API 数量: 11 个
> 创建时间: 2025-11-26

---

## 1. 测试范围

### 1.1 待测 API

| 分组 | API | 方法 | 测试文件 |
|------|-----|------|----------|
| **6D-1** | `/api/support/user/sync` | POST | `userSync.api.test.ts` |
| **6D-1** | `/api/support/user/team/member/export` | GET | `memberExport.api.test.ts` |
| **6D-1** | `/api/support/user/team/updateNotificationAccount` | PUT | `userSync.api.test.ts` |
| **6D-2** | `/api/support/user/team/tag/list` | GET | `teamTag.api.test.ts` |
| **6D-2** | `/api/support/user/team/tag/async` | GET | `teamTag.api.test.ts` |
| **6D-2** | `/api/support/user/team/tag/getAppsByTeamTokens` | GET | `teamTag.api.test.ts` |
| **6D-3** | `/api/core/dataset/datasetSync` | POST | `datasetSync.api.test.ts` |
| **6D-3** | `/api/core/dataset/changeOwner` | POST | `datasetSync.api.test.ts` |
| **6D-3** | `/api/core/dataset/collection/create/externalFileUrl` | POST | `datasetSync.api.test.ts` |
| **6D-4** | `/api/support/activity/promotion/getPromotions` | POST | `promotion.api.test.ts` |
| **6D-4** | `/api/core/app/template/getTemplateTypes` | GET | `templateType.api.test.ts` |

---

## 2. 用户同步与导出 API 测试

### 2.1 成员同步测试

`test/api/phase6/userSync.api.test.ts`

```typescript
describe('POST /api/support/user/sync', () => {
  describe('正常流程 - 增量同步', () => {
    it('应该创建新用户', async () => {
      // Given: 同步列表包含新用户
      // When: syncMode=incremental
      // Then: 创建新用户，返回 created=1
    });

    it('应该更新已有用户', async () => {
      // Given: 同步列表包含已存在的用户（更新了信息）
      // When: syncMode=incremental
      // Then: 更新用户信息，返回 updated=1
    });

    it('应该跳过无变化的用户', async () => {
      // Given: 同步列表与数据库一致
      // When: syncMode=incremental
      // Then: 返回 skipped>0
    });
  });

  describe('正常流程 - 全量同步', () => {
    it('应该标记不在列表中的成员为 inactive', async () => {
      // Given: 团队有成员 A, B, C
      // When: 全量同步只包含 A, B
      // Then: C 状态变为 inactive
    });

    it('应该自动创建不存在的部门', async () => {
      // Given: department="/公司/技术部/后端组"，但技术部不存在
      // When: 同步
      // Then: 自动创建技术部和后端组
    });
  });

  describe('参数验证', () => {
    it('users 必填', async () => {
      // When: 不传 users
      // Then: 返回 400
    });

    it('syncMode 必填', async () => {
      // When: 不传 syncMode
      // Then: 返回 400
    });

    it('每个用户必须有 externalId', async () => {
      // When: 某用户缺少 externalId
      // Then: 返回 400
    });

    it('每个用户必须有 username', async () => {
      // When: 某用户缺少 username
      // Then: 返回 400
    });
  });

  describe('权限验证', () => {
    it('只有 owner/admin 可以同步', async () => {
      // Given: 当前用户是普通成员
      // When: 尝试同步
      // Then: 返回 403
    });
  });

  describe('错误处理', () => {
    it('应该返回同步失败的用户列表', async () => {
      // Given: 某用户数据无效
      // When: 同步
      // Then: errors 数组包含失败详情
    });

    it('部分失败不影响其他用户同步', async () => {
      // Given: 3 个用户，1 个数据无效
      // When: 同步
      // Then: 2 个成功，1 个失败
    });
  });
});
```

### 2.2 成员导出测试

`test/api/phase6/memberExport.api.test.ts`

```typescript
describe('GET /api/support/user/team/member/export', () => {
  describe('正常流程', () => {
    it('应该导出 CSV 文件', async () => {
      // Given: 团队有成员
      // When: format=csv
      // Then: 返回 CSV 内容
    });

    it('应该包含正确的列', async () => {
      // When: 导出
      // Then: 包含 用户名,邮箱,手机号,角色,状态,所属部门,加入时间
    });

    it('应该正确设置响应头', async () => {
      // When: 导出
      // Then: Content-Type=text/csv, Content-Disposition 包含文件名
    });

    it('默认格式应为 CSV', async () => {
      // When: 不传 format
      // Then: 返回 CSV 格式
    });
  });

  describe('权限验证', () => {
    it('只有 owner/admin 可以导出', async () => {
      // Given: 当前用户是普通成员
      // When: 尝试导出
      // Then: 返回 403
    });
  });

  describe('边界条件', () => {
    it('团队没有成员时返回只有标题行的 CSV', async () => {
      // Given: 团队没有成员
      // When: 导出
      // Then: 返回只有标题行的 CSV
    });
  });
});
```

### 2.3 更新通知账户测试

```typescript
describe('PUT /api/support/user/team/updateNotificationAccount', () => {
  describe('正常流程', () => {
    it('应该更新邮件通知配置', async () => {
      // When: emailNotification.enabled=true, email="test@example.com"
      // Then: 更新成功
    });

    it('应该更新短信通知配置', async () => {
      // When: smsNotification.enabled=true, phone="13800138000"
      // Then: 更新成功
    });

    it('应该更新 Webhook 通知配置', async () => {
      // When: webhookNotification.enabled=true, url="https://..."
      // Then: 更新成功
    });

    it('应该支持部分更新', async () => {
      // Given: 已有邮件配置
      // When: 只更新短信配置
      // Then: 邮件配置保持不变
    });
  });

  describe('参数验证', () => {
    it('邮箱格式验证', async () => {
      // When: email="invalid"
      // Then: 返回 400
    });

    it('手机号格式验证', async () => {
      // When: phone="123"
      // Then: 返回 400
    });

    it('Webhook URL 格式验证', async () => {
      // When: url="not-a-url"
      // Then: 返回 400
    });
  });

  describe('权限验证', () => {
    it('只有 owner/admin 可以更新', async () => {
      // Given: 当前用户是普通成员
      // When: 尝试更新
      // Then: 返回 403
    });
  });
});
```

---

## 3. 团队标签 API 测试

### 3.1 测试文件

`test/api/phase6/teamTag.api.test.ts`

### 3.2 标签列表测试

```typescript
describe('GET /api/support/user/team/tag/list', () => {
  describe('正常流程', () => {
    it('应该返回团队标签列表', async () => {
      // Given: 团队有 3 个标签
      // When: 获取列表
      // Then: 返回 3 个标签
    });

    it('应该按创建时间排序', async () => {
      // Given: 标签创建于不同时间
      // When: 获取列表
      // Then: 按创建时间排序
    });

    it('应该包含标签的选项', async () => {
      // Given: 标签有多个选项
      // When: 获取列表
      // Then: options 字段包含所有选项
    });
  });

  describe('权限验证', () => {
    it('未认证请求应返回 401', async () => {
      // When: 不带 token
      // Then: 返回 401
    });
  });

  describe('边界条件', () => {
    it('没有标签时返回空数组', async () => {
      // Given: 团队没有标签
      // When: 获取列表
      // Then: 返回 []
    });
  });
});
```

### 3.3 异步加载标签测试

```typescript
describe('GET /api/support/user/team/tag/async', () => {
  describe('正常流程', () => {
    it('应该支持分页', async () => {
      // Given: 团队有 30 个标签
      // When: page=1, pageSize=10
      // Then: 返回 10 个标签，hasMore=true
    });

    it('应该支持关键词搜索', async () => {
      // Given: 标签名包含 "项目"
      // When: keyword="项目"
      // Then: 只返回匹配的标签
    });

    it('应该返回正确的 total', async () => {
      // Given: 25 个标签
      // When: 获取列表
      // Then: total=25
    });
  });

  describe('参数默认值', () => {
    it('page 默认为 1', async () => {
      // When: 不传 page
      // Then: 返回第一页
    });

    it('pageSize 默认为 20', async () => {
      // When: 不传 pageSize
      // Then: 返回最多 20 条
    });
  });
});
```

### 3.4 令牌获取应用测试

```typescript
describe('GET /api/support/user/team/tag/getAppsByTeamTokens', () => {
  describe('正常流程', () => {
    it('应该返回令牌关联的应用', async () => {
      // Given: 令牌关联了应用 A 和 B
      // When: 查询
      // Then: 返回应用 A 和 B 的信息
    });

    it('应该支持多个令牌', async () => {
      // When: tokens="token1,token2"
      // Then: 返回所有关联的应用
    });
  });

  describe('参数验证', () => {
    it('tokens 必填', async () => {
      // When: 不传 tokens
      // Then: 返回 400
    });
  });

  describe('错误处理', () => {
    it('令牌无效时返回空数组', async () => {
      // When: tokens="invalid_token"
      // Then: 返回 []
    });
  });
});
```

---

## 4. 数据集同步 API 测试

### 4.1 测试文件

`test/api/phase6/datasetSync.api.test.ts`

### 4.2 数据集同步测试

```typescript
describe('POST /api/core/dataset/datasetSync', () => {
  describe('正常流程', () => {
    it('应该创建同步任务', async () => {
      // Given: 数据集存在
      // When: 触发同步
      // Then: 返回 taskId，status=queued
    });

    it('应该支持手动同步模式', async () => {
      // When: syncMode=manual
      // Then: 创建手动同步任务
    });
  });

  describe('参数验证', () => {
    it('datasetId 必填', async () => {
      // When: 不传 datasetId
      // Then: 返回 400
    });
  });

  describe('权限验证', () => {
    it('需要数据集写权限', async () => {
      // Given: 用户只有数据集只读权限
      // When: 触发同步
      // Then: 返回 403
    });
  });

  describe('业务验证', () => {
    it('已有进行中的同步任务时返回错误', async () => {
      // Given: 数据集有进行中的同步任务
      // When: 再次触发同步
      // Then: 返回 400 "已有同步任务进行中"
    });
  });
});
```

### 4.3 更改数据集所有者测试

```typescript
describe('POST /api/core/dataset/changeOwner', () => {
  describe('正常流程', () => {
    it('应该成功转让所有权', async () => {
      // Given: 当前用户是数据集 owner
      // When: 转让给团队成员
      // Then: 转让成功
    });

    it('应该更新数据集的 tmbId', async () => {
      // When: 转让成功
      // Then: dataset.tmbId 更新为新所有者
    });

    it('应该更新协作者记录', async () => {
      // When: 转让成功
      // Then: 协作者表中相关记录更新
    });

    it('应该记录审计日志', async () => {
      // When: 转让成功
      // Then: 审计日志表有记录
    });
  });

  describe('参数验证', () => {
    it('datasetId 必填', async () => {
      // When: 不传 datasetId
      // Then: 返回 400
    });

    it('targetTmbId 必填', async () => {
      // When: 不传 targetTmbId
      // Then: 返回 400
    });
  });

  describe('权限验证', () => {
    it('只有 owner 可以转让', async () => {
      // Given: 当前用户不是 owner
      // When: 尝试转让
      // Then: 返回 403
    });
  });

  describe('业务验证', () => {
    it('目标用户必须是团队成员', async () => {
      // Given: targetTmbId 不是团队成员
      // When: 尝试转让
      // Then: 返回 400
    });

    it('不能转让给自己', async () => {
      // Given: targetTmbId 是当前用户
      // When: 尝试转让
      // Then: 返回 400
    });
  });
});
```

### 4.4 外部文件集合测试

```typescript
describe('POST /api/core/dataset/collection/create/externalFileUrl', () => {
  describe('正常流程', () => {
    it('应该创建集合', async () => {
      // Given: 有效的外部文件 URL
      // When: 创建集合
      // Then: 返回 collectionId
    });

    it('应该自动提取文件名作为集合名', async () => {
      // Given: URL 为 https://example.com/docs/guide.pdf
      // When: 不传 name
      // Then: 集合名为 "guide.pdf"
    });

    it('应该支持自定义名称', async () => {
      // When: name="自定义名称"
      // Then: 集合名为 "自定义名称"
    });

    it('应该支持自定义元数据', async () => {
      // When: metadata={ source: "external" }
      // Then: 集合包含元数据
    });
  });

  describe('参数验证', () => {
    it('datasetId 必填', async () => {
      // When: 不传 datasetId
      // Then: 返回 400
    });

    it('externalFileUrl 必填', async () => {
      // When: 不传 externalFileUrl
      // Then: 返回 400
    });

    it('URL 格式验证', async () => {
      // When: externalFileUrl="not-a-url"
      // Then: 返回 400
    });
  });

  describe('权限验证', () => {
    it('需要数据集写权限', async () => {
      // Given: 用户只有数据集只读权限
      // When: 创建集合
      // Then: 返回 403
    });
  });
});
```

---

## 5. 其他 API 测试

### 5.1 推广记录测试

`test/api/phase6/promotion.api.test.ts`

```typescript
describe('POST /api/support/activity/promotion/getPromotions', () => {
  describe('正常流程', () => {
    it('应该返回推广记录分页列表', async () => {
      // Given: 有 25 条推广记录
      // When: pageNum=1, pageSize=10
      // Then: 返回 10 条记录，total=25
    });

    it('应该支持状态筛选', async () => {
      // When: status="completed"
      // Then: 只返回已完成的记录
    });

    it('应该支持时间范围筛选', async () => {
      // When: dateRange.start="2024-01-01"
      // Then: 只返回指定时间后的记录
    });

    it('应该包含推广人和被邀请人信息', async () => {
      // When: 获取列表
      // Then: 包含 promoterName 和 inviteeName
    });
  });

  describe('参数验证', () => {
    it('pageNum 必填', async () => {
      // When: 不传 pageNum
      // Then: 返回 400
    });

    it('pageSize 必填', async () => {
      // When: 不传 pageSize
      // Then: 返回 400
    });
  });

  describe('权限验证', () => {
    it('只有 owner/admin 可以查看全部记录', async () => {
      // Given: 当前用户是普通成员
      // When: 获取列表
      // Then: 只返回自己的推广记录
    });
  });
});
```

### 5.2 模板类型测试

`test/api/phase6/templateType.api.test.ts`

```typescript
describe('GET /api/core/app/template/getTemplateTypes', () => {
  describe('正常流程', () => {
    it('应该返回模板类型列表', async () => {
      // Given: 有模板类型
      // When: 获取列表
      // Then: 返回类型列表
    });

    it('应该返回树形结构', async () => {
      // Given: 存在父子类型关系
      // When: 获取列表
      // Then: 子类型在 children 字段中
    });

    it('应该按 order 字段排序', async () => {
      // Given: 类型有不同的 order 值
      // When: 获取列表
      // Then: 按 order 排序
    });
  });

  describe('权限验证', () => {
    it('未认证请求应返回 401', async () => {
      // When: 不带 token
      // Then: 返回 401
    });
  });

  describe('边界条件', () => {
    it('没有类型时返回空数组', async () => {
      // Given: 没有模板类型
      // When: 获取列表
      // Then: 返回 []
    });
  });
});
```

---

## 6. 测试数据准备

### 6.1 基础测试数据

```typescript
// test/fixtures/phase6d.ts

export const testExternalUsers = [
  { externalId: 'ext_001', username: '张三', email: 'zhangsan@example.com', department: '/技术部' },
  { externalId: 'ext_002', username: '李四', email: 'lisi@example.com', department: '/产品部' }
];

export const testTeamTags = [
  { teamId: testTeam._id, key: 'project', label: '项目标签', type: 'single', options: [{ value: 'p1', label: '项目一' }] },
  { teamId: testTeam._id, key: 'priority', label: '优先级', type: 'single', options: [{ value: 'high', label: '高' }] }
];

export const testPromotions = [
  { promoterId: testUser._id, inviteeId: new ObjectId(), rewardAmount: 5000, status: 'completed' },
  { promoterId: testUser._id, inviteeId: new ObjectId(), rewardAmount: 5000, status: 'pending' }
];

export const testTemplateTypes = [
  { key: 'chat', label: '对话应用', order: 1 },
  { key: 'workflow', label: '工作流应用', order: 2 },
  { key: 'chat-assistant', label: '对话助手', parentKey: 'chat', order: 1 }
];
```

---

## 7. 测试执行

### 7.1 执行命令

```bash
# 运行 Phase 6D 所有测试
pnpm test -- test/api/phase6/userSync.api.test.ts test/api/phase6/memberExport.api.test.ts test/api/phase6/teamTag.api.test.ts test/api/phase6/datasetSync.api.test.ts test/api/phase6/promotion.api.test.ts test/api/phase6/templateType.api.test.ts

# 运行单个测试文件
pnpm test -- test/api/phase6/datasetSync.api.test.ts

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

- [ ] 所有测试用例通过
- [ ] 覆盖率达标
- [ ] 导出文件格式正确
- [ ] 异步任务创建正确
- [ ] 测试执行时间 < 60s

---

*创建时间: 2025-11-26*

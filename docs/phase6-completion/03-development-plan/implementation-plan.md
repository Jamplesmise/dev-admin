# Phase 6 实现计划

> 阶段: Phase 6 - 接口补全
> 总 API 数量: 25 个
> 创建时间: 2025-11-26

---

## 1. 开发顺序

按优先级和依赖关系，建议的开发顺序：

```
Phase 6A (协作者+搜索)
    ↓
Phase 6B (成员+微信登录)
    ↓
Phase 6C (评估+发票+优惠券)
    ↓
Phase 6D (同步+标签+其他)
```

---

## 2. Phase 6A 实现计划 ✅ 已完成

> **状态**: 已完成 | **完成时间**: 2025-11-26 | **测试结果**: 32/32 通过

### 2.1 开发任务

| 任务ID | 任务名称 | 状态 | 实际文件 |
|--------|----------|------|----------|
| 6A-1 | 用户搜索 API | ✅ | `pages/api/support/user/search.ts` |
| 6A-2 | 团队协作者列表 | ✅ | `pages/api/support/user/team/collaborator/list.ts` |
| 6A-3 | 更新协作者权限 | ✅ | `pages/api/support/user/team/collaborator/update.ts` |
| 6A-4 | 更新单个协作者 | ✅ | `pages/api/support/user/team/collaborator/updateOne.ts` |
| 6A-5 | 删除协作者 | ✅ | `pages/api/support/user/team/collaborator/delete.ts` |

### 2.2 Schema 修改 ✅

- `src/packages/global/support/permission/collaborator/constant.ts` - 新增 'team' 资源类型
- `src/packages/service/support_permission/collaborator/schema.ts` - resourceId 改为可选（team 类型时）

### 2.2 实现步骤

#### 6A-1: 用户搜索 API

**文件**: `pages/api/support/user/search.ts`

```typescript
// 伪代码结构
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import { authMiddleware } from '@fastgpt/service/common/middle/authMiddleware';
import { MongoTeamMember } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { MongoMemberGroup } from '@fastgpt/service/support_permission/memberGroup/memberGroupSchema';
import { MongoOrg } from '@fastgpt/service/support_user/team/org/schema';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(req, res) {
  const { teamId } = req;
  const { searchKey, members = true, orgs = true, groups = true } = req.query;

  const result = { members: [], orgs: [], groups: [] };
  const searchRegex = new RegExp(searchKey, 'i');
  const limit = 20;

  if (members) {
    result.members = await MongoTeamMember.find({
      teamId,
      memberName: searchRegex
    }).limit(limit).lean();
  }

  if (orgs) {
    result.orgs = await MongoOrg.find({
      teamId,
      name: searchRegex
    }).limit(limit).lean();
  }

  if (groups) {
    result.groups = await MongoMemberGroup.find({
      teamId,
      name: searchRegex
    }).limit(limit).lean();
  }

  return result;
}

export default NextAPI(handler);
```

#### 6A-2: 团队协作者列表 API

**文件**: `pages/api/support/user/team/collaborator/list.ts`

```typescript
// 关键实现逻辑
async function handler(req, res) {
  const { teamId } = req;

  // 查询 resourceType 为 'team' 的协作者
  const collaborators = await MongoCollaborator.find({
    teamId,
    resourceType: 'team'
  }).lean();

  // 聚合查询名称和头像
  const clbs = await enrichCollaboratorInfo(collaborators);

  return { clbs };
}
```

#### 6A-3 ~ 6A-5: 协作者 CRUD

**核心验证逻辑**:
```typescript
// 权限验证
const tmb = await MongoTeamMember.findById(tmbId);
if (tmb.role !== 'owner' && tmb.role !== 'admin') {
  throw new Error('权限不足');
}

// Owner 保护
if (targetCollaborator.tmbId === ownerTmbId) {
  throw new Error('不能修改 owner 的权限');
}
```

---

## 3. Phase 6B 实现计划 ✅ 已完成

> **状态**: 已完成 | **完成时间**: 2025-11-26 | **测试结果**: 39/39 通过

### 3.1 开发任务

| 任务ID | 任务名称 | 状态 | 实际文件 |
|--------|----------|------|----------|
| 6B-1 | 分组成员列表 | ✅ | `pages/api/support/user/team/group/members.ts` |
| 6B-2 | 更改分组所有者 | ✅ | `pages/api/support/user/team/group/changeOwner.ts` |
| 6B-3 | 组织成员列表 | ✅ | `pages/api/support/user/team/org/members.ts` |
| 6B-4 | 微信登录结果 | ✅ | `pages/api/support/user/account/login/wx/getResult.ts` |

### 3.2 类型定义更新 ✅

- `src/packages/global/support_user_team/group/api.d.ts` - 新增 GetGroupMembersQuery, PutChangeGroupOwnerBody
- `src/packages/global/support_user_team/org/api.d.ts` - 新增 GetOrgMembersQuery, PaginatedResponse
- `src/packages/global/support_user/auth/type.d.ts` - 新增 GetWxLoginResultRequest, GetWxLoginResultResponse

### 3.3 实现要点

1. **ObjectId 类型处理**: MongoDB 聚合查询需要使用 `mongoose.Types.ObjectId()` 转换字符串 ID
2. **分页参数验证**: 先验证再设默认值，避免 `Number('0') || 1` 的逻辑问题
3. **事务操作**: changeOwner 使用 MongoDB 事务确保角色交换的原子性
4. **JWT 生成**: 微信登录返回包含 userId、teamId、tmbId 三个关键字段的 token

### 3.4 实现步骤

#### 6B-1: 分组成员列表

```typescript
async function handler(req, res) {
  const { groupId } = req.query;

  const members = await MongoGroupMember.aggregate([
    { $match: { groupId: new ObjectId(groupId) } },
    {
      $lookup: {
        from: 'team_members',
        localField: 'tmbId',
        foreignField: '_id',
        as: 'member'
      }
    },
    { $unwind: '$member' },
    {
      $project: {
        tmbId: 1,
        name: '$member.memberName',
        avatar: '$member.avatar',
        role: 1
      }
    },
    {
      $sort: {
        role: 1  // owner < admin < member
      }
    }
  ]);

  return members;
}
```

#### 6B-4: 微信登录结果

```typescript
async function handler(req, res) {
  const { code, inviterId, bd_vid, msclkid, fastgpt_sem, sourceDomain } = req.body;

  // 1. 从 Redis 获取扫码结果
  const redis = await getGlobalRedisConnection();
  const scanResult = await redis.get(`wx_scan:${code}`);

  if (!scanResult) {
    throw new Error('扫码信息不存在或已过期');
  }

  const { openId, unionId } = JSON.parse(scanResult);

  // 2. 查找或创建用户
  let user = await MongoUser.findOne({ 'oauthAccounts.wechat.openId': openId });

  if (!user) {
    user = await createUserWithTeam({
      openId,
      unionId,
      inviterId,
      trackingParams: { bd_vid, msclkid, fastgpt_sem, sourceDomain }
    });
  }

  // 3. 生成 JWT Token
  const token = generateToken(user._id);

  // 4. 清理 Redis 缓存
  await redis.del(`wx_scan:${code}`);

  return {
    user: formatUserInfo(user),
    token
  };
}
```

---

## 4. Phase 6C 实现计划 ✅ 已完成

> **状态**: 已完成 | **完成时间**: 2025-11-26 | **测试结果**: 48/48 通过

### 4.1 开发任务

| 任务ID | 任务名称 | 状态 | 实际文件 |
|--------|----------|------|----------|
| 6C-1 | 创建应用评估 | ✅ | `pages/api/core/app/evaluation/create.ts` |
| 6C-2 | 获取发票抬头 | ✅ | `pages/api/support/user/team/invoiceAccount/getTeamInvoiceHeader.ts` |
| 6C-3 | 更新发票抬头 | ✅ | `pages/api/support/user/team/invoiceAccount/update.ts` |
| 6C-4 | 兑换优惠券 | ✅ | `pages/api/support/wallet/coupon/redeem.ts` |
| 6C-5 | 更新收藏标签 | ✅ | `pages/api/core/chat/setting/favourite/tags.ts` (已修改) |

### 4.2 Schema 创建 ✅

已创建的 Schema 文件：

1. `src/packages/global/support/wallet/invoiceHeader/constant.ts` - 发票抬头常量
2. `src/packages/global/support/wallet/invoiceHeader/type.d.ts` - 发票抬头类型
3. `src/packages/service/support_wallet/invoiceHeader/schema.ts` - 发票抬头 Schema
4. `src/packages/global/support/wallet/coupon/constant.ts` - 优惠券常量
5. `src/packages/global/support/wallet/coupon/type.d.ts` - 优惠券类型
6. `src/packages/service/support_wallet/coupon/schema.ts` - 优惠券 Schema

### 4.3 实现步骤

#### 6C-1: 创建应用评估（文件上传）

```typescript
import formidable from 'formidable';
import { parseCSV, parseJSON } from '@fastgpt/service/common/utils/fileParser';

export const config = {
  api: {
    bodyParser: false  // 禁用默认 body parser
  }
};

async function handler(req, res) {
  const form = formidable({ maxFileSize: 10 * 1024 * 1024 }); // 10MB

  const [fields, files] = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve([fields, files]);
    });
  });

  const { appId, datasetId } = fields;
  const file = files.file?.[0];

  // 解析文件
  let evaluationData;
  if (file.mimetype === 'text/csv') {
    evaluationData = await parseCSV(file.filepath);
  } else if (file.mimetype === 'application/json') {
    evaluationData = await parseJSON(file.filepath);
  }

  // 创建评估任务
  const evaluation = await MongoEvaluation.create({
    appId,
    datasetId,
    data: evaluationData,
    status: 'pending'
  });

  return { evaluationId: evaluation._id };
}
```

#### 6C-4: 兑换优惠券

```typescript
async function handler(req, res) {
  const { userId, teamId } = req;
  const { code } = req.query;

  // 1. 查找兑换码
  const couponCode = await MongoCouponCode.findOne({ code, status: 'unused' });
  if (!couponCode) throw new Error('兑换码无效');

  // 2. 检查是否过期
  if (couponCode.expireTime < new Date()) {
    await MongoCouponCode.updateOne({ _id: couponCode._id }, { status: 'expired' });
    throw new Error('兑换码已过期');
  }

  // 3. 检查是否重复兑换同批次
  const existingCoupon = await MongoUserCoupon.findOne({
    userId,
    batchId: couponCode.batchId
  });
  if (existingCoupon) throw new Error('已兑换过此批次优惠券');

  // 4. 创建用户优惠券
  const userCoupon = await MongoUserCoupon.create({
    userId,
    teamId,
    sourceCode: code,
    batchId: couponCode.batchId,
    type: couponCode.type,
    value: couponCode.value,
    minAmount: couponCode.minAmount,
    scope: couponCode.scope,
    expireTime: couponCode.expireTime,
    status: 'available'
  });

  // 5. 标记兑换码已使用
  await MongoCouponCode.updateOne(
    { _id: couponCode._id },
    { status: 'used', usedBy: userId, usedTime: new Date() }
  );

  return {
    coupon: userCoupon,
    message: formatCouponMessage(userCoupon)
  };
}
```

---

## 5. Phase 6D 实现计划 🚧 进行中

> **状态**: 进行中 | **开始时间**: 2025-11-26 | **测试结果**: 82/82 通过 (7/11 API)

### 5.1 开发任务

| 任务ID | 任务名称 | 状态 | 实际文件 |
|--------|----------|------|----------|
| 6D-1-1 | 成员同步 | ✅ | `pages/api/support/user/sync.ts` |
| 6D-1-2 | 成员导出 | ✅ | `pages/api/support/user/team/member/export.ts` |
| 6D-1-3 | 更新通知账户 | ✅ | `pages/api/support/user/team/updateNotificationAccount.ts` |
| 6D-2-1 | 团队标签列表 | ✅ | `pages/api/support/user/team/tag/list.ts` |
| 6D-2-2 | 异步加载标签 | ✅ | `pages/api/support/user/team/tag/async.ts` |
| 6D-2-3 | 令牌获取应用 | ✅ | `pages/api/support/user/team/tag/getAppsByTeamTokens.ts` |
| 6D-3-1 | 数据集同步 | ✅ | `pages/api/core/dataset/datasetSync.ts` |
| 6D-3-2 | 更改数据集所有者 | ⏳ | `pages/api/core/dataset/changeOwner.ts` |
| 6D-3-3 | 外部文件集合 | ⏳ | `pages/api/core/dataset/collection/create/externalFileUrl.ts` |
| 6D-4-1 | 推广记录列表 | ⏳ | `pages/api/support/activity/promotion/getPromotions.ts` |
| 6D-4-2 | 模板类型列表 | ⏳ | `pages/api/core/app/template/getTemplateTypes.ts` |

### 5.2 Schema 创建 ✅

1. `src/packages/service/support_user/team/tag/schema.ts` - 团队标签 ✅ 已创建
2. `src/packages/service/core/app/template/schema.ts` - 模板类型 (待创建)

### 5.3 类型定义更新 ✅

- `src/packages/global/support_user_team/type.d.ts` - 新增 TeamTagOptionType, 更新 TeamTagItemType
- `src/packages/global/support_user/sync/type.d.ts` - 新增 SyncUserItem, PostUserSyncBody, PostUserSyncResponse

### 5.4 已完成测试

| 测试文件 | 测试数量 | 状态 |
|----------|----------|------|
| `test/api/phase6/userSync.api.test.ts` | 15 | ✅ |
| `test/api/phase6/memberExport.api.test.ts` | 13 | ✅ |
| `test/api/phase6/notificationAccount.api.test.ts` | 18 | ✅ |
| `test/api/phase6/teamTag.api.test.ts` | 18 | ✅ |
| `test/api/phase6/getAppsByTeamTokens.api.test.ts` | 6 | ✅ |
| `test/api/phase6/datasetSync.api.test.ts` | 12 | ✅ |
| **总计** | **82** | ✅ |

### 5.5 实现要点

1. **成员同步 API**: 支持增量/全量两种模式，自动创建不存在的组织结构
2. **成员导出 API**: 生成 UTF-8 BOM 格式的 CSV 文件，支持中文
3. **通知账户 API**: 支持邮件/短信/Webhook 三种通知渠道配置
4. **团队标签 API**: 支持分页、搜索、按创建时间排序
5. **数据集同步 API**: 创建同步任务，支持权限验证（owner/admin/协作者写权限）

---

## 6. 公共组件

### 6.1 需要新增的公共服务

```
src/packages/service/
├── support_invoice/
│   └── schema.ts                    # 发票抬头 Schema
├── support_wallet/
│   └── coupon/
│       └── schema.ts                # 优惠券 Schema
├── support_user/
│   └── team/
│       └── tag/
│           └── schema.ts            # 团队标签 Schema
└── core/
    └── app/
        └── template/
            └── schema.ts            # 模板类型 Schema
```

### 6.2 需要扩展的现有 Schema

1. **CollaboratorSchema**: 添加 `resourceType: 'team'` 支持
2. **TeamSchema**: 添加 `notificationConfig` 字段

---

## 7. 测试策略

### 7.1 单元测试文件

```
test/api/phase6/
├── collaborator.api.test.ts         # 6A 协作者测试
├── userSearch.api.test.ts           # 6A 用户搜索测试
├── groupMember.api.test.ts          # 6B 分组成员测试
├── orgMember.api.test.ts            # 6B 组织成员测试
├── wxLogin.api.test.ts              # 6B 微信登录测试
├── evaluation.api.test.ts           # 6C 评估测试
├── invoiceHeader.api.test.ts        # 6C 发票抬头测试
├── coupon.api.test.ts               # 6C 优惠券测试
├── favouriteTags.api.test.ts        # 6C 收藏标签测试
├── userSync.api.test.ts             # 6D 成员同步测试
├── memberExport.api.test.ts         # 6D 成员导出测试
├── teamTag.api.test.ts              # 6D 团队标签测试
├── datasetSync.api.test.ts          # 6D 数据集同步测试
├── promotion.api.test.ts            # 6D 推广记录测试
└── templateType.api.test.ts         # 6D 模板类型测试
```

### 7.2 测试覆盖要求

- 每个 API 测试覆盖率 ≥ 80%
- 包含正常流程和异常流程测试
- 包含权限验证测试
- 包含边界条件测试

---

## 8. 开发检查清单

### Phase 6A 检查清单 ✅ 已完成

- [x] 用户搜索返回正确结果
- [x] 搜索限制在当前团队范围内
- [x] 协作者列表关联查询正确
- [x] 批量更新使用 bulkWrite
- [x] Owner 权限不可修改
- [x] 删除操作物理删除记录
- [x] 所有 API 添加认证中间件
- [x] 单元测试通过 (32/32)

### Phase 6B 检查清单 ✅ 已完成

- [x] 分组成员按角色排序
- [x] 分组所有者转让使用事务
- [x] 组织成员分页正确
- [x] 微信登录支持新用户自动注册
- [x] MongoDB 扫码会话正确处理
- [x] 所有 API 添加认证中间件（微信登录除外）
- [x] 单元测试通过 (39/39)

### Phase 6C 检查清单 ✅ 已完成

- [x] 应用评估支持请求体传递测试用例
- [x] 测试用例格式验证（input 必填、长度限制）
- [x] 发票抬头 upsert 正确
- [x] 企业发票税号验证
- [x] 优惠券兑换防重复（同批次限制）
- [x] 优惠券使用 MongoDB 事务保证一致性
- [x] 收藏标签数量限制（最多 5 个）
- [x] 收藏标签长度限制（最多 20 字符）
- [x] 所有 API 添加认证中间件
- [x] 单元测试通过 (48/48)

### Phase 6D 检查清单 🚧 进行中

- [x] 成员同步增量/全量模式正确
- [x] 成员导出 CSV 格式正确（UTF-8 BOM，中文支持）
- [x] 通知账户支持多渠道（邮件/短信/Webhook）
- [x] 团队标签分页搜索正确
- [x] 数据集同步任务创建正确
- [ ] 数据集所有者转让正确
- [ ] 外部文件集合创建正确
- [ ] 推广记录筛选正确
- [ ] 模板类型树形结构正确
- [x] 所有已完成 API 添加认证中间件
- [x] 已完成 API 单元测试通过 (82/82)

---

## 9. 认证中间件规范

> **重要**: 详见 [API 认证中间件修复报告](../../troubleshooting/02-api-auth-fix-report.md)

### 9.1 API 开发必须遵循

```typescript
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import { authMiddleware, getTeamIdFromReq } from '@fastgpt/service/common/middle/authMiddleware';

// ⚠️ 必须在 beforeCallback 中添加 authMiddleware
const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(req: ApiRequestProps<Body>, _res: NextApiResponse) {
  const teamId = getTeamIdFromReq(req);
  // ...
}

export default NextAPI(handler);
```

### 9.2 测试编写必须遵循

```typescript
// ✅ 测试认证失败场景 - 必须添加 skipAuthMock
it('应该拒绝未登录用户', async () => {
  const response = await callApi(handler, {
    method: 'GET',
    skipAuthMock: true  // 关闭 TEST_MODE 的自动认证
  });
  expectError(response);
});
```

### 9.3 例外情况

微信登录结果 API (`/api/support/user/account/login/wx/getResult`) **不需要**认证中间件。

---

## 10. 风险与注意事项

### 10.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 文件上传大小限制 | 评估文件可能很大 | 设置合理的 maxFileSize |
| Redis 连接问题 | 微信登录失败 | 添加重试机制和错误处理 |
| 事务一致性 | 所有者转让数据不一致 | 使用 MongoDB 事务 |
| 认证中间件遗漏 | API 暴露安全风险 | 代码审查检查清单 |

### 10.2 注意事项

1. **认证中间件**: 所有新 API 必须添加 authMiddleware（微信登录除外）
2. **权限验证**: 所有涉及修改操作的 API 必须验证操作权限
3. **数据验证**: 输入参数必须严格验证，防止注入攻击
4. **错误处理**: 提供清晰的错误消息，便于前端展示
5. **日志记录**: 关键操作记录审计日志
6. **测试认证失败**: 测试未登录场景必须使用 `skipAuthMock: true`

---

*创建时间: 2025-11-26*

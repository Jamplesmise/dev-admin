# 4-action-standards.md

> 动作标准文档 - 定义 FastGPT 项目的开发规范与流程标准

---

## 1. 代码规范

### 1.1 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| **文件名** | 小驼峰 (组件除外) | `userService.ts`, `formatDate.ts` |
| **React 组件** | 大驼峰 + 同名目录 | `LoginForm/index.tsx` |
| **变量/函数** | 小驼峰 | `getUserInfo`, `isLoading` |
| **常量** | 全大写 + 下划线 | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| **类型/接口** | 大驼峰 | `UserInfo`, `ChatItemType` |
| **枚举** | 大驼峰 + Enum 后缀 | `FlowNodeTypeEnum`, `PermissionTypeEnum` |
| **数据库 Schema** | 大驼峰 + Schema 后缀 | `UserSchema`, `AppSchema` |

### 1.2 TypeScript 规范

```typescript
// ✅ 优先使用 type 而非 interface
type UserType = {
  id: string;
  name: string;
  createdAt: Date;
};

// ✅ 使用 type-imports
import type { UserType } from './types';
import { getUserById } from './service';

// ✅ 启用 strict 模式，不允许 any (除非不可避免)
// ❌ 避免使用 any
const data: any = response.data;  // 不推荐
const data = response.data as UserType;  // 推荐

// ✅ 共享类型定义在 packages/global 的 .d.ts 文件中
```

### 1.3 格式化规范 (Prettier)

```javascript
// .prettierrc.js 配置
{
  printWidth: 100,        // 单行最大长度
  tabWidth: 2,            // 缩进 2 空格
  useTabs: false,         // 使用空格
  semi: true,             // 语句末尾分号
  singleQuote: true,      // 单引号
  trailingComma: 'none',  // 无尾随逗号
  bracketSpacing: true,   // 对象括号空格
  arrowParens: 'always',  // 箭头函数参数括号
  endOfLine: 'lf'         // Unix 换行符
}
```

### 1.4 ESLint 规范

```json
// .eslintrc.json 核心规则
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    // 强制使用 type-imports
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        "prefer": "type-imports",
        "disallowTypeAnnotations": false
      }
    ]
  }
}
```

### 1.5 注释规范

```typescript
// ✅ 复杂逻辑必须添加注释
// 使用 KMP 算法进行字符串匹配，时间复杂度 O(n+m)
function kmpSearch(text: string, pattern: string): number {
  // ...
}

// ✅ TODO 格式
// TODO: 需要优化性能 - @zhangpeng 2025-01-20

// ✅ 函数文档 (仅导出的公共函数)
/**
 * 根据用户ID获取用户信息
 * @param userId - 用户唯一标识
 * @returns 用户信息，不存在返回 null
 */
export async function getUserById(userId: string): Promise<UserType | null> {
  // ...
}

// ❌ 不添加无意义注释
// 获取用户 (注释内容和代码一样，无意义)
const user = getUser();
```

---

## 2. 提交规范

### 2.1 Conventional Commits 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2.2 Type 类型定义

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: team rate limitation` |
| `fix` | Bug 修复 | `fix: dataset quick create modal` |
| `docs` | 文档更新 | `docs: update API documentation` |
| `style` | 代码格式 (不影响逻辑) | `style: format code with prettier` |
| `refactor` | 重构 (非新功能/修复) | `refactor: extract common utils` |
| `perf` | 性能优化 | `perf: optimize dataset query` |
| `test` | 测试相关 | `test: add workflow unit tests` |
| `chore` | 构建/工具变动 | `chore(deps): bump js-yaml` |
| `ci` | CI/CD 配置 | `ci: update github actions` |

### 2.3 Scope 范围 (可选)

```
core/workflow    - 工作流引擎
core/dataset     - 知识库模块
core/chat        - 对话模块
core/app         - 应用模块
core/ai          - AI 调用模块
support/user     - 用户模块
support/wallet   - 计费模块
common/utils     - 通用工具
deps             - 依赖更新
```

### 2.4 提交信息示例

```bash
# ✅ 好的提交信息
feat(core/workflow): add conditional branch node
fix(core/dataset): resolve vector search timeout issue
refactor(core/chat): extract message formatting logic
chore(deps): bump eslint from 8.56.0 to 8.57.0

# ❌ 不好的提交信息
fix bug                    # 太模糊
update code                # 无具体信息
feat: 新功能               # 避免中英混用
```

### 2.5 PR 关联

```bash
# 关联 Issue
fix(core/app): resolve template creating issue (#5924)

# 关联 PR
feat: V4.14.2 featured (#5922)
```

---

## 3. 分支策略

### 3.1 分支模型 (Git Flow 简化版)

```
main (主分支)
├── 始终保持可部署状态
├── 通过 PR 合并，禁止直接 push
└── 每次合并触发 CI/CD

feature/* (功能分支)
├── 从 main 创建
├── 命名: feature/FE-001-login-page
└── 完成后合并回 main

fix/* (修复分支)
├── 从 main 创建
├── 命名: fix/BUG-123-dataset-timeout
└── 完成后合并回 main

release/* (发布分支)
├── 从 main 创建
├── 命名: release/v4.14.2
└── 用于版本发布准备
```

### 3.2 分支命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 功能开发 | `feature/<task-id>-<brief-desc>` | `feature/FE-001-login-page` |
| Bug 修复 | `fix/<bug-id>-<brief-desc>` | `fix/BUG-123-search-timeout` |
| 发布准备 | `release/v<version>` | `release/v4.14.2` |
| 热修复 | `hotfix/<issue>-<brief-desc>` | `hotfix/urgent-auth-fix` |

### 3.3 工作流程

```
1. 从 main 创建功能分支
   git checkout main
   git pull origin main
   git checkout -b feature/FE-001-login-page

2. 开发并提交
   git add .
   git commit -m "feat(core/app): implement login page UI"

3. 推送并创建 PR
   git push -u origin feature/FE-001-login-page
   # 在 GitHub 创建 PR → main

4. Code Review 通过后合并
   # Squash and merge (推荐)

5. 删除功能分支
   git branch -d feature/FE-001-login-page
```

---

## 4. Code Review 标准

### 4.1 Review Checklist

```markdown
## 功能完整性
- [ ] 功能符合需求描述
- [ ] 边界条件已处理
- [ ] 错误情况有适当处理

## 代码质量
- [ ] 代码可读性良好
- [ ] 无重复代码 (DRY)
- [ ] 函数职责单一 (SRP)
- [ ] TypeScript 类型完整
- [ ] 无 ESLint 错误/警告

## 安全性
- [ ] 无硬编码敏感信息
- [ ] 用户输入已验证/转义
- [ ] API 权限校验正确
- [ ] 无 SQL/NoSQL 注入风险

## 性能
- [ ] 无 N+1 查询问题
- [ ] 大数据量有分页处理
- [ ] React 组件无不必要的重渲染
- [ ] 无内存泄漏风险

## 测试
- [ ] 核心逻辑有单元测试
- [ ] 测试覆盖关键路径
- [ ] 测试用例通过
```

### 4.2 Review 响应时效

| 优先级 | 响应时间 | 适用场景 |
|--------|----------|----------|
| P0 紧急 | 2 小时内 | 线上 Bug 修复、安全漏洞 |
| P1 高优 | 8 小时内 | 功能阻塞、版本发布相关 |
| P2 正常 | 24 小时内 | 常规功能开发 |
| P3 低优 | 48 小时内 | 重构、优化、文档 |

### 4.3 Review 反馈规范

```markdown
# 使用标签区分严重程度

[MUST]  必须修改，阻塞合并
[SHOULD] 建议修改，不阻塞但强烈推荐
[COULD] 可以修改，可选改进
[QUESTION] 纯粹提问，需要解释
[NITPICK] 小问题，可忽略
```

---

## 5. 发布流程

### 5.1 版本号规范 (SemVer)

```
MAJOR.MINOR.PATCH

MAJOR: 不兼容的 API 变更 (4.x.x → 5.0.0)
MINOR: 新增功能，向后兼容 (4.14.x → 4.15.0)
PATCH: Bug 修复，向后兼容 (4.14.1 → 4.14.2)
```

### 5.2 发布前检查清单

```markdown
## 代码检查
- [ ] pnpm lint 通过
- [ ] pnpm build 成功
- [ ] pnpm test 全部通过
- [ ] TypeScript 无类型错误

## 功能验证
- [ ] 主要功能在开发环境测试通过
- [ ] 数据库迁移脚本已准备 (如需要)
- [ ] 环境变量变更已文档化

## 文档更新
- [ ] CHANGELOG.md 已更新
- [ ] README.md 已更新 (如需要)
- [ ] 版本号已更新

## 发布准备
- [ ] 创建 release 分支
- [ ] 更新版本号
- [ ] 创建 Git Tag
- [ ] PR 合并到 main
```

### 5.3 CI/CD Pipeline

```yaml
# 触发条件
- Push to main: 运行 lint + test + build
- Pull Request: 运行 lint + test + build + preview
- Tag v*: 运行 lint + test + build + deploy

# 流程
1. Install: pnpm install --frozen-lockfile
2. Lint: pnpm lint
3. Test: pnpm test
4. Build: pnpm build
5. Deploy: (仅 Tag 触发)
```

---

## 6. AI 辅助开发规范

### 6.1 AI 开发工作模式

```
设计文档 → 测试示例 → 代码编写 → 测试运行 → 修正
```

### 6.2 任务文档要求

```markdown
# 任务模板

## 必填字段 (AI 会检查完整性)
- [ ] 任务ID: _______
- [ ] 功能描述: _______
- [ ] 文件清单: _______
- [ ] 接口依赖: _______
- [ ] 验收标准: _______

## 选填字段
- [ ] UI 设计稿: _______
- [ ] 参考实现: _______
```

### 6.3 MVU 原则 (Minimum Viable Unit)

每个开发单元应满足:

| 约束 | 限制 |
|------|------|
| 改动文件数 | < 5 个 |
| 改动代码量 | < 200 行 |
| 独立可运行 | 是 |
| 独立可验证 | 是 |
| 独立可回滚 | 是 |

### 6.4 上下文管理

```markdown
会话管理规则:
- 1 会话 = 1 任务文档
- 1 任务 = 1 功能单元
- Context < 60% 时可继续
- Context > 60% 立即 /clear
- 任务完成立即关闭会话
```

### 6.5 阶段门控制

| 阶段 | 输出制品 | 审批点 |
|------|----------|--------|
| 计划 | implementation-plan.md | 人工审核 |
| 实现 | 代码 + 测试 | 自动检查 |
| 审批 | review-report.md | 人工审核 |
| 文档 | CHANGELOG + 总结 | - |

---

## 7. 文件结构规范

### 7.1 组件目录结构

```
ComponentName/
├── index.tsx          # 组件入口
├── index.module.css   # 样式文件 (如需要)
├── types.ts           # 类型定义 (如复杂)
├── hooks.ts           # 组件专用 hooks (如有)
└── components/        # 子组件 (如有)
    └── SubComponent.tsx
```

### 7.2 API 路由结构

```
pages/api/
├── v1/                      # API 版本
│   ├── app/                 # 应用相关
│   │   ├── list.ts          # GET 列表
│   │   ├── create.ts        # POST 创建
│   │   └── [appId]/         # 动态路由
│   │       ├── index.ts     # GET/PUT/DELETE
│   │       └── publish.ts   # POST 发布
│   └── dataset/             # 知识库相关
└── support/                 # 支撑功能
    ├── user/
    └── wallet/
```

### 7.3 服务层结构

```
packages/service/core/<domain>/
├── schema.ts          # Mongoose Schema
├── controller.ts      # 业务逻辑
├── type.d.ts          # 类型定义
└── constants.ts       # 常量定义
```

---

## 8. 测试规范

### 8.1 测试文件位置

| 类型 | 位置 | 命名 |
|------|------|------|
| 单元测试 | `test/cases/` | `*.test.ts` |
| 集成测试 | `test/cases/` | `*.integration.test.ts` |
| 应用测试 | `projects/app/test/` | `*.test.ts` |
| 沙箱测试 | `projects/sandbox/test/` | `*.test.ts` |

### 8.2 测试覆盖率要求

| 模块类型 | 最低覆盖率 |
|----------|------------|
| 核心模块 (workflow, dataset) | 80% |
| 工具函数 | 90% |
| API 路由 | 70% |
| 前端组件 | 60% |

### 8.3 测试命名规范

```typescript
describe('模块名', () => {
  describe('函数名', () => {
    it('应该在[条件]时[预期行为]', () => {
      // ...
    });

    it('should [expected behavior] when [condition]', () => {
      // 英文格式也可接受
    });
  });
});
```

---

## 9. 文档更新记录

| 日期 | 版本 | 更新内容 | 更新人 |
|------|------|----------|--------|
| 2025-11-23 | 1.0 | 初始版本 | AI Assistant |

---

## 10. 附录: 快速检查清单

### 10.1 提交前检查

```bash
# 1. 格式化代码
pnpm format-code

# 2. 运行 lint
pnpm lint

# 3. 运行测试
pnpm test

# 4. 构建验证
pnpm build
```

### 10.2 Pre-commit Hook

自动执行 (由 husky + lint-staged 配置):
- `*.ts,tsx,scss` → Prettier 格式化
- `*.ts,tsx` → ESLint 检查
- `*.mdx` (文档) → zhlint 格式化

### 10.3 相关文档

- [0-project-overview.md](./0-project-overview.md) - 项目全貌
- [1-tech-stack.md](./1-tech-stack.md) - 技术栈锁定
- [2-architecture.md](./2-architecture.md) - 架构设计
- [3-interface-contracts.md](./3-interface-contracts.md) - 接口契约
- [5-initialization-actions.md](./5-initialization-actions.md) - 初始化清单
- [6-resource-inventory.md](./6-resource-inventory.md) - 资源清单

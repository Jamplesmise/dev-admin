# FastGPT Pro 故障排查文档索引

**更新时间**: 2025-11-27

## 文档列表

| 文档 | 说明 | 优先级 |
|------|------|--------|
| [01-build-deployment-guide.md](./01-build-deployment-guide.md) | 构建部署完整指南（综合整理版） | P0 |
| [02-api-auth-fix-report.md](./02-api-auth-fix-report.md) | API 认证中间件修复报告 | P0 |
| [03-evaluation-logs-api-fix.md](./03-evaluation-logs-api-fix.md) | 应用评估与日志 API 修复报告 | P1 |
| [04-audit-log-and-port-fix.md](./04-audit-log-and-port-fix.md) | 审计日志优化与端口配置修复报告 | P1 |

## 快速参考

### 常见问题

1. **构建失败 OOM** → 参考 `01-build-deployment-guide.md` 第二节
2. **API 认证错误** → 参考 `02-api-auth-fix-report.md`
3. **PRO_URL 配置** → 参考 `01-build-deployment-guide.md` 第五节
4. **路由 404** → 参考 `01-build-deployment-guide.md` 第三节
5. **审计日志显示 ObjectId** → 参考 `04-audit-log-and-port-fix.md`
6. **成员变更无审计日志** → 参考 `04-audit-log-and-port-fix.md`

### 关键配置

```bash
# PRO_URL 配置（不包含 /api）
PRO_URL=http://localhost:3000

# TEST_MODE 开启测试模式
TEST_MODE=true
```

### Git 提交记录

```bash
83299d4 fix(auth): 修复认证流程和团队列表接口
cbbf082 fix(api): 修复 API 认证中间件配置问题
f4fc717 fix(build): 修复项目打包部署结构问题
```

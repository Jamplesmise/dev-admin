/**
 * 审计日志工具函数
 */
import { MongoOperationLog } from './schema';
import type { AuditEventEnum, AuditEventParamsType } from '@fastgpt/global/support_user_audit/constants';

/**
 * 添加审计日志
 * @param teamId 团队 ID
 * @param tmbId 团队成员 ID
 * @param event 事件类型
 * @param metadata 事件元数据
 */
export async function addAuditLog<T extends AuditEventEnum>({
  teamId,
  tmbId,
  event,
  metadata
}: {
  teamId: string;
  tmbId: string;
  event: T;
  metadata?: AuditEventParamsType[T];
}): Promise<void> {
  try {
    await MongoOperationLog.create({
      teamId,
      tmbId,
      event,
      metadata: metadata || {},
      timestamp: new Date()
    });
  } catch (error) {
    // 审计日志记录失败不应影响主业务流程
    console.error('[AuditLog] Failed to record audit log:', error);
  }
}

/**
 * 批量添加审计日志
 * @param logs 日志数组
 */
export async function addAuditLogs(
  logs: Array<{
    teamId: string;
    tmbId: string;
    event: AuditEventEnum;
    metadata?: Record<string, unknown>;
  }>
): Promise<void> {
  if (logs.length === 0) return;

  try {
    await MongoOperationLog.insertMany(
      logs.map((log) => ({
        ...log,
        metadata: log.metadata || {},
        timestamp: new Date()
      }))
    );
  } catch (error) {
    console.error('[AuditLog] Failed to record batch audit logs:', error);
  }
}

import { MongoOperationLog } from './schema';
import type {
  AdminAuditEventEnum,
  AuditEventEnum,
  AdminAuditEventParamsType,
  AuditEventParamsType
} from '../../global/support_user_audit/constants';
import { addLog } from '../common/system/log';

/**
 * 简单的重试函数
 */
async function retryFn<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T | undefined> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        addLog.error('Retry failed after max attempts', error);
        return undefined;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return undefined;
}

export function addAuditLog<T extends AuditEventEnum>({
  teamId,
  tmbId,
  event,
  params
}: {
  tmbId: string;
  teamId: string;
  event: T;
  params?: AuditEventParamsType[T];
}): void;

export function addAuditLog<T extends AdminAuditEventEnum>({
  teamId,
  tmbId,
  event,
  params
}: {
  tmbId: string;
  teamId: string;
  event: T;
  params?: AdminAuditEventParamsType[T];
}): void;

export function addAuditLog<T extends AuditEventEnum | AdminAuditEventEnum>({
  teamId,
  tmbId,
  event,
  params
}: {
  tmbId: string;
  teamId: string;
  event: T;
  params?: AuditEventParamsType[keyof AuditEventParamsType] | AdminAuditEventParamsType[keyof AdminAuditEventParamsType];
}) {
  retryFn(() =>
    MongoOperationLog.create({
      tmbId,
      teamId,
      event,
      metadata: params
    })
  );
}

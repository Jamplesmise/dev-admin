/**
 * 审计日志类型定义
 * 同步自官方 FastGPT: packages/global/support/user/audit/type.d.ts
 */
import type { AuditEventEnum } from './constants';
import type { TeamMemberStatusEnum } from '../support_user_team/constant';

export type OperationLogSchemaType = {
  _id: string;
  tmbId: string;
  teamId: string;
  timestamp: Date;
  event: `${AuditEventEnum}`;
  metadata?: Record<string, string | number | boolean>;
};

// 同步自官方 FastGPT
export type SourceMemberType = {
  name: string;
  avatar: string;
  status: `${TeamMemberStatusEnum}`;
};

export type OperationListItemType = {
  _id: string;
  sourceMember: SourceMemberType;
  event: `${AuditEventEnum}`;
  timestamp: Date;
  metadata: Record<string, string | number | boolean>;
};

// API Request/Response Types
export type GetAuditLogsRequest = {
  pageNum: number;
  pageSize: number;
  tmbIds?: string[];
  events?: string[];
  startTime?: string;
  endTime?: string;
};

export type GetAuditLogsResponse = {
  list: OperationListItemType[];
  total: number;
};

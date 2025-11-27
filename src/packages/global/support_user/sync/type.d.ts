/**
 * 用户同步相关类型定义
 */

// 同步模式
export type SyncMode = 'incremental' | 'full';

// 同步用户数据
export type SyncUserItem = {
  externalId: string;       // 外部系统用户 ID（必填）
  username: string;         // 用户名（必填）
  email?: string;           // 邮箱
  phone?: string;           // 手机号
  avatar?: string;          // 头像 URL
  department?: string;      // 部门路径，如 "/公司/技术部/后端组"
};

// 同步请求参数
export type PostUserSyncBody = {
  users: SyncUserItem[];
  syncMode: SyncMode;
};

// 同步错误信息
export type SyncErrorItem = {
  externalId: string;
  reason: string;
};

// 同步响应
export type PostUserSyncResponse = {
  created: number;    // 新创建用户数
  updated: number;    // 更新用户数
  skipped: number;    // 跳过用户数
  errors: SyncErrorItem[];
};

// 用户集合名称
export const UserCollectionName = 'users';

// 用户状态
export const UserStatusEnum = {
  active: 'active',
  inactive: 'inactive',
  banned: 'banned'
} as const;

// Token 配置
export const TOKEN_CONFIG = {
  // Access Token 过期时间 (1小时)
  ACCESS_TOKEN_EXPIRES: '1h',
  ACCESS_TOKEN_EXPIRES_SECONDS: 3600,

  // Refresh Token 过期时间 (7天)
  REFRESH_TOKEN_EXPIRES: '7d',
  REFRESH_TOKEN_EXPIRES_SECONDS: 604800
} as const;

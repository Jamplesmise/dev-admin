// 用户状态枚举
export type UserStatusType = 'active' | 'inactive' | 'banned';

// 用户 Schema 类型
export type UserSchemaType = {
  _id: string;
  username: string;
  password?: string; // 加密后的密码
  avatar?: string;
  email?: string;
  phone?: string;
  status: UserStatusType;
  lastLoginTime?: Date;
  createTime: Date;
  updateTime: Date;
};

// 用户信息类型 (不含敏感信息)
export type UserInfoType = {
  _id: string;
  username: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status: UserStatusType;
  createTime: string;
};

// 创建用户请求
export type CreateUserRequest = {
  username: string;
  password?: string;
  avatar?: string;
  email?: string;
  phone?: string;
};

// 更新用户请求
export type UpdateUserRequest = {
  username?: string;
  avatar?: string;
  email?: string;
  phone?: string;
};

// JWT Payload 类型
export type JwtPayloadType = {
  userId: string;
  teamId?: string;
  tmbId?: string;
  exp?: number;
  iat?: number;
};

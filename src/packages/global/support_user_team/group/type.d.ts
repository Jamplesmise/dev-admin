import type { GroupMemberRole } from './constant';

// 成员分组 Schema 类型
export type MemberGroupSchemaType = {
  _id: string;
  teamId: string;
  name: string;
  avatar?: string;
  createTime: Date;
  updateTime: Date;
};

// 分组成员关系 Schema 类型
export type GroupMemberSchemaType = {
  _id: string;
  teamId: string;
  groupId: string;
  tmbId: string;
  role: `${GroupMemberRole}`;
  createTime: Date;
};

// 分组列表项类型（含成员数量）
export type MemberGroupListItemType = MemberGroupSchemaType & {
  memberCount: number;
};

// 分组详情类型（含成员列表）
export type MemberGroupDetailType = MemberGroupSchemaType & {
  members: GroupMemberItemType[];
};

// 分组成员项类型
// 注意：前端期望字段是 name，不是 memberName
export type GroupMemberItemType = {
  tmbId: string;
  name: string; // 前端期望 name
  avatar: string;
  role: `${GroupMemberRole}`;
};

import type { GroupMemberRole } from './constant';

// 创建分组请求
export type PostCreateGroupBody = {
  name: string;
  avatar?: string;
  memberIdList?: string[]; // 初始成员 tmbId 列表
};

// 更新分组请求
export type PutUpdateGroupBody = {
  groupId: string;
  name?: string;
  avatar?: string;
  memberList?: {
    tmbId: string;
    role: `${GroupMemberRole}`;
  }[];
};

// 删除分组请求
export type DeleteGroupQuery = {
  groupId: string;
};

// 获取分组列表请求
export type GetGroupListQuery = {
  searchKey?: string; // 搜索关键词
};

// 获取分组成员列表请求
export type GetGroupMembersQuery = {
  groupId: string; // 分组 ID
};

// 更改分组所有者请求
export type PutChangeGroupOwnerBody = {
  groupId: string; // 分组 ID
  tmbId: string; // 新所有者的团队成员 ID
};

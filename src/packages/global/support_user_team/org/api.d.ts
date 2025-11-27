export type postCreateOrgData = {
  name: string;
  description?: string;
  avatar?: string;
  orgId?: string;
};

export type putUpdateOrgMembersData = {
  orgId?: string;
  members: {
    tmbId: string;
    // role: `${OrgMemberRole}`;
  }[];
};

export type putUpdateOrgData = {
  orgId: string; // can not be undefined because can not uppdate root org
  name?: string;
  avatar?: string;
  description?: string;
};

export type putMoveOrgType = {
  orgId: string;
  targetOrgId?: string; // '' ===> move to root org
};

// 获取组织成员列表请求
export type GetOrgMembersQuery = {
  pageNum: number; // 页码（从 1 开始）
  pageSize: number; // 每页数量
  orgPath?: string; // 可选，组织路径
};

// 分页响应类型
export type PaginatedResponse<T> = {
  pageNum: number;
  pageSize: number;
  total: number;
  data: T[];
};

// type putChnageOrgOwnerData = {
//   orgId: string;
//   tmbId: string;
//   toAdmin?: boolean;
// };

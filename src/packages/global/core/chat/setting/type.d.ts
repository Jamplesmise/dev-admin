// 聊天设置模块类型定义

import type { ThemeEnum } from './constant';

// 用户偏好设置
export type ChatPreferencesType = {
  theme: `${ThemeEnum}`;
  fontSize: number;
  codeTheme: string;
};

// 聊天设置 Schema 类型
export type ChatSettingSchemaType = {
  _id: string;
  tmbId: string;
  teamId: string;

  // 首页设置
  homeEnabled: boolean;
  homeWelcome: string;
  homeBackground?: string;

  // 默认设置
  defaultAppId?: string;
  sidebarCollapsed: boolean;

  // 偏好设置
  preferences: ChatPreferencesType;

  createTime: Date;
  updateTime: Date;
};

// 收藏应用 Schema 类型
export type FavouriteAppSchemaType = {
  _id: string;
  tmbId: string;
  teamId: string;
  appId: string;

  // 排序
  order: number;

  // 分类标签
  tags: string[];

  // 自定义显示
  customName?: string;
  customIcon?: string;

  createTime: Date;
};

// API 请求/响应类型

// 获取设置详情响应
export type GetChatSettingDetailResponse = ChatSettingSchemaType | null;

// 更新设置请求
export type UpdateChatSettingBody = {
  homeEnabled?: boolean;
  homeWelcome?: string;
  homeBackground?: string;
  defaultAppId?: string;
  sidebarCollapsed?: boolean;
  preferences?: Partial<ChatPreferencesType>;
};

// 获取收藏列表响应
export type FavouriteAppListItemType = FavouriteAppSchemaType & {
  app?: {
    _id: string;
    name: string;
    avatar: string;
    intro?: string;
  };
};

// 添加/更新收藏请求
export type UpdateFavouriteAppBody = {
  appId: string;
  customName?: string;
  customIcon?: string;
  tags?: string[];
};

// 调整收藏顺序请求
export type UpdateFavouriteOrderBody = {
  favouriteId: string;
  targetOrder: number;
};

// 更新收藏标签请求
export type UpdateFavouriteTagsBody = {
  favouriteId: string;
  tags: string[];
};

// 删除收藏请求
export type DeleteFavouriteAppQuery = {
  favouriteId: string;
};

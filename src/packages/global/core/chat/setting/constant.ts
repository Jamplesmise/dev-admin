// 聊天设置模块常量定义

export const ChatSettingCollectionName = 'chat_settings';
export const FavouriteAppCollectionName = 'favourite_apps';

// 主题枚举
export enum ThemeEnum {
  light = 'light',
  dark = 'dark',
  system = 'system'
}

// 默认设置值
export const DEFAULT_CHAT_SETTING = {
  homeEnabled: false,
  homeWelcome: '',
  sidebarCollapsed: false,
  theme: ThemeEnum.system,
  fontSize: 14,
  codeTheme: 'github'
} as const;

// 字体大小限制
export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 20;

// 欢迎语最大长度
export const HOME_WELCOME_MAX_LENGTH = 500;

// 标签最大长度
export const TAG_MAX_LENGTH = 20;

// 标签最大数量
export const MAX_TAGS_COUNT = 5;

// 自定义名称最大长度
export const CUSTOM_NAME_MAX_LENGTH = 50;

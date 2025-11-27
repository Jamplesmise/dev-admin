export const OperationalAdCollectionName = 'operational_ads';

// 广告类型
export enum AdTypeEnum {
  banner = 'banner', // 横幅广告
  popup = 'popup', // 弹窗广告
  notice = 'notice' // 通知广告
}

// 目标用户类型
export enum AdTargetUsersEnum {
  all = 'all', // 所有用户
  free = 'free', // 免费用户
  paid = 'paid' // 付费用户
}

// 目标平台
export enum AdTargetPlatformEnum {
  web = 'web', // Web 端
  mobile = 'mobile', // 移动端
  all = 'all' // 所有平台
}

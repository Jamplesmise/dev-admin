export const CollaboratorCollectionName = 'collaborators';

// 资源类型
export enum ResourceTypeEnum {
  app = 'app',
  dataset = 'dataset',
  model = 'model',
  team = 'team'
}

// 协作者类型
export enum CollaboratorTypeEnum {
  member = 'member', // 单个成员
  group = 'group', // 分组
  org = 'org' // 组织
}

// 通用权限位定义 (3 位)
export const PermissionBits = {
  read: 0b100, // 4 - 读取
  write: 0b010, // 2 - 写入
  manage: 0b001 // 1 - 管理
} as const;

// 团队权限位定义 (6 位) - 与官方 FastGPT 保持一致
export const TeamPermissionBits = {
  manage: 0b000001, // 1 - 管理
  write: 0b000010, // 2 - 写入
  read: 0b000100, // 4 - 读取
  appCreate: 0b001000, // 8 - 创建应用
  datasetCreate: 0b010000, // 16 - 创建数据集
  apikeyCreate: 0b100000 // 32 - 创建 API Key
} as const;

// 权限组合
export const PermissionPresets = {
  readOnly: PermissionBits.read, // 4 - 只读
  readWrite: PermissionBits.read | PermissionBits.write, // 6 - 读写
  full: PermissionBits.read | PermissionBits.write | PermissionBits.manage // 7 - 全部
} as const;

// 团队权限组合
export const TeamPermissionPresets = {
  readOnly: TeamPermissionBits.read, // 4
  readWrite: TeamPermissionBits.read | TeamPermissionBits.write, // 6
  fullMember:
    TeamPermissionBits.read |
    TeamPermissionBits.write |
    TeamPermissionBits.appCreate |
    TeamPermissionBits.datasetCreate, // 30 - 读写 + 创建应用/数据集
  admin:
    TeamPermissionBits.manage |
    TeamPermissionBits.write |
    TeamPermissionBits.read |
    TeamPermissionBits.appCreate |
    TeamPermissionBits.datasetCreate |
    TeamPermissionBits.apikeyCreate // 63 - 全部权限
} as const;

// 权限标签映射
export const PermissionLabelMap = {
  [PermissionPresets.readOnly]: {
    label: 'permission.readOnly',
    value: PermissionPresets.readOnly
  },
  [PermissionPresets.readWrite]: {
    label: 'permission.readWrite',
    value: PermissionPresets.readWrite
  },
  [PermissionPresets.full]: {
    label: 'permission.full',
    value: PermissionPresets.full
  }
};

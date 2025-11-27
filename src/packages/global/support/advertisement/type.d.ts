import type { AdTypeEnum, AdTargetUsersEnum, AdTargetPlatformEnum } from './constant';

export type OperationalAdSchemaType = {
  _id: string;
  type: `${AdTypeEnum}`;
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  position: string;
  priority: number;
  startTime: Date;
  endTime: Date;
  targetUsers: `${AdTargetUsersEnum}`;
  targetPlatform: `${AdTargetPlatformEnum}`;
  enabled: boolean;
  createTime: Date;
  updateTime: Date;
};

// API 响应类型
export type GetOperationalAdResponse = {
  ads: {
    _id: string;
    type: `${AdTypeEnum}`;
    title: string;
    content: string;
    imageUrl?: string;
    linkUrl?: string;
    position: string;
    priority: number;
    startTime: string;
    endTime: string;
  }[];
};

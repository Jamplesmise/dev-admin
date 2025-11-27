import type { PromotionStatusEnum } from './constant';

export type PromotionRecordSchemaType = {
  _id: string;
  promoterId: string;
  promotionCode: string;
  inviteeId: string;
  status: `${PromotionStatusEnum}`;
  reward: number;
  rewardPaidAt?: Date;
  registerTime: Date;
  validTime?: Date;
  createTime: Date;
  updateTime: Date;
};

// API 请求/响应类型
export type GetPromotionDataResponse = {
  // 推广码信息
  promotionCode: string;
  promotionUrl: string;

  // 统计数据
  totalInvites: number; // 总邀请数
  validInvites: number; // 有效邀请数
  totalReward: number; // 总奖励金额（分）
  pendingReward: number; // 待发放奖励（分）

  // 邀请明细
  inviteList: {
    userId: string;
    username: string;
    registerTime: string;
    status: `${PromotionStatusEnum}`;
    reward: number;
  }[];
};

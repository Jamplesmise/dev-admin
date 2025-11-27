import { MongoPromotionRecord } from './schema';
import { PromotionStatusEnum } from '../../../global/support/promotion/constant';
import type { GetPromotionDataResponse } from '../../../global/support/promotion/type';

/**
 * 获取用户的推广数据
 */
export async function getPromotionData(userId: string): Promise<GetPromotionDataResponse> {
  // 查询用户的推广码（这里假设推广码存储在用户表或单独生成）
  // 简化处理：使用 userId 作为推广码基础
  const promotionCode = `PROMO_${userId.slice(-8).toUpperCase()}`;
  const promotionUrl = `https://fastgpt.io/register?code=${promotionCode}`;

  // 查询该用户的所有推广记录
  const records = await MongoPromotionRecord.find({ promoterId: userId })
    .sort({ createTime: -1 })
    .lean();

  // 统计数据
  const totalInvites = records.length;
  const validInvites = records.filter((r) => r.status === PromotionStatusEnum.valid).length;

  // 奖励统计
  const totalReward = records
    .filter((r) => r.status === PromotionStatusEnum.valid)
    .reduce((sum, r) => sum + r.reward, 0);

  const pendingReward = records
    .filter((r) => r.status === PromotionStatusEnum.valid && !r.rewardPaidAt)
    .reduce((sum, r) => sum + r.reward, 0);

  // 获取被邀请人详情
  const inviteeIds = records.map((r) => r.inviteeId);

  // 如果没有邀请记录，直接返回空列表
  let userMap = new Map();
  if (inviteeIds.length > 0) {
    // 尝试获取 User model（如果已注册）
    const UserModel = connectionMongo.models['user'];

    if (UserModel) {
      const users = await UserModel.find({ _id: { $in: inviteeIds } })
        .select('_id username')
        .lean();
      userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
    }
  }

  const inviteList = records.map((record) => {
    const user = userMap.get(record.inviteeId.toString());
    return {
      userId: record.inviteeId.toString(),
      username: user?.username || '未知用户',
      registerTime: record.registerTime.toISOString(),
      status: record.status,
      reward: record.reward
    };
  });

  return {
    promotionCode,
    promotionUrl,
    totalInvites,
    validInvites,
    totalReward,
    pendingReward,
    inviteList
  };
}

/**
 * 创建推广记录
 */
export async function createPromotionRecord({
  promoterId,
  inviteeId,
  promotionCode
}: {
  promoterId: string;
  inviteeId: string;
  promotionCode: string;
}) {
  return MongoPromotionRecord.create({
    promoterId,
    inviteeId,
    promotionCode,
    status: PromotionStatusEnum.pending,
    reward: 0,
    registerTime: new Date()
  });
}

/**
 * 更新推广记录状态为有效并设置奖励
 */
export async function markPromotionAsValid({
  inviteeId,
  reward
}: {
  inviteeId: string;
  reward: number;
}) {
  return MongoPromotionRecord.updateOne(
    { inviteeId },
    {
      $set: {
        status: PromotionStatusEnum.valid,
        reward,
        validTime: new Date()
      }
    }
  );
}

/**
 * 标记奖励已发放
 */
export async function markRewardAsPaid(inviteeId: string) {
  return MongoPromotionRecord.updateOne({ inviteeId }, { $set: { rewardPaidAt: new Date() } });
}

import { MongoOperationalAd } from './schema';
import type { GetOperationalAdResponse } from '../../../global/support/advertisement/type';

/**
 * 获取运营广告列表
 * 返回当前有效的广告（已启用且在时间范围内）
 */
export async function getOperationalAds({
  position,
  userType = 'all',
  platform = 'web'
}: {
  position?: string;
  userType?: 'all' | 'free' | 'paid';
  platform?: 'web' | 'mobile' | 'all';
}): Promise<GetOperationalAdResponse> {
  const now = new Date();

  const query: Record<string, unknown> = {
    enabled: true,
    startTime: { $lte: now },
    endTime: { $gte: now }
  };

  // 位置筛选
  if (position) {
    query.position = position;
  }

  // 用户类型筛选
  if (userType !== 'all') {
    query.$or = [{ targetUsers: 'all' }, { targetUsers: userType }];
  }

  // 平台筛选
  if (platform !== 'all') {
    query.$and = [
      {
        $or: [{ targetPlatform: 'all' }, { targetPlatform: platform }]
      }
    ];
  }

  const ads = await MongoOperationalAd.find(query)
    .sort({ priority: -1, createTime: -1 })
    .select('_id type title content imageUrl linkUrl position priority startTime endTime')
    .lean();

  return {
    ads: ads.map((ad) => ({
      _id: ad._id.toString(),
      type: ad.type,
      title: ad.title,
      content: ad.content,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
      position: ad.position,
      priority: ad.priority,
      startTime: ad.startTime.toISOString(),
      endTime: ad.endTime.toISOString()
    }))
  };
}

/**
 * 创建运营广告
 */
export async function createOperationalAd(data: {
  type: string;
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  position: string;
  priority?: number;
  startTime: Date;
  endTime: Date;
  targetUsers?: string;
  targetPlatform?: string;
}) {
  return MongoOperationalAd.create(data);
}

/**
 * 更新广告状态
 */
export async function updateAdStatus(adId: string, enabled: boolean) {
  return MongoOperationalAd.updateOne({ _id: adId }, { $set: { enabled } });
}

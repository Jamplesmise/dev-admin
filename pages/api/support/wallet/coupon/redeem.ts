import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import type { RedeemCouponResponse } from '@fastgpt/global/support/wallet/coupon/type';
import {
  CouponCodeStatusEnum,
  CouponTypeEnum
} from '@fastgpt/global/support/wallet/coupon/constant';
import {
  authMiddleware,
  getTeamIdFromReq,
  getUserIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import {
  MongoCouponCode,
  MongoUserCoupon
} from '@fastgpt/service/support_wallet/coupon/schema';
import { connectionMongo } from '@fastgpt/service/common/mongo';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type QueryType = {
  code?: string;
};

// 格式化优惠券消息
function formatCouponMessage(type: string, value: number): string {
  if (type === CouponTypeEnum.amount) {
    // 金额转换为元
    const yuan = (value / 100).toFixed(2);
    return `兑换成功，获得 ${yuan} 元优惠券`;
  } else {
    return `兑换成功，获得 ${value}% 折扣券`;
  }
}

async function handler(
  req: ApiRequestProps<unknown, QueryType>,
  _res: NextApiResponse
): Promise<RedeemCouponResponse> {
  const teamId = getTeamIdFromReq(req);
  const userId = getUserIdFromReq(req);

  const { code } = req.query;

  // 验证参数
  if (!code || !code.trim()) {
    throw new Error('兑换码不能为空');
  }

  const upperCode = code.trim().toUpperCase();

  // 使用事务确保原子性
  const session = await connectionMongo.startSession();

  try {
    session.startTransaction();

    // 1. 查找兑换码（使用 findOneAndUpdate 原子操作锁定）
    const couponCode = await MongoCouponCode.findOne({
      code: upperCode
    }).session(session);

    if (!couponCode) {
      throw new Error('兑换码无效');
    }

    // 2. 检查状态
    if (couponCode.status === CouponCodeStatusEnum.used) {
      throw new Error('兑换码已被使用');
    }

    if (couponCode.status === CouponCodeStatusEnum.expired) {
      throw new Error('兑换码已过期');
    }

    // 3. 检查是否过期
    if (couponCode.expireTime < new Date()) {
      // 更新状态为过期
      await MongoCouponCode.updateOne(
        { _id: couponCode._id },
        { $set: { status: CouponCodeStatusEnum.expired } },
        { session }
      );
      throw new Error('兑换码已过期');
    }

    // 4. 检查是否重复兑换同批次
    const existingCoupon = await MongoUserCoupon.findOne({
      userId,
      batchId: couponCode.batchId
    }).session(session);

    if (existingCoupon) {
      throw new Error('已兑换过此批次优惠券');
    }

    // 5. 创建用户优惠券
    const userCoupon = await MongoUserCoupon.create(
      [
        {
          userId,
          teamId,
          sourceCode: upperCode,
          batchId: couponCode.batchId,
          type: couponCode.type,
          value: couponCode.value,
          minAmount: couponCode.minAmount,
          scope: couponCode.scope,
          expireTime: couponCode.expireTime,
          status: 'available'
        }
      ],
      { session }
    );

    // 6. 标记兑换码已使用
    await MongoCouponCode.updateOne(
      { _id: couponCode._id, status: CouponCodeStatusEnum.unused },
      {
        $set: {
          status: CouponCodeStatusEnum.used,
          usedBy: userId,
          usedTime: new Date()
        }
      },
      { session }
    );

    await session.commitTransaction();

    return {
      coupon: {
        _id: String(userCoupon[0]._id),
        code: upperCode,
        type: couponCode.type,
        value: couponCode.value,
        minAmount: couponCode.minAmount,
        expireTime: couponCode.expireTime,
        scope: couponCode.scope
      },
      message: formatCouponMessage(couponCode.type, couponCode.value)
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export default NextAPI(handler);

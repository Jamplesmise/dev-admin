import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { BillTypeEnum } from '@fastgpt/global/support_wallet/bill/constants';
import type {
  BalanceConversionRequest,
  BalanceConversionResponse
} from '@fastgpt/global/support_wallet/bill/type';

const NextAPI = NextEntry({ beforeCallback: [] });

// 模拟获取用户余额（实际应该从数据库获取）
async function getUserBalance(_teamId: string): Promise<number> {
  // TODO: 从团队账户获取余额
  return 10000; // 模拟 100 元余额
}

// 计算原始价格（单位：分）
function calculateOriginalPrice(type: BillTypeEnum, amount: number): number {
  switch (type) {
    case BillTypeEnum.standard:
      // 标准订阅 - amount 为订阅等级对应的基础价格
      return amount;

    case BillTypeEnum.extraDatasetSize:
      // 扩展存储 10元/GB - amount 为 GB 数
      return amount * 1000;

    case BillTypeEnum.extraPoints:
      // 扩展积分 1元/100积分 - amount 为积分数
      return Math.ceil(amount / 100) * 100;

    default:
      return 0;
  }
}

async function handler(
  req: ApiRequestProps<BalanceConversionRequest, BalanceConversionRequest>,
  _res: NextApiResponse
): Promise<BalanceConversionResponse> {
  const { teamId } = req.auth;
  const { type, amount } = req.query;

  if (!type || amount === undefined) {
    return Promise.reject('缺少必要参数');
  }

  if (!Object.values(BillTypeEnum).includes(type)) {
    return Promise.reject('无效的账单类型');
  }

  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return Promise.reject('无效的金额');
  }

  // 计算原始价格
  const originalPrice = calculateOriginalPrice(type, amountNum);

  // 获取用户余额
  const balance = await getUserBalance(teamId);

  // 计算可用余额抵扣（最多抵扣原价的 30%）
  const maxDeduction = Math.floor(originalPrice * 0.3);
  const balanceUsed = Math.min(balance, maxDeduction);

  // 计算折后价格
  const discountPrice = originalPrice - balanceUsed;

  return {
    originalPrice,
    discountPrice,
    balanceUsed
  };
}

export default NextAPI(handler);

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware } from '@fastgpt/service/common/middle/authMiddleware';
import { MongoBillModel } from '@fastgpt/service/support_wallet/bill/schema';
import {
  BillTypeEnum,
  BillStatusEnum,
  PaymentEnum,
  BILL_EXPIRE_MINUTES
} from '@fastgpt/global/support_wallet/bill/constants';
import type {
  CreateBillRequest,
  CreateBillResponse
} from '@fastgpt/global/support_wallet/bill/type';
import { nanoid } from 'nanoid';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 生成订单号
function generateOrderId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `FG${dateStr}${nanoid(10).toUpperCase()}`;
}

// 计算价格（单位：分）
function calculatePrice(data: CreateBillRequest): number {
  // 这里是简化的价格计算逻辑，实际应该从配置或数据库获取
  switch (data.type) {
    case BillTypeEnum.standard: {
      // 标准订阅价格
      const basePrice: Record<string, number> = {
        experience: 9900,
        team: 29900,
        enterprise: 99900,
        custom: 0
      };
      const price = basePrice[data.subLevel || 'experience'] || 9900;
      // 年付打折
      return data.subMode === 'year' ? price * 10 : price;
    }

    case BillTypeEnum.extraDatasetSize: {
      // 扩展存储 10元/GB
      return (data.extraDatasetSize || 0) * 1000;
    }

    case BillTypeEnum.extraPoints: {
      // 扩展积分 1元/100积分
      return Math.ceil((data.extraPoints || 0) / 100) * 100;
    }

    default:
      return 0;
  }
}

// 格式化价格显示
function formatPrice(priceInCents: number): string {
  return `¥${(priceInCents / 100).toFixed(2)}`;
}

async function handler(
  req: ApiRequestProps<CreateBillRequest>,
  _res: NextApiResponse
): Promise<CreateBillResponse> {
  const { teamId, tmbId } = req.auth;
  const { type, subLevel, subMode, extraDatasetSize, extraPoints, payment } = req.body;

  // 验证参数
  if (!type || !payment) {
    return Promise.reject('缺少必要参数');
  }

  if (!Object.values(BillTypeEnum).includes(type)) {
    return Promise.reject('无效的账单类型');
  }

  if (!Object.values(PaymentEnum).includes(payment)) {
    return Promise.reject('无效的支付方式');
  }

  // 计算价格
  const price = calculatePrice(req.body);
  if (price <= 0) {
    return Promise.reject('价格计算错误');
  }

  // 计算过期时间
  const now = new Date();
  const expireTime = new Date(now.getTime() + BILL_EXPIRE_MINUTES * 60 * 1000);

  // 生成订单
  const orderId = generateOrderId();

  // 创建账单
  const bill = await MongoBillModel.create({
    orderId,
    teamId,
    tmbId,
    type,
    price,
    payment,
    status: BillStatusEnum.pending,
    subLevel,
    subMode,
    extraDatasetSize,
    extraPoints,
    createTime: now,
    expireTime
  });

  // TODO: 根据支付方式调用第三方支付接口获取二维码
  // 这里先返回模拟数据，实际需要集成微信支付/支付宝
  let qrCode: string | undefined;
  let codeUrl: string | undefined;

  if (payment === PaymentEnum.wx || payment === PaymentEnum.alipay) {
    // 模拟二维码URL
    qrCode = `https://pay.example.com/qr/${orderId}`;
    codeUrl = `https://pay.example.com/native/${orderId}`;

    // 更新账单中的支付信息
    await MongoBillModel.updateOne(
      { _id: bill._id },
      { $set: { qrCode, codeUrl } }
    );
  }

  return {
    billId: String(bill._id),
    orderId,
    price,
    readPrice: formatPrice(price),
    payment,
    qrCode,
    codeUrl,
    expireTime: expireTime.toISOString()
  };
}

export default NextAPI(handler);

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoBillModel } from '@fastgpt/service/support_wallet/bill/schema';
import { BillStatusEnum, PaymentEnum } from '@fastgpt/global/support_wallet/bill/constants';
import type {
  UpdatePaymentRequest,
  UpdatePaymentResponse
} from '@fastgpt/global/support_wallet/bill/type';

const NextAPI = NextEntry({ beforeCallback: [] });

async function handler(
  req: ApiRequestProps<UpdatePaymentRequest>,
  _res: NextApiResponse
): Promise<UpdatePaymentResponse> {
  const { teamId } = req.auth;
  const { billId, payment } = req.body;

  if (!billId || !payment) {
    return Promise.reject('缺少必要参数');
  }

  if (!Object.values(PaymentEnum).includes(payment)) {
    return Promise.reject('无效的支付方式');
  }

  // 查询账单
  const bill = await MongoBillModel.findOne({
    _id: billId,
    teamId,
    status: BillStatusEnum.pending
  }).lean();

  if (!bill) {
    return Promise.reject('账单不存在或已完成');
  }

  // 检查是否过期
  if (new Date() > new Date(bill.expireTime)) {
    // 更新状态为已取消
    await MongoBillModel.updateOne(
      { _id: billId },
      { $set: { status: BillStatusEnum.canceled } }
    );
    return Promise.reject('订单已过期');
  }

  // TODO: 根据新的支付方式调用第三方支付接口获取新的二维码
  // 这里先返回模拟数据
  let qrCode: string | undefined;
  let codeUrl: string | undefined;

  if (payment === PaymentEnum.wx || payment === PaymentEnum.alipay) {
    qrCode = `https://pay.example.com/qr/${bill.orderId}?t=${Date.now()}`;
    codeUrl = `https://pay.example.com/native/${bill.orderId}?t=${Date.now()}`;
  }

  // 更新账单支付方式
  await MongoBillModel.updateOne(
    { _id: billId },
    { $set: { payment, qrCode, codeUrl } }
  );

  return {
    qrCode,
    codeUrl
  };
}

export default NextAPI(handler);

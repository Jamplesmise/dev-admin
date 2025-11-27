import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoBillModel } from '@fastgpt/service/support_wallet/bill/schema';
import type {
  CheckPayResultRequest,
  CheckPayResultResponse
} from '@fastgpt/global/support_wallet/bill/type';

const NextAPI = NextEntry({ beforeCallback: [] });

async function handler(
  req: ApiRequestProps<CheckPayResultRequest, CheckPayResultRequest>,
  _res: NextApiResponse
): Promise<CheckPayResultResponse> {
  const { teamId } = req.auth;
  const { billId } = req.query;

  if (!billId) {
    return Promise.reject('缺少账单ID');
  }

  // 查询账单
  const bill = await MongoBillModel.findOne({
    _id: billId,
    teamId
  }).lean();

  if (!bill) {
    return Promise.reject('账单不存在');
  }

  return {
    status: bill.status,
    payTime: bill.payTime?.toISOString()
  };
}

export default NextAPI(handler);

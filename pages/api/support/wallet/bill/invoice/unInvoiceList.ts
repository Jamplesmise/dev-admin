import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import type {
  GetUnInvoiceListQuery,
  UnInvoiceBillItem
} from '@fastgpt/global/support/wallet/invoice/type';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoBillModel } from '@fastgpt/service/support_wallet/bill/schema';
import { BillStatusEnum, BillTypeMap } from '@fastgpt/global/support_wallet/bill/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps<unknown, GetUnInvoiceListQuery>,
  _res: NextApiResponse
): Promise<UnInvoiceBillItem[]> {
  const { startTime, endTime } = req.query;
  const teamId = getTeamIdFromReq(req);

  // 构建查询条件
  const query: Record<string, unknown> = {
    teamId,
    // 只查询已支付且未开票的账单
    status: BillStatusEnum.success,
    invoiced: { $ne: true }
  };

  // 时间范围过滤
  if (startTime || endTime) {
    query.createTime = {};
    if (startTime) {
      (query.createTime as Record<string, unknown>).$gte = new Date(startTime);
    }
    if (endTime) {
      (query.createTime as Record<string, unknown>).$lte = new Date(endTime);
    }
  }

  // 从 Bill 集合查询待开票账单
  const bills = await MongoBillModel.find(query)
    .sort({ createTime: -1 })
    .lean();

  // 转换为接口返回格式
  const result: UnInvoiceBillItem[] = bills.map((bill) => ({
    _id: String(bill._id),
    amount: bill.price,
    createTime: bill.createTime,
    type: bill.type,
    description: BillTypeMap[bill.type] || bill.type
  }));

  return result;
}

export default NextAPI(handler);

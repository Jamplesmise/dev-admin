import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { authMiddleware } from '@fastgpt/service/common/middle/authMiddleware';
import { MongoBillModel } from '@fastgpt/service/support_wallet/bill/schema';
import { BillTypeMap } from '@fastgpt/global/support_wallet/bill/constants';
import type {
  GetBillListRequest,
  GetBillListResponse,
  BillListItemType,
  BillSchemaType
} from '@fastgpt/global/support_wallet/bill/type';
import type { FilterQuery } from 'mongoose';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 格式化价格显示
function formatPrice(priceInCents: number): string {
  return `¥${(priceInCents / 100).toFixed(2)}`;
}

async function handler(
  req: ApiRequestProps<GetBillListRequest>,
  _res: NextApiResponse
): Promise<GetBillListResponse> {
  const { teamId } = req.auth;
  const { pageNum = 1, pageSize = 20, type, status, startTime, endTime } = req.body;

  // 构建查询条件
  const query: FilterQuery<BillSchemaType> = { teamId };

  if (type) {
    query.type = type;
  }

  if (status) {
    query.status = status;
  }

  if (startTime || endTime) {
    query.createTime = {};
    if (startTime) {
      query.createTime.$gte = new Date(startTime);
    }
    if (endTime) {
      query.createTime.$lte = new Date(endTime);
    }
  }

  // 查询总数
  const total = await MongoBillModel.countDocuments(query);

  // 分页查询
  const bills = await MongoBillModel.find(query)
    .sort({ createTime: -1 })
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    .lean();

  // 格式化返回数据
  const list: BillListItemType[] = bills.map((bill: BillSchemaType) => ({
    _id: String(bill._id),
    orderId: bill.orderId,
    type: bill.type,
    typeName: BillTypeMap[bill.type] || bill.type,
    price: bill.price,
    readPrice: formatPrice(bill.price),
    payment: bill.payment,
    status: bill.status,
    createTime: bill.createTime.toISOString(),
    payTime: bill.payTime?.toISOString(),
    subLevel: bill.subLevel,
    subMode: bill.subMode
  }));

  return {
    list,
    total
  };
}

export default NextAPI(handler);

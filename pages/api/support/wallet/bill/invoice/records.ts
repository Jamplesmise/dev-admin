import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoInvoiceModel } from '@fastgpt/service/support_wallet/invoice/schema';
import type {
  GetInvoiceRecordsQuery,
  InvoiceListItemType
} from '@fastgpt/global/support/wallet/invoice/type';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type InvoiceRecordsResponse = {
  list: InvoiceListItemType[];
  total: number;
  page: number;
  pageSize: number;
};

async function handler(
  req: ApiRequestProps<unknown, GetInvoiceRecordsQuery>,
  _res: NextApiResponse
): Promise<InvoiceRecordsResponse> {
  const { status, page = '1', pageSize = '10' } = req.query;
  const teamId = getTeamIdFromReq(req);

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
  const skip = (pageNum - 1) * pageSizeNum;

  // 构建查询条件
  const query: Record<string, unknown> = { teamId };

  if (status) {
    query.status = status;
  }

  // 查询发票记录
  const [invoices, total] = await Promise.all([
    MongoInvoiceModel.find(query)
      .sort({ createTime: -1 })
      .skip(skip)
      .limit(pageSizeNum)
      .lean(),
    MongoInvoiceModel.countDocuments(query)
  ]);

  const list: InvoiceListItemType[] = invoices.map((invoice) => ({
    _id: String(invoice._id),
    title: invoice.title,
    totalAmount: invoice.totalAmount,
    type: invoice.type,
    status: invoice.status,
    createTime: invoice.createTime,
    completeTime: invoice.completeTime,
    invoiceUrl: invoice.invoiceUrl
  }));

  return {
    list,
    total,
    page: pageNum,
    pageSize: pageSizeNum
  };
}

export default NextAPI(handler);

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoInvoiceModel } from '@fastgpt/service/support_wallet/invoice/schema';
import { InvoiceStatusEnum } from '@fastgpt/global/support/wallet/invoice/constant';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

type DownloadQuery = {
  invoiceId: string;
};

type DownloadResponse = {
  invoiceUrl: string;
  invoiceNo?: string;
  invoiceCode?: string;
  title: string;
};

async function handler(
  req: ApiRequestProps<unknown, DownloadQuery>,
  _res: NextApiResponse
): Promise<DownloadResponse> {
  const { invoiceId } = req.query;

  if (!invoiceId) {
    throw new Error('缺少发票 ID');
  }

  const teamId = getTeamIdFromReq(req);

  // 查询发票记录
  const invoice = await MongoInvoiceModel.findOne({
    _id: invoiceId,
    teamId
  }).lean();

  if (!invoice) {
    throw new Error('发票不存在');
  }

  // 检查发票状态
  if (invoice.status !== InvoiceStatusEnum.completed) {
    throw new Error('发票尚未开具完成');
  }

  if (!invoice.invoiceUrl) {
    throw new Error('发票文件不存在');
  }

  return {
    invoiceUrl: invoice.invoiceUrl,
    invoiceNo: invoice.invoiceNo,
    invoiceCode: invoice.invoiceCode,
    title: invoice.title
  };
}

export default NextAPI(handler);

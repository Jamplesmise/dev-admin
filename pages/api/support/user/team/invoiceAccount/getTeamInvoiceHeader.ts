import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import type { InvoiceHeaderSchemaType } from '@fastgpt/global/support/wallet/invoiceHeader/type';
import {
  authMiddleware,
  getTeamIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoInvoiceHeader } from '@fastgpt/service/support_wallet/invoiceHeader/schema';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps,
  _res: NextApiResponse
): Promise<InvoiceHeaderSchemaType | null> {
  const teamId = getTeamIdFromReq(req);

  // 查询团队的发票抬头
  const invoiceHeader = await MongoInvoiceHeader.findOne({ teamId }).lean();

  return invoiceHeader || null;
}

export default NextAPI(handler);

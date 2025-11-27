import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoInvoiceModel } from '@fastgpt/service/support_wallet/invoice/schema';
import { InvoiceTypeEnum, InvoiceStatusEnum } from '@fastgpt/global/support/wallet/invoice/constant';
import type {
  InvoiceSchemaType,
  SubmitInvoiceBody
} from '@fastgpt/global/support/wallet/invoice/type';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoBillModel } from '@fastgpt/service/support_wallet/bill/schema';
import { BillStatusEnum } from '@fastgpt/global/support_wallet/bill/constants';
import { connectionMongo } from '@fastgpt/service/common/mongo';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

async function handler(
  req: ApiRequestProps<SubmitInvoiceBody>,
  _res: NextApiResponse
): Promise<InvoiceSchemaType> {
  const {
    billIds,
    type,
    title,
    taxNumber,
    bankName,
    bankAccount,
    address,
    phone,
    receiverEmail,
    receiverAddress,
    receiverName,
    receiverPhone
  } = req.body;

  // 参数验证
  if (!billIds || !Array.isArray(billIds) || billIds.length === 0) {
    throw new Error('请选择要开票的账单');
  }

  if (!title || !title.trim()) {
    throw new Error('发票抬头不能为空');
  }

  if (!taxNumber || !taxNumber.trim()) {
    throw new Error('税号不能为空');
  }

  // 专票额外验证
  if (type === InvoiceTypeEnum.special) {
    if (!bankName || !bankAccount || !address || !phone) {
      throw new Error('专用发票需要填写完整的开票信息');
    }
  }

  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  // 验证账单存在且属于当前团队，且未开票
  const bills = await MongoBillModel.find({
    _id: { $in: billIds },
    teamId,
    status: BillStatusEnum.success,
    invoiced: { $ne: true }
  }).lean();

  if (bills.length === 0) {
    throw new Error('未找到可开票的账单');
  }

  if (bills.length !== billIds.length) {
    throw new Error('部分账单不存在或已开票');
  }

  // 计算账单总金额
  const totalAmount = bills.reduce((sum, bill) => sum + bill.price, 0);

  // 使用事务确保发票创建和账单标记的原子性
  const session = await connectionMongo.startSession();
  let invoice: InvoiceSchemaType;

  try {
    await session.withTransaction(async () => {
      // 创建发票申请
      const [createdInvoice] = await MongoInvoiceModel.create(
        [
          {
            teamId,
            tmbId,
            billIds,
            totalAmount,
            type: type || InvoiceTypeEnum.normal,
            title: title.trim(),
            taxNumber: taxNumber.trim(),
            bankName,
            bankAccount,
            address,
            phone,
            receiverEmail,
            receiverAddress,
            receiverName,
            receiverPhone,
            status: InvoiceStatusEnum.pending
          }
        ],
        { session }
      );

      // 标记账单为已申请开票
      await MongoBillModel.updateMany(
        { _id: { $in: billIds } },
        {
          $set: {
            invoiced: true,
            invoiceId: createdInvoice._id
          }
        },
        { session }
      );

      invoice = createdInvoice.toObject() as InvoiceSchemaType;
    });
  } finally {
    await session.endSession();
  }

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.CREATE_INVOICE,
    metadata: {
      amount: totalAmount
    }
  });

  return invoice!;
}

export default NextAPI(handler);

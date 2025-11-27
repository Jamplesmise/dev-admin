import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import type { UpdateInvoiceHeaderBody } from '@fastgpt/global/support/wallet/invoiceHeader/type';
import { InvoiceHeaderTypeEnum } from '@fastgpt/global/support/wallet/invoiceHeader/constant';
import {
  authMiddleware,
  getTeamIdFromReq,
  getTmbIdFromReq
} from '@fastgpt/service/common/middle/authMiddleware';
import { MongoInvoiceHeader } from '@fastgpt/service/support_wallet/invoiceHeader/schema';
import { MongoTeamMemberModel } from '@fastgpt/service/support_user/team/teamMemberSchema';
import { TeamMemberRoleEnum } from '@fastgpt/global/support_user_team/constant';
import { addAuditLog } from '@fastgpt/service/support_user_audit/utils';
import { AuditEventEnum } from '@fastgpt/global/support_user_audit/constants';

const NextAPI = NextEntry({ beforeCallback: [authMiddleware] });

// 验证税号格式（15-20 位字母数字）
function validateTaxNumber(taxNumber: string): boolean {
  return /^[A-Za-z0-9]{15,20}$/.test(taxNumber);
}

// 验证手机号格式
function validatePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

// 验证邮箱格式
function validateEmail(email: string): boolean {
  return /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(email);
}

async function handler(
  req: ApiRequestProps<UpdateInvoiceHeaderBody>,
  _res: NextApiResponse
): Promise<void> {
  const teamId = getTeamIdFromReq(req);
  const tmbId = getTmbIdFromReq(req);

  const {
    invoiceType,
    title,
    taxNumber,
    bankName,
    bankAccount,
    companyAddress,
    companyPhone,
    receiverName,
    receiverPhone,
    receiverAddress,
    receiverEmail
  } = req.body;

  // 验证必填字段
  if (!invoiceType) {
    throw new Error('发票类型不能为空');
  }
  if (!title || !title.trim()) {
    throw new Error('发票抬头不能为空');
  }
  if (!receiverName || !receiverName.trim()) {
    throw new Error('收件人姓名不能为空');
  }
  if (!receiverPhone) {
    throw new Error('收件人电话不能为空');
  }
  if (!receiverAddress || !receiverAddress.trim()) {
    throw new Error('收件地址不能为空');
  }

  // 验证权限：只有 owner 或有管理权限的用户可以更新
  const member = await MongoTeamMemberModel.findById(tmbId).lean();
  if (!member) {
    throw new Error('用户不存在');
  }

  // owner 直接有权限
  let hasPermission = member.role === TeamMemberRoleEnum.owner;
  if (!hasPermission) {
    const { getTeamMemberPermission } = await import('@fastgpt/service/support_permission/controller');
    const permission = await getTeamMemberPermission({
      teamId,
      tmbId,
      role: member.role as `${TeamMemberRoleEnum}`
    });
    hasPermission = permission.hasManagePer;
  }

  if (!hasPermission) {
    throw new Error('权限不足，只有管理员可以更新发票抬头');
  }

  // 企业类型必须填写税号
  if (invoiceType === InvoiceHeaderTypeEnum.company) {
    if (!taxNumber) {
      throw new Error('企业类型必须填写税号');
    }
    if (!validateTaxNumber(taxNumber)) {
      throw new Error('税号格式错误，应为 15-20 位字母或数字');
    }
  }

  // 验证手机号格式
  if (!validatePhone(receiverPhone)) {
    throw new Error('手机号格式错误');
  }

  // 验证邮箱格式（如果填写了）
  if (receiverEmail && !validateEmail(receiverEmail)) {
    throw new Error('邮箱格式错误');
  }

  // 使用 upsert 操作（有则更新，无则创建）
  await MongoInvoiceHeader.findOneAndUpdate(
    { teamId },
    {
      $set: {
        invoiceType,
        title: title.trim(),
        taxNumber: taxNumber || undefined,
        bankName: bankName || undefined,
        bankAccount: bankAccount || undefined,
        companyAddress: companyAddress || undefined,
        companyPhone: companyPhone || undefined,
        receiverName: receiverName.trim(),
        receiverPhone,
        receiverAddress: receiverAddress.trim(),
        receiverEmail: receiverEmail || undefined
      },
      $setOnInsert: {
        teamId
      }
    },
    { upsert: true, new: true }
  );

  // 记录审计日志
  await addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.SET_INVOICE_HEADER,
    metadata: {
      headerName: title.trim()
    }
  });
}

export default NextAPI(handler);

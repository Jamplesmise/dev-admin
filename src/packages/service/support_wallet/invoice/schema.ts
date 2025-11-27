import { TeamCollectionName, TeamMemberCollectionName } from '../../../global/support_user_team/constant';
import {
  InvoiceCollectionName,
  InvoiceTypeEnum,
  InvoiceStatusEnum
} from '../../../global/support/wallet/invoice/constant';
import type { InvoiceSchemaType } from '../../../global/support/wallet/invoice/type';
import { connectionMongo, getMongoModel } from '../../common/mongo';

const { Schema } = connectionMongo;

export const InvoiceSchema = new Schema(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: TeamCollectionName,
      required: true
    },
    tmbId: {
      type: Schema.Types.ObjectId,
      ref: TeamMemberCollectionName,
      required: true
    },

    // 关联账单
    billIds: [{
      type: Schema.Types.ObjectId,
      ref: 'bills'
    }],
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    // 发票类型
    type: {
      type: String,
      enum: Object.values(InvoiceTypeEnum),
      default: InvoiceTypeEnum.normal
    },

    // 基本信息
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    taxNumber: {
      type: String,
      required: true,
      maxlength: 20
    },

    // 专票额外信息
    bankName: String,
    bankAccount: String,
    address: String,
    phone: String,

    // 收件信息
    receiverEmail: String,
    receiverAddress: String,
    receiverName: String,
    receiverPhone: String,

    // 状态
    status: {
      type: String,
      enum: Object.values(InvoiceStatusEnum),
      default: InvoiceStatusEnum.pending
    },
    rejectReason: String,

    // 发票信息
    invoiceNo: String,
    invoiceCode: String,
    invoiceUrl: String,
    invoiceDate: Date,

    completeTime: Date
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: 'updateTime'
    }
  }
);

// 索引
try {
  InvoiceSchema.index({ teamId: 1, createTime: -1 });
  InvoiceSchema.index({ teamId: 1, status: 1 });
  InvoiceSchema.index({ invoiceNo: 1 }, { sparse: true });
} catch (error) {
  console.log(error);
}

export const MongoInvoiceModel = getMongoModel<InvoiceSchemaType>(
  InvoiceCollectionName,
  InvoiceSchema
);

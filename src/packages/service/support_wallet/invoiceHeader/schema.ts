import { TeamCollectionName } from '../../../global/support_user_team/constant';
import {
  InvoiceHeaderCollectionName,
  InvoiceHeaderTypeEnum
} from '../../../global/support/wallet/invoiceHeader/constant';
import type { InvoiceHeaderSchemaType } from '../../../global/support/wallet/invoiceHeader/type';
import { connectionMongo, getMongoModel } from '../../common/mongo';

const { Schema } = connectionMongo;

export const InvoiceHeaderSchema = new Schema(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: TeamCollectionName,
      required: true,
      unique: true
    },

    // 发票类型
    invoiceType: {
      type: String,
      enum: Object.values(InvoiceHeaderTypeEnum),
      required: true
    },

    // 基本信息
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    taxNumber: {
      type: String,
      maxlength: 20
    },

    // 企业专用信息
    bankName: {
      type: String,
      maxlength: 100
    },
    bankAccount: {
      type: String,
      maxlength: 30
    },
    companyAddress: {
      type: String,
      maxlength: 200
    },
    companyPhone: {
      type: String,
      maxlength: 20
    },

    // 收件信息
    receiverName: {
      type: String,
      required: true,
      maxlength: 50
    },
    receiverPhone: {
      type: String,
      required: true,
      maxlength: 20
    },
    receiverAddress: {
      type: String,
      required: true,
      maxlength: 200
    },
    receiverEmail: {
      type: String,
      maxlength: 100
    }
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
  InvoiceHeaderSchema.index({ teamId: 1 }, { unique: true });
} catch (error) {
  console.log(error);
}

export const MongoInvoiceHeader = getMongoModel<InvoiceHeaderSchemaType>(
  InvoiceHeaderCollectionName,
  InvoiceHeaderSchema
);

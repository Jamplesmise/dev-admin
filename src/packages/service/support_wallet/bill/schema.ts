import { getMongoModel, Schema } from '../../common/mongo/index';
import {
  BillTypeEnum,
  BillStatusEnum,
  PaymentEnum,
  StandardSubLevelEnum,
  SubModeEnum
} from '../../../global/support_wallet/bill/constants';
import type { BillSchemaType } from '../../../global/support_wallet/bill/type';

export const BillCollectionName = 'team_bills';

const BillSchema = new Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'teams',
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: 'team_members',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(BillTypeEnum),
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  payment: {
    type: String,
    enum: Object.values(PaymentEnum),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(BillStatusEnum),
    default: BillStatusEnum.pending
  },
  subLevel: {
    type: String,
    enum: Object.values(StandardSubLevelEnum)
  },
  subMode: {
    type: String,
    enum: Object.values(SubModeEnum)
  },
  extraDatasetSize: Number,
  extraPoints: Number,
  qrCode: String,
  codeUrl: String,
  transactionId: String,
  createTime: {
    type: Date,
    default: () => new Date()
  },
  payTime: Date,
  expireTime: {
    type: Date,
    required: true
  },
  // 发票相关
  invoiced: {
    type: Boolean,
    default: false
  },
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'invoices'
  }
});

// 索引
BillSchema.index({ teamId: 1, createTime: -1 });
BillSchema.index({ status: 1, expireTime: 1 });
BillSchema.index({ tmbId: 1 });
BillSchema.index({ teamId: 1, status: 1, invoiced: 1 }); // 发票查询索引

export const MongoBillModel = getMongoModel<BillSchemaType>(BillCollectionName, BillSchema);

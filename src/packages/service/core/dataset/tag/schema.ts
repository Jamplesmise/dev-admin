/**
 * 数据集标签 Schema
 *
 * 存储数据集的标签信息
 */

import { getMongoModel, Schema } from '../../../common/mongo/index';

// 数据集标签 Schema 类型
export type DatasetTagSchemaType = {
  _id: string;
  teamId: string;
  datasetId: string;
  name: string;
  createTime: Date;
};

export const DatasetTagCollectionName = 'dataset_tags';

const DatasetTagSchema = new Schema(
  {
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'teams',
      required: true
    },
    datasetId: {
      type: Schema.Types.ObjectId,
      ref: 'datasets',
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 50
    }
  },
  {
    timestamps: { createdAt: 'createTime', updatedAt: false }
  }
);

// 索引：同一数据集内标签名称唯一
DatasetTagSchema.index({ datasetId: 1, name: 1 }, { unique: true });
DatasetTagSchema.index({ teamId: 1 });

export const MongoDatasetTagModel = getMongoModel<DatasetTagSchemaType>(
  DatasetTagCollectionName,
  DatasetTagSchema
);

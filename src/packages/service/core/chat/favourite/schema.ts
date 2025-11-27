// 收藏应用 Schema 定义

import { TeamCollectionName, TeamMemberCollectionName } from '../../../../global/support_user_team/constant';
import {
  FavouriteAppCollectionName,
  TAG_MAX_LENGTH,
  CUSTOM_NAME_MAX_LENGTH
} from '../../../../global/core/chat/setting/constant';
import type { FavouriteAppSchemaType } from '../../../../global/core/chat/setting/type';
import { connectionMongo, getMongoModel } from '../../../common/mongo';

const { Schema } = connectionMongo;

export const FavouriteAppSchema = new Schema(
  {
    tmbId: {
      type: Schema.Types.ObjectId,
      ref: TeamMemberCollectionName,
      required: true
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: TeamCollectionName,
      required: true
    },
    appId: {
      type: Schema.Types.ObjectId,
      ref: 'apps',
      required: true
    },

    // 排序
    order: {
      type: Number,
      default: 0
    },

    // 分类标签
    tags: [
      {
        type: String,
        maxlength: TAG_MAX_LENGTH
      }
    ],

    // 自定义显示
    customName: {
      type: String,
      maxlength: CUSTOM_NAME_MAX_LENGTH
    },
    customIcon: {
      type: String
    }
  },
  {
    timestamps: { createdAt: 'createTime', updatedAt: false }
  }
);

// 索引
try {
  // 用于排序查询
  FavouriteAppSchema.index({ teamId: 1, tmbId: 1, order: 1 });
  // 防止重复收藏
  FavouriteAppSchema.index({ teamId: 1, tmbId: 1, appId: 1 }, { unique: true });
} catch (error) {
  console.log(error);
}

export const MongoFavouriteAppModel = getMongoModel<FavouriteAppSchemaType>(
  FavouriteAppCollectionName,
  FavouriteAppSchema
);

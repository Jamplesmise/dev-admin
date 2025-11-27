import { getMongoModel, Schema } from '../common/mongo/index';
import { UserCollectionName, UserStatusEnum } from '../../global/support_user/constants';
import type { UserSchemaType } from '../../global/support_user/type';

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    password: {
      type: String,
      select: false // 默认查询不返回密码
    },
    avatar: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true // 允许多个 null 值
    },
    phone: {
      type: String,
      trim: true,
      sparse: true
    },
    status: {
      type: String,
      enum: Object.values(UserStatusEnum),
      default: UserStatusEnum.active
    },
    lastLoginTime: {
      type: Date
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
  UserSchema.index({ email: 1 }, { unique: true, sparse: true });
  UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
  UserSchema.index({ username: 1 });
  UserSchema.index({ status: 1 });
} catch (error) {
  console.log('User schema index error:', error);
}

export const MongoUserModel = getMongoModel<UserSchemaType>(UserCollectionName, UserSchema);

import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoWxLoginSessionModel } from '@fastgpt/service/support_user/auth/schema';
import { WxLoginStatusEnum } from '@fastgpt/global/support_user/auth/constants';
import type {
  CheckWxStatusRequest,
  CheckWxStatusResponse,
  UserInfoType
} from '@fastgpt/global/support_user/auth/type';
import { nanoid } from 'nanoid';

const NextAPI = NextEntry({ beforeCallback: [] });

async function handler(
  req: ApiRequestProps<CheckWxStatusRequest, CheckWxStatusRequest>,
  _res: NextApiResponse
): Promise<CheckWxStatusResponse> {
  const { sceneId } = req.query;

  if (!sceneId) {
    return Promise.reject('缺少场景 ID');
  }

  // 查询登录会话
  const session = await MongoWxLoginSessionModel.findOne({ sceneId }).lean();

  if (!session) {
    return {
      status: WxLoginStatusEnum.expired
    };
  }

  // 检查是否过期
  if (new Date() > new Date(session.expireAt)) {
    return {
      status: WxLoginStatusEnum.expired
    };
  }

  // 如果已确认登录
  if (session.status === WxLoginStatusEnum.confirmed && session.userId) {
    // 生成 token
    const token = `token_${nanoid(32)}`;

    // TODO: 从数据库获取用户信息
    const user: UserInfoType = {
      _id: session.userId,
      username: '微信用户',
      status: 'active',
      createTime: new Date().toISOString()
    };

    return {
      status: session.status,
      user,
      token
    };
  }

  return {
    status: session.status
  };
}

export default NextAPI(handler);

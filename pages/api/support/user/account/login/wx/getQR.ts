import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoWxLoginSessionModel } from '@fastgpt/service/support_user/auth/schema';
import { WxLoginStatusEnum, WX_QR_EXPIRE_SECONDS } from '@fastgpt/global/support_user/auth/constants';
import type {
  GetWxQRRequest,
  GetWxQRResponse
} from '@fastgpt/global/support_user/auth/type';
import { nanoid } from 'nanoid';

const NextAPI = NextEntry({ beforeCallback: [] });

// 微信配置
const WX_APPID = process.env.WX_APPID;
const WX_APPSECRET = process.env.WX_APPSECRET;

// 获取微信 Access Token
async function getWxAccessToken(): Promise<string> {
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_APPSECRET}`
  );
  const data = await res.json();

  if (data.errcode) {
    throw new Error(data.errmsg || '获取微信 Access Token 失败');
  }

  return data.access_token;
}

// 创建临时二维码
async function createWxQRCode(accessToken: string, sceneId: string): Promise<{ ticket: string; url: string }> {
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expire_seconds: WX_QR_EXPIRE_SECONDS,
        action_name: 'QR_STR_SCENE',
        action_info: {
          scene: {
            scene_str: sceneId
          }
        }
      })
    }
  );
  const data = await res.json();

  if (data.errcode) {
    throw new Error(data.errmsg || '创建微信二维码失败');
  }

  return {
    ticket: data.ticket,
    url: data.url
  };
}

async function handler(
  req: ApiRequestProps<GetWxQRRequest, GetWxQRRequest>,
  _res: NextApiResponse
): Promise<GetWxQRResponse> {
  const { inviterId } = req.query;

  // 生成场景 ID
  const sceneId = `login_${nanoid(16)}`;

  // 计算过期时间
  const expireAt = new Date(Date.now() + WX_QR_EXPIRE_SECONDS * 1000);

  let ticket: string;
  let qrUrl: string;

  // 检查是否配置了微信
  if (WX_APPID && WX_APPSECRET) {
    // 获取微信 Access Token
    const accessToken = await getWxAccessToken();

    // 创建临时二维码
    const qrData = await createWxQRCode(accessToken, sceneId);
    ticket = qrData.ticket;
    qrUrl = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;
  } else {
    // 模拟数据（开发环境）
    ticket = `mock_ticket_${sceneId}`;
    qrUrl = `https://example.com/qr/${sceneId}`;
  }

  // 创建登录会话
  await MongoWxLoginSessionModel.create({
    sceneId,
    ticket,
    status: WxLoginStatusEnum.waiting,
    inviterId,
    expireAt
  });

  return {
    ticket,
    qrUrl,
    expireTime: WX_QR_EXPIRE_SECONDS,
    sceneId
  };
}

export default NextAPI(handler);

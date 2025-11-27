/**
 * 短信发送服务
 *
 * 支持配置：
 * - 阿里云短信
 * - 腾讯云短信
 * - 测试模式（仅打印，不实际发送）
 */

export type SmsConfig = {
  provider: 'aliyun' | 'tencent' | 'test';
  // 阿里云配置
  aliyun?: {
    accessKeyId: string;
    accessKeySecret: string;
    signName: string;
    templateCode: string;
  };
  // 腾讯云配置
  tencent?: {
    secretId: string;
    secretKey: string;
    sdkAppId: string;
    signName: string;
    templateId: string;
  };
};

/**
 * 获取短信配置
 */
function getSmsConfig(): SmsConfig {
  // 测试模式
  if (process.env.SMS_PROVIDER === 'test' || process.env.NODE_ENV === 'test') {
    return { provider: 'test' };
  }

  // 阿里云
  if (process.env.SMS_ACCESS_KEY_ID && process.env.SMS_ACCESS_KEY_SECRET) {
    return {
      provider: 'aliyun',
      aliyun: {
        accessKeyId: process.env.SMS_ACCESS_KEY_ID,
        accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET,
        signName: process.env.SMS_SIGN_NAME || 'FastGPT',
        templateCode: process.env.SMS_TEMPLATE_CODE || ''
      }
    };
  }

  // 腾讯云
  if (process.env.SMS_SECRET_ID && process.env.SMS_SECRET_KEY) {
    return {
      provider: 'tencent',
      tencent: {
        secretId: process.env.SMS_SECRET_ID,
        secretKey: process.env.SMS_SECRET_KEY,
        sdkAppId: process.env.SMS_SDK_APP_ID || '',
        signName: process.env.SMS_SIGN_NAME || 'FastGPT',
        templateId: process.env.SMS_TEMPLATE_ID || ''
      }
    };
  }

  // 默认测试模式
  return { provider: 'test' };
}

/**
 * 发送短信验证码
 */
export async function sendSmsCode(phone: string, code: string): Promise<void> {
  const config = getSmsConfig();

  switch (config.provider) {
    case 'aliyun':
      await sendAliyunSms(phone, code, config.aliyun!);
      break;
    case 'tencent':
      await sendTencentSms(phone, code, config.tencent!);
      break;
    case 'test':
    default:
      console.log(`[SMS Test] Phone: ${phone}, Code: ${code}`);
      // 测试模式下直接返回成功
      break;
  }
}

/**
 * 阿里云短信发送
 */
async function sendAliyunSms(
  phone: string,
  code: string,
  config: NonNullable<SmsConfig['aliyun']>
): Promise<void> {
  // 动态导入阿里云 SDK（避免未安装时报错）
  try {
    const Dysmsapi20170525 = await import('@alicloud/dysmsapi20170525');
    const OpenApi = await import('@alicloud/openapi-client');

    const apiConfig = new OpenApi.Config({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret
    });
    apiConfig.endpoint = 'dysmsapi.aliyuncs.com';

    const client = new Dysmsapi20170525.default(apiConfig);

    const request = new Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phone,
      signName: config.signName,
      templateCode: config.templateCode,
      templateParam: JSON.stringify({ code })
    });

    const response = await client.sendSms(request);

    if (response.body.code !== 'OK') {
      throw new Error(`短信发送失败: ${response.body.message}`);
    }
  } catch (error: any) {
    if (error.message?.includes('Cannot find module')) {
      console.error('阿里云 SDK 未安装，请运行: pnpm add @alicloud/dysmsapi20170525 @alicloud/openapi-client');
      throw new Error('短信服务配置错误');
    }
    throw error;
  }
}

/**
 * 腾讯云短信发送
 */
async function sendTencentSms(
  phone: string,
  code: string,
  config: NonNullable<SmsConfig['tencent']>
): Promise<void> {
  try {
    const tencentcloud = await import('tencentcloud-sdk-nodejs');
    const SmsClient = tencentcloud.sms.v20210111.Client;

    const client = new SmsClient({
      credential: {
        secretId: config.secretId,
        secretKey: config.secretKey
      },
      region: 'ap-guangzhou'
    });

    const params = {
      SmsSdkAppId: config.sdkAppId,
      SignName: config.signName,
      TemplateId: config.templateId,
      TemplateParamSet: [code],
      PhoneNumberSet: [`+86${phone}`]
    };

    const response = await client.SendSms(params);

    const sendStatus = response.SendStatusSet?.[0];
    if (sendStatus?.Code !== 'Ok') {
      throw new Error(`短信发送失败: ${sendStatus?.Message}`);
    }
  } catch (error: any) {
    if (error.message?.includes('Cannot find module')) {
      console.error('腾讯云 SDK 未安装，请运行: pnpm add tencentcloud-sdk-nodejs');
      throw new Error('短信服务配置错误');
    }
    throw error;
  }
}

/**
 * 验证手机号格式
 */
export function isValidPhone(phone: string): boolean {
  // 中国大陆手机号：1 开头，11 位数字
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

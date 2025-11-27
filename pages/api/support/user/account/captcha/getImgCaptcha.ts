import type { NextApiResponse } from 'next';
import { NextEntry } from '@fastgpt/service/common/middle/entry';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoCaptchaSessionModel } from '@fastgpt/service/support_user/auth/schema';
import { CAPTCHA_EXPIRE_SECONDS } from '@fastgpt/global/support_user/auth/constants';
import type { GetImgCaptchaResponse } from '@fastgpt/global/support_user/auth/type';
import { nanoid } from 'nanoid';

const NextAPI = NextEntry({ beforeCallback: [] });

// 生成随机验证码
function generateCaptchaCode(length: number = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// 生成简单的 SVG 验证码图片
function generateCaptchaSVG(code: string): string {
  const width = 120;
  const height = 40;
  const fontSize = 24;

  // 生成干扰线
  let lines = '';
  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = `rgb(${Math.random() * 200},${Math.random() * 200},${Math.random() * 200})`;
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"/>`;
  }

  // 生成干扰点
  let dots = '';
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = `rgb(${Math.random() * 200},${Math.random() * 200},${Math.random() * 200})`;
    dots += `<circle cx="${x}" cy="${y}" r="1" fill="${color}"/>`;
  }

  // 生成字符
  let chars = '';
  for (let i = 0; i < code.length; i++) {
    const x = 15 + i * 25 + Math.random() * 5;
    const y = 28 + Math.random() * 8 - 4;
    const rotate = Math.random() * 30 - 15;
    const color = `rgb(${Math.random() * 100},${Math.random() * 100},${Math.random() * 100 + 50})`;
    chars += `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" transform="rotate(${rotate} ${x} ${y})">${code[i]}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f0f0f0"/>
    ${lines}
    ${dots}
    ${chars}
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function handler(
  _req: ApiRequestProps<Record<string, never>>,
  _res: NextApiResponse
): Promise<GetImgCaptchaResponse> {
  // 生成验证码
  const code = generateCaptchaCode();
  const captchaId = nanoid(16);

  // 计算过期时间
  const expireAt = new Date(Date.now() + CAPTCHA_EXPIRE_SECONDS * 1000);

  // 保存验证码会话（答案需要哈希存储，这里简化处理）
  await MongoCaptchaSessionModel.create({
    captchaId,
    answer: code.toUpperCase(), // 实际应该哈希
    expireAt
  });

  // 生成验证码图片
  const captchaImg = generateCaptchaSVG(code);

  return {
    captchaId,
    captchaImg,
    expireTime: CAPTCHA_EXPIRE_SECONDS
  };
}

export default NextAPI(handler);

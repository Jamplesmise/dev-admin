/**
 * 邮件发送服务
 *
 * 支持配置：
 * - SMTP
 * - 测试模式（仅打印，不实际发送）
 */

import nodemailer from 'nodemailer';

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

/**
 * 获取邮件配置
 */
function getEmailConfig(): EmailConfig | null {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null;
  }

  return {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER
  };
}

/**
 * 创建邮件传输器
 */
function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

/**
 * 发送邮件验证码
 */
export async function sendEmailCode(email: string, code: string): Promise<void> {
  const config = getEmailConfig();

  // 测试模式
  if (!config || process.env.NODE_ENV === 'test') {
    console.log(`[Email Test] Email: ${email}, Code: ${code}`);
    return;
  }

  const transporter = createTransporter(config);

  const mailOptions = {
    from: config.from,
    to: email,
    subject: 'FastGPT 验证码',
    html: generateEmailTemplate(code)
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error: any) {
    console.error('Email send failed:', error);
    throw new Error('邮件发送失败，请稍后重试');
  }
}

/**
 * 生成邮件 HTML 模板
 */
function generateEmailTemplate(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4f46e5;
      margin-bottom: 20px;
    }
    .code {
      font-size: 32px;
      font-weight: bold;
      color: #4f46e5;
      letter-spacing: 4px;
      padding: 20px;
      background-color: #fff;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .note {
      color: #666;
      font-size: 14px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">FastGPT</div>
    <p>您好，</p>
    <p>您的验证码是：</p>
    <div class="code">${code}</div>
    <p class="note">
      此验证码将在 5 分钟内有效。<br>
      如果您没有请求此验证码，请忽略此邮件。
    </p>
    <div class="footer">
      <p>此邮件由系统自动发送，请勿回复。</p>
      <p>&copy; FastGPT Team</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

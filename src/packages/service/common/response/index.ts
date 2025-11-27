import type { NextApiResponse } from 'next';
import { proxyError, ERROR_RESPONSE, ERROR_ENUM } from '../../../global/common/error/errorCode';
import { addLog } from '../system/log';
import { replaceSensitiveText } from '../../../global/common/string/tools';
import { UserError } from '../../../global/common/error/utils';

// SSE 事件枚举
export enum SseResponseEventEnum {
  error = 'error',
  flowNodeStatus = 'flowNodeStatus'
}

// 临时的 clearCookie 实现
const clearCookie = (res: NextApiResponse) => {
  res.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; Max-Age=0');
};

export interface ResponseType<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface ProcessedError {
  code: number;
  statusText: string;
  message: string;
  data?: unknown;
  shouldClearCookie: boolean;
}

/**
 * 通用错误处理函数，提取错误信息并分类记录日志
 * @param params - 包含错误对象、URL和默认状态码的参数
 * @returns 处理后的错误对象
 */
interface ErrorWithResponse {
  response?: {
    statusText?: string;
    data?: { error?: { message?: string } };
  };
  message?: string;
  code?: string;
  error?: { message?: string; code?: string };
}

export function processError(params: {
  error: string | Error | ErrorWithResponse | unknown;
  url?: string;
  defaultCode?: number;
}): ProcessedError {
  const { error, url, defaultCode = 500 } = params;

  const errObj = error as ErrorWithResponse;
  const errResponseKey = typeof error === 'string' ? error : errObj?.message;

  // 1. 处理特定的业务错误（ERROR_RESPONSE）
  const errEnumKey = errResponseKey as ERROR_ENUM;
  if (errEnumKey && ERROR_RESPONSE[errEnumKey]) {
    const shouldClearCookie = errEnumKey === ERROR_ENUM.unAuthorization;

    // 记录业务侧错误日志
    addLog.info(`Api response error: ${url}`, ERROR_RESPONSE[errEnumKey]);

    return {
      code: ERROR_RESPONSE[errEnumKey].code || defaultCode,
      statusText: ERROR_RESPONSE[errEnumKey].statusText || 'error',
      message: ERROR_RESPONSE[errEnumKey].message,
      data: ERROR_RESPONSE[errEnumKey].data,
      shouldClearCookie
    };
  }

  // 2. 提取通用错误消息
  let msg = errObj?.response?.statusText || errObj?.message || '请求错误';
  if (typeof error === 'string') {
    msg = error;
  } else if (errObj?.code && proxyError[errObj.code]) {
    msg = '网络连接异常';
  } else if (errObj?.response?.data?.error?.message) {
    msg = errObj.response.data.error.message;
  } else if (errObj?.error?.message) {
    msg = errObj.error.message;
  }

  // 3. 根据错误类型记录不同级别的日志
  if (error instanceof UserError) {
    addLog.info(`Request error: ${url}, ${msg}`);
  } else {
    addLog.error(`System unexpected error: ${url}, ${msg}`, error);
  }

  // 4. 返回处理后的错误信息
  return {
    code: defaultCode,
    statusText: 'error',
    message: replaceSensitiveText(msg),
    shouldClearCookie: false
  };
}

export const jsonRes = <T = unknown>(
  res: NextApiResponse,
  props?: {
    code?: number;
    message?: string;
    data?: T;
    error?: string | Error | ErrorWithResponse | unknown;
    url?: string;
  }
) => {
  const { code = 200, message = '', data = null, error, url } = props || {};

  // 如果有错误，使用统一的错误处理逻辑
  if (error) {
    const processedError = processError({ error, url, defaultCode: code });

    // 如果需要清除 cookie
    if (processedError.shouldClearCookie) {
      clearCookie(res);
    }

    res.status(500).json({
      code: processedError.code,
      statusText: processedError.statusText,
      message: message || processedError.message,
      data: processedError.data !== undefined ? processedError.data : null
    });

    return;
  }

  // 成功响应
  res.status(code).json({
    code,
    statusText: '',
    message: replaceSensitiveText(message),
    data: data !== undefined ? data : null
  });
};

export const sseErrRes = (res: NextApiResponse, error: string | Error | ErrorWithResponse | unknown) => {
  const errObj = error as ErrorWithResponse;
  const errResponseKey = typeof error === 'string' ? error : errObj?.message;

  // Specified error
  const errEnumKey = errResponseKey as ERROR_ENUM;
  if (errEnumKey && ERROR_RESPONSE[errEnumKey]) {
    // login is expired
    if (errEnumKey === ERROR_ENUM.unAuthorization) {
      clearCookie(res);
    }

    return responseWrite({
      res,
      event: SseResponseEventEnum.error,
      data: JSON.stringify(ERROR_RESPONSE[errEnumKey])
    });
  }

  let msg = errObj?.response?.statusText || errObj?.message || '请求错误';
  if (typeof error === 'string') {
    msg = error;
  } else if (errObj?.code && proxyError[errObj.code]) {
    msg = '网络连接异常';
  } else if (errObj?.response?.data?.error?.message) {
    msg = errObj.response.data.error.message;
  } else if (errObj?.error?.message) {
    msg = `${errObj.error.code ?? ''} ${errObj.error.message}`;
  }

  addLog.error(`sse error: ${msg}`, error);

  responseWrite({
    res,
    event: SseResponseEventEnum.error,
    data: JSON.stringify({ message: replaceSensitiveText(msg) })
  });
};

interface ReadableStreamLike {
  resume?: () => void;
  pause?: () => void;
}

export function responseWriteController({
  res,
  readStream
}: {
  res: NextApiResponse;
  readStream: ReadableStreamLike;
}) {
  res.on('drain', () => {
    readStream?.resume?.();
  });

  return (text: string | Buffer) => {
    const writeResult = res.write(text);
    if (!writeResult) {
      readStream?.pause?.();
    }
  };
}

export function responseWrite({
  res,
  write,
  event,
  data
}: {
  res?: NextApiResponse;
  write?: (text: string) => void;
  event?: string;
  data: string;
}) {
  const Write = write || res?.write;

  if (!Write) return;

  event && Write(`event: ${event}\n`);
  Write(`data: ${data}\n\n`);
}

export const responseWriteNodeStatus = ({
  res,
  status = 'running',
  name
}: {
  res?: NextApiResponse;
  status?: 'running';
  name: string;
}) => {
  responseWrite({
    res,
    event: SseResponseEventEnum.flowNodeStatus,
    data: JSON.stringify({
      status,
      name
    })
  });
};

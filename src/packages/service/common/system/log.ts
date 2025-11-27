import dayjs from 'dayjs';

export enum LogLevelEnum {
  debug = 0,
  info = 1,
  warn = 2,
  error = 3
}

const envLogLevelMap: Record<string, number> = {
  debug: LogLevelEnum.debug,
  info: LogLevelEnum.info,
  warn: LogLevelEnum.warn,
  error: LogLevelEnum.error
};

const LOG_LEVEL = (() => {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return envLogLevelMap[level] ?? LogLevelEnum.info;
})();

type LogData = Record<string, string | number | boolean | null | undefined | object>;

interface ErrorLike {
  message?: string;
  stack?: string;
}

/* add logger */
export const addLog = {
  log(level: LogLevelEnum, msg: string, obj: LogData = {}) {
    if (level < LOG_LEVEL) return;

    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const stringifyObj = Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';

    console.log(`[${levelNames[level]}] ${timestamp} ${msg} ${stringifyObj}`);

    if (level === LogLevelEnum.error) {
      console.error(obj);
    }
  },
  debug(msg: string, obj?: LogData) {
    this.log(LogLevelEnum.debug, msg, obj);
  },
  info(msg: string, obj?: LogData) {
    this.log(LogLevelEnum.info, msg, obj);
  },
  warn(msg: string, obj?: LogData) {
    this.log(LogLevelEnum.warn, msg, obj);
  },
  error(msg: string, error?: string | Error | ErrorLike | unknown) {
    const errObj = error as ErrorLike;
    this.log(LogLevelEnum.error, msg, {
      message: errObj?.message || String(error ?? ''),
      stack: errObj?.stack
    });
  }
};

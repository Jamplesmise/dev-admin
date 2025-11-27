import { replaceSensitiveText } from '../string/tools';

interface ErrorLike {
  response?: {
    data?: { message?: string; msg?: string };
    message?: string;
    msg?: string;
  };
  message?: string;
  msg?: string;
  error?: string;
  errors?: Array<{ message: string }>;
}

export const getErrText = (err: string | ErrorLike | unknown, def = ''): string => {
  if (typeof err === 'string') {
    return replaceSensitiveText(err);
  }

  const errObj = err as ErrorLike;
  const msg: string =
    errObj?.response?.data?.message ||
    errObj?.response?.message ||
    errObj?.message ||
    errObj?.response?.data?.msg ||
    errObj?.response?.msg ||
    errObj?.msg ||
    errObj?.error ||
    def;

  // Axios special
  if (errObj?.errors && Array.isArray(errObj.errors) && errObj.errors.length > 0) {
    return errObj.errors[0].message;
  }

  return replaceSensitiveText(msg);
};

export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

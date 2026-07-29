export const RAW_BODY_LIMIT = 10 * 1024 * 1024;

export const MULTIPART_MAX_FILES = 20;

export const MULTIPART_MAX_FIELDS = 100;

export const isBodySizeLimitError = (message: string): boolean => {
  return /exceeds limit of \d+ bytes/i.test(message)
    || /request entity too large/i.test(message);
};

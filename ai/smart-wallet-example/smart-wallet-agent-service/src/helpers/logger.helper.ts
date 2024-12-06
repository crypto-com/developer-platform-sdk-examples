import { isAxiosError } from 'axios';
import util from 'util';
import winston, { createLogger, format, transports } from 'winston';
import { IS_PROD_ENV } from './constants/global.constants.js';
import { getErrorMessage } from './errors.helpers.js';

const {
  combine,
  errors,
  colorize,
  // timestamp,
  printf,
} = format;

const customFormat = printf((info) => {
  // Format the message with any additional arguments
  const formattedMessage = info[Symbol.for('splat')]
    ? util.format(info.message, ...info[Symbol.for('splat')])
    : info.message;

  const sanitizedMessage =
    isAxiosError(info.message) || info instanceof Error
      ? JSON.stringify(sanitizeError(info.message), null, 2)
      : formattedMessage;

  const log = `${info.level}: ${sanitizedMessage}`;
  return info.stack ? `${log}\n${info.stack}` : log;
});

export const logger: winston.Logger = createLogger({
  level: IS_PROD_ENV ? 'info' : 'debug',
  format: combine(errors({ stack: true }), colorize(), customFormat),
  transports: [
    new transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

/**
 * Sanitizes an error object by removing sensitive information such as API keys and request details.
 *
 * @param {unknown} error - The error object (could be an Axios error or a generic error).
 * @param {string[]} [redactFields=['Authorization', 'apiKey']] - Fields to redact from headers or query parameters.
 * @returns {Object} - Sanitized error object with only essential information.
 */
export const sanitizeError = (
  error: unknown,
  redactFields: string[] = ['Authorization', 'apiKey']
): {
  message: string;
  status?: number;
  url?: string;
  method?: string;
  data?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
} => {
  if (isAxiosError(error)) {
    const sanitizedError: {
      message: string;
      status?: number;
      url?: string;
      method?: string;
      data?: string;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    } = {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data ? 'Redacted' : undefined,
      headers: undefined,
      params: undefined,
    };

    if (error.config?.headers) {
      const redactedHeaders: Record<string, string> = {
        ...error.config.headers,
      };
      redactFields.forEach((field) => {
        if (redactedHeaders[field]) {
          redactedHeaders[field] = 'REDACTED';
        }
      });
      sanitizedError.headers = redactedHeaders;
    }

    if (error.config?.params) {
      const redactedParams: Record<string, string> = {
        ...error.config.params,
      };
      redactFields.forEach((field) => {
        if (redactedParams[field]) {
          redactedParams[field] = 'REDACTED';
        }
      });
      sanitizedError.params = redactedParams;
    }

    return sanitizedError;
  }

  return {
    message: getErrorMessage(error),
  };
};

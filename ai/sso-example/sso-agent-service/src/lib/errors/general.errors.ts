import { HTTP_CODES } from '../interfaces/api.interface.js';
import { BaseError, Jsonable } from './base.error.js';

export class HTTPError extends BaseError {
  public readonly statusCode: HTTP_CODES;

  constructor(message: string, httpCode: HTTP_CODES, context?: Jsonable) {
    super(message, context);
    this.statusCode = httpCode;
  }
}

export class NotFoundError extends HTTPError {
  constructor(resource: string, context?: Jsonable) {
    super(`Resource not found: ${resource}`, HTTP_CODES.NOT_FOUND, context);
  }
}

export class BadRequestError extends HTTPError {
  constructor(message: string, context?: Jsonable) {
    super(`Bad Request: ${message}`, HTTP_CODES.BAD_REQUEST, context);
  }
}

export class InternalServerError extends HTTPError {
  constructor(message: string, context?: Jsonable) {
    super(`Internal Server Error: ${message}`, HTTP_CODES.INTERNAL_SERVER_ERROR, context);
  }
}

export class AuthorizationError extends HTTPError {
  constructor(message: string, context?: Jsonable) {
    super(`Unauthorized: ${message}`, HTTP_CODES.UNAUTHORIZED, context);
  }
}

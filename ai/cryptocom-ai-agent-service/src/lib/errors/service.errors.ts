import { BaseError } from './base.error.js';

export class OpenAIUnauthorizedError extends BaseError {
  constructor(message: string) {
    super(`${message}`);
  }
}

export class OpenAIModelError extends BaseError {
  constructor(message: string) {
    super(`${message}`);
  }
}

export class DeepSeekUnauthorizedError extends BaseError {
  constructor(message: string) {
    super(`${message}`);
  }
}

export class DeepSeekModelError extends BaseError {
  constructor(message: string) {
    super(`${message}`);
  }
}

export class MistralUnauthorizedError extends BaseError {
  constructor(message: string) {
    super(`${message}`);
  }
}

export class MistralModelError extends BaseError {
  constructor(message: string) {
    super(`${message}`);
  }
}

export class InputError extends BaseError {
  constructor(message: string) {
    super(`${message}`);
  }
}

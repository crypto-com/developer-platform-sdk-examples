import { body, ValidationChain } from 'express-validator';

export const queryInputValidator: ValidationChain[] = [
  body('query', 'query should be a string').notEmpty().isString(),
  body('options.openAI.apiKey', 'options.openAI.apiKey should be a valid string').notEmpty().isString(),
  body('options.chainId', 'options.chainId should be a valid number').notEmpty().isInt(),
  body('options.explorer', 'options.apiKey should be a valid object').notEmpty().isObject(),
  body('options.context', 'options.context should be an array of objects with role and content properties')
    .optional()
    .isArray()
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      return value.every(
        (item) =>
          typeof item === 'object' &&
          'role' in item &&
          'content' in item &&
          typeof item.role === 'string' &&
          typeof item.content === 'string'
      );
    }),
];

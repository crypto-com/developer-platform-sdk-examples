import { NextFunction, Request, Response } from 'express';
import { Result, ValidationError, validationResult } from 'express-validator';
import { HTTP_STATUS, ResponseError } from '../interfaces/api.interface.js';

/**
 * Middleware for checking and handling validation errors in an Express request.
 *
 * @param {Request} req - The Express request object containing the request data and validation results.
 * @param {Response<ResponseError>} res - Only returns a ResponseError if validation fails.
 * @param {NextFunction} next - The next middleware function in the Express routing pipeline.
 * @returns {void | Response} - If validation errors are present, returns a response with error details; otherwise, proceeds to the next middleware.
 *
 * @example
 * router.post('/register', verifyErrors, ...);
 */
export const validationMiddleware = (
  req: Request,
  res: Response<ResponseError>,
  next: NextFunction
): void | Response<ResponseError> => {
  const errors: Result<ValidationError> = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors: string[] = [];
  errors.array().forEach((e: ValidationError) => {
    if ('msg' in e && typeof e.msg === 'string') {
      extractedErrors.push(e.msg as string);
    }
  });

  return res.status(400).json({
    status: HTTP_STATUS.FAILED,
    message: `The following inputs are invalid: ${extractedErrors.join(', ')}`,
  });
};

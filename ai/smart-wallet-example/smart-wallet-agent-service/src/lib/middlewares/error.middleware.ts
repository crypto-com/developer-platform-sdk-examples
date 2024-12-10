import { NextFunction, Request, Response } from 'express';
import { getErrorMessage } from '../../helpers/errors.helpers.js';
import { HTTPError, InternalServerError, NotFoundError } from '../errors/general.errors.js';
import { HTTP_CODES, HTTP_STATUS, ResponseError } from '../interfaces/api.interface.js';

/**
 * Global error handling middleware for the Express application.
 *
 * This middleware catches all errors thrown, then differentiates between HTTPErrors
 * and unexpected errors.
 *
 * It only returns a ResponseError object in the body with the status and message.
 *
 * @param {Error} err - The error object to be handled.
 * @param {Request} req - The Express request object.
 * @param {Response<ResponseError>} res - Only returns an error response
 * @returns {void}
 *
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware = (err: Error, req: Request, res: Response<ResponseError>, next: NextFunction) => {
  if (err instanceof HTTPError) {
    return res.status(err.statusCode).json({
      status: HTTP_STATUS.FAILED,
      message: err.message,
    });
  }

  const unexpectedError = new InternalServerError(getErrorMessage(err), HTTP_CODES.INTERNAL_SERVER_ERROR);
  return res.status(unexpectedError.statusCode).json({
    status: HTTP_STATUS.FAILED,
    message: unexpectedError.message,
  });
};

export const resourceNotFoundMiddleWare = (req: Request, res: Response<ResponseError>) => {
  const notFoundError = new NotFoundError(req.originalUrl, HTTP_CODES.NOT_FOUND);
  return res.status(HTTP_CODES.NOT_FOUND).json({
    status: HTTP_STATUS.FAILED,
    message: notFoundError.message,
  });
};

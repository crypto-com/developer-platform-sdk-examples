import { NextFunction, Request, Response } from 'express';
import { getErrorMessage } from '../helpers/errors.helpers.js';
import { InputError, OpenAIUnauthorizedError } from '../lib/errors/service.errors.js';
import { HTTP_CODES, HTTP_MESSAGES, ResponseError } from '../lib/interfaces/api.interface.js';
import { HealthCheckResponse, QueryResponse } from '../services/query/query.interfaces.js';
import { QueryService } from '../services/query/query.service.js';
import { HTTP_STATUS } from './../lib/interfaces/api.interface.js';
import { Status } from '../services/agent/agent.interfaces.js';

/**
 * Controller function to handle a query request.
 *
 * @async
 * @param {Request} req - The Express request object containing the query data in its body.
 * @param {Response<QueryResponse | ResponseError>} res - Response is a QueryResponse object if successful, or a ResponseError object if an error occurs
 * @param {NextFunction} next - The Express next function to pass the error to the error middleware.
 */
export const generateResponse = async (
  req: Request,
  res: Response<QueryResponse | ResponseError>,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { query, options } = req.body;
    const context = options.context || [];

    const queryService = new QueryService(options);
    const {
      functionResponses,
      context: updatedContext,
      finalResponse,
    } = await queryService.generateResponse(query, context);

    return res.status(HTTP_CODES.CREATED).json({
      status: HTTP_STATUS.SUCCESS,
      hasErrors: functionResponses.some((result) => result.status === Status.Failed),
      results: functionResponses,
      context: updatedContext,
      finalResponse,
    });
  } catch (error) {
    if (error instanceof OpenAIUnauthorizedError) {
      return res.status(HTTP_CODES.UNAUTHORIZED).json({
        status: HTTP_STATUS.FAILED,
        message: error.message,
      });
    }

    if (error instanceof InputError) {
      return res.status(HTTP_CODES.BAD_REQUEST).json({
        status: HTTP_STATUS.FAILED,
        message: error.message,
      });
    }

    next(error);
  }
};

/**
 * Asynchronous function for performing a health check of the application.
 * This function generates a health report including the application's uptime, response time, a success message, and the current timestamp.
 *
 * @async
 * @param {Request} _req - The Express request object (unused in this function, hence the underscore prefix).
 * @param {Response<HealthCheckResponse | ResponseError>} res - Response is a HealthCheckResponse object if successful, or a ResponseError object if an error occurs
 * @returns {Promise<Response>} A promise that resolves with a JSON response containing the health check data.
 */
export const healthCheck = async (
  _req: Request,
  res: Response<HealthCheckResponse | ResponseError>
): Promise<Response> => {
  try {
    return res.status(HTTP_CODES.OK).json({
      status: HTTP_STATUS.SUCCESS,
      results: {
        uptime: process.uptime(),
        responseTime: process.hrtime(),
        message: HTTP_MESSAGES.MESSAGE_OK,
        timestamp: Date.now(),
      },
    });
  } catch (e) {
    return res.status(HTTP_CODES.SERVICE_UNAVAILABLE).json({
      status: HTTP_STATUS.FAILED,
      message: getErrorMessage(e),
    });
  }
};

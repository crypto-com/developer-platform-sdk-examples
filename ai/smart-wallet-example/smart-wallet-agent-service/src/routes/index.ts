import * as express from 'express';
import { errorMiddleware, resourceNotFoundMiddleWare } from '../lib/middlewares/error.middleware.js';
import cdcAiAgentRoute from './ai-agent.routes.js';
import healthRoutes from './health.routes.js';

/**
 * Registers routes and middleware on the provided Express application.
 *
 * @param {express.Application} app - The Express application instance on which routes and middleware are to be registered.
 * @returns {void} - This function does not return anything.
 *
 * @example
 * const app = express();
 * register(app);
 */
export const register = (app: express.Application): void => {
  app.get('/');
  app.use('/healthcheck', healthRoutes);
  app.use('(/api)?/v1/cdc-ai-agent-service', cdcAiAgentRoute);
  app.use(resourceNotFoundMiddleWare);
  app.use(errorMiddleware);
};

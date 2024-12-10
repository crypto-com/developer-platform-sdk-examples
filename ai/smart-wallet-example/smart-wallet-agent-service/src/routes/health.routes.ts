import * as controller from '../controllers/query.controller.js';
import { healthRouter } from '../helpers/constants/global.constants.js';
import { validationMiddleware } from '../lib/middlewares/validation.middleware.js';

healthRouter.get('/', validationMiddleware, controller.healthCheck);

export default healthRouter;

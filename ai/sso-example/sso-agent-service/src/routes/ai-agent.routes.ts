import * as controller from '../controllers/query.controller.js';
import * as validate from '../controllers/query.validator.js';

import { aiAgentRouter } from '../helpers/constants/global.constants.js';

aiAgentRouter.post('/query', validate.queryInputValidator, controller.generateResponse);

export default aiAgentRouter;

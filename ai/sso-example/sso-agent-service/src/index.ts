import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';

import { logger } from './helpers/logger.helper.js';

import * as routes from './routes/index.js';

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(bodyParser.json());

/* routing setup */
routes.register(app);

app.listen(port, async () => {
  logger.info(`Running on ${port}`);
});

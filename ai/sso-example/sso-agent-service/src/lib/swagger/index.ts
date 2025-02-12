import { BASE_APP_URL } from '../../helpers/constants/global.constants.js';

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CDC Agent Service API',
      version: '1.0.0',
      description: 'API Documentation for CDC Agent Service',
      contact: {
        name: 'Developer',
        email: 'developer@crypto.com',
      },
    },
    servers: [
      {
        url: `${BASE_APP_URL}`, // Base URL for health check
      },
    ],
  },
  apis: ['src/routes/*.ts', 'src/controllers/*.ts'],
};

import dotenv from 'dotenv';
import express, { Router } from 'express';

dotenv.config();

// service config
export const IS_PROD_ENV: boolean = process.env.NODE_ENV === 'production';
export const IS_DEV_ENV: boolean = process.env.NODE_ENV === 'development';
export const DEFAULT_ENV: string = IS_DEV_ENV ? 'development' : 'production';
export const BASE_APP_URL: string = 'http://localhost:8000';

// router
export const aiAgentRouter: Router = express.Router();
export const healthRouter: Router = express.Router();

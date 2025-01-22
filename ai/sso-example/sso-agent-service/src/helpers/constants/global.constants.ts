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

// smart wallet
export const HTTP_ENDPOINT = 'https://testnet.zkevm.cronos.org';
export const WS_ENDPOINT = 'wss://ws.testnet.zkevm.cronos.org';
export const TARGET_ADDRESS = '0xE51ed414b0065e6A73F1D2866Aad4258B2DAde05'.toLowerCase();
export const WBTC_ADDRESS = '0x8a4c5552ee1e96c195badc7226e1d38f7ce9405b';

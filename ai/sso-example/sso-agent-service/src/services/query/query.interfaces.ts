import { HTTP_STATUS, ResponseSuccess } from '../../lib/interfaces/api.interface';
import { FunctionCallResponse, QueryContext } from '../agent/agent.interfaces';

export interface QueryResponse extends ResponseSuccess {
  status: HTTP_STATUS.SUCCESS;
  hasErrors: boolean;
  results: FunctionCallResponse[];
  context: QueryContext[];
  finalResponse: string;
}

export interface HealthCheckResponse extends ResponseSuccess {
  status: HTTP_STATUS.SUCCESS;
  results: {
    uptime: number;
    responseTime: [number, number];
    message: string;
    timestamp: number;
  };
}

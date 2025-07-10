export interface UAWWindowCounts {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface CountResult {
  count: string | number;
}

export enum TimeWindow {
  DAILY = 1,
  WEEKLY = 7,
  MONTHLY = 30,
  YEARLY = 365,
}

export enum BigQueryLocation {
  US = 'US',
  EU = 'EU',
  ASIA_NORTHEAST1 = 'asia-northeast1',
  US_MULTI_REGION = 'us',
}

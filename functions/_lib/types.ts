export interface Env {
  DB: D1Database;
  SITE_URL: string;
  RESEND_API_KEY: string;
  AUTH_FROM_EMAIL: string;
  PRINTAVO_ENCRYPTION_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID: string;
}

export interface AppUser {
  id: string;
  email: string;
  learningEnabled: boolean;
}

export interface SessionState {
  user: AppUser;
  tokenHash: string;
}

export type AppPagesFunction = PagesFunction<Env>;

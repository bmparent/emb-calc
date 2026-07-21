import { sha256Hex } from './crypto';
import { HttpError } from './http';
import type { AppUser, Env, SessionState } from './types';

const COOKIE_NAME = 'embcalc_session';
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

const parseCookies = (header: string | null) => Object.fromEntries(
  (header ?? '').split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf('=');
    return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }),
);

export const sessionCookie = (token: string, maximumAgeSeconds = 60 * 60 * 24 * 30) => (
  `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maximumAgeSeconds}`
);

export const clearSessionCookie = () => (
  `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
);

export const getSession = async (request: Request, env: Env): Promise<SessionState | null> => {
  const token = parseCookies(request.headers.get('cookie'))[COOKIE_NAME];
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(`
    SELECT users.id, users.email, users.learning_enabled
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?1 AND sessions.expires_at > ?2
  `).bind(tokenHash, new Date().toISOString()).first<{
    id: string;
    email: string;
    learning_enabled: number;
  }>();
  if (!row) return null;
  return {
    tokenHash,
    user: { id: row.id, email: row.email, learningEnabled: row.learning_enabled === 1 },
  };
};

export const requireSession = async (request: Request, env: Env) => {
  const session = await getSession(request, env);
  if (!session) throw new HttpError(401, 'Sign in to continue.');
  return session;
};

export const getSubscription = async (userId: string, env: Env) => {
  const row = await env.DB.prepare(`
    SELECT stripe_customer_id, status, current_period_end
    FROM subscriptions WHERE user_id = ?1
  `).bind(userId).first<{
    stripe_customer_id: string | null;
    status: string;
    current_period_end: string | null;
  }>();
  return {
    active: Boolean(row && ACTIVE_SUBSCRIPTION_STATUSES.has(row.status)),
    status: row?.status ?? 'inactive',
    customerId: row?.stripe_customer_id ?? null,
    currentPeriodEnd: row?.current_period_end ?? null,
  };
};

export const requireActiveSubscription = async (user: AppUser, env: Env) => {
  const subscription = await getSubscription(user.id, env);
  if (!subscription.active) throw new HttpError(402, 'An active Pro subscription is required.');
  return subscription;
};

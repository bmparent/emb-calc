import { decryptJson } from './crypto';
import { HttpError } from './http';
import type { Env } from './types';

export interface PrintavoCredentials { email: string; token: string }

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message?: string }>;
}

export const printavoRequest = async <T>(
  credentials: PrintavoCredentials,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> => {
  const response = await fetch('https://www.printavo.com/api/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      email: credentials.email,
      token: credentials.token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (response.status === 401 || response.status === 403) throw new HttpError(401, 'Printavo rejected the email or API token.');
  if (response.status === 429) throw new HttpError(429, 'Printavo rate limit reached. Wait a few seconds and try again.');
  if (!response.ok) throw new HttpError(502, 'Printavo is unavailable right now.');
  const payload = await response.json<GraphqlResponse<T>>();
  if (payload.errors?.length) {
    console.error('Printavo GraphQL error', payload.errors.map((error) => error.message ?? 'unknown').join('; '));
    throw new HttpError(502, 'Printavo could not complete that read-only request.');
  }
  if (!payload.data) throw new HttpError(502, 'Printavo returned an empty response.');
  return payload.data;
};

export const getPrintavoCredentials = async (userId: string, env: Env) => {
  const row = await env.DB.prepare(`
    SELECT credentials_cipher, credentials_iv FROM printavo_connections WHERE user_id = ?1
  `).bind(userId).first<{ credentials_cipher: string; credentials_iv: string }>();
  if (!row) throw new HttpError(409, 'Connect Printavo first.');
  return decryptJson<PrintavoCredentials>(row.credentials_cipher, row.credentials_iv, env.PRINTAVO_ENCRYPTION_KEY);
};

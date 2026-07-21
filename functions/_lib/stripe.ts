import { constantTimeEqual } from './crypto';

const encoder = new TextEncoder();

export const stripeRequest = async <T>(
  secretKey: string,
  path: string,
  body?: URLSearchParams,
  method = 'POST',
): Promise<T> => {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });
  const value = await response.json<Record<string, unknown>>();
  if (!response.ok) {
    const stripeMessage = (value.error as { message?: string } | undefined)?.message;
    throw new Error(stripeMessage || `Stripe returned ${response.status}`);
  }
  return value as T;
};

export const verifyStripeSignature = async (
  payload: string,
  signatureHeader: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) => {
  const entries = signatureHeader.split(',').map((entry) => entry.split('=', 2));
  const timestamp = Number(entries.find(([key]) => key === 't')?.[1]);
  const signatures = entries.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300 || signatures.length === 0) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`));
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return signatures.some((signature) => constantTimeEqual(signature, expected));
};

export const unixToIso = (value: unknown) => (
  typeof value === 'number' && Number.isFinite(value) ? new Date(value * 1000).toISOString() : null
);

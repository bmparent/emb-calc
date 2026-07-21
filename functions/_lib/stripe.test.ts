import { describe, expect, it } from 'vitest';
import { verifyStripeSignature } from './stripe';

const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)]
  .map((byte) => byte.toString(16).padStart(2, '0')).join('');

describe('verifyStripeSignature', () => {
  it('accepts an authentic, recent signature and rejects tampering', async () => {
    const timestamp = 1_700_000_000;
    const payload = '{"id":"evt_test"}';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('whsec_test'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = hex(await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${timestamp}.${payload}`),
    ));
    expect(await verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, 'whsec_test', timestamp)).toBe(true);
    expect(await verifyStripeSignature(`${payload}x`, `t=${timestamp},v1=${signature}`, 'whsec_test', timestamp)).toBe(false);
  });
});

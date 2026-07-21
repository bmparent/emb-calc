import { randomToken, sha256Hex } from '../../_lib/crypto';
import { handleError, json, readJson, requireSameOrigin } from '../../_lib/http';
import type { AppPagesFunction } from '../../_lib/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const onRequestPost: AppPagesFunction = async ({ request, env }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    if (!env.DB || !env.RESEND_API_KEY || !env.AUTH_FROM_EMAIL || !env.SITE_URL) {
      return json({ error: 'Account sign-in is not configured yet.' }, 503);
    }
    const body = await readJson<{ email?: string }>(request);
    const email = body.email?.trim().toLowerCase() ?? '';
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return json({ error: 'Enter a valid email address.' }, 400);
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM magic_links WHERE email = ?1 AND created_at > ?2',
    ).bind(email, oneHourAgo).first<{ count: number }>();
    // Return the same response to avoid exposing whether an account exists.
    if ((recent?.count ?? 0) >= 5) return json({ ok: true });

    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await env.DB.prepare(`
      INSERT INTO magic_links (token_hash, email, created_at, expires_at)
      VALUES (?1, ?2, ?3, ?4)
    `).bind(tokenHash, email, createdAt, expiresAt).run();

    const signInUrl = new URL('/api/auth/verify', env.SITE_URL);
    signInUrl.searchParams.set('token', token);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': tokenHash,
      },
      body: JSON.stringify({
        from: env.AUTH_FROM_EMAIL,
        to: [email],
        subject: 'Sign in to EmbroideryCalc Pro',
        html: `<p>Use this secure, one-time link to sign in to EmbroideryCalc Pro:</p><p><a href="${escapeHtml(signInUrl.toString())}">Sign in to EmbroideryCalc Pro</a></p><p>This link expires in 15 minutes. If you did not request it, you can ignore this email.</p>`,
      }),
    });
    if (!response.ok) {
      await env.DB.prepare('DELETE FROM magic_links WHERE token_hash = ?1').bind(tokenHash).run();
      throw new Error(`Email provider returned ${response.status}`);
    }
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
};

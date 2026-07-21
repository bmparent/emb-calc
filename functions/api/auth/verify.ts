import { randomToken, sha256Hex } from '../../_lib/crypto';
import { sessionCookie } from '../../_lib/auth';
import type { AppPagesFunction } from '../../_lib/types';

const redirectToCalculator = (siteUrl: string, status: 'ready' | 'invalid', cookie?: string) => {
  const destination = new URL('/calculator/', siteUrl);
  destination.searchParams.set('account', status);
  const headers = new Headers({ Location: destination.toString(), 'Cache-Control': 'no-store' });
  if (cookie) headers.set('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
};

export const onRequestGet: AppPagesFunction = async ({ request, env }) => {
  if (!env.DB || !env.SITE_URL) return redirectToCalculator(env.SITE_URL || new URL(request.url).origin, 'invalid');
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (token.length < 32) return redirectToCalculator(env.SITE_URL, 'invalid');
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const link = await env.DB.prepare(`
    SELECT email FROM magic_links
    WHERE token_hash = ?1 AND consumed_at IS NULL AND expires_at > ?2
  `).bind(tokenHash, now).first<{ email: string }>();
  if (!link) return redirectToCalculator(env.SITE_URL, 'invalid');

  const consumed = await env.DB.prepare(`
    UPDATE magic_links SET consumed_at = ?2
    WHERE token_hash = ?1 AND consumed_at IS NULL AND expires_at > ?2
  `).bind(tokenHash, now).run();
  if ((consumed.meta.changes ?? 0) !== 1) return redirectToCalculator(env.SITE_URL, 'invalid');

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(link.email).first<{ id: string }>();
  const userId = existing?.id ?? crypto.randomUUID();
  if (!existing) {
    await env.DB.prepare(`
      INSERT INTO users (id, email, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)
    `).bind(userId, link.email, now).run();
  }

  const sessionToken = randomToken();
  const sessionHash = await sha256Hex(sessionToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)
    `).bind(sessionHash, userId, now, expiresAt),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?1').bind(now),
    env.DB.prepare('DELETE FROM magic_links WHERE expires_at <= ?1').bind(now),
  ]);
  return redirectToCalculator(env.SITE_URL, 'ready', sessionCookie(sessionToken));
};

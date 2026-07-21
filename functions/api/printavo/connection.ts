import { requireActiveSubscription, requireSession } from '../../_lib/auth';
import { encryptJson } from '../../_lib/crypto';
import { handleError, HttpError, json, readJson, requireSameOrigin } from '../../_lib/http';
import { printavoRequest, type PrintavoCredentials } from '../../_lib/printavo';
import type { AppPagesFunction } from '../../_lib/types';

export const onRequestPost: AppPagesFunction = async ({ request, env }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    const session = await requireSession(request, env);
    await requireActiveSubscription(session.user, env);
    if (!env.PRINTAVO_ENCRYPTION_KEY) throw new HttpError(503, 'Printavo encryption is not configured yet.');
    const body = await readJson<Partial<PrintavoCredentials>>(request);
    const credentials = { email: body.email?.trim() ?? '', token: body.token?.trim() ?? '' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email) || credentials.email.length > 254) {
      throw new HttpError(400, 'Enter the email used for your Printavo account.');
    }
    if (credentials.token.length < 16 || credentials.token.length > 512) throw new HttpError(400, 'Enter a valid Printavo API token.');
    await printavoRequest<{ account: { id: string } }>(credentials, 'query ValidateAccount { account { id } }');
    const encrypted = await encryptJson(credentials, env.PRINTAVO_ENCRYPTION_KEY);
    const now = new Date().toISOString();
    const renewalReminderAt = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare(`
      INSERT INTO printavo_connections (
        user_id, credentials_cipher, credentials_iv, key_version, connected_at, verified_at, renewal_reminder_at
      ) VALUES (?1, ?2, ?3, 1, ?4, ?4, ?5)
      ON CONFLICT(user_id) DO UPDATE SET
        credentials_cipher = excluded.credentials_cipher,
        credentials_iv = excluded.credentials_iv,
        key_version = excluded.key_version,
        connected_at = excluded.connected_at,
        verified_at = excluded.verified_at,
        renewal_reminder_at = excluded.renewal_reminder_at
    `).bind(session.user.id, encrypted.cipher, encrypted.iv, now, renewalReminderAt).run();
    return json({ connected: true, verifiedAt: now, renewalReminderAt });
  } catch (error) {
    return handleError(error);
  }
};

export const onRequestDelete: AppPagesFunction = async ({ request, env }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    const session = await requireSession(request, env);
    await env.DB.prepare('DELETE FROM printavo_connections WHERE user_id = ?1').bind(session.user.id).run();
    return json({ connected: false });
  } catch (error) {
    return handleError(error);
  }
};

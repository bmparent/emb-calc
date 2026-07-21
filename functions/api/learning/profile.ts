import { requireActiveSubscription, requireSession } from '../../_lib/auth';
import { handleError, HttpError, json, readJson, requireSameOrigin } from '../../_lib/http';
import type { AppPagesFunction } from '../../_lib/types';

export const onRequestPatch: AppPagesFunction = async ({ request, env }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    const session = await requireSession(request, env);
    await requireActiveSubscription(session.user, env);
    const body = await readJson<{ enabled?: unknown }>(request);
    if (typeof body.enabled !== 'boolean') throw new HttpError(400, 'Choose whether personal learning is enabled.');
    await env.DB.prepare(`
      UPDATE users SET learning_enabled = ?2, updated_at = ?3 WHERE id = ?1
    `).bind(session.user.id, body.enabled ? 1 : 0, new Date().toISOString()).run();
    return json({ learningEnabled: body.enabled });
  } catch (error) {
    return handleError(error);
  }
};

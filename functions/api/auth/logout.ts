import { clearSessionCookie, requireSession } from '../../_lib/auth';
import { handleError, json, requireSameOrigin } from '../../_lib/http';
import type { AppPagesFunction } from '../../_lib/types';

export const onRequestPost: AppPagesFunction = async ({ request, env }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    const session = await requireSession(request, env);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(session.tokenHash).run();
    return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
  } catch (error) {
    return handleError(error);
  }
};

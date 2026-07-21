import { clearSessionCookie, getSubscription, requireSession } from '../_lib/auth';
import { handleError, HttpError, json, readJson, requireSameOrigin } from '../_lib/http';
import type { AppPagesFunction } from '../_lib/types';

export const onRequestDelete: AppPagesFunction = async ({ request, env }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    const session = await requireSession(request, env);
    const body = await readJson<{ confirm?: string }>(request);
    if (body.confirm !== 'DELETE') throw new HttpError(400, 'Account deletion was not confirmed.');
    const subscription = await getSubscription(session.user.id, env);
    if (subscription.active) {
      throw new HttpError(409, 'Cancel the active subscription in Billing before deleting the account.');
    }
    await env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(session.user.id).run();
    return json({ deleted: true }, 200, { 'Set-Cookie': clearSessionCookie() });
  } catch (error) {
    return handleError(error);
  }
};

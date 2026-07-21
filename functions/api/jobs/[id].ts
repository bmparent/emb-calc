import { requireSession } from '../../_lib/auth';
import { handleError, HttpError, json, requireSameOrigin } from '../../_lib/http';
import type { AppPagesFunction } from '../../_lib/types';

export const onRequestDelete: AppPagesFunction = async ({ request, env, params }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    const session = await requireSession(request, env);
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id || id.length > 80) throw new HttpError(400, 'Enter a valid saved-job ID.');
    await env.DB.prepare('DELETE FROM saved_jobs WHERE id = ?1 AND user_id = ?2').bind(id, session.user.id).run();
    return json({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
};

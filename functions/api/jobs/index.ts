import { requireActiveSubscription, requireSession } from '../../_lib/auth';
import { handleError, HttpError, json, readJson, requireSameOrigin } from '../../_lib/http';
import type { AppPagesFunction } from '../../_lib/types';

interface SavedJobBody {
  label?: unknown;
  printavoOrderId?: unknown;
  printavoVisualId?: unknown;
  snapshot?: unknown;
}

export const onRequestGet: AppPagesFunction = async ({ request, env }) => {
  try {
    const session = await requireSession(request, env);
    await requireActiveSubscription(session.user, env);
    const rows = await env.DB.prepare(`
      SELECT id, printavo_order_id, printavo_visual_id, snapshot_json, created_at, updated_at
      FROM saved_jobs WHERE user_id = ?1 ORDER BY updated_at DESC LIMIT 50
    `).bind(session.user.id).all<{
      id: string;
      printavo_order_id: string | null;
      printavo_visual_id: string | null;
      snapshot_json: string;
      created_at: string;
      updated_at: string;
    }>();
    return json({ jobs: rows.results.map((row) => ({
      id: row.id,
      printavoOrderId: row.printavo_order_id,
      printavoVisualId: row.printavo_visual_id,
      snapshot: JSON.parse(row.snapshot_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) });
  } catch (error) {
    return handleError(error);
  }
};

export const onRequestPost: AppPagesFunction = async ({ request, env }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    const session = await requireSession(request, env);
    await requireActiveSubscription(session.user, env);
    const body = await readJson<SavedJobBody>(request, 80_000);
    if (!body.snapshot || typeof body.snapshot !== 'object' || Array.isArray(body.snapshot)) {
      throw new HttpError(400, 'The saved job is incomplete.');
    }
    const snapshot = JSON.stringify(body.snapshot);
    if (new TextEncoder().encode(snapshot).byteLength > 64_000) throw new HttpError(413, 'The saved job is too large.');
    const printavoOrderId = typeof body.printavoOrderId === 'string' ? body.printavoOrderId.slice(0, 256) : null;
    const printavoVisualId = typeof body.printavoVisualId === 'string' ? body.printavoVisualId.slice(0, 100) : null;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO saved_jobs (
        id, user_id, printavo_order_id, printavo_visual_id, snapshot_json, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
    `).bind(id, session.user.id, printavoOrderId, printavoVisualId, snapshot, now).run();
    return json({ id, createdAt: now }, 201);
  } catch (error) {
    return handleError(error);
  }
};

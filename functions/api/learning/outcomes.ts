import { requireActiveSubscription, requireSession } from '../../_lib/auth';
import { handleError, HttpError, json, readJson, requireSameOrigin } from '../../_lib/http';
import type { AppPagesFunction } from '../../_lib/types';

interface OutcomeBody {
  clientEventId?: unknown;
  source?: unknown;
  model?: unknown;
  garmentType?: unknown;
  quantity?: unknown;
  locationCount?: unknown;
  heads?: unknown;
  rpm?: unknown;
  predictedMinutes?: unknown;
  actualMinutes?: unknown;
  stitches?: unknown;
  colors?: unknown;
  trims?: unknown;
}

const finiteNumber = (value: unknown, minimum: number, maximum: number, label: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new HttpError(400, `${label} is outside the supported range.`);
  }
  return value;
};

export const onRequestPost: AppPagesFunction = async ({ request, env }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    const session = await requireSession(request, env);
    await requireActiveSubscription(session.user, env);
    if (!session.user.learningEnabled) throw new HttpError(403, 'Enable personal learning before logging outcomes.');
    const body = await readJson<OutcomeBody>(request);
    const clientEventId = typeof body.clientEventId === 'string' ? body.clientEventId : '';
    const source = body.source === 'printavo' ? 'printavo' : 'manual';
    const model = body.model === 'verified' ? 'verified' : body.model === 'batch-aware' ? 'batch-aware' : '';
    const garmentType = typeof body.garmentType === 'string' ? body.garmentType.slice(0, 40) : '';
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(clientEventId) || !model || !garmentType) {
      throw new HttpError(400, 'The learning outcome is incomplete.');
    }
    const values = {
      quantity: Math.round(finiteNumber(body.quantity, 1, 1_000_000, 'Quantity')),
      locationCount: Math.round(finiteNumber(body.locationCount, 1, 100, 'Location count')),
      heads: Math.round(finiteNumber(body.heads, 1, 100, 'Head count')),
      rpm: finiteNumber(body.rpm, 50, 2_000, 'RPM'),
      predictedMinutes: finiteNumber(body.predictedMinutes, 0.1, 100_000, 'Predicted time'),
      actualMinutes: finiteNumber(body.actualMinutes, 0.1, 100_000, 'Actual time'),
      stitches: Math.round(finiteNumber(body.stitches, 0, 100_000_000, 'Stitches')),
      colors: Math.round(finiteNumber(body.colors, 0, 1_000, 'Colors')),
      trims: Math.round(finiteNumber(body.trims, 0, 100_000, 'Trims')),
    };
    await env.DB.prepare(`
      INSERT OR IGNORE INTO learning_outcomes (
        id, user_id, client_event_id, source, model, garment_type, quantity, location_count,
        heads, rpm, predicted_minutes, actual_minutes, stitches, colors, trims, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
    `).bind(
      crypto.randomUUID(), session.user.id, clientEventId, source, model, garmentType,
      values.quantity, values.locationCount, values.heads, values.rpm, values.predictedMinutes,
      values.actualMinutes, values.stitches, values.colors, values.trims, new Date().toISOString(),
    ).run();
    return json({ saved: true });
  } catch (error) {
    return handleError(error);
  }
};

export const onRequestDelete: AppPagesFunction = async ({ request, env }) => {
  try {
    requireSameOrigin(request, new URL(request.url).origin);
    const session = await requireSession(request, env);
    await env.DB.prepare('DELETE FROM learning_outcomes WHERE user_id = ?1').bind(session.user.id).run();
    return json({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
};

import { requireActiveSubscription, requireSession } from '../../_lib/auth';
import { handleError, HttpError, json } from '../../_lib/http';
import type { AppPagesFunction } from '../../_lib/types';
import { buildLearningSuggestion, type LearningOutcome } from '../../../shared/adaptiveLearning';

export const onRequestGet: AppPagesFunction = async ({ request, env }) => {
  try {
    const session = await requireSession(request, env);
    await requireActiveSubscription(session.user, env);
    if (!session.user.learningEnabled) throw new HttpError(403, 'Personal learning is not enabled.');
    const url = new URL(request.url);
    const predictedMinutes = Number(url.searchParams.get('predictedMinutes'));
    const garmentType = (url.searchParams.get('garmentType') ?? '').slice(0, 40);
    if (!Number.isFinite(predictedMinutes) || predictedMinutes <= 0 || predictedMinutes > 100_000 || !garmentType) {
      throw new HttpError(400, 'A valid estimate and garment type are required.');
    }
    const rows = await env.DB.prepare(`
      SELECT predicted_minutes, actual_minutes, garment_type, created_at
      FROM learning_outcomes WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 100
    `).bind(session.user.id).all<{
      predicted_minutes: number;
      actual_minutes: number;
      garment_type: string;
      created_at: string;
    }>();
    const outcomes: LearningOutcome[] = rows.results.map((row) => ({
      predictedMinutes: row.predicted_minutes,
      actualMinutes: row.actual_minutes,
      garmentType: row.garment_type,
      createdAt: row.created_at,
    }));
    return json({ suggestion: buildLearningSuggestion(outcomes, predictedMinutes, garmentType) });
  } catch (error) {
    return handleError(error);
  }
};

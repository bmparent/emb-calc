import { getSession, getSubscription } from '../../_lib/auth';
import { handleError, json } from '../../_lib/http';
import type { AppPagesFunction } from '../../_lib/types';

export const onRequestGet: AppPagesFunction = async ({ request, env }) => {
  try {
    if (!env.DB) return json({ configured: false, signedIn: false }, 503);
    const session = await getSession(request, env);
    if (!session) return json({ configured: true, signedIn: false });
    const [subscription, connection] = await Promise.all([
      getSubscription(session.user.id, env),
      env.DB.prepare(`
        SELECT connected_at, verified_at, renewal_reminder_at
        FROM printavo_connections WHERE user_id = ?1
      `).bind(session.user.id).first<{
        connected_at: string;
        verified_at: string;
        renewal_reminder_at: string;
      }>(),
    ]);
    return json({
      configured: true,
      signedIn: true,
      user: { email: session.user.email, learningEnabled: session.user.learningEnabled },
      subscription: {
        active: subscription.active,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      printavo: connection ? {
        connected: true,
        connectedAt: connection.connected_at,
        verifiedAt: connection.verified_at,
        renewalReminderAt: connection.renewal_reminder_at,
      } : { connected: false },
    });
  } catch (error) {
    return handleError(error);
  }
};

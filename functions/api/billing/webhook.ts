import { handleError, HttpError, json } from '../../_lib/http';
import { stripeRequest, unixToIso, verifyStripeSignature } from '../../_lib/stripe';
import type { AppPagesFunction, Env } from '../../_lib/types';

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

interface StripeSubscription extends Record<string, unknown> {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number;
  metadata?: { user_id?: string };
}

const upsertSubscription = async (env: Env, subscription: StripeSubscription, fallbackUserId?: string) => {
  const userId = subscription.metadata?.user_id || fallbackUserId || await env.DB.prepare(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = ?1',
  ).bind(subscription.customer).first<string>('user_id');
  if (!userId) throw new Error('Stripe subscription could not be mapped to an EmbroideryCalc user.');
  await env.DB.prepare(`
    INSERT INTO subscriptions (
      user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    ON CONFLICT(user_id) DO UPDATE SET
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      updated_at = excluded.updated_at
  `).bind(
    userId,
    subscription.customer,
    subscription.id,
    subscription.status,
    unixToIso(subscription.current_period_end),
    new Date().toISOString(),
  ).run();
};

export const onRequestPost: AppPagesFunction = async ({ request, env }) => {
  try {
    if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) throw new HttpError(503, 'Stripe webhook is not configured.');
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature') ?? '';
    if (!await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)) {
      throw new HttpError(400, 'Invalid Stripe signature.');
    }
    const event = JSON.parse(rawBody) as StripeEvent;
    const alreadyProcessed = await env.DB.prepare(
      'SELECT event_id FROM processed_webhooks WHERE event_id = ?1',
    ).bind(event.id).first();
    if (alreadyProcessed) return json({ received: true });

    if (event.type.startsWith('customer.subscription.')) {
      await upsertSubscription(env, event.data.object as StripeSubscription);
    } else if (event.type === 'checkout.session.completed') {
      const object = event.data.object;
      const subscriptionId = typeof object.subscription === 'string' ? object.subscription : '';
      const fallbackUserId = typeof object.client_reference_id === 'string'
        ? object.client_reference_id
        : (object.metadata as { user_id?: string } | undefined)?.user_id;
      if (subscriptionId) {
        const subscription = await stripeRequest<StripeSubscription>(
          env.STRIPE_SECRET_KEY,
          `/subscriptions/${encodeURIComponent(subscriptionId)}`,
          undefined,
          'GET',
        );
        await upsertSubscription(env, subscription, fallbackUserId);
      }
    }

    await env.DB.prepare(
      'INSERT INTO processed_webhooks (event_id, processed_at) VALUES (?1, ?2)',
    ).bind(event.id, new Date().toISOString()).run();
    return json({ received: true });
  } catch (error) {
    return handleError(error);
  }
};

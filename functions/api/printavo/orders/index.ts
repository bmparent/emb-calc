import { requireActiveSubscription, requireSession } from '../../../_lib/auth';
import { handleError, json } from '../../../_lib/http';
import { getPrintavoCredentials, printavoRequest } from '../../../_lib/printavo';
import type { AppPagesFunction } from '../../../_lib/types';

interface OrderNode {
  __typename: 'Invoice' | 'Quote';
  id: string;
  visualId?: string | null;
  nickname?: string | null;
  totalQuantity?: number | null;
  dueAt?: string | null;
  status?: { name?: string | null } | null;
}

const ORDERS_QUERY = `
  query SearchOrders($query: String, $first: Int!) {
    orders(query: $query, first: $first) {
      nodes {
        __typename
        ... on Invoice {
          id visualId nickname totalQuantity dueAt status { name }
        }
        ... on Quote {
          id visualId nickname totalQuantity dueAt status { name }
        }
      }
    }
  }
`;

export const onRequestGet: AppPagesFunction = async ({ request, env }) => {
  try {
    const session = await requireSession(request, env);
    await requireActiveSubscription(session.user, env);
    const credentials = await getPrintavoCredentials(session.user.id, env);
    const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 100) || undefined;
    const data = await printavoRequest<{ orders: { nodes: OrderNode[] } }>(credentials, ORDERS_QUERY, {
      query,
      first: 20,
    });
    return json({
      orders: data.orders.nodes.map((order) => ({
        type: order.__typename,
        id: order.id,
        visualId: order.visualId ?? order.id,
        nickname: order.nickname ?? '',
        quantity: order.totalQuantity ?? 0,
        dueAt: order.dueAt ?? null,
        status: order.status?.name ?? '',
      })),
    });
  } catch (error) {
    return handleError(error);
  }
};

import type { OrderStatus } from '@/types';

export const ORDER_STATUSES = [
  'draft',
  'pending',
  'confirmed',
  'cancelled',
] as const satisfies readonly OrderStatus[];

export interface OrderInput {
  contact_id?: string | null;
  order_number?: string | null;
  title?: string | null;
  items_note?: string | null;
  total?: number | string | null;
  currency?: string | null;
  status?: string | null;
  notes?: string | null;
}

export interface NormalizedOrderInput {
  contact_id: string | null;
  order_number: string | null;
  title: string;
  items_note: string | null;
  total: number;
  currency: string;
  status: OrderStatus;
  notes: string | null;
}

export class OrderValidationError extends Error {
  readonly status = 400 as const;
  constructor(message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === 'string' &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

export function normalizeOrderInput(
  input: OrderInput,
  fallbackCurrency = 'USD',
): NormalizedOrderInput {
  const title = input.title?.trim() ?? '';
  if (!title) throw new OrderValidationError('Order title is required');

  const rawTotal = input.total ?? 0;
  const total =
    typeof rawTotal === 'number' ? rawTotal : Number.parseFloat(String(rawTotal));
  if (!Number.isFinite(total) || total < 0) {
    throw new OrderValidationError('Order total must be a non-negative number');
  }

  const currency = (input.currency?.trim() || fallbackCurrency).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new OrderValidationError('Currency must be a 3-letter code');
  }

  const status = input.status ?? 'draft';
  if (!isOrderStatus(status)) {
    throw new OrderValidationError('Invalid order status');
  }

  return {
    contact_id: input.contact_id?.trim() || null,
    order_number: input.order_number?.trim() || null,
    title,
    items_note: input.items_note?.trim() || null,
    total,
    currency,
    status,
    notes: input.notes?.trim() || null,
  };
}

export function buildOrderConfirmationPatch(userId: string) {
  return {
    status: 'confirmed' as const,
    confirmed_at: new Date().toISOString(),
    confirmed_by_user_id: userId,
  };
}

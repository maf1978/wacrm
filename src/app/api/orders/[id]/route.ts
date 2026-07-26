import { NextResponse } from 'next/server';

import { requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  buildOrderConfirmationPatch,
  isOrderStatus,
  normalizeOrderInput,
  OrderValidationError,
} from '@/lib/orders/validation';

const orderSelect = `
  *,
  contact:contacts(id, name, phone, email)
`;

type Params = { id: string };

export async function PATCH(
  request: Request,
  context: { params: Promise<Params> },
) {
  try {
    const ctx = await requireRole('agent');
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const action = 'action' in body ? body.action : null;
    let patch: object;

    if (action === 'confirm') {
      patch = buildOrderConfirmationPatch(ctx.userId);
    } else if (action === 'set_status') {
      const status = 'status' in body ? body.status : null;
      if (!isOrderStatus(status)) {
        return NextResponse.json(
          { error: 'Invalid order status' },
          { status: 400 },
        );
      }
      patch = {
        status,
        confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
        confirmed_by_user_id: status === 'confirmed' ? ctx.userId : null,
      };
    } else {
      const normalized = normalizeOrderInput(body);
      patch = normalized;
    }

    const { data, error } = await ctx.supabase
      .from('orders')
      .update(patch)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select(orderSelect)
      .single();

    if (error) {
      const duplicate = error.code === '23505';
      return NextResponse.json(
        {
          error: duplicate
            ? 'Order number already exists for this account'
            : 'Failed to update order',
        },
        { status: duplicate ? 409 : 500 },
      );
    }

    return NextResponse.json({ order: data });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<Params> },
) {
  try {
    const ctx = await requireRole('agent');
    const { id } = await context.params;

    const { error } = await ctx.supabase
      .from('orders')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId);

    if (error) {
      console.error('[DELETE /api/orders/[id]] delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete order' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

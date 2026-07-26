import { NextResponse } from 'next/server';

import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account';
import {
  normalizeOrderInput,
  OrderValidationError,
} from '@/lib/orders/validation';

const orderSelect = `
  *,
  contact:contacts(id, name, phone, email)
`;

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search')?.trim();

    let query = ctx.supabase
      .from('orders')
      .select(orderSelect)
      .eq('account_id', ctx.accountId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (search) {
      const pattern = `%${search.replace(/[%_]/g, '\\$&')}%`;
      query = query.or(
        `title.ilike.${pattern},order_number.ilike.${pattern},items_note.ilike.${pattern},notes.ilike.${pattern}`,
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error('[GET /api/orders] query error:', error);
      return NextResponse.json(
        { error: 'Failed to load orders' },
        { status: 500 },
      );
    }
    return NextResponse.json({ orders: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const order = normalizeOrderInput(body);
    if (order.contact_id) {
      const { data: contact } = await ctx.supabase
        .from('contacts')
        .select('id')
        .eq('id', order.contact_id)
        .eq('account_id', ctx.accountId)
        .maybeSingle();
      if (!contact) {
        return NextResponse.json(
          { error: 'Contact not found' },
          { status: 400 },
        );
      }
    }

    const { data, error } = await ctx.supabase
      .from('orders')
      .insert({
        ...order,
        account_id: ctx.accountId,
        user_id: ctx.userId,
      })
      .select(orderSelect)
      .single();

    if (error) {
      const duplicate = error.code === '23505';
      return NextResponse.json(
        {
          error: duplicate
            ? 'Order number already exists for this account'
            : 'Failed to create order',
        },
        { status: duplicate ? 409 : 500 },
      );
    }

    return NextResponse.json({ order: data }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return toErrorResponse(err);
  }
}

import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

const ROOM_COLORS = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('admin');
    const { id } = await params;
    const body = await request.json();
    const admin = supabaseAdmin();

    const { data: current } = await admin
      .from('clinic_rooms')
      .select('id, name')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle();
    if (!current)
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if ('name' in body) {
      const name = String(body.name ?? '').trim();
      if (!name)
        return NextResponse.json(
          { error: 'A room name is required.' },
          { status: 400 }
        );
      update.name = name;
    }
    if ('color' in body && ROOM_COLORS.includes(body.color))
      update.color = body.color;
    if ('sort_order' in body && Number.isInteger(body.sort_order))
      update.sort_order = body.sort_order;
    if ('is_active' in body) update.is_active = body.is_active === true;

    const { data, error } = await admin
      .from('clinic_rooms')
      .update(update)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select()
      .maybeSingle();
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A room with that name already exists.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data)
      return NextResponse.json(
        { error: 'Room changed; refresh and retry.' },
        { status: 409 }
      );
    return NextResponse.json({ room: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('admin');
    const { id } = await params;
    const { data, error } = await supabaseAdmin()
      .from('clinic_rooms')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select('id')
      .maybeSingle();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data)
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    // Deleting a room nulls `room_id` on its appointments (FK SET NULL),
    // so they move to the "Unassigned" bucket rather than disappearing.
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

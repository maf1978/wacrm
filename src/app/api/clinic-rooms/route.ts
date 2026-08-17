import { NextResponse } from 'next/server';
import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

const ROOM_COLORS = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const { data, error } = await ctx.supabase
      .from('clinic_rooms')
      .select('*')
      .eq('account_id', ctx.accountId)
      .order('sort_order')
      .order('name');
    if (error) throw error;
    return NextResponse.json({ rooms: data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (!name) {
      return NextResponse.json(
        { error: 'A room name is required.' },
        { status: 400 }
      );
    }
    const color = ROOM_COLORS.includes(body.color)
      ? body.color
      : ROOM_COLORS[0];
    const { data: existing } = await supabaseAdmin()
      .from('clinic_rooms')
      .select('id')
      .eq('account_id', ctx.accountId)
      .eq('name', name)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: 'A room with that name already exists.' },
        { status: 409 }
      );
    }
    const { count } = await supabaseAdmin()
      .from('clinic_rooms')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', ctx.accountId);
    const { data, error } = await supabaseAdmin()
      .from('clinic_rooms')
      .insert({
        account_id: ctx.accountId,
        name,
        color,
        sort_order: (count ?? 0) + 1,
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A room with that name already exists.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ room: data }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from 'next/server';
import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const { data, error } = await ctx.supabase
      .from('appointment_services')
      .select('*')
      .eq('account_id', ctx.accountId)
      .order('name');
    if (error) throw error;
    return NextResponse.json({ services: data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = await request.json();
    const duration = Number(body.duration_minutes);
    if (!String(body.name ?? '').trim() || duration < 5 || duration > 1440) {
      return NextResponse.json(
        {
          error: 'A name and duration between 5 and 1440 minutes are required.',
        },
        { status: 400 }
      );
    }
    const { data, error } = await supabaseAdmin()
      .from('appointment_services')
      .insert({
        account_id: ctx.accountId,
        name: String(body.name).trim(),
        description: body.description || null,
        duration_minutes: duration,
        buffer_before_minutes: Number(body.buffer_before_minutes ?? 0),
        buffer_after_minutes: Number(body.buffer_after_minutes ?? 0),
        is_active: body.is_active !== false,
      })
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ service: data }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

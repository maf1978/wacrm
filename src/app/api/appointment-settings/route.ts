import { NextResponse } from 'next/server';
import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { isValidTimeZone } from '@/lib/appointments/validation';

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const { data, error } = await ctx.supabase
      .from('accounts')
      .select('scheduling_timezone')
      .eq('id', ctx.accountId)
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ timezone: data.scheduling_timezone });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const { timezone } = await request.json();
    if (!isValidTimeZone(timezone)) {
      return NextResponse.json(
        { error: 'Invalid IANA timezone' },
        { status: 400 }
      );
    }
    const { error } = await supabaseAdmin()
      .from('accounts')
      .update({ scheduling_timezone: timezone })
      .eq('id', ctx.accountId);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ timezone });
  } catch (error) {
    return toErrorResponse(error);
  }
}

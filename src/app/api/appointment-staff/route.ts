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
      .from('staff_scheduling_profiles')
      .select('*')
      .eq('account_id', ctx.accountId)
      .order('created_at');
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    const userIds = (data ?? []).map((row) => row.user_id);
    const { data: profiles } = userIds.length
      ? await ctx.supabase
          .from('profiles')
          .select('user_id,full_name,avatar_url')
          .eq('account_id', ctx.accountId)
          .in('user_id', userIds)
      : { data: [] };
    const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    return NextResponse.json({
      staff: (data ?? []).map((row) => ({
        ...row,
        profile: byUser.get(row.user_id),
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = await request.json();
    const timezone = String(body.timezone ?? 'America/New_York');
    if (!body.user_id || !isValidTimeZone(timezone)) {
      return NextResponse.json(
        { error: 'Valid user_id and timezone required' },
        { status: 400 }
      );
    }
    const admin = supabaseAdmin();
    const { data: member } = await admin
      .from('profiles')
      .select('user_id')
      .eq('account_id', ctx.accountId)
      .eq('user_id', body.user_id)
      .maybeSingle();
    if (!member)
      return NextResponse.json(
        { error: 'User is not an account member' },
        { status: 400 }
      );
    const { data, error } = await admin
      .from('staff_scheduling_profiles')
      .upsert(
        {
          account_id: ctx.accountId,
          user_id: body.user_id,
          timezone,
          is_bookable: body.is_bookable !== false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id,user_id' }
      )
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ staff: data }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';
import { calculateSlots } from '@/lib/appointments/slots';
import {
  localClock,
  localDateParts,
  zonedDateTimeToUtc,
} from '@/lib/appointments/time';
import { isValidTimeZone } from '@/lib/appointments/validation';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const params = new URL(request.url).searchParams;
    const date = params.get('date') ?? '';
    const serviceId = params.get('service_id') ?? '';
    const requestedStaff = params.get('staff_profile_id');
    const timezone = params.get('timezone') ?? 'America/New_York';
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !serviceId ||
      !isValidTimeZone(timezone)
    ) {
      return NextResponse.json(
        { error: 'Valid date, service_id, and timezone required' },
        { status: 400 }
      );
    }
    const { data: service } = await ctx.supabase
      .from('appointment_services')
      .select('*')
      .eq('id', serviceId)
      .eq('account_id', ctx.accountId)
      .eq('is_active', true)
      .maybeSingle();
    if (!service)
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    let staffQuery = ctx.supabase
      .from('staff_scheduling_profiles')
      .select('*')
      .eq('account_id', ctx.accountId)
      .eq('is_bookable', true);
    if (requestedStaff) staffQuery = staffQuery.eq('id', requestedStaff);
    const { data: staffRows } = await staffQuery;
    const result = [];
    for (const staff of staffRows ?? []) {
      const dayStart = zonedDateTimeToUtc(date, '00:00', timezone);
      const dayEnd = zonedDateTimeToUtc(date, '23:59', timezone);
      const weekday = localDateParts(dayStart, timezone).weekday;
      const [{ data: rules }, { data: busy }, { data: exceptions }] =
        await Promise.all([
          ctx.supabase
            .from('staff_availability_rules')
            .select('start_time,end_time')
            .eq('staff_profile_id', staff.id)
            .eq('weekday', weekday),
          ctx.supabase
            .from('appointments')
            .select('starts_at,ends_at')
            .eq('staff_profile_id', staff.id)
            .in('status', ['pending', 'confirmed'])
            .lt('starts_at', dayEnd.toISOString())
            .gt('ends_at', dayStart.toISOString()),
          ctx.supabase
            .from('staff_availability_exceptions')
            .select('starts_at,ends_at,is_available')
            .eq('staff_profile_id', staff.id)
            .lt('starts_at', dayEnd.toISOString())
            .gt('ends_at', dayStart.toISOString()),
        ]);
      const blocked = [
        ...(busy ?? []),
        ...(exceptions ?? []).filter((e) => !e.is_available),
      ];
      const extraWindows = (exceptions ?? [])
        .filter((exception) => exception.is_available)
        .map((exception) => ({
          start_time: localClock(
            exception.starts_at,
            staff.timezone || timezone
          ),
          end_time: localClock(exception.ends_at, staff.timezone || timezone),
        }));
      const slots = calculateSlots({
        date,
        timezone: staff.timezone || timezone,
        windows: [...(rules ?? []), ...extraWindows],
        busy: blocked,
        durationMinutes: service.duration_minutes,
        bufferBeforeMinutes: service.buffer_before_minutes,
        bufferAfterMinutes: service.buffer_after_minutes,
      });
      for (const slot of slots)
        result.push({ ...slot, staff_profile_id: staff.id });
    }
    result.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return NextResponse.json({ slots: result });
  } catch (error) {
    return toErrorResponse(error);
  }
}

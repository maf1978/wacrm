'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { DoorOpen } from 'lucide-react';
import type { Appointment, ClinicRoom } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Rooms occupancy board — the dental clinic's at-a-glance view.
 *
 * A single-day timeline with one column per physical room. Each
 * appointment renders as a positioned block in its room's column, so
 * staff can see exactly which patient is in which room right now. A
 * red "now" line tracks the current time when viewing today, and
 * appointments without a room (WhatsApp self-bookings) collect in an
 * "Unassigned" column at the end.
 */

const DAY_START_HOUR = 8; // 08:00 — first visible hour
const DAY_END_HOUR = 19; // 19:00 — grid ends here (exclusive)
const HOUR_HEIGHT = 64; // px per hour

const GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;

const statusStyle: Record<Appointment['status'], string> = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  confirmed: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100',
  completed: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
  cancelled: 'border-border bg-muted/60 text-muted-foreground line-through',
  no_show: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
};

interface RoomsViewProps {
  day: Date;
  rooms: ClinicRoom[];
  appointments: Appointment[];
  onSelect: (appointment: Appointment) => void;
}

export function RoomsView({
  day,
  rooms,
  appointments,
  onSelect,
}: RoomsViewProps) {
  const [now, setNow] = useState(() => new Date());

  // Keep the "now" line honest while the board is on screen.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const isToday = isSameDay(day, now);
  const nowTop =
    isToday &&
    now.getHours() >= DAY_START_HOUR &&
    now.getHours() < DAY_END_HOUR
      ? ((now.getHours() - DAY_START_HOUR) * 60 + now.getMinutes()) *
        (HOUR_HEIGHT / 60)
      : null;

  const visibleRooms = useMemo(
    () => rooms.filter((room) => room.is_active),
    [rooms]
  );

  const unassigned = useMemo(
    () =>
      appointments.filter(
        (a) =>
          !a.room_id ||
          !visibleRooms.some((room) => room.id === a.room_id)
      ),
    [appointments, visibleRooms]
  );

  const columns = useMemo(
    () =>
      visibleRooms.map((room) => ({
        room,
        items: appointments.filter((a) => a.room_id === room.id),
      })),
    [visibleRooms, appointments]
  );

  const hourTicks = useMemo(
    () =>
      Array.from(
        { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
        (_, index) => DAY_START_HOUR + index
      ),
    []
  );

  if (!visibleRooms.length) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center text-center">
        <div className="border-primary/20 bg-primary/10 mb-3 flex size-12 items-center justify-center rounded-2xl border">
          <DoorOpen className="text-primary size-5" />
        </div>
        <p className="font-medium">No rooms yet</p>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Add your operatories in Settings → Scheduling and they will
          appear here as columns on the board.
        </p>
      </div>
    );
  }

  const showUnassigned = unassigned.length > 0;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Room headers */}
        <div className="border-border grid border-b" style={{ gridTemplateColumns: `56px repeat(${columns.length + (showUnassigned ? 1 : 0)}, minmax(0, 1fr))` }}>
          <div />
          {columns.map(({ room, items }) => (
            <div
              key={room.id}
              className="flex flex-col items-center gap-1 px-2 py-3"
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: room.color }}
                />
                {room.name}
              </span>
              <span className="text-muted-foreground text-[10px] tracking-widest uppercase">
                {items.filter((a) => a.status !== 'cancelled').length} patient
                {items.filter((a) => a.status !== 'cancelled').length === 1
                  ? ''
                  : 's'}
              </span>
            </div>
          ))}
          {showUnassigned && (
            <div className="flex flex-col items-center gap-1 px-2 py-3">
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm font-semibold">
                <span className="bg-muted-foreground/50 size-2.5 rounded-full" />
                Unassigned
              </span>
              <span className="text-muted-foreground text-[10px] tracking-widest uppercase">
                {unassigned.length} patient
                {unassigned.length === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `56px repeat(${columns.length + (showUnassigned ? 1 : 0)}, minmax(0, 1fr))`, height: GRID_HEIGHT }}
        >
          {/* Hour labels + ticks */}
          <div className="relative" aria-hidden="true">
            {hourTicks.map((hour) => (
              <span
                key={hour}
                className="text-muted-foreground absolute right-2 -translate-y-1/2 text-[10px] tabular-nums"
                style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT }}
              >
                {format(new Date(2000, 0, 1, hour), 'ha')}
              </span>
            ))}
          </div>

          {/* Room columns */}
          {columns.map(({ room, items }) => (
            <div
              key={room.id}
              className="border-border relative border-l"
              style={{ backgroundColor: `${room.color}08` }}
            >
              {/* Half-hour ticks */}
              {hourTicks.map((hour) => (
                <div
                  key={hour}
                  className="border-border/60 pointer-events-none absolute inset-x-0 border-t"
                  style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT }}
                />
              ))}
              {items.map((appointment) => (
                <RoomBlock
                  key={appointment.id}
                  appointment={appointment}
                  onClick={() => onSelect(appointment)}
                />
              ))}
            </div>
          ))}

          {/* Unassigned column */}
          {showUnassigned && (
            <div className="border-border relative border-l">
              {hourTicks.map((hour) => (
                <div
                  key={hour}
                  className="border-border/60 pointer-events-none absolute inset-x-0 border-t"
                  style={{ top: (hour - DAY_START_HOUR) * HOUR_HEIGHT }}
                />
              ))}
              {unassigned.map((appointment) => (
                <RoomBlock
                  key={appointment.id}
                  appointment={appointment}
                  onClick={() => onSelect(appointment)}
                />
              ))}
            </div>
          )}

          {/* Now line */}
          {nowTop !== null && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10"
              style={{ top: nowTop }}
            >
              <div className="border-rose-500 relative border-t-2">
                <span className="bg-rose-500 absolute -left-1 -top-[3px] size-1.5 rounded-full" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RoomBlock({
  appointment,
  onClick,
}: {
  appointment: Appointment;
  onClick: () => void;
}) {
  const start = new Date(appointment.starts_at);
  const end = new Date(appointment.ends_at);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const durationMinutes = Math.max(
    (end.getTime() - start.getTime()) / 60_000,
    15
  );

  let top = ((startMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT;
  let height = (durationMinutes / 60) * HOUR_HEIGHT;

  // Clamp to the visible grid so early/late appointments still peek in.
  if (top < 0) {
    height = Math.max(height + top, 18);
    top = 0;
  }
  if (top + height > GRID_HEIGHT) height = Math.max(GRID_HEIGHT - top, 18);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-0.5 text-left transition hover:-translate-y-px hover:shadow-md',
        statusStyle[appointment.status]
      )}
      style={{ top, height }}
    >
      <span className="block text-[10px] font-semibold tabular-nums">
        {format(start, 'h:mm')}–{format(end, 'h:mm a')}
      </span>
      <span className="block truncate text-[11px] font-medium">
        {appointment.contact?.name || appointment.contact?.phone}
      </span>
      <span className="block truncate text-[10px] opacity-80">
        {appointment.service?.name}
      </span>
    </button>
  );
}

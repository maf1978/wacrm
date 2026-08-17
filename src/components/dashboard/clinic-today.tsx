'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { addDays, format, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  DoorOpen,
  UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appointment, ClinicRoom } from '@/types';

/**
 * "Hoy en la clínica" — the GutiDental daily-operations panel shown at
 * the top of the Dashboard:
 *
 *   1. Citas de hoy      — count + today's appointments
 *   2. Salas ahora       — which patient is in each room right now
 *   3. Próximas citas    — the next five upcoming appointments
 *
 * Fetches appointments (today + 14 days) and rooms, and refreshes
 * every minute so the "now" occupancy stays honest.
 */

const DAY_START = 8; // 08:00 — first visible hour (matches Rooms board)

export function ClinicToday() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const today = new Date();
      const from = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        DAY_START - 1
      );
      const to = addDays(from, 14);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const [apptRes, roomRes] = await Promise.all([
        fetch(`/api/appointments?${params}`),
        fetch('/api/clinic-rooms'),
      ]);
      const [apptJson, roomJson] = await Promise.all([
        apptRes.json(),
        roomRes.json(),
      ]);
      if (!apptRes.ok) throw new Error(apptJson.error);
      setAppointments(apptJson.appointments ?? []);
      setRooms(roomJson.rooms ?? []);
    } catch (error) {
      console.error('[clinic-today] failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const now = new Date();
  const activeRooms = rooms.filter((room) => room.is_active);
  const todayItems = appointments.filter(
    (a) => isSameDay(new Date(a.starts_at), now) && a.status !== 'cancelled'
  );
  const upcoming = appointments
    .filter((a) => new Date(a.starts_at) >= now && a.status !== 'cancelled')
    .slice(0, 5);

  const patientInRoom = (roomId: string): Appointment | undefined =>
    appointments.find(
      (a) =>
        a.room_id === roomId &&
        a.status !== 'cancelled' &&
        isWithinInterval(now, {
          start: new Date(a.starts_at),
          end: new Date(a.ends_at),
        })
    );

  if (loading) {
    return (
      <section className="border-border bg-card space-y-4 rounded-xl border p-5">
        <div className="bg-muted/60 h-5 w-44 animate-pulse rounded" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-muted/40 h-40 animate-pulse rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="border-border bg-card overflow-hidden rounded-xl border shadow-[0_18px_60px_-36px_rgba(0,0,0,.85)]">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <div className="border-primary/20 bg-primary/5 text-primary mb-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.2em] uppercase">
            <CalendarDays className="size-3" />
            Hoy en la clínica
          </div>
          <h2 className="text-foreground text-lg font-bold tracking-tight">
            {format(now, 'EEEE, d MMMM', { locale: es })}
          </h2>
        </div>
        <Link
          href="/appointments"
          className="text-primary hover:text-primary/80 flex items-center gap-1.5 text-sm font-semibold"
        >
          Ver calendario completo
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {/* Citas de hoy */}
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock3 className="text-primary size-4" />
            Citas de hoy
            <span className="text-primary bg-primary/10 ml-auto rounded-full px-2 py-0.5 text-xs font-bold">
              {todayItems.length}
            </span>
          </div>
          {todayItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin citas por ahora.</p>
          ) : (
            <ul className="space-y-2">
              {todayItems.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-14 shrink-0 tabular-nums">
                    {format(new Date(a.starts_at), 'h:mm a')}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {a.contact?.name || a.contact?.phone}
                  </span>
                  <span className="text-muted-foreground max-w-28 truncate text-xs">
                    {a.service?.name}
                  </span>
                </li>
              ))}
              {todayItems.length > 6 && (
                <li className="text-muted-foreground pt-1 text-xs">
                  +{todayItems.length - 6} más
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Salas ahora */}
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <DoorOpen className="text-primary size-4" />
            Salas ahora
          </div>
          {activeRooms.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sin salas configuradas.
            </p>
          ) : (
            <ul className="space-y-2">
              {activeRooms.map((room) => {
                const patient = patientInRoom(room.id);
                return (
                  <li
                    key={room.id}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-3 py-2',
                      patient
                        ? 'border-border bg-muted/40'
                        : 'border-dashed border-border/60'
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: room.color }}
                    />
                    <span className="text-sm font-semibold">{room.name}</span>
                    {patient ? (
                      <span className="text-muted-foreground ml-auto flex min-w-0 items-center gap-1.5 text-xs">
                        <UsersRound className="text-primary size-3.5 shrink-0" />
                        <span className="truncate font-medium text-foreground">
                          {patient.contact?.name || patient.contact?.phone}
                        </span>
                        <span className="tabular-nums">
                          · hasta {format(new Date(patient.ends_at), 'h:mm a')}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground ml-auto text-xs">
                        Libre
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Próximas citas */}
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="text-primary size-4" />
            Próximas citas
          </div>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nada agendado en los próximos días.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-20 shrink-0 text-xs tabular-nums">
                    {format(new Date(a.starts_at), 'EEE d, h:mm a', {
                      locale: es,
                    })}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {a.contact?.name || a.contact?.phone}
                  </span>
                  <span className="text-muted-foreground max-w-24 truncate text-xs">
                    {a.service?.name}
                  </span>
                  {a.room && (
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: a.room.color }}
                      title={a.room.name}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

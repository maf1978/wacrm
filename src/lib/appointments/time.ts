/** Convert a wall-clock time in an IANA timezone to UTC.
 * The second pass corrects offsets around DST boundaries. */
export function zonedDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string
): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(guess));
    const value = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const rendered = Date.UTC(
      Number(value.year),
      Number(value.month) - 1,
      Number(value.day),
      Number(value.hour),
      Number(value.minute)
    );
    guess += target - rendered;
  }
  return new Date(guess);
}

export function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
      p.weekday
    ),
  };
}

export function formatAppointmentTime(date: string, timeZone: string) {
  const value = new Date(date);
  return {
    localDate: new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(value),
    localTime: new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(value),
  };
}

export function localClock(date: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(date));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
  return `${values.hour}:${values.minute}`;
}

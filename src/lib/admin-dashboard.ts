export type DoctorLeave = { date: string; reason?: string | null };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function utcDate(value: string) {
  if (!DATE_PATTERN.test(value)) throw new Error("Use a valid leave date");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Use a valid leave date");
  }
  return date;
}

export function enumerateLeaveDates(start: string, end: string) {
  const first = utcDate(start);
  const last = utcDate(end);
  if (last < first) throw new Error("Leave end date must be on or after the start date");

  const dates: string[] = [];
  for (const cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(cursor.toISOString().slice(0, 10));
    if (dates.length > 31) throw new Error("Leave ranges can be up to 31 days");
  }
  return dates;
}

export function sortDoctorLeaves<T extends DoctorLeave>(leaves: T[]) {
  return [...leaves].sort((left, right) => left.date.localeCompare(right.date));
}

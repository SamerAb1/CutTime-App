import { addMinutes, isBefore, set, format } from "date-fns";

export const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function buildDaySlots(date, start, end, stepMin = 30) {
  if (!start || !end) return [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let cur = set(date, { hours: sh, minutes: sm, seconds: 0, milliseconds: 0 });
  const last = set(date, {
    hours: eh,
    minutes: em,
    seconds: 0,
    milliseconds: 0,
  });

  const out = [];
  while (isBefore(cur, last)) {
    out.push(format(cur, "HH:mm"));
    cur = addMinutes(cur, stepMin);
  }
  return out;
}

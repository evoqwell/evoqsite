/**
 * Parse a date-only string ("YYYY-MM-DD" from an <input type="date">) as
 * midnight in the server's timezone, which config/tz.js pins to Pacific.
 *
 * `new Date('2026-08-01')` is specified to parse as midnight UTC, which is
 * 2026-07-31 17:00 Pacific. That shifts every entry back a day on screen and
 * drops the first of the month out of "this month" summaries. Building the
 * Date from its parts keeps the day the user picked.
 *
 * @param {string} value Date-only string; other formats fall through to Date.
 * @returns {Date}
 */
export function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}


export type CronPreviewResult = Date[];

type ParsedCron = { seconds: number[]; minutes: number[]; hours: number[]; dom: number[]; months: number[]; dow: number[] };

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function parsePart(part: string, min: number, max: number, allowQuestion = false): number[] {
  const value = part.trim();
  if (!value || (allowQuestion && value === '?') || value === '*') return range(min, max);
  const values = new Set<number>();
  for (const segment of value.split(',')) {
    const [base, stepRaw] = segment.split('/');
    const step = stepRaw ? Number.parseInt(stepRaw, 10) : 1;
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid cron step: ${segment}`);
    let start: number;
    let end: number;
    if (base === '*') {
      start = min; end = max;
    } else if (base.includes('-')) {
      const [a, b] = base.split('-').map(v => Number.parseInt(v, 10));
      start = a; end = b;
    } else {
      start = Number.parseInt(base, 10);
      end = stepRaw ? max : start;
    }
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || start > end) throw new Error(`Invalid cron field: ${segment}`);
    for (let current = start; current <= end; current += step) values.add(current);
  }
  return [...values].sort((a, b) => a - b);
}

function parseCron(expr: string): ParsedCron {
  const fields = expr.trim().split(/\s+/).filter(Boolean);
  if (fields.length !== 5 && fields.length !== 6) throw new Error('Schedule must have 5 or 6 fields');
  const [sec, min, hour, dom, mon, dow] = fields.length === 6 ? fields : ['0', ...fields];
  return {
    seconds: parsePart(sec, 0, 59),
    minutes: parsePart(min, 0, 59),
    hours: parsePart(hour, 0, 23),
    dom: parsePart(dom, 1, 31, true),
    months: parsePart(mon, 1, 12),
    dow: parsePart(dow, 0, 7, true).map(v => v === 7 ? 0 : v),
  };
}

function matches(date: Date, cron: ParsedCron): boolean {
  return cron.seconds.includes(date.getUTCSeconds())
    && cron.minutes.includes(date.getUTCMinutes())
    && cron.hours.includes(date.getUTCHours())
    && cron.dom.includes(date.getUTCDate())
    && cron.months.includes(date.getUTCMonth() + 1)
    && cron.dow.includes(date.getUTCDay());
}

export function cronPreview(expr: string, from = new Date(), count = 3): CronPreviewResult {
  const cron = parseCron(expr);
  const out: Date[] = [];
  const cursor = new Date(from.getTime());
  cursor.setUTCMilliseconds(0);
  cursor.setUTCSeconds(cursor.getUTCSeconds() + 1);
  const limit = 366 * 24 * 60 * 60;
  for (let scanned = 0; scanned < limit && out.length < count; scanned += 1) {
    if (matches(cursor, cron)) out.push(new Date(cursor.getTime()));
    cursor.setUTCSeconds(cursor.getUTCSeconds() + 1);
  }
  if (out.length === 0) throw new Error('No firings found in search window');
  return out;
}

export function cronPreviewLabels(expr: string, from = new Date(), count = 3): string[] {
  return cronPreview(expr, from, count).map(date => date.toLocaleString());
}

export function validateCronExpression(expr: string): string | null {
  try { cronPreview(expr, new Date(), 1); return null; } catch (error) { return error instanceof Error ? error.message : 'Invalid schedule'; }
}

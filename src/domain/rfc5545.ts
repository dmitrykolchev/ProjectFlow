import {
  RecurrenceEndType,
  ReminderRecurrence,
  Rfc5545ByDay,
  Rfc5545Freq,
  Rfc5545Weekday,
} from '../types';

export const RFC5545_FREQS: readonly Rfc5545Freq[] = [
  'MINUTELY',
  'HOURLY',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
];

export const RFC5545_WEEKDAYS: readonly Rfc5545Weekday[] = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
];

const JS_DAY_TO_RFC: readonly Rfc5545Weekday[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const RFC_TO_JS_DAY: Record<Rfc5545Weekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export interface Rfc5545Rule {
  freq: Rfc5545Freq;
  interval: number;
  count?: number;
  until?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  byMonth?: number[];
  byWeekNo?: number[];
  byYearDay?: number[];
  byMonthDay?: number[];
  byDay?: Rfc5545ByDay[];
  byHour?: number[];
  byMinute?: number[];
  bySetPos?: number[];
  wkst?: Rfc5545Weekday;
}

export type RRuleParseErrorCode =
  | 'empty'
  | 'missing_freq'
  | 'invalid_freq'
  | 'invalid_interval'
  | 'invalid_count'
  | 'invalid_until'
  | 'count_until_conflict'
  | 'invalid_bymonth'
  | 'invalid_bymonthday'
  | 'invalid_byday'
  | 'invalid_bysetpos'
  | 'invalid_byyearday'
  | 'invalid_byweekno'
  | 'invalid_byhour'
  | 'invalid_byminute'
  | 'invalid_wkst'
  | 'invalid_part';

export type RRuleParseResult =
  | { ok: true; rule: Rfc5545Rule }
  | { ok: false; errorCode: RRuleParseErrorCode; detail?: string };

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatLocalDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseLocalDateTime(value: string): Date {
  if (!value) return new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value.trim());
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), 0, 0);
  }
  const dOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dOnly) {
    return new Date(Number(dOnly[1]), Number(dOnly[2]) - 1, Number(dOnly[3]), 9, 0, 0, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function weekdayFromDate(d: Date): Rfc5545Weekday {
  return JS_DAY_TO_RFC[d.getDay()];
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

function formatUntilRfc(endDate: string): string {
  const cleaned = endDate.trim();
  const dtMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(cleaned);
  if (dtMatch) {
    return `${dtMatch[1]}${dtMatch[2]}${dtMatch[3]}T${dtMatch[4]}${dtMatch[5]}${dtMatch[6] || '00'}`;
  }
  const dMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);
  if (dMatch) {
    return `${dMatch[1]}${dMatch[2]}${dMatch[3]}T235959`;
  }
  const rawMatch = /^(\d{8})(?:T(\d{6})Z?)?$/i.exec(cleaned);
  if (rawMatch) {
    return rawMatch[2] ? `${rawMatch[1]}T${rawMatch[2]}` : `${rawMatch[1]}T235959`;
  }
  return cleaned.replace(/[-:]/g, '');
}

function parseUntilRfc(val: string): string | null {
  const v = val.trim().toUpperCase();
  const utcDt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(v);
  if (utcDt) {
    const d = new Date(
      Date.UTC(
        Number(utcDt[1]),
        Number(utcDt[2]) - 1,
        Number(utcDt[3]),
        Number(utcDt[4]),
        Number(utcDt[5]),
        Number(utcDt[6])
      )
    );
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  const localDt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(v);
  if (localDt) {
    return `${localDt[1]}-${localDt[2]}-${localDt[3]}T${localDt[4]}:${localDt[5]}`;
  }
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (dateOnly) {
    return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  }
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  }
  return null;
}

function formatByDayItem(item: Rfc5545ByDay): string {
  return item.nth !== undefined && item.nth !== 0 ? `${item.nth}${item.day}` : item.day;
}

/**
 * Serializes a structured RFC 5545 rule into canonical RRULE text.
 * Example: "RRULE:FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13"
 */
export function serializeRRule(rule: Rfc5545Rule, includePrefix: boolean = true): string {
  const parts: string[] = [`FREQ=${rule.freq}`];

  const interval = Math.max(1, Math.round(rule.interval || 1));
  if (interval > 1) {
    parts.push(`INTERVAL=${interval}`);
  }

  if (rule.until) {
    parts.push(`UNTIL=${formatUntilRfc(rule.until)}`);
  } else if (rule.count && rule.count >= 1) {
    parts.push(`COUNT=${Math.round(rule.count)}`);
  }

  if (rule.byMonth && rule.byMonth.length > 0) {
    const uniq = Array.from(new Set(rule.byMonth.filter((m) => m >= 1 && m <= 12))).sort((a, b) => a - b);
    if (uniq.length > 0) parts.push(`BYMONTH=${uniq.join(',')}`);
  }

  if (rule.byWeekNo && rule.byWeekNo.length > 0) {
    parts.push(`BYWEEKNO=${rule.byWeekNo.join(',')}`);
  }

  if (rule.byYearDay && rule.byYearDay.length > 0) {
    parts.push(`BYYEARDAY=${rule.byYearDay.join(',')}`);
  }

  if (rule.byMonthDay && rule.byMonthDay.length > 0) {
    const valid = Array.from(
      new Set(rule.byMonthDay.filter((d) => d !== 0 && d >= -31 && d <= 31))
    ).sort((a, b) => a - b);
    if (valid.length > 0) parts.push(`BYMONTHDAY=${valid.join(',')}`);
  }

  if (rule.byDay && rule.byDay.length > 0) {
    const seen = new Set<string>();
    const tokens: string[] = [];
    for (const item of rule.byDay) {
      const tok = formatByDayItem(item);
      if (!seen.has(tok)) {
        seen.add(tok);
        tokens.push(tok);
      }
    }
    if (tokens.length > 0) parts.push(`BYDAY=${tokens.join(',')}`);
  }

  if (rule.byHour && rule.byHour.length > 0) {
    parts.push(`BYHOUR=${rule.byHour.join(',')}`);
  }

  if (rule.byMinute && rule.byMinute.length > 0) {
    parts.push(`BYMINUTE=${rule.byMinute.join(',')}`);
  }

  if (rule.bySetPos && rule.bySetPos.length > 0) {
    const valid = Array.from(
      new Set(rule.bySetPos.filter((p) => p !== 0 && p >= -366 && p <= 366))
    ).sort((a, b) => a - b);
    if (valid.length > 0) parts.push(`BYSETPOS=${valid.join(',')}`);
  }

  if (rule.wkst && rule.wkst !== 'MO') {
    parts.push(`WKST=${rule.wkst}`);
  }

  const body = parts.join(';');
  return includePrefix ? `RRULE:${body}` : body;
}

function parseIntList(
  raw: string,
  min: number,
  max: number,
  allowZero: boolean
): number[] | null {
  const tokens = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (tokens.length === 0) return null;
  const out: number[] = [];
  for (const tok of tokens) {
    if (!/^[+-]?\d+$/.test(tok)) return null;
    const num = Number(tok);
    if (!Number.isInteger(num) || num < min || num > max || (!allowZero && num === 0)) {
      return null;
    }
    out.push(num);
  }
  return out;
}

/**
 * Parses an RFC 5545 RRULE string (with or without leading "RRULE:") into a validated rule object.
 */
export function parseRRule(input: string): RRuleParseResult {
  const trimmed = (input || '').trim();
  if (!trimmed) return { ok: false, errorCode: 'empty' };

  const body = trimmed.replace(/^RRULE:/i, '').trim();
  if (!body) return { ok: false, errorCode: 'empty' };

  const segments = body.split(';').map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return { ok: false, errorCode: 'empty' };

  let freq: Rfc5545Freq | undefined;
  let interval = 1;
  let count: number | undefined;
  let until: string | undefined;
  let byMonth: number[] | undefined;
  let byWeekNo: number[] | undefined;
  let byYearDay: number[] | undefined;
  let byMonthDay: number[] | undefined;
  let byDay: Rfc5545ByDay[] | undefined;
  let byHour: number[] | undefined;
  let byMinute: number[] | undefined;
  let bySetPos: number[] | undefined;
  let wkst: Rfc5545Weekday | undefined;

  for (const seg of segments) {
    const eqIdx = seg.indexOf('=');
    if (eqIdx <= 0 || eqIdx === seg.length - 1) {
      return { ok: false, errorCode: 'invalid_part', detail: seg };
    }
    const key = seg.slice(0, eqIdx).trim().toUpperCase();
    const val = seg.slice(eqIdx + 1).trim();

    switch (key) {
      case 'FREQ': {
        const up = val.toUpperCase() as Rfc5545Freq;
        if (!RFC5545_FREQS.includes(up)) {
          return { ok: false, errorCode: 'invalid_freq', detail: val };
        }
        freq = up;
        break;
      }
      case 'INTERVAL': {
        if (!/^\d+$/.test(val)) return { ok: false, errorCode: 'invalid_interval', detail: val };
        const n = Number(val);
        if (n < 1) return { ok: false, errorCode: 'invalid_interval', detail: val };
        interval = n;
        break;
      }
      case 'COUNT': {
        if (!/^\d+$/.test(val)) return { ok: false, errorCode: 'invalid_count', detail: val };
        const n = Number(val);
        if (n < 1) return { ok: false, errorCode: 'invalid_count', detail: val };
        count = n;
        break;
      }
      case 'UNTIL': {
        const parsed = parseUntilRfc(val);
        if (!parsed) return { ok: false, errorCode: 'invalid_until', detail: val };
        until = parsed;
        break;
      }
      case 'BYMONTH': {
        const list = parseIntList(val, 1, 12, false);
        if (!list) return { ok: false, errorCode: 'invalid_bymonth', detail: val };
        byMonth = list;
        break;
      }
      case 'BYWEEKNO': {
        const list = parseIntList(val, -53, 53, false);
        if (!list) return { ok: false, errorCode: 'invalid_byweekno', detail: val };
        byWeekNo = list;
        break;
      }
      case 'BYYEARDAY': {
        const list = parseIntList(val, -366, 366, false);
        if (!list) return { ok: false, errorCode: 'invalid_byyearday', detail: val };
        byYearDay = list;
        break;
      }
      case 'BYMONTHDAY': {
        const list = parseIntList(val, -31, 31, false);
        if (!list) return { ok: false, errorCode: 'invalid_bymonthday', detail: val };
        byMonthDay = list;
        break;
      }
      case 'BYDAY': {
        const tokens = val.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
        if (tokens.length === 0) return { ok: false, errorCode: 'invalid_byday', detail: val };
        const parsedDays: Rfc5545ByDay[] = [];
        for (const tok of tokens) {
          const m = /^([+-]?\d+)?(MO|TU|WE|TH|FR|SA|SU)$/.exec(tok);
          if (!m) return { ok: false, errorCode: 'invalid_byday', detail: tok };
          const day = m[2] as Rfc5545Weekday;
          if (m[1]) {
            const nth = Number(m[1]);
            if (!Number.isInteger(nth) || nth === 0 || nth < -53 || nth > 53) {
              return { ok: false, errorCode: 'invalid_byday', detail: tok };
            }
            parsedDays.push({ day, nth });
          } else {
            parsedDays.push({ day });
          }
        }
        byDay = parsedDays;
        break;
      }
      case 'BYHOUR': {
        const list = parseIntList(val, 0, 23, true);
        if (!list) return { ok: false, errorCode: 'invalid_byhour', detail: val };
        byHour = list;
        break;
      }
      case 'BYMINUTE': {
        const list = parseIntList(val, 0, 59, true);
        if (!list) return { ok: false, errorCode: 'invalid_byminute', detail: val };
        byMinute = list;
        break;
      }
      case 'BYSETPOS': {
        const list = parseIntList(val, -366, 366, false);
        if (!list) return { ok: false, errorCode: 'invalid_bysetpos', detail: val };
        bySetPos = list;
        break;
      }
      case 'WKST': {
        const up = val.toUpperCase() as Rfc5545Weekday;
        if (!RFC5545_WEEKDAYS.includes(up)) {
          return { ok: false, errorCode: 'invalid_wkst', detail: val };
        }
        wkst = up;
        break;
      }
      default:
        return { ok: false, errorCode: 'invalid_part', detail: seg };
    }
  }

  if (!freq) return { ok: false, errorCode: 'missing_freq' };
  if (count !== undefined && until !== undefined) {
    return { ok: false, errorCode: 'count_until_conflict' };
  }

  // RFC 5545 restricts the BYDAY prefix by frequency: a numeric prefix is only
  // meaningful for MONTHLY (-5..-1, 1..5) and YEARLY (-53..-1, 1..53); DAILY,
  // WEEKLY, HOURLY and MINUTELY rules must not carry one.
  if (byDay) {
    for (const item of byDay) {
      if (item.nth === undefined) continue;
      const abs = Math.abs(item.nth);
      if (freq === 'MONTHLY') {
        if (abs > 5) return { ok: false, errorCode: 'invalid_byday', detail: formatByDayItem(item) };
      } else if (freq !== 'YEARLY') {
        return { ok: false, errorCode: 'invalid_byday', detail: formatByDayItem(item) };
      }
    }
  }

  return {
    ok: true,
    rule: {
      freq,
      interval,
      count,
      until,
      byMonth,
      byWeekNo,
      byYearDay,
      byMonthDay,
      byDay,
      byHour,
      byMinute,
      bySetPos,
      wkst: wkst || 'MO',
    },
  };
}

export function recurrenceToRRule(rec: ReminderRecurrence): Rfc5545Rule | null {
  if (!rec || !rec.enabled) return null;
  if (rec.freq) {
    return {
      freq: rec.freq,
      interval: Math.max(1, Math.round(rec.interval || 1)),
      count:
        rec.endType === 'max_occurrences' && rec.maxOccurrences
          ? Math.max(1, Math.round(rec.maxOccurrences))
          : undefined,
      until: rec.endType === 'until_date' && rec.endDate ? rec.endDate : undefined,
      byMonth: rec.byMonth?.length ? [...rec.byMonth] : undefined,
      byWeekNo: rec.byWeekNo?.length ? [...rec.byWeekNo] : undefined,
      byYearDay: rec.byYearDay?.length ? [...rec.byYearDay] : undefined,
      byMonthDay: rec.byMonthDay?.length ? [...rec.byMonthDay] : undefined,
      byDay: rec.byDay?.length ? rec.byDay.map((d) => ({ ...d })) : undefined,
      byHour: rec.byHour?.length ? [...rec.byHour] : undefined,
      byMinute: rec.byMinute?.length ? [...rec.byMinute] : undefined,
      bySetPos: rec.bySetPos?.length ? [...rec.bySetPos] : undefined,
      wkst: rec.wkst || 'MO',
    };
  }
  if (rec.rrule) {
    const parsed = parseRRule(rec.rrule);
    if (parsed.ok) return parsed.rule;
  }
  return null;
}

export function buildRecurrenceFromRRule(
  rule: Rfc5545Rule | null,
  opts: {
    templateCode?: string;
    skipWeekends?: boolean;
    occurrenceCount?: number;
  } = {}
): ReminderRecurrence {
  if (!rule) {
    return {
      templateCode: opts.templateCode || 'ONCE',
      enabled: false,
      rrule: '',
      interval: 1,
      skipWeekends: false,
      endType: 'max_occurrences',
      maxOccurrences: 1,
      occurrenceCount: opts.occurrenceCount || 0,
    };
  }

  let endType: RecurrenceEndType = 'never';
  let endDate: string | undefined;
  let maxOccurrences: number | undefined;
  if (rule.until) {
    endType = 'until_date';
    endDate = rule.until.slice(0, 10);
  } else if (rule.count && rule.count >= 1) {
    endType = 'max_occurrences';
    maxOccurrences = Math.round(rule.count);
  }

  const canonical = serializeRRule(rule, true);
  return {
    templateCode: opts.templateCode || 'CUSTOM',
    enabled: true,
    rrule: canonical,
    freq: rule.freq,
    interval: Math.max(1, Math.round(rule.interval || 1)),
    byDay: rule.byDay?.length ? rule.byDay.map((d) => ({ ...d })) : undefined,
    byMonthDay: rule.byMonthDay?.length ? [...rule.byMonthDay] : undefined,
    byMonth: rule.byMonth?.length ? [...rule.byMonth] : undefined,
    bySetPos: rule.bySetPos?.length ? [...rule.bySetPos] : undefined,
    byYearDay: rule.byYearDay?.length ? [...rule.byYearDay] : undefined,
    byWeekNo: rule.byWeekNo?.length ? [...rule.byWeekNo] : undefined,
    byHour: rule.byHour?.length ? [...rule.byHour] : undefined,
    byMinute: rule.byMinute?.length ? [...rule.byMinute] : undefined,
    wkst: rule.wkst || 'MO',
    skipWeekends: Boolean(opts.skipWeekends),
    endType,
    endDate,
    maxOccurrences,
    occurrenceCount: opts.occurrenceCount || 0,
  };
}

/**
 * Migrates legacy reminder recurrence objects (using `unit`/`daysOfWeek`/`dayOfMonth`)
 * into standard RFC 5545 ReminderRecurrence format cleanly.
 */
export function normalizeReminderRecurrence(raw: unknown): ReminderRecurrence {
  if (!raw || typeof raw !== 'object') {
    return buildRecurrenceFromRRule(null);
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.enabled === 'boolean') {
    if (!obj.enabled) {
      return buildRecurrenceFromRRule(null, {
        templateCode: typeof obj.templateCode === 'string' ? obj.templateCode : 'ONCE',
        occurrenceCount: Number(obj.occurrenceCount) || 0,
      });
    }
    const existingRule = recurrenceToRRule(obj as unknown as ReminderRecurrence);
    return buildRecurrenceFromRRule(existingRule, {
      templateCode: typeof obj.templateCode === 'string' ? obj.templateCode : 'CUSTOM',
      skipWeekends: Boolean(obj.skipWeekends),
      occurrenceCount: Number(obj.occurrenceCount) || 0,
    });
  }

  // Legacy migration (`unit` field)
  const legacyUnit = String(obj.unit || 'none');
  if (legacyUnit === 'none') {
    return buildRecurrenceFromRRule(null, {
      templateCode: typeof obj.templateCode === 'string' ? obj.templateCode : 'ONCE',
      occurrenceCount: Number(obj.occurrenceCount) || 0,
    });
  }

  const unitToFreq: Record<string, Rfc5545Freq> = {
    minute: 'MINUTELY',
    hour: 'HOURLY',
    day: 'DAILY',
    week: 'WEEKLY',
    month: 'MONTHLY',
    quarter: 'MONTHLY',
    year: 'YEARLY',
  };
  const freq = unitToFreq[legacyUnit] || 'DAILY';
  const rawInterval = Math.max(1, Number(obj.interval) || 1);
  const interval = legacyUnit === 'quarter' ? rawInterval * 3 : rawInterval;

  let byDay: Rfc5545ByDay[] | undefined;
  if (Array.isArray(obj.daysOfWeek) && obj.daysOfWeek.length > 0) {
    const numToRfc: Record<number, Rfc5545Weekday> = {
      1: 'MO',
      2: 'TU',
      3: 'WE',
      4: 'TH',
      5: 'FR',
      6: 'SA',
      7: 'SU',
    };
    const mapped = (obj.daysOfWeek as number[])
      .map((n) => numToRfc[n])
      .filter((w): w is Rfc5545Weekday => Boolean(w));
    if (mapped.length > 0) byDay = mapped.map((day) => ({ day }));
  }

  const byMonthDay =
    typeof obj.dayOfMonth === 'number' && obj.dayOfMonth >= 1 && obj.dayOfMonth <= 31
      ? [obj.dayOfMonth]
      : undefined;

  const endType = (obj.endType as RecurrenceEndType) || 'never';
  const rule: Rfc5545Rule = {
    freq,
    interval,
    byDay,
    byMonthDay,
    until: endType === 'until_date' && typeof obj.endDate === 'string' ? obj.endDate : undefined,
    count:
      endType === 'max_occurrences' && typeof obj.maxOccurrences === 'number'
        ? obj.maxOccurrences
        : undefined,
    wkst: 'MO',
  };

  return buildRecurrenceFromRRule(rule, {
    templateCode: typeof obj.templateCode === 'string' ? obj.templateCode : 'CUSTOM',
    skipWeekends: Boolean(obj.skipWeekends),
    occurrenceCount: Number(obj.occurrenceCount) || 0,
  });
}

// =============================================================================
// RFC 5545 §3.3.10 Recurrence Evaluator
// =============================================================================

function startOfWeek(date: Date, wkst: Rfc5545Weekday): Date {
  const wkstJs = RFC_TO_JS_DAY[wkst];
  const diff = (date.getDay() - wkstJs + 7) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff, 0, 0, 0, 0);
}

function getIsoLikeWeekNumber(date: Date, wkst: Rfc5545Weekday): number {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const wkstJs = RFC_TO_JS_DAY[wkst];
  const jan1Offset = (jan1.getDay() - wkstJs + 7) % 7;
  // Week 1 has at least 4 days in the year
  const firstWeekStart =
    7 - jan1Offset >= 4
      ? new Date(year, 0, 1 - jan1Offset)
      : new Date(year, 0, 1 + (7 - jan1Offset));
  const curStart = startOfWeek(date, wkst);
  const diffWeeks = Math.round((curStart.getTime() - firstWeekStart.getTime()) / (7 * 86400000));
  return diffWeeks + 1;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - start.getTime()) / 86400000) + 1;
}

function matchesByMonth(month1to12: number, rule: Rfc5545Rule): boolean {
  if (!rule.byMonth || rule.byMonth.length === 0) return true;
  return rule.byMonth.includes(month1to12);
}

function matchesByMonthDay(year: number, month1to12: number, day: number, rule: Rfc5545Rule): boolean {
  if (!rule.byMonthDay || rule.byMonthDay.length === 0) return true;
  const dim = daysInMonth(year, month1to12);
  return rule.byMonthDay.some((spec) => (spec > 0 ? spec === day : dim + 1 + spec === day));
}

function matchesByYearDay(date: Date, rule: Rfc5545Rule): boolean {
  if (!rule.byYearDay || rule.byYearDay.length === 0) return true;
  const doy = getDayOfYear(date);
  const diy = daysInYear(date.getFullYear());
  return rule.byYearDay.some((spec) => (spec > 0 ? spec === doy : diy + 1 + spec === doy));
}

function matchesByWeekNo(date: Date, rule: Rfc5545Rule): boolean {
  if (!rule.byWeekNo || rule.byWeekNo.length === 0) return true;
  const wkst = rule.wkst || 'MO';
  const wk = getIsoLikeWeekNumber(date, wkst);
  const dec28 = new Date(date.getFullYear(), 11, 28);
  const totalWeeks = getIsoLikeWeekNumber(dec28, wkst);
  return rule.byWeekNo.some((spec) => (spec > 0 ? spec === wk : totalWeeks + 1 + spec === wk));
}

function getAllDatesInYear(year: number): Date[] {
  const out: Date[] = [];
  const total = daysInYear(year);
  for (let i = 0; i < total; i++) {
    out.push(new Date(year, 0, 1 + i, 0, 0, 0, 0));
  }
  return out;
}

function getAllDatesInMonth(year: number, month1to12: number): Date[] {
  const out: Date[] = [];
  const dim = daysInMonth(year, month1to12);
  for (let d = 1; d <= dim; d++) {
    out.push(new Date(year, month1to12 - 1, d, 0, 0, 0, 0));
  }
  return out;
}

function filterDatesByDaySpecs(dates: Date[], specs: Rfc5545ByDay[]): Date[] {
  if (specs.length === 0) return dates;
  const matchedTimestamps = new Set<number>();

  // Group dates by weekday for ordinal nth checks
  const byWeekday = new Map<Rfc5545Weekday, Date[]>();
  for (const w of RFC5545_WEEKDAYS) byWeekday.set(w, []);
  for (const d of dates) {
    byWeekday.get(weekdayFromDate(d))!.push(d);
  }

  for (const spec of specs) {
    const bucket = byWeekday.get(spec.day) || [];
    if (spec.nth === undefined || spec.nth === 0) {
      for (const d of bucket) matchedTimestamps.add(d.getTime());
    } else if (spec.nth > 0) {
      const idx = spec.nth - 1;
      if (idx >= 0 && idx < bucket.length) matchedTimestamps.add(bucket[idx].getTime());
    } else {
      const idx = bucket.length + spec.nth;
      if (idx >= 0 && idx < bucket.length) matchedTimestamps.add(bucket[idx].getTime());
    }
  }

  return dates.filter((d) => matchedTimestamps.has(d.getTime()));
}

function expandTimesForDates(
  dates: Date[],
  hours: number[],
  minutes: number[]
): Date[] {
  const sortedHours = Array.from(new Set(hours)).sort((a, b) => a - b);
  const sortedMins = Array.from(new Set(minutes)).sort((a, b) => a - b);
  const result: Date[] = [];
  for (const d of dates) {
    for (const h of sortedHours) {
      for (const m of sortedMins) {
        result.push(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0));
      }
    }
  }
  return result;
}

function applyBySetPos(candidates: Date[], bySetPos?: number[]): Date[] {
  if (!bySetPos || bySetPos.length === 0) return candidates;
  const len = candidates.length;
  if (len === 0) return [];
  const chosen = new Set<number>();
  for (const pos of bySetPos) {
    if (pos > 0) {
      const idx = pos - 1;
      if (idx >= 0 && idx < len) chosen.add(idx);
    } else if (pos < 0) {
      const idx = len + pos;
      if (idx >= 0 && idx < len) chosen.add(idx);
    }
  }
  return Array.from(chosen)
    .sort((a, b) => a - b)
    .map((idx) => candidates[idx]);
}

function buildIntervalCandidates(
  rule: Rfc5545Rule,
  dtstart: Date,
  stepIndex: number
): Date[] {
  const interval = Math.max(1, rule.interval || 1);
  const baseHour = dtstart.getHours();
  const baseMinute = dtstart.getMinutes();
  const hours = rule.byHour?.length ? rule.byHour : [baseHour];
  const minutes = rule.byMinute?.length ? rule.byMinute : [baseMinute];
  const wkst = rule.wkst || 'MO';

  let rawCandidates: Date[] = [];

  switch (rule.freq) {
    case 'YEARLY': {
      const year = dtstart.getFullYear() + stepIndex * interval;
      const hasExplicitMonth = Boolean(rule.byMonth?.length);
      const hasExplicitWeek = Boolean(rule.byWeekNo?.length);
      const hasExplicitYearDay = Boolean(rule.byYearDay?.length);
      const hasExplicitMonthDay = Boolean(rule.byMonthDay?.length);
      const hasExplicitDay = Boolean(rule.byDay?.length);

      let dayCandidates: Date[];

      if (!hasExplicitMonth && !hasExplicitWeek && !hasExplicitYearDay && !hasExplicitMonthDay && !hasExplicitDay) {
        // Default RFC 5545: same month and day as dtstart
        const m = dtstart.getMonth() + 1;
        const d = dtstart.getDate();
        dayCandidates = d <= daysInMonth(year, m) ? [new Date(year, m - 1, d)] : [];
      } else if (hasExplicitYearDay) {
        dayCandidates = getAllDatesInYear(year).filter(
          (d) =>
            matchesByYearDay(d, rule) &&
            matchesByMonth(d.getMonth() + 1, rule) &&
            matchesByWeekNo(d, rule) &&
            matchesByMonthDay(year, d.getMonth() + 1, d.getDate(), rule)
        );
        if (hasExplicitDay) {
          dayCandidates = filterDatesByDaySpecs(dayCandidates, rule.byDay!);
        }
      } else if (hasExplicitMonth) {
        dayCandidates = [];
        const months = Array.from(new Set(rule.byMonth!)).sort((a, b) => a - b);
        for (const m of months) {
          let mDates = getAllDatesInMonth(year, m);
          if (hasExplicitWeek) mDates = mDates.filter((d) => matchesByWeekNo(d, rule));
          if (hasExplicitMonthDay) {
            mDates = mDates.filter((d) => matchesByMonthDay(year, m, d.getDate(), rule));
          } else if (!hasExplicitDay && !hasExplicitWeek) {
            mDates = mDates.filter((d) => d.getDate() === dtstart.getDate());
          }
          if (hasExplicitDay) {
            // In YEARLY + BYMONTH, nth applies within the month (or full year if ordinal > 5; using month matches standard RFC 5545)
            const monthAll = getAllDatesInMonth(year, m);
            const dayMatched = new Set(
              filterDatesByDaySpecs(monthAll, rule.byDay!).map((x) => x.getTime())
            );
            mDates = mDates.filter((x) => dayMatched.has(x.getTime()));
          }
          dayCandidates.push(...mDates);
        }
      } else {
        // Whole year scope (e.g., BYWEEKNO, BYMONTHDAY without BYMONTH, or BYDAY without BYMONTH)
        let yDates = getAllDatesInYear(year);
        if (hasExplicitWeek) yDates = yDates.filter((d) => matchesByWeekNo(d, rule));
        if (hasExplicitMonthDay) {
          yDates = yDates.filter((d) => matchesByMonthDay(year, d.getMonth() + 1, d.getDate(), rule));
        }
        if (hasExplicitDay) {
          const dayMatched = new Set(
            filterDatesByDaySpecs(getAllDatesInYear(year), rule.byDay!).map((x) => x.getTime())
          );
          yDates = yDates.filter((x) => dayMatched.has(x.getTime()));
        }
        dayCandidates = yDates;
      }

      rawCandidates = expandTimesForDates(dayCandidates, hours, minutes);
      break;
    }

    case 'MONTHLY': {
      const totalMonths = dtstart.getFullYear() * 12 + dtstart.getMonth() + stepIndex * interval;
      const year = Math.floor(totalMonths / 12);
      const month0 = totalMonths % 12;
      const month1 = month0 + 1;

      if (!matchesByMonth(month1, rule)) {
        return [];
      }

      const monthAll = getAllDatesInMonth(year, month1);
      let dayCandidates = monthAll;

      const hasMonthDay = Boolean(rule.byMonthDay?.length);
      const hasByDay = Boolean(rule.byDay?.length);

      if (!hasMonthDay && !hasByDay) {
        dayCandidates = monthAll.filter((d) => d.getDate() === dtstart.getDate());
      } else {
        if (hasMonthDay) {
          dayCandidates = dayCandidates.filter((d) =>
            matchesByMonthDay(year, month1, d.getDate(), rule)
          );
        }
        if (hasByDay) {
          const dayMatched = new Set(
            filterDatesByDaySpecs(monthAll, rule.byDay!).map((x) => x.getTime())
          );
          dayCandidates = dayCandidates.filter((x) => dayMatched.has(x.getTime()));
        }
      }

      rawCandidates = expandTimesForDates(dayCandidates, hours, minutes);
      break;
    }

    case 'WEEKLY': {
      const baseWeekStart = startOfWeek(dtstart, wkst);
      const weekStart = new Date(
        baseWeekStart.getFullYear(),
        baseWeekStart.getMonth(),
        baseWeekStart.getDate() + stepIndex * interval * 7
      );
      const targetWeekdays = rule.byDay?.length
        ? new Set(rule.byDay.map((b) => b.day))
        : new Set([weekdayFromDate(dtstart)]);

      const weekDays: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
        if (
          targetWeekdays.has(weekdayFromDate(d)) &&
          matchesByMonth(d.getMonth() + 1, rule) &&
          matchesByMonthDay(d.getFullYear(), d.getMonth() + 1, d.getDate(), rule)
        ) {
          weekDays.push(d);
        }
      }
      rawCandidates = expandTimesForDates(weekDays, hours, minutes);
      break;
    }

    case 'DAILY': {
      const d = new Date(
        dtstart.getFullYear(),
        dtstart.getMonth(),
        dtstart.getDate() + stepIndex * interval
      );
      const dayMatches =
        matchesByMonth(d.getMonth() + 1, rule) &&
        matchesByMonthDay(d.getFullYear(), d.getMonth() + 1, d.getDate(), rule) &&
        (!rule.byDay?.length || rule.byDay.some((b) => b.day === weekdayFromDate(d)));

      if (!dayMatches) return [];
      rawCandidates = expandTimesForDates([d], hours, minutes);
      break;
    }

    case 'HOURLY': {
      const hDate = new Date(
        dtstart.getFullYear(),
        dtstart.getMonth(),
        dtstart.getDate(),
        dtstart.getHours() + stepIndex * interval,
        0,
        0,
        0
      );
      const matchesFilters =
        matchesByMonth(hDate.getMonth() + 1, rule) &&
        matchesByMonthDay(hDate.getFullYear(), hDate.getMonth() + 1, hDate.getDate(), rule) &&
        (!rule.byDay?.length || rule.byDay.some((b) => b.day === weekdayFromDate(hDate))) &&
        (!rule.byHour?.length || rule.byHour.includes(hDate.getHours()));

      if (!matchesFilters) return [];
      const sortedMins = Array.from(new Set(minutes)).sort((a, b) => a - b);
      rawCandidates = sortedMins.map(
        (m) =>
          new Date(
            hDate.getFullYear(),
            hDate.getMonth(),
            hDate.getDate(),
            hDate.getHours(),
            m,
            0,
            0
          )
      );
      break;
    }

    case 'MINUTELY': {
      const mDate = new Date(
        dtstart.getFullYear(),
        dtstart.getMonth(),
        dtstart.getDate(),
        dtstart.getHours(),
        dtstart.getMinutes() + stepIndex * interval,
        0,
        0
      );
      const matchesFilters =
        matchesByMonth(mDate.getMonth() + 1, rule) &&
        matchesByMonthDay(mDate.getFullYear(), mDate.getMonth() + 1, mDate.getDate(), rule) &&
        (!rule.byDay?.length || rule.byDay.some((b) => b.day === weekdayFromDate(mDate))) &&
        (!rule.byHour?.length || rule.byHour.includes(mDate.getHours())) &&
        (!rule.byMinute?.length || rule.byMinute.includes(mDate.getMinutes()));

      rawCandidates = matchesFilters ? [mDate] : [];
      break;
    }
  }

  // Deduplicate and sort chronologically
  const uniqMap = new Map<number, Date>();
  for (const c of rawCandidates) {
    uniqMap.set(c.getTime(), c);
  }
  const sorted = Array.from(uniqMap.values()).sort((a, b) => a.getTime() - b.getTime());
  return applyBySetPos(sorted, rule.bySetPos);
}

function getUntilLimitMs(rule: Rfc5545Rule): number | null {
  if (!rule.until) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rule.until)) {
    const [y, m, d] = rule.until.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  }
  return parseLocalDateTime(rule.until).getTime();
}

function applySkipWeekends(date: Date, skipWeekends?: boolean): Date {
  if (!skipWeekends) return date;
  const shifted = new Date(date.getTime());
  const day = shifted.getDay();
  if (day === 6) shifted.setDate(shifted.getDate() + 2);
  else if (day === 0) shifted.setDate(shifted.getDate() + 1);
  return shifted;
}

/**
 * Generates up to `limit` future occurrences strictly after `baseDueAt` according to RFC 5545 RRULE.
 */
export function getUpcomingRRuleOccurrences(
  baseDueAt: string,
  rec: ReminderRecurrence,
  limit: number = 3
): string[] {
  const rule = recurrenceToRRule(rec);
  if (!rule || limit <= 0) return [];

  const dtstart = parseLocalDateTime(baseDueAt);
  const startMs = dtstart.getTime();
  const untilMs = getUntilLimitMs(rule);

  const maxStep =
    rule.freq === 'YEARLY'
      ? 200
      : rule.freq === 'MONTHLY'
      ? 2400
      : rule.freq === 'WEEKLY'
      ? 2600
      : rule.freq === 'DAILY'
      ? 5000
      : 5000;

  const remainingByCount =
    rec.endType === 'max_occurrences' && rec.maxOccurrences
      ? Math.max(0, rec.maxOccurrences - (rec.occurrenceCount || 0) - 1)
      : limit;

  const targetCount = Math.min(limit, remainingByCount);
  if (targetCount <= 0) return [];

  const results: string[] = [];
  const seenFormatted = new Set<string>();

  for (let step = 0; step <= maxStep; step++) {
    const periodCandidates = buildIntervalCandidates(rule, dtstart, step);
    for (const cand of periodCandidates) {
      const adjusted = applySkipWeekends(cand, rec.skipWeekends);
      const ms = adjusted.getTime();
      if (ms <= startMs) continue;
      if (untilMs !== null && ms > untilMs) {
        return results;
      }
      const formatted = formatLocalDateTime(adjusted);
      if (!seenFormatted.has(formatted)) {
        seenFormatted.add(formatted);
        results.push(formatted);
        if (results.length >= targetCount) return results;
      }
    }

    // Fast-exit check if period baseline already exceeded UNTIL
    if (untilMs !== null && periodCandidates.length > 0) {
      const lastInPeriod = periodCandidates[periodCandidates.length - 1].getTime();
      if (lastInPeriod > untilMs) break;
    }
  }

  return results;
}

export function getNextRRuleOccurrence(
  baseDueAt: string,
  rec: ReminderRecurrence
): string | null {
  const next = getUpcomingRRuleOccurrences(baseDueAt, rec, 1);
  return next.length > 0 ? next[0] : null;
}

/**
 * Helper to find the first occurrence of a rule on or after a given reference Date
 * (used for realistic seed dates such as Friday the 13th).
 */
export function findFirstOccurrenceOnOrAfter(
  rule: Rfc5545Rule,
  fromDate: Date,
  hour: number = 13,
  minute: number = 0
): string {
  const dtstart = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate(),
    hour,
    minute,
    0,
    0
  );
  const startMs = dtstart.getTime() - 60000;
  for (let step = 0; step <= 240; step++) {
    const cands = buildIntervalCandidates(rule, dtstart, step);
    for (const c of cands) {
      if (c.getTime() >= startMs) {
        return formatLocalDateTime(c);
      }
    }
  }
  return formatLocalDateTime(dtstart);
}

export interface RRuleDisplayTranslations {
  freqEvery: Record<Rfc5545Freq, (interval: number) => string>;
  weekdaysShortMap: Record<Rfc5545Weekday, string>;
  monthsShort: readonly string[];
  nthPrefix: (nth: number) => string;
  monthDayPrefix: (days: string) => string;
  setPosLabel: (pos: string) => string;
}

export function formatRRuleHumanSummary(
  rec: ReminderRecurrence,
  labels: RRuleDisplayTranslations
): string {
  const rule = recurrenceToRRule(rec);
  if (!rule) return '';

  const parts: string[] = [labels.freqEvery[rule.freq](rule.interval || 1)];

  if (rule.byMonth && rule.byMonth.length > 0) {
    const mLabels = rule.byMonth
      .filter((m) => m >= 1 && m <= 12)
      .map((m) => labels.monthsShort[m - 1]);
    if (mLabels.length > 0) parts.push(mLabels.join(', '));
  }

  if (rule.byDay && rule.byDay.length > 0) {
    const dLabels = rule.byDay.map((b) => {
      const wd = labels.weekdaysShortMap[b.day];
      return b.nth ? `${labels.nthPrefix(b.nth)} ${wd}` : wd;
    });
    parts.push(dLabels.join(', '));
  }

  if (rule.byMonthDay && rule.byMonthDay.length > 0) {
    parts.push(labels.monthDayPrefix(rule.byMonthDay.join(', ')));
  }

  if (rule.bySetPos && rule.bySetPos.length > 0) {
    parts.push(labels.setPosLabel(rule.bySetPos.join(', ')));
  }

  return parts.join(' · ');
}

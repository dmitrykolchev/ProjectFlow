import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import {
  RecurrenceEndType,
  Rfc5545ByDay,
  Rfc5545Freq,
  Rfc5545Weekday,
  SupportedLang,
} from '../../../types';
import {
  RFC5545_WEEKDAYS,
  Rfc5545Rule,
  buildRecurrenceFromRRule,
  formatLocalDateTime,
  formatRRuleHumanSummary,
  getUpcomingRRuleOccurrences,
  parseLocalDateTime,
  parseRRule,
  serializeRRule,
} from '../../../domain/rfc5545';
import { getTranslation } from '../../../i18n';
import { eventValue } from '../event-value';
import {
  iconCalendar,
  iconCheck,
  iconChevronDown,
  iconChevronUp,
  iconClock,
  iconCopy,
  iconPlus,
  iconRepeat,
  iconX,
  iconAlertTriangle,
} from '../icons';
import '../app-button/app-button';
import '../app-checkbox/app-checkbox';
import '../app-date-input/app-date-input';
import '../app-input/app-input';
import '../app-number-input/app-number-input';
import '../app-select/app-select';
import styles from './app-recurrence-editor.css';

export interface RecurrenceEditorChangeDetail {
  value: string;
  rrule: string;
  rule: Rfc5545Rule | null;
  isValid: boolean;
  summary: string;
}

type MonthlyMode = 'monthday' | 'weekday';
type YearlyMode = 'monthday' | 'weekday' | 'yearindex';
type WeekdayTargetGroup = 'WORKDAYS' | 'WEEKENDS' | 'ANY_DAY' | Rfc5545Weekday;
type SetPosPresetMode = 'all' | 'first' | 'last' | 'first_last' | 'custom';

interface QuickPreset {
  id: string;
  labelKey:
    | 'presetOnce'
    | 'presetDaily'
    | 'presetWeekdays'
    | 'presetBiweekly'
    | 'presetLastWorkday'
    | 'presetFriday13'
    | 'presetQuarterly'
    | 'presetLastMonthDay'
    | 'presetDay256';
  body: string; // empty string for one-time
}

const QUICK_PRESETS: QuickPreset[] = [
  { id: 'once', labelKey: 'presetOnce', body: '' },
  { id: 'daily', labelKey: 'presetDaily', body: 'FREQ=DAILY' },
  { id: 'weekdays', labelKey: 'presetWeekdays', body: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
  { id: 'biweekly', labelKey: 'presetBiweekly', body: 'FREQ=WEEKLY;INTERVAL=2' },
  {
    id: 'last_workday',
    labelKey: 'presetLastWorkday',
    body: 'FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1',
  },
  { id: 'friday_13', labelKey: 'presetFriday13', body: 'FREQ=MONTHLY;BYMONTHDAY=13;BYDAY=FR' },
  { id: 'quarterly', labelKey: 'presetQuarterly', body: 'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1' },
  { id: 'last_month_day', labelKey: 'presetLastMonthDay', body: 'FREQ=MONTHLY;BYMONTHDAY=-1' },
  { id: 'day_256', labelKey: 'presetDay256', body: 'FREQ=YEARLY;BYYEARDAY=256' },
];

const WORKDAY_CODES: readonly Rfc5545Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
const WEEKEND_CODES: readonly Rfc5545Weekday[] = ['SA', 'SU'];
const ORDINAL_OPTIONS = ['0', '1', '2', '3', '4', '5', '-1', '-2'] as const;
const MINUTE_QUICK_LIST = [0, 15, 30, 45] as const;

@customElement('app-recurrence-editor')
export class AppRecurrenceEditor extends LitElement {
  @property({ type: String }) value: string = '';
  @property({ type: String, attribute: 'start-date' }) startDate: string = '';
  @property({ type: Boolean, attribute: 'include-prefix' }) includePrefix: boolean = true;
  @property({ type: Boolean, attribute: 'allow-one-time' }) allowOneTime: boolean = true;
  @property({ type: Boolean, reflect: true }) compact: boolean = false;
  @property({ type: Boolean, attribute: 'hide-rrule-bar' }) hideRruleBar: boolean = false;

  @state() private currentLang: SupportedLang = store.customization.language;

  // Canonical structured rule state
  @state() private freq: Rfc5545Freq | 'NONE' = 'NONE';
  @state() private interval: number = 1;
  @state() private endType: RecurrenceEndType = 'never';
  @state() private count: number = 5;
  @state() private until: string = '';
  @state() private byMonth: number[] = [];
  @state() private byWeekNo: number[] = [];
  @state() private byYearDay: number[] = [];
  @state() private byMonthDay: number[] = [];
  @state() private byDay: Rfc5545ByDay[] = [];
  @state() private byHour: number[] = [];
  @state() private byMinute: number[] = [];
  @state() private bySetPos: number[] = [];
  @state() private wkst: Rfc5545Weekday = 'MO';

  // Friendly UI state
  @state() private monthlyMode: MonthlyMode = 'monthday';
  @state() private yearlyMode: YearlyMode = 'monthday';
  @state() private showWeekdayIntersect: boolean = false;
  @state() private builderOrd: string = '-1';
  @state() private builderTarget: WeekdayTargetGroup = 'WORKDAYS';
  @state() private builderCustomDayText: string = '1';
  @state() private builderCustomOrdText: string = '';
  @state() private byWeekNoText: string = '';
  @state() private byYearDayText: string = '';
  @state() private byMinuteText: string = '';
  @state() private setPosMode: SetPosPresetMode = 'all';
  @state() private setPosCustomText: string = '';
  @state() private advancedOpen: boolean = false;
  @state() private rawInput: string = '';
  @state() private rawError: string = '';
  @state() private copiedRecent: boolean = false;

  private lastEmittedValue: string | null = null;
  private unsubscribe?: () => void;
  private copyTimer?: number;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
    if (this.copyTimer) {
      window.clearTimeout(this.copyTimer);
    }
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('value') || changed.has('allowOneTime') || changed.has('includePrefix')) {
      if (changed.has('value') && this.value === this.lastEmittedValue) {
        return;
      }
      this.hydrateFromValue(this.value);
    }
  }

  private resetRuleFields(targetFreq: Rfc5545Freq | 'NONE') {
    this.freq = targetFreq;
    this.interval = 1;
    this.endType = 'never';
    this.count = 5;
    this.until = '';
    this.byMonth = [];
    this.byWeekNo = [];
    this.byYearDay = [];
    this.byMonthDay = [];
    this.byDay = targetFreq === 'WEEKLY' ? [{ day: 'MO' }] : [];
    this.byHour = [];
    this.byMinute = [];
    this.bySetPos = [];
    this.wkst = 'MO';

    this.monthlyMode = 'monthday';
    this.yearlyMode = 'monthday';
    this.showWeekdayIntersect = false;
    this.builderOrd = '-1';
    this.builderTarget = 'WORKDAYS';
    this.builderCustomDayText = '1';
    this.builderCustomOrdText = '';
    this.byWeekNoText = '';
    this.byYearDayText = '';
    this.byMinuteText = '';
    this.setPosMode = 'all';
    this.setPosCustomText = '';
    this.rawError = '';
  }

  private hydrateFromValue(rawVal: string) {
    const t = getTranslation(this.currentLang);
    const trimmed = (rawVal || '').trim();

    if (!trimmed || trimmed.toUpperCase() === 'NONE') {
      if (this.allowOneTime) {
        this.resetRuleFields('NONE');
        this.rawInput = '';
      } else {
        this.resetRuleFields('WEEKLY');
        const rule = this.buildRule();
        this.rawInput = rule ? serializeRRule(rule, this.includePrefix) : '';
      }
      return;
    }

    const parsed = parseRRule(trimmed);
    if (!parsed.ok) {
      this.rawInput = trimmed;
      this.rawError = t.reminders.rruleErrors[parsed.errorCode];
      this.advancedOpen = true;
      return;
    }

    this.applyParsedRule(parsed.rule, false);
  }

  private applyParsedRule(rule: Rfc5545Rule, emitChange: boolean) {
    this.freq = rule.freq;
    this.interval = Math.max(1, Math.round(rule.interval || 1));
    this.byMonth = rule.byMonth ? [...rule.byMonth] : [];
    this.byWeekNo = rule.byWeekNo ? [...rule.byWeekNo] : [];
    this.byYearDay = rule.byYearDay ? [...rule.byYearDay] : [];
    this.byMonthDay = rule.byMonthDay ? [...rule.byMonthDay] : [];
    this.byDay = rule.byDay ? rule.byDay.map((b) => ({ ...b })) : [];
    this.byHour = rule.byHour ? [...rule.byHour] : [];
    this.byMinute = rule.byMinute ? [...rule.byMinute] : [];
    this.bySetPos = rule.bySetPos ? [...rule.bySetPos] : [];
    this.wkst = rule.wkst || 'MO';

    if (rule.until) {
      this.endType = 'until_date';
      this.until = rule.until.slice(0, 10);
      this.count = 5;
    } else if (rule.count && rule.count >= 1) {
      this.endType = 'max_occurrences';
      this.count = Math.round(rule.count);
      this.until = '';
    } else {
      this.endType = 'never';
      this.until = '';
      this.count = 5;
    }

    // Smart UI mode detection for Monthly / Yearly
    const hasMonthDay = this.byMonthDay.length > 0;
    const hasByDay = this.byDay.length > 0;
    const hasSetPos = this.bySetPos.length > 0;

    if (hasMonthDay) {
      this.monthlyMode = 'monthday';
      this.showWeekdayIntersect = hasByDay;
    } else if (hasByDay || hasSetPos) {
      this.monthlyMode = 'weekday';
      this.showWeekdayIntersect = false;
    } else {
      this.monthlyMode = 'monthday';
      this.showWeekdayIntersect = false;
    }

    if (this.byWeekNo.length > 0 || this.byYearDay.length > 0) {
      this.yearlyMode = 'yearindex';
    } else if (hasByDay && !hasMonthDay) {
      this.yearlyMode = 'weekday';
    } else {
      this.yearlyMode = 'monthday';
    }

    // Smart weekday-builder state prefill
    if (this.isWorkdaysByDay(this.byDay)) {
      this.builderTarget = 'WORKDAYS';
      this.builderOrd = this.bySetPos.length === 1 ? String(this.bySetPos[0]) : '-1';
    } else if (this.isWeekendsByDay(this.byDay)) {
      this.builderTarget = 'WEEKENDS';
      this.builderOrd = this.bySetPos.length === 1 ? String(this.bySetPos[0]) : '1';
    } else if (this.byDay.length === 1) {
      this.builderTarget = this.byDay[0].day;
      this.builderOrd = String(this.byDay[0].nth ?? 0);
    }

    // Sync auxiliary text boxes
    this.byWeekNoText = this.byWeekNo.join(', ');
    this.byYearDayText = this.byYearDay.join(', ');
    this.byMinuteText = this.byMinute.join(', ');
    this.syncSetPosUiFromState();

    this.rawInput = serializeRRule(rule, this.includePrefix);
    this.rawError = '';

    if (emitChange) {
      this.commitVisualState();
    }
  }

  private syncSetPosUiFromState() {
    const sp = [...this.bySetPos].sort((a, b) => a - b);
    if (sp.length === 0) {
      this.setPosMode = 'all';
      this.setPosCustomText = '';
    } else if (sp.length === 1 && sp[0] === 1) {
      this.setPosMode = 'first';
      this.setPosCustomText = '1';
    } else if (sp.length === 1 && sp[0] === -1) {
      this.setPosMode = 'last';
      this.setPosCustomText = '-1';
    } else if (sp.length === 2 && sp[0] === -1 && sp[1] === 1) {
      this.setPosMode = 'first_last';
      this.setPosCustomText = '1, -1';
    } else {
      this.setPosMode = 'custom';
      this.setPosCustomText = this.bySetPos.join(', ');
    }
  }

  private isWorkdaysByDay(list: Rfc5545ByDay[]): boolean {
    if (list.length !== 5 || list.some((b) => b.nth !== undefined && b.nth !== 0)) return false;
    const days = new Set(list.map((b) => b.day));
    return WORKDAY_CODES.every((d) => days.has(d));
  }

  private isWeekendsByDay(list: Rfc5545ByDay[]): boolean {
    if (list.length !== 2 || list.some((b) => b.nth !== undefined && b.nth !== 0)) return false;
    const days = new Set(list.map((b) => b.day));
    return WEEKEND_CODES.every((d) => days.has(d));
  }

  private buildRule(): Rfc5545Rule | null {
    if (this.freq === 'NONE') return null;

    const allowByDayNth = this.freq === 'MONTHLY' || this.freq === 'YEARLY';
    const cleanByDay: Rfc5545ByDay[] | undefined =
      this.byDay.length > 0
        ? this.byDay.map((b) =>
            allowByDayNth && b.nth !== undefined && b.nth !== 0 ? { day: b.day, nth: b.nth } : { day: b.day }
          )
        : undefined;

    return {
      freq: this.freq,
      interval: Math.max(1, Math.round(this.interval || 1)),
      count: this.endType === 'max_occurrences' ? Math.max(1, Math.round(this.count || 1)) : undefined,
      until: this.endType === 'until_date' && this.until ? this.until : undefined,
      byMonth: this.byMonth.length > 0 ? [...this.byMonth].sort((a, b) => a - b) : undefined,
      byWeekNo:
        this.freq === 'YEARLY' && this.byWeekNo.length > 0 ? [...this.byWeekNo] : undefined,
      byYearDay:
        this.freq === 'YEARLY' && this.byYearDay.length > 0 ? [...this.byYearDay] : undefined,
      byMonthDay: this.byMonthDay.length > 0 ? [...this.byMonthDay] : undefined,
      byDay: cleanByDay,
      byHour: this.byHour.length > 0 ? [...this.byHour].sort((a, b) => a - b) : undefined,
      byMinute: this.byMinute.length > 0 ? [...this.byMinute].sort((a, b) => a - b) : undefined,
      bySetPos: this.bySetPos.length > 0 ? [...this.bySetPos] : undefined,
      wkst: this.wkst || 'MO',
    };
  }

  private formatHumanSummary(rule: Rfc5545Rule | null): string {
    const t = getTranslation(this.currentLang);
    if (!rule) return t.viewTexts.recurrenceEditor.summaryOnce;

    const draft = buildRecurrenceFromRRule(rule);
    return formatRRuleHumanSummary(draft, {
      freqEvery: t.reminders.rfcFreqEvery,
      weekdaysShortMap: t.reminders.rfcWeekdaysShort,
      monthsShort: t.reminders.monthsShort,
      nthPrefix: t.reminders.nthPrefix,
      monthDayPrefix: t.reminders.monthDayPrefix,
      setPosLabel: t.reminders.setPosLabel,
      weekNoPrefix: t.viewTexts.recurrenceEditor.weekNoSummary,
      yearDayPrefix: t.viewTexts.recurrenceEditor.yearDaySummary,
      timePrefix: t.viewTexts.recurrenceEditor.timeSummary,
      countLabel: t.viewTexts.recurrenceEditor.countSummary,
      untilLabel: t.viewTexts.recurrenceEditor.untilSummary,
    });
  }

  private commitVisualState() {
    const rule = this.buildRule();
    const out = rule ? serializeRRule(rule, this.includePrefix) : '';
    this.rawInput = out;
    this.rawError = '';
    this.lastEmittedValue = out;
    this.value = out;

    const summary = this.formatHumanSummary(rule);
    this.dispatchEvent(
      new CustomEvent<RecurrenceEditorChangeDetail>('change', {
        detail: {
          value: out,
          rrule: out,
          rule,
          isValid: true,
          summary,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  private applyQuickPreset(preset: QuickPreset) {
    if (!preset.body) {
      if (!this.allowOneTime) return;
      this.resetRuleFields('NONE');
      this.commitVisualState();
      return;
    }
    const parsed = parseRRule(preset.body);
    if (parsed.ok) {
      this.applyParsedRule(parsed.rule, true);
    }
  }

  private selectCadence(next: Rfc5545Freq | 'NONE') {
    if (next === this.freq) return;
    if (next === 'NONE') {
      this.resetRuleFields('NONE');
      this.commitVisualState();
      return;
    }

    this.freq = next;
    if (next !== 'MONTHLY' && next !== 'YEARLY') {
      this.byDay = this.byDay.map((b) => ({ day: b.day }));
    }
    if (next !== 'YEARLY') {
      this.byWeekNo = [];
      this.byYearDay = [];
      this.byWeekNoText = '';
      this.byYearDayText = '';
    }
    if (next === 'WEEKLY' && this.byDay.length === 0) {
      this.byDay = [{ day: 'MO' }];
    }
    this.commitVisualState();
  }

  private setIntervalValue(next: number) {
    this.interval = Math.max(1, Math.min(999, Math.round(next || 1)));
    this.commitVisualState();
  }

  private togglePlainWeekday(day: Rfc5545Weekday) {
    const exists = this.byDay.some((b) => b.day === day && !b.nth);
    let next: Rfc5545ByDay[];
    if (exists) {
      next = this.byDay.filter((b) => !(b.day === day && !b.nth));
    } else {
      next = [...this.byDay.filter((b) => b.day !== day), { day }];
      next.sort((a, b) => RFC5545_WEEKDAYS.indexOf(a.day) - RFC5545_WEEKDAYS.indexOf(b.day));
    }
    this.byDay = next;
    this.commitVisualState();
  }

  private setWeekdayGroup(days: readonly Rfc5545Weekday[]) {
    this.byDay = days.map((day) => ({ day }));
    this.commitVisualState();
  }

  private toggleMonthDay(dayNum: number) {
    const exists = this.byMonthDay.includes(dayNum);
    const next = exists
      ? this.byMonthDay.filter((d) => d !== dayNum)
      : [...this.byMonthDay, dayNum].sort((a, b) => a - b);
    this.byMonthDay = next;
    if (!this.showWeekdayIntersect) {
      this.byDay = [];
      this.bySetPos = [];
      this.syncSetPosUiFromState();
    }
    this.commitVisualState();
  }

  private setMonthDaysPreset(days: number[]) {
    this.byMonthDay = [...days];
    if (!this.showWeekdayIntersect) {
      this.byDay = [];
      this.bySetPos = [];
      this.syncSetPosUiFromState();
    }
    this.commitVisualState();
  }

  private toggleIntersectWeekday(checked: boolean) {
    this.showWeekdayIntersect = checked;
    if (!checked) {
      this.byDay = [];
      this.commitVisualState();
    } else {
      this.byDay = this.byDay.map((b) => ({ day: b.day }));
      this.commitVisualState();
    }
  }

  private applyWeekdayBuilderRule() {
    const ordNumRaw =
      this.builderCustomOrdText.trim() && /^[+-]?\d+$/.test(this.builderCustomOrdText.trim())
        ? Number(this.builderCustomOrdText.trim())
        : Number(this.builderOrd) || 0;

    if (this.builderTarget === 'WORKDAYS') {
      this.byMonthDay = [];
      this.byWeekNo = [];
      this.byYearDay = [];
      this.byDay = WORKDAY_CODES.map((day) => ({ day }));
      this.bySetPos = ordNumRaw !== 0 ? [ordNumRaw] : [];
      this.syncSetPosUiFromState();
      this.commitVisualState();
      return;
    }

    if (this.builderTarget === 'WEEKENDS') {
      this.byMonthDay = [];
      this.byWeekNo = [];
      this.byYearDay = [];
      this.byDay = WEEKEND_CODES.map((day) => ({ day }));
      this.bySetPos = ordNumRaw !== 0 ? [ordNumRaw] : [];
      this.syncSetPosUiFromState();
      this.commitVisualState();
      return;
    }

    if (this.builderTarget === 'ANY_DAY') {
      const customDay = /^[+-]?\d+$/.test(this.builderCustomDayText.trim())
        ? Number(this.builderCustomDayText.trim())
        : ordNumRaw;
      const clamped =
        customDay !== 0 && customDay >= -31 && customDay <= 31 ? customDay : 1;
      this.byDay = [];
      this.bySetPos = [];
      this.byMonthDay = [clamped];
      this.syncSetPosUiFromState();
      this.commitVisualState();
      return;
    }

    // Specific weekday (MO..SU) — supports multiple combined ordinal specs e.g. 1MO, -1FR
    const day = this.builderTarget;
    const maxOrd = this.freq === 'YEARLY' ? 53 : 5;
    const validNth =
      ordNumRaw !== 0 && Math.abs(ordNumRaw) <= maxOrd ? ordNumRaw : undefined;

    // If transitioning out of WORKDAYS/WEEKENDS/BYMONTHDAY, replace cleanly
    const wasGroupSetPos =
      (this.isWorkdaysByDay(this.byDay) || this.isWeekendsByDay(this.byDay)) &&
      this.bySetPos.length > 0;
    const baseList = wasGroupSetPos ? [] : [...this.byDay];

    const already = baseList.some((b) => b.day === day && (b.nth ?? 0) === (validNth ?? 0));
    if (!already) {
      baseList.push(validNth ? { day, nth: validNth } : { day });
    }

    this.byMonthDay = [];
    if (wasGroupSetPos) {
      this.bySetPos = [];
      this.syncSetPosUiFromState();
    }
    this.byDay = baseList;
    this.commitVisualState();
  }

  private removeByDaySpec(index: number) {
    this.byDay = this.byDay.filter((_, i) => i !== index);
    if (this.byDay.length === 0 && (this.isWorkdaysByDay(this.byDay) || this.bySetPos.length > 0)) {
      this.bySetPos = [];
      this.syncSetPosUiFromState();
    }
    this.commitVisualState();
  }

  private toggleMonth(month1to12: number) {
    const exists = this.byMonth.includes(month1to12);
    this.byMonth = exists
      ? this.byMonth.filter((m) => m !== month1to12)
      : [...this.byMonth, month1to12].sort((a, b) => a - b);
    this.commitVisualState();
  }

  private setMonthsPreset(months: number[]) {
    this.byMonth = [...months].sort((a, b) => a - b);
    this.commitVisualState();
  }

  private parseIntTokens(raw: string, min: number, max: number, allowZero: boolean): number[] {
    const tokens = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const out: number[] = [];
    for (const tok of tokens) {
      if (!/^[+-]?\d+$/.test(tok)) continue;
      const num = Number(tok);
      if (
        Number.isInteger(num) &&
        num >= min &&
        num <= max &&
        (allowZero || num !== 0) &&
        !out.includes(num)
      ) {
        out.push(num);
      }
    }
    return out;
  }

  private toggleHour(hour: number) {
    const exists = this.byHour.includes(hour);
    this.byHour = exists
      ? this.byHour.filter((h) => h !== hour)
      : [...this.byHour, hour].sort((a, b) => a - b);
    this.commitVisualState();
  }

  private setHoursPreset(hours: number[]) {
    this.byHour = [...hours].sort((a, b) => a - b);
    this.commitVisualState();
  }

  private toggleMinute(min: number) {
    const exists = this.byMinute.includes(min);
    const next = exists
      ? this.byMinute.filter((m) => m !== min)
      : [...this.byMinute, min].sort((a, b) => a - b);
    this.byMinute = next;
    this.byMinuteText = next.join(', ');
    this.commitVisualState();
  }

  private setEndCondition(mode: RecurrenceEndType) {
    this.endType = mode;
    if (mode === 'until_date' && !this.until) {
      const base = this.startDate ? parseLocalDateTime(this.startDate) : new Date();
      const plus90 = new Date(base.getTime());
      plus90.setDate(plus90.getDate() + 90);
      this.until = formatLocalDateTime(plus90).slice(0, 10);
    }
    if (mode === 'max_occurrences' && (!this.count || this.count < 1)) {
      this.count = 5;
    }
    this.commitVisualState();
  }

  private applySetPosMode(mode: SetPosPresetMode) {
    this.setPosMode = mode;
    if (mode === 'all') {
      this.bySetPos = [];
      this.setPosCustomText = '';
    } else if (mode === 'first') {
      this.bySetPos = [1];
      this.setPosCustomText = '1';
    } else if (mode === 'last') {
      this.bySetPos = [-1];
      this.setPosCustomText = '-1';
    } else if (mode === 'first_last') {
      this.bySetPos = [1, -1];
      this.setPosCustomText = '1, -1';
    } else {
      this.bySetPos = this.parseIntTokens(this.setPosCustomText, -366, 366, false);
    }
    this.commitVisualState();
  }

  private applyRawRRuleInput() {
    const t = getTranslation(this.currentLang);
    const cleaned = this.rawInput.trim();
    if (!cleaned) {
      if (this.allowOneTime) {
        this.resetRuleFields('NONE');
        this.commitVisualState();
      } else {
        this.rawError = t.reminders.rruleErrors.empty;
      }
      return;
    }

    const parsed = parseRRule(cleaned);
    if (!parsed.ok) {
      this.rawError = t.reminders.rruleErrors[parsed.errorCode];
      return;
    }

    this.applyParsedRule(parsed.rule, true);
  }

  private resetRawInputToCurrent() {
    const rule = this.buildRule();
    this.rawInput = rule ? serializeRRule(rule, this.includePrefix) : '';
    this.rawError = '';
  }

  private async copyCanonicalRRule() {
    const t = getTranslation(this.currentLang);
    const rule = this.buildRule();
    const text = rule ? serializeRRule(rule, this.includePrefix) : '';
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
    this.copiedRecent = true;
    if (this.copyTimer) window.clearTimeout(this.copyTimer);
    this.copyTimer = window.setTimeout(() => {
      this.copiedRecent = false;
    }, 1800);
    store.addNotification('info', t.reminders.rruleCopiedToast, text);
  }

  private countAdvancedRefinements(): number {
    let n = 0;
    if (this.freq !== 'YEARLY' && this.byMonth.length > 0) n++;
    if (this.freq !== 'HOURLY' && this.freq !== 'MINUTELY' && (this.byHour.length > 0 || this.byMinute.length > 0)) n++;
    if (this.bySetPos.length > 0) n++;
    if (this.wkst !== 'MO') n++;
    return n;
  }

  // ─── Sub-renderers ────────────────────────────────────────────────────────

  private renderMonthDaysGrid() {
    const t = getTranslation(this.currentLang);
    const txt = t.viewTexts.recurrenceEditor;
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const isLastActive = this.byMonthDay.includes(-1);

    return html`
      <div class="re-subblock">
        <span class="re-hint">${txt.monthDaysGridHint}</span>
        <div class="re-days-grid">
          ${days.map((d) => {
            const active = this.byMonthDay.includes(d);
            return html`
              <button
                type="button"
                class="re-day-cell ${active ? 'is-active' : ''}"
                aria-pressed="${active ? 'true' : 'false'}"
                @click="${() => this.toggleMonthDay(d)}"
              >
                ${d}
              </button>
            `;
          })}
          <button
            type="button"
            class="re-day-cell re-day-cell-last ${isLastActive ? 'is-active' : ''}"
            aria-pressed="${isLastActive ? 'true' : 'false'}"
            @click="${() => this.toggleMonthDay(-1)}"
          >
            ${txt.lastDayOfMonthBtn}
          </button>
        </div>

        <div class="re-quick-links">
          <button type="button" class="re-chip-btn" @click="${() => this.setMonthDaysPreset([1])}">
            ${txt.presetDay1}
          </button>
          <button type="button" class="re-chip-btn" @click="${() => this.setMonthDaysPreset([15])}">
            ${txt.presetDay15}
          </button>
          <button type="button" class="re-chip-btn" @click="${() => this.setMonthDaysPreset([1, 15])}">
            ${txt.presetDay1And15}
          </button>
          <button type="button" class="re-chip-btn" @click="${() => this.setMonthDaysPreset([])}">
            ${txt.presetClear}
          </button>
        </div>

        <div class="re-intersect-box">
          <app-checkbox
            label="${txt.intersectWeekdayToggle}"
            .checked="${this.showWeekdayIntersect}"
            @change="${(e: CustomEvent<{ checked: boolean }>) =>
              this.toggleIntersectWeekday(Boolean(e.detail?.checked))}"
          ></app-checkbox>

          ${this.showWeekdayIntersect
            ? html`
                <span class="re-hint">${txt.intersectWeekdayHint}</span>
                ${this.renderWeekdayButtons(false)}
              `
            : ''}
        </div>
      </div>
    `;
  }

  private renderWeekdayButtons(withQuickBar: boolean) {
    const t = getTranslation(this.currentLang);
    const txt = t.viewTexts.recurrenceEditor;
    return html`
      <div class="re-subblock">
        <div class="re-weekdays-row">
          ${RFC5545_WEEKDAYS.map((wd) => {
            const active = this.byDay.some((b) => b.day === wd && !b.nth);
            const isWeekend = wd === 'SA' || wd === 'SU';
            return html`
              <button
                type="button"
                class="re-wd-btn ${active ? 'is-active' : ''} ${isWeekend ? 'is-weekend' : ''}"
                aria-pressed="${active ? 'true' : 'false'}"
                @click="${() => this.togglePlainWeekday(wd)}"
              >
                ${t.reminders.rfcWeekdaysShort[wd]}
              </button>
            `;
          })}
        </div>
        ${withQuickBar
          ? html`
              <div class="re-quick-links">
                <button
                  type="button"
                  class="re-chip-btn"
                  @click="${() => this.setWeekdayGroup(WORKDAY_CODES)}"
                >
                  ${txt.quickWeekdays}
                </button>
                <button
                  type="button"
                  class="re-chip-btn"
                  @click="${() => this.setWeekdayGroup(WEEKEND_CODES)}"
                >
                  ${txt.quickWeekends}
                </button>
                <button
                  type="button"
                  class="re-chip-btn"
                  @click="${() => this.setWeekdayGroup(RFC5545_WEEKDAYS)}"
                >
                  ${txt.quickAllDays}
                </button>
              </div>
            `
          : ''}
      </div>
    `;
  }

  private formatOrdinalLabel(nth: number | undefined): string {
    const txt = getTranslation(this.currentLang).viewTexts.recurrenceEditor;
    if (nth === undefined || nth === 0) return txt.ordinals['0'];
    const key = String(nth) as keyof typeof txt.ordinals;
    if (txt.ordinals[key]) return txt.ordinals[key];
    return getTranslation(this.currentLang).reminders.nthPrefix(nth);
  }

  private renderWeekdayOrdinalBuilder(allowCustomYearOrdinal: boolean) {
    const t = getTranslation(this.currentLang);
    const txt = t.viewTexts.recurrenceEditor;

    const ordOptions = ORDINAL_OPTIONS.map((k) => ({
      value: k,
      label: txt.ordinals[k],
    }));

    const targetOptions: Array<{ value: WeekdayTargetGroup; label: string }> = [
      { value: 'WORKDAYS', label: txt.targetGroups.WORKDAYS },
      { value: 'WEEKENDS', label: txt.targetGroups.WEEKENDS },
      { value: 'ANY_DAY', label: txt.targetGroups.ANY_DAY },
      ...RFC5545_WEEKDAYS.map((wd) => ({
        value: wd as WeekdayTargetGroup,
        label: txt.targetGroups[wd],
      })),
    ];

    const isWorkdaySet = this.isWorkdaysByDay(this.byDay) && this.bySetPos.length > 0;
    const isWeekendSet = this.isWeekendsByDay(this.byDay) && this.bySetPos.length > 0;

    return html`
      <div class="re-subblock">
        <span class="re-hint">${txt.weekdayOrdinalTitle}</span>

        <div class="re-builder-row">
          <app-select
            size="sm"
            label="${txt.ordinalPrefixLabel}"
            .value="${this.builderOrd}"
            .options="${ordOptions}"
            @change="${(e: Event) => {
              this.builderOrd = eventValue(e);
              this.builderCustomOrdText = '';
            }}"
          ></app-select>

          <app-select
            size="sm"
            label="${txt.targetDayGroupLabel}"
            .value="${this.builderTarget}"
            .options="${targetOptions}"
            @change="${(e: Event) => {
              this.builderTarget = eventValue(e) as WeekdayTargetGroup;
            }}"
          ></app-select>

          <app-button
            size="sm"
            variant="primary"
            @click="${() => this.applyWeekdayBuilderRule()}"
          >
            <span slot="icon-start">${iconPlus(14)}</span>
            <span>${txt.addWeekdayRuleBtn}</span>
          </app-button>
        </div>

        ${this.builderTarget === 'ANY_DAY'
          ? html`
              <app-input
                size="sm"
                label="${txt.customOrdinalInput}"
                placeholder="1, 15, -1"
                .value="${this.builderCustomDayText}"
                @input="${(e: Event) => (this.builderCustomDayText = eventValue(e))}"
              ></app-input>
            `
          : allowCustomYearOrdinal
          ? html`
              <app-input
                size="sm"
                label="${txt.customOrdinalInput}"
                placeholder="1..53 / -1"
                .value="${this.builderCustomOrdText}"
                @input="${(e: Event) => (this.builderCustomOrdText = eventValue(e))}"
              ></app-input>
            `
          : ''}

        ${isWorkdaySet || isWeekendSet || this.byDay.length > 0
          ? html`
              <div class="re-subblock">
                <span class="re-hint">${txt.activeDayRulesLabel}</span>
                <div class="re-rules-chips">
                  ${isWorkdaySet || isWeekendSet
                    ? this.bySetPos.map(
                        (pos) => html`
                          <span class="re-rule-chip">
                            <span>
                              ${this.formatOrdinalLabel(pos)} ·
                              ${isWorkdaySet
                                ? txt.targetGroups.WORKDAYS
                                : txt.targetGroups.WEEKENDS}
                            </span>
                            <button
                              type="button"
                              class="re-chip-x"
                              @click="${() => {
                                this.byDay = [];
                                this.bySetPos = [];
                                this.syncSetPosUiFromState();
                                this.commitVisualState();
                              }}"
                            >
                              ${iconX(12)}
                            </button>
                          </span>
                        `
                      )
                    : this.byDay.map(
                        (spec, idx) => html`
                          <span class="re-rule-chip">
                            <span>
                              ${this.formatOrdinalLabel(spec.nth)} · ${txt.targetGroups[spec.day]}
                            </span>
                            <button
                              type="button"
                              class="re-chip-x"
                              @click="${() => this.removeByDaySpec(idx)}"
                            >
                              ${iconX(12)}
                            </button>
                          </span>
                        `
                      )}
                </div>
              </div>
            `
          : html`<span class="re-hint">${txt.noDayRulesHint}</span>`}
      </div>
    `;
  }

  private renderMonthsSelector(showPresets: boolean) {
    const t = getTranslation(this.currentLang);
    const txt = t.viewTexts.recurrenceEditor;

    return html`
      <div class="re-subblock">
        <div class="re-months-grid">
          ${t.reminders.monthsShort.map((mLabel, idx) => {
            const mNum = idx + 1;
            const active = this.byMonth.includes(mNum);
            return html`
              <button
                type="button"
                class="re-month-cell ${active ? 'is-active' : ''}"
                aria-pressed="${active ? 'true' : 'false'}"
                @click="${() => this.toggleMonth(mNum)}"
              >
                ${mLabel}
              </button>
            `;
          })}
        </div>
        ${showPresets
          ? html`
              <div class="re-quick-links">
                <button
                  type="button"
                  class="re-chip-btn"
                  @click="${() => this.setMonthsPreset([1, 4, 7, 10])}"
                >
                  ${txt.yearlyQuarterMonths}
                </button>
                <button
                  type="button"
                  class="re-chip-btn"
                  @click="${() => this.setMonthsPreset([1, 7])}"
                >
                  ${txt.yearlyHalfYearMonths}
                </button>
                <button
                  type="button"
                  class="re-chip-btn"
                  @click="${() => this.setMonthsPreset([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}"
                >
                  ${txt.yearlyAllMonths}
                </button>
                <button
                  type="button"
                  class="re-chip-btn"
                  @click="${() => this.setMonthsPreset([])}"
                >
                  ${txt.presetClear}
                </button>
              </div>
            `
          : ''}
      </div>
    `;
  }

  private renderTimeFilters(showSectionWrapper: boolean) {
    const t = getTranslation(this.currentLang);
    const txt = t.viewTexts.recurrenceEditor;
    const hours = Array.from({ length: 24 }, (_, h) => h);

    const content = html`
      <div class="re-subblock">
        <div class="re-quick-links">
          <button
            type="button"
            class="re-chip-btn"
            @click="${() => this.setHoursPreset([9, 10, 11, 12, 13, 14, 15, 16, 17, 18])}"
          >
            ${txt.workHoursBtn}
          </button>
          <button
            type="button"
            class="re-chip-btn"
            @click="${() => this.setHoursPreset([8, 9, 10, 11, 12])}"
          >
            ${txt.morningHoursBtn}
          </button>
          <button
            type="button"
            class="re-chip-btn"
            @click="${() => this.setHoursPreset([])}"
          >
            ${txt.allHoursResetBtn}
          </button>
        </div>

        <span class="re-block-label">${txt.hoursLabel}</span>
        <div class="re-hours-grid">
          ${hours.map((h) => {
            const active = this.byHour.includes(h);
            const label = String(h).padStart(2, '0');
            return html`
              <button
                type="button"
                class="re-hour-cell ${active ? 'is-active' : ''}"
                aria-pressed="${active ? 'true' : 'false'}"
                @click="${() => this.toggleHour(h)}"
              >
                ${label}
              </button>
            `;
          })}
        </div>

        <span class="re-block-label">${txt.minutesLabel}</span>
        <div class="re-minutes-row">
          ${MINUTE_QUICK_LIST.map((m) => {
            const active = this.byMinute.includes(m);
            const label = `:${String(m).padStart(2, '0')}`;
            return html`
              <button
                type="button"
                class="re-chip-btn ${active ? 'is-active' : ''}"
                @click="${() => this.toggleMinute(m)}"
              >
                ${label}
              </button>
            `;
          })}
          <div class="re-minutes-custom">
            <app-input
              size="sm"
              placeholder="${txt.minutesCustomPlaceholder}"
              .value="${this.byMinuteText}"
              @input="${(e: Event) => {
                const raw = eventValue(e);
                this.byMinuteText = raw;
                this.byMinute = this.parseIntTokens(raw, 0, 59, true);
                this.commitVisualState();
              }}"
            ></app-input>
          </div>
        </div>
      </div>
    `;

    if (!showSectionWrapper) return content;

    return html`
      <section class="re-section">
        <div class="re-section-head">
          <span class="re-section-title">${txt.intradaySectionTitle}</span>
        </div>
        ${content}
        ${this.renderWeekdayButtons(true)}
      </section>
    `;
  }

  private renderPatternSection() {
    if (this.freq === 'NONE') return '';

    const txt = getTranslation(this.currentLang).viewTexts.recurrenceEditor;

    switch (this.freq) {
      case 'DAILY':
        return html`
          <section class="re-section">
            <div class="re-section-head">
              <span class="re-section-title">${txt.dailySectionTitle}</span>
            </div>
            <span class="re-hint">${txt.dailyHint}</span>
            ${this.renderWeekdayButtons(true)}
          </section>
        `;

      case 'WEEKLY':
        return html`
          <section class="re-section">
            <div class="re-section-head">
              <span class="re-section-title">${txt.weeklySectionTitle}</span>
            </div>
            ${this.renderWeekdayButtons(true)}
          </section>
        `;

      case 'MONTHLY':
        return html`
          <section class="re-section">
            <div class="re-section-head">
              <span class="re-section-title">${txt.monthlySectionTitle}</span>
              <div class="re-tabs">
                <button
                  type="button"
                  class="re-tab-btn ${this.monthlyMode === 'monthday' ? 'is-active' : ''}"
                  @click="${() => (this.monthlyMode = 'monthday')}"
                >
                  ${txt.monthlyModeMonthday}
                </button>
                <button
                  type="button"
                  class="re-tab-btn ${this.monthlyMode === 'weekday' ? 'is-active' : ''}"
                  @click="${() => (this.monthlyMode = 'weekday')}"
                >
                  ${txt.monthlyModeWeekday}
                </button>
              </div>
            </div>
            ${this.monthlyMode === 'monthday'
              ? this.renderMonthDaysGrid()
              : this.renderWeekdayOrdinalBuilder(false)}
          </section>
        `;

      case 'YEARLY':
        return html`
          <section class="re-section">
            <div class="re-section-head">
              <span class="re-section-title">${txt.yearlySectionTitle}</span>
              <div class="re-tabs">
                <button
                  type="button"
                  class="re-tab-btn ${this.yearlyMode === 'monthday' ? 'is-active' : ''}"
                  @click="${() => (this.yearlyMode = 'monthday')}"
                >
                  ${txt.yearlyModeMonthday}
                </button>
                <button
                  type="button"
                  class="re-tab-btn ${this.yearlyMode === 'weekday' ? 'is-active' : ''}"
                  @click="${() => (this.yearlyMode = 'weekday')}"
                >
                  ${txt.yearlyModeWeekday}
                </button>
                <button
                  type="button"
                  class="re-tab-btn ${this.yearlyMode === 'yearindex' ? 'is-active' : ''}"
                  @click="${() => (this.yearlyMode = 'yearindex')}"
                >
                  ${txt.yearlyModeYearIndex}
                </button>
              </div>
            </div>

            ${this.yearlyMode !== 'yearindex'
              ? html`
                  <span class="re-hint">${txt.yearlyMonthsLabel}</span>
                  ${this.renderMonthsSelector(true)}
                `
              : ''}

            ${this.yearlyMode === 'monthday'
              ? this.renderMonthDaysGrid()
              : this.yearlyMode === 'weekday'
              ? this.renderWeekdayOrdinalBuilder(true)
              : html`
                  <div class="re-subgrid-2">
                    <div class="re-subblock">
                      <app-input
                        size="sm"
                        label="${txt.byWeekNoLabel}"
                        placeholder="${txt.byWeekNoPlaceholder}"
                        .value="${this.byWeekNoText}"
                        @input="${(e: Event) => {
                          const raw = eventValue(e);
                          this.byWeekNoText = raw;
                          this.byWeekNo = this.parseIntTokens(raw, -53, 53, false);
                          this.commitVisualState();
                        }}"
                      ></app-input>
                      <div class="re-quick-links">
                        <button
                          type="button"
                          class="re-chip-btn"
                          @click="${() => {
                            this.byWeekNo = [1];
                            this.byWeekNoText = '1';
                            this.commitVisualState();
                          }}"
                        >
                          ${txt.presetWeek1}
                        </button>
                        <button
                          type="button"
                          class="re-chip-btn"
                          @click="${() => {
                            this.byWeekNo = [-1];
                            this.byWeekNoText = '-1';
                            this.commitVisualState();
                          }}"
                        >
                          ${txt.presetWeekLast}
                        </button>
                      </div>
                    </div>

                    <div class="re-subblock">
                      <app-input
                        size="sm"
                        label="${txt.byYearDayLabel}"
                        placeholder="${txt.byYearDayPlaceholder}"
                        .value="${this.byYearDayText}"
                        @input="${(e: Event) => {
                          const raw = eventValue(e);
                          this.byYearDayText = raw;
                          this.byYearDay = this.parseIntTokens(raw, -366, 366, false);
                          this.commitVisualState();
                        }}"
                      ></app-input>
                      <div class="re-quick-links">
                        <button
                          type="button"
                          class="re-chip-btn"
                          @click="${() => {
                            this.byYearDay = [1];
                            this.byYearDayText = '1';
                            this.commitVisualState();
                          }}"
                        >
                          ${txt.presetYearDay1}
                        </button>
                        <button
                          type="button"
                          class="re-chip-btn"
                          @click="${() => {
                            this.byYearDay = [256];
                            this.byYearDayText = '256';
                            this.commitVisualState();
                          }}"
                        >
                          ${txt.presetYearDay256}
                        </button>
                        <button
                          type="button"
                          class="re-chip-btn"
                          @click="${() => {
                            this.byYearDay = [-1];
                            this.byYearDayText = '-1';
                            this.commitVisualState();
                          }}"
                        >
                          ${txt.presetYearDayLast}
                        </button>
                      </div>
                    </div>
                  </div>
                `}
          </section>
        `;

      case 'HOURLY':
      case 'MINUTELY':
        return this.renderTimeFilters(true);
    }
  }

  private renderEndSection() {
    if (this.freq === 'NONE') return '';
    const txt = getTranslation(this.currentLang).viewTexts.recurrenceEditor;

    return html`
      <section class="re-section">
        <div class="re-section-head">
          <span class="re-section-title">${txt.endSectionTitle}</span>
        </div>

        <div class="re-end-row">
          <div class="re-tabs">
            <button
              type="button"
              class="re-tab-btn ${this.endType === 'never' ? 'is-active' : ''}"
              @click="${() => this.setEndCondition('never')}"
            >
              ${txt.endNever}
            </button>
            <button
              type="button"
              class="re-tab-btn ${this.endType === 'max_occurrences' ? 'is-active' : ''}"
              @click="${() => this.setEndCondition('max_occurrences')}"
            >
              ${txt.endCount}
            </button>
            <button
              type="button"
              class="re-tab-btn ${this.endType === 'until_date' ? 'is-active' : ''}"
              @click="${() => this.setEndCondition('until_date')}"
            >
              ${txt.endUntil}
            </button>
          </div>

          ${this.endType === 'max_occurrences'
            ? html`
                <div class="re-end-control">
                  <app-number-input
                    size="sm"
                    min="1"
                    max="999"
                    step="1"
                    unit="${txt.occurrencesUnit}"
                    .value="${this.count}"
                    @change="${(e: Event) => {
                      this.count = Math.max(1, Number(eventValue(e)) || 1);
                      this.commitVisualState();
                    }}"
                  ></app-number-input>
                </div>
              `
            : this.endType === 'until_date'
            ? html`
                <div class="re-end-control">
                  <app-date-input
                    size="sm"
                    .value="${this.until}"
                    @change="${(e: Event) => {
                      this.until = eventValue(e);
                      this.commitVisualState();
                    }}"
                  ></app-date-input>
                </div>
              `
            : ''}
        </div>
      </section>
    `;
  }

  private renderAdvancedPanel() {
    const t = getTranslation(this.currentLang);
    const txt = t.viewTexts.recurrenceEditor;
    const activeCount = this.countAdvancedRefinements();

    const setPosOptions = [
      { value: 'all', label: txt.advancedSetPosModeAll },
      { value: 'first', label: txt.advancedSetPosModeFirst },
      { value: 'last', label: txt.advancedSetPosModeLast },
      { value: 'first_last', label: txt.advancedSetPosModeFirstLast },
      { value: 'custom', label: txt.advancedSetPosModeCustom },
    ];

    const wkstOptions = RFC5545_WEEKDAYS.map((wd) => ({
      value: wd,
      label: `${txt.targetGroups[wd]} (${wd})`,
    }));

    return html`
      <div class="re-subblock">
        <button
          type="button"
          class="re-advanced-toggle"
          aria-expanded="${this.advancedOpen ? 'true' : 'false'}"
          @click="${() => (this.advancedOpen = !this.advancedOpen)}"
        >
          <span class="re-advanced-left">
            <span>${txt.advancedToggle}</span>
            ${activeCount > 0
              ? html`<span class="re-advanced-badge">${txt.advancedActiveCount(activeCount)}</span>`
              : ''}
          </span>
          ${this.advancedOpen ? iconChevronUp(16) : iconChevronDown(16)}
        </button>

        ${this.advancedOpen
          ? html`
              <div class="re-advanced-panel">
                ${this.freq !== 'NONE' && this.freq !== 'YEARLY'
                  ? html`
                      <div class="re-subblock">
                        <span class="re-block-label">${txt.advancedMonthsTitle}</span>
                        ${this.renderMonthsSelector(false)}
                      </div>
                    `
                  : ''}

                ${this.freq !== 'NONE' && this.freq !== 'HOURLY' && this.freq !== 'MINUTELY'
                  ? html`
                      <div class="re-subblock">
                        <span class="re-block-label">${txt.advancedTimeTitle}</span>
                        ${this.renderTimeFilters(false)}
                      </div>
                    `
                  : ''}

                ${this.freq !== 'NONE'
                  ? html`
                      <div class="re-subgrid-2">
                        <app-select
                          size="sm"
                          label="${txt.advancedSetPosTitle}"
                          .value="${this.setPosMode}"
                          .options="${setPosOptions}"
                          @change="${(e: Event) =>
                            this.applySetPosMode(eventValue(e) as SetPosPresetMode)}"
                        ></app-select>

                        <app-select
                          size="sm"
                          label="${txt.advancedWkstTitle}"
                          .value="${this.wkst}"
                          .options="${wkstOptions}"
                          @change="${(e: Event) => {
                            this.wkst = eventValue(e) as Rfc5545Weekday;
                            this.commitVisualState();
                          }}"
                        ></app-select>
                      </div>

                      ${this.setPosMode === 'custom'
                        ? html`
                            <app-input
                              size="sm"
                              label="${txt.advancedSetPosTitle}"
                              placeholder="${txt.advancedSetPosCustomPlaceholder}"
                              .value="${this.setPosCustomText}"
                              @input="${(e: Event) => {
                                const raw = eventValue(e);
                                this.setPosCustomText = raw;
                                this.bySetPos = this.parseIntTokens(raw, -366, 366, false);
                                this.commitVisualState();
                              }}"
                            ></app-input>
                          `
                        : ''}
                    `
                  : ''}

                ${!this.hideRruleBar
                  ? html`
                      <div class="re-subblock">
                        <div class="re-raw-row">
                          <div class="re-raw-input-wrap">
                            <app-input
                              size="sm"
                              class="re-mono-input"
                              label="${txt.rawRruleSectionTitle}"
                              placeholder="RRULE:FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13"
                              .value="${this.rawInput}"
                              @input="${(e: Event) => {
                                this.rawInput = eventValue(e);
                                this.rawError = '';
                              }}"
                              @keydown="${(e: KeyboardEvent) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  this.applyRawRRuleInput();
                                }
                              }}"
                            ></app-input>
                          </div>
                          <div class="re-raw-actions">
                            <app-button
                              size="sm"
                              variant="outline"
                              @click="${() => this.applyRawRRuleInput()}"
                            >
                              ${txt.rawApplyBtn}
                            </app-button>
                            <app-button
                              size="sm"
                              variant="ghost"
                              @click="${() => this.resetRawInputToCurrent()}"
                            >
                              ${txt.rawResetBtn}
                            </app-button>
                          </div>
                        </div>

                        ${this.rawError
                          ? html`
                              <div class="re-error-banner">
                                ${iconAlertTriangle(14)}
                                <span>${this.rawError}</span>
                              </div>
                            `
                          : ''}
                      </div>
                    `
                  : ''}
              </div>
            `
          : ''}
      </div>
    `;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const txt = t.viewTexts.recurrenceEditor;
    const rule = this.buildRule();
    const canonicalBody = rule ? serializeRRule(rule, false) : '';
    const canonicalDisplay = rule ? serializeRRule(rule, this.includePrefix) : '';
    const humanSummary = this.formatHumanSummary(rule);

    const visiblePresets = this.allowOneTime
      ? QUICK_PRESETS
      : QUICK_PRESETS.filter((p) => p.id !== 'once');

    const cadenceItems: Array<{ value: Rfc5545Freq | 'NONE'; label: string }> = [
      ...(this.allowOneTime ? [{ value: 'NONE' as const, label: txt.cadenceNone }] : []),
      { value: 'MINUTELY', label: txt.cadenceMinutely },
      { value: 'HOURLY', label: txt.cadenceHourly },
      { value: 'DAILY', label: txt.cadenceDaily },
      { value: 'WEEKLY', label: txt.cadenceWeekly },
      { value: 'MONTHLY', label: txt.cadenceMonthly },
      { value: 'YEARLY', label: txt.cadenceYearly },
    ];

    const startBase =
      this.startDate && this.startDate.trim()
        ? this.startDate
        : `${formatLocalDateTime(new Date()).slice(0, 10)}T10:00`;

    const draftRecurrence = buildRecurrenceFromRRule(rule);
    const upcomingDates =
      rule !== null ? getUpcomingRRuleOccurrences(startBase, draftRecurrence, 5) : [];

    return html`
      <div class="re-shell">
        <!-- Live Summary + Canonical RFC 5545 Readout -->
        <div class="re-summary-card">
          <div class="re-summary-top">
            <div class="re-summary-main">
              <span class="re-summary-icon">${iconRepeat(15)}</span>
              <div class="re-summary-copy">
                <span class="re-summary-kicker">${txt.summaryLabel}</span>
                <span class="re-summary-text">${humanSummary}</span>
              </div>
            </div>
          </div>

          ${!this.hideRruleBar && canonicalDisplay
            ? html`
                <div class="re-rrule-row">
                  <div class="re-rrule-code-wrap">
                    <span class="re-rrule-label">${txt.rruleOutputLabel}</span>
                    <code class="re-rrule-code">${canonicalDisplay}</code>
                  </div>
                  <app-button
                    size="xs"
                    variant="ghost"
                    title="${t.reminders.rruleCopyBtn}"
                    @click="${() => this.copyCanonicalRRule()}"
                  >
                    <span slot="icon-start">
                      ${this.copiedRecent ? iconCheck(13) : iconCopy(13)}
                    </span>
                  </app-button>
                </div>
              `
            : ''}
        </div>

        <!-- Friendly Quick Scenarios -->
        <div class="re-presets-block">
          <span class="re-block-label">${txt.presetsTitle}</span>
          <div class="re-presets-wrap">
            ${visiblePresets.map((preset) => {
              const active = canonicalBody === preset.body;
              return html`
                <button
                  type="button"
                  class="re-chip-btn ${active ? 'is-active' : ''}"
                  @click="${() => this.applyQuickPreset(preset)}"
                >
                  ${txt[preset.labelKey]}
                </button>
              `;
            })}
          </div>
        </div>

        <!-- Step 1: Cadence & Interval -->
        <section class="re-section">
          <div class="re-section-head">
            <span class="re-section-title">${txt.cadenceSectionTitle}</span>
          </div>

          <div class="re-cadence-grid">
            ${cadenceItems.map(
              (item) => html`
                <button
                  type="button"
                  class="re-cadence-btn ${this.freq === item.value ? 'is-active' : ''}"
                  aria-pressed="${this.freq === item.value ? 'true' : 'false'}"
                  @click="${() => this.selectCadence(item.value)}"
                >
                  ${item.label}
                </button>
              `
            )}
          </div>

          ${this.freq !== 'NONE'
            ? html`
                <div class="re-interval-row">
                  <span class="re-inline-text">${txt.everyWord}</span>
                  <div class="re-stepper">
                    <button
                      type="button"
                      class="re-step-btn"
                      ?disabled="${this.interval <= 1}"
                      aria-label="-"
                      @click="${() => this.setIntervalValue(this.interval - 1)}"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      class="re-step-input"
                      min="1"
                      max="999"
                      .value="${String(this.interval)}"
                      @change="${(e: Event) => {
                        const val = parseInt((e.target as HTMLInputElement).value, 10);
                        this.setIntervalValue(Number.isNaN(val) ? 1 : val);
                      }}"
                    />
                    <button
                      type="button"
                      class="re-step-btn"
                      ?disabled="${this.interval >= 999}"
                      aria-label="+"
                      @click="${() => this.setIntervalValue(this.interval + 1)}"
                    >
                      +
                    </button>
                  </div>
                  <span class="re-inline-text">${txt.intervalUnits[this.freq]}</span>
                </div>
              `
            : ''}
        </section>

        <!-- Step 2: Adaptive Schedule Rules -->
        ${this.renderPatternSection()}

        <!-- Step 3: End Condition -->
        ${this.renderEndSection()}

        <!-- Fine-grained RFC 5545 & Two-Way Import/Export -->
        ${this.renderAdvancedPanel()}

        <!-- Upcoming Dates Live Preview -->
        <div class="re-preview-box">
          <span class="re-block-label">${txt.previewTitle}</span>
          ${this.freq === 'NONE'
            ? html`<span class="re-hint">${txt.previewEmptyOnce}</span>`
            : upcomingDates.length === 0
            ? html`<span class="re-hint">${txt.previewEmptyNoMatch}</span>`
            : html`
                <div class="re-preview-dates">
                  ${upcomingDates.map(
                    (dt) => html`
                      <span class="re-preview-chip">
                        ${this.freq === 'HOURLY' || this.freq === 'MINUTELY'
                          ? iconClock(12)
                          : iconCalendar()}
                        <span>
                          ${parseLocalDateTime(dt).toLocaleString(t.common.locale, {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    `
                  )}
                </div>
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-recurrence-editor': AppRecurrenceEditor;
  }
}

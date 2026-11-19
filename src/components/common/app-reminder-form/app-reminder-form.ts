import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import {
  RecurrenceEndType,
  Reminder,
  ReminderEntityType,
  ReminderLeadUnit,
  ReminderNotificationChannel,
  ReminderNotificationRule,
  ReminderPriority,
  ReminderRecurrence,
  ReminderRecipientMode,
  ReminderStatus,
  Rfc5545ByDay,
  Rfc5545Freq,
  Rfc5545Weekday,
} from '../../../types';
import {
  RFC5545_FREQS,
  RFC5545_WEEKDAYS,
  Rfc5545Rule,
  buildRecurrenceFromRRule,
  formatRRuleHumanSummary,
  parseRRule,
  recurrenceToRRule,
  serializeRRule,
} from '../../../domain/rfc5545';
import { getTranslation } from '../../../i18n';
import styles from './app-reminder-form.css';
import { eventValue } from '../event-value';
import {
  iconBell,
  iconBellRing,
  iconCalendar,
  iconCopy,
  iconPaperclip,
  iconPlus,
  iconRepeat,
  iconTrash,
  iconX,
} from '../icons';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-input/app-input';
import '../app-select/app-select';
import '../app-textarea/app-textarea';
import '../app-date-input/app-date-input';
import '../app-number-input/app-number-input';
import '../app-entity-selector/app-entity-selector';
import type { AppEntitySelector } from '../app-entity-selector/app-entity-selector';
import '../app-switch/app-switch';
import '../app-button/app-button';
import {
  AttachmentsChangeDetail,
  commitPendingAttachments,
  PendingAttachmentFile,
} from '../app-project-attachments/app-project-attachments';
import '../app-project-attachments/app-project-attachments';

const REMINDER_ENTITY_TYPES: ReminderEntityType[] = [
  'company',
  'counterparty',
  'contact',
  'contract',
  'employee',
  'invoice',
  'calculation',
  'payment',
  'project',
  'task',
  'document',
  'requirement',
  'expense',
  'none',
];

@customElement('app-reminder-form')
export class AppReminderForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ attribute: false }) reminder: Reminder | null = null;
  @property({ type: String }) presetEntityType: ReminderEntityType | '' = '';
  @property({ type: String }) presetEntityId: string = '';

  @state() private currentLang = store.customization.language;
  @state() private formError = '';

  // Base fields
  @state() private fTitle = '';
  @state() private fDescription = '';
  @state() private fEntityType: ReminderEntityType = 'project';
  @state() private fEntityId = '';
  @state() private fDueDate = '';
  @state() private fDueTime = '10:00';
  @state() private fPriority: ReminderPriority = 'medium';
  @state() private fStatus: ReminderStatus = 'active';
  @state() private fOwnerId = '';
  @state() private fAssigneeIds: string[] = [];
  @state() private fTags = '';
  @state() private fAttachmentIds: string[] = [];
  @state() private fPendingFiles: PendingAttachmentFile[] = [];

  // RFC 5545 Recurrence fields
  @state() private fTemplateCode = 'ONCE';
  @state() private fFreq: Rfc5545Freq | 'NONE' = 'NONE';
  @state() private fInterval = 1;
  @state() private fWkst: Rfc5545Weekday = 'MO';
  @state() private fByDay: Rfc5545ByDay[] = [];
  @state() private fByDayOrdinal = 0;
  @state() private fByMonthDayText = '';
  @state() private fByMonth: number[] = [];
  @state() private fBySetPosText = '';
  @state() private fByYearDay?: number[];
  @state() private fByWeekNo?: number[];
  @state() private fByHour?: number[];
  @state() private fByMinute?: number[];
  @state() private fSkipWeekends = false;
  @state() private fEndType: RecurrenceEndType = 'never';
  @state() private fEndDate = '';
  @state() private fMaxOccurrences = 5;
  @state() private fOccurrenceCount = 0;
  @state() private fRruleInput = '';
  @state() private fRruleError = '';

  // Notifications config
  @state() private fRules: ReminderNotificationRule[] = [];
  @state() private fSoundEnabled = false;
  @state() private fRequireAck = false;
  @state() private fQuietHoursRespect = true;
  @state() private fRepeatNagMinutes = 0;
  @state() private fEscalationUserId = '';

  private unsubscribe?: () => void;

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
    if (this.unsubscribe) this.unsubscribe();
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('open') && this.open) {
      this.initFields();
    }
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('open') && !this.open) {
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }
  }

  private parseIntListText(raw: string, min: number, max: number): number[] | undefined {
    const tokens = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length === 0) return undefined;
    const nums: number[] = [];
    for (const tok of tokens) {
      if (!/^[+-]?\d+$/.test(tok)) continue;
      const n = Number(tok);
      if (Number.isInteger(n) && n !== 0 && n >= min && n <= max && !nums.includes(n)) {
        nums.push(n);
      }
    }
    return nums.length > 0 ? nums : undefined;
  }

  private applyRuleToFields(rule: Rfc5545Rule | null) {
    if (!rule) {
      this.fFreq = 'NONE';
      this.fInterval = 1;
      this.fWkst = 'MO';
      this.fByDay = [];
      this.fByDayOrdinal = 0;
      this.fByMonthDayText = '';
      this.fByMonth = [];
      this.fBySetPosText = '';
      this.fByYearDay = undefined;
      this.fByWeekNo = undefined;
      this.fByHour = undefined;
      this.fByMinute = undefined;
      this.fEndType = 'never';
      this.fEndDate = '';
      this.fMaxOccurrences = 5;
      this.fRruleInput = '';
      this.fRruleError = '';
      return;
    }

    this.fFreq = rule.freq;
    this.fInterval = Math.max(1, rule.interval || 1);
    this.fWkst = rule.wkst || 'MO';
    this.fByDay = rule.byDay ? rule.byDay.map((b) => ({ ...b })) : [];
    const firstNth = rule.byDay?.find((b) => b.nth !== undefined && b.nth !== 0)?.nth;
    this.fByDayOrdinal = firstNth ?? 0;
    this.fByMonthDayText = rule.byMonthDay?.length ? rule.byMonthDay.join(', ') : '';
    this.fByMonth = rule.byMonth ? [...rule.byMonth] : [];
    this.fBySetPosText = rule.bySetPos?.length ? rule.bySetPos.join(', ') : '';
    this.fByYearDay = rule.byYearDay ? [...rule.byYearDay] : undefined;
    this.fByWeekNo = rule.byWeekNo ? [...rule.byWeekNo] : undefined;
    this.fByHour = rule.byHour ? [...rule.byHour] : undefined;
    this.fByMinute = rule.byMinute ? [...rule.byMinute] : undefined;

    if (rule.until) {
      this.fEndType = 'until_date';
      this.fEndDate = rule.until.slice(0, 10);
    } else if (rule.count && rule.count >= 1) {
      this.fEndType = 'max_occurrences';
      this.fMaxOccurrences = rule.count;
    } else {
      this.fEndType = 'never';
      this.fEndDate = '';
    }

    this.fRruleInput = serializeRRule(rule, true);
    this.fRruleError = '';
  }

  private buildCurrentRfcRule(): Rfc5545Rule | null {
    if (this.fFreq === 'NONE') return null;
    const byMonthDay = this.parseIntListText(this.fByMonthDayText, -31, 31);
    const bySetPos = this.parseIntListText(this.fBySetPosText, -366, 366);

    const allowOrdinal = this.fFreq === 'MONTHLY' || this.fFreq === 'YEARLY';
    const byDay =
      this.fByDay.length > 0
        ? this.fByDay.map((b) =>
            allowOrdinal && this.fByDayOrdinal !== 0
              ? { day: b.day, nth: this.fByDayOrdinal }
              : { day: b.day }
          )
        : undefined;

    return {
      freq: this.fFreq,
      interval: Math.max(1, Math.round(Number(this.fInterval) || 1)),
      count:
        this.fEndType === 'max_occurrences'
          ? Math.max(1, Math.round(Number(this.fMaxOccurrences) || 1))
          : undefined,
      until: this.fEndType === 'until_date' && this.fEndDate ? this.fEndDate : undefined,
      byMonth:
        (this.fFreq === 'MONTHLY' || this.fFreq === 'YEARLY') && this.fByMonth.length > 0
          ? [...this.fByMonth].sort((a, b) => a - b)
          : undefined,
      byMonthDay:
        this.fFreq === 'MONTHLY' || this.fFreq === 'YEARLY' ? byMonthDay : undefined,
      byDay,
      bySetPos:
        this.fFreq === 'MONTHLY' || this.fFreq === 'YEARLY' ? bySetPos : undefined,
      byYearDay: this.fByYearDay?.length ? [...this.fByYearDay] : undefined,
      byWeekNo: this.fByWeekNo?.length ? [...this.fByWeekNo] : undefined,
      byHour: this.fByHour?.length ? [...this.fByHour] : undefined,
      byMinute: this.fByMinute?.length ? [...this.fByMinute] : undefined,
      wkst: this.fWkst || 'MO',
    };
  }

  private buildDraftRecurrence(): ReminderRecurrence {
    const rule = this.buildCurrentRfcRule();
    return buildRecurrenceFromRRule(rule, {
      templateCode: this.fTemplateCode || (rule ? 'CUSTOM' : 'ONCE'),
      skipWeekends: this.fSkipWeekends,
      occurrenceCount: this.fOccurrenceCount,
    });
  }

  private syncRruleTextFromControls() {
    const rule = this.buildCurrentRfcRule();
    this.fRruleInput = rule ? serializeRRule(rule, true) : '';
    this.fRruleError = '';
  }

  private initFields() {
    this.formError = '';
    this.fRruleError = '';
    if (this.reminder) {
      const rem = this.reminder;
      const [datePart, timePart] = (rem.dueAt || '').split('T');
      this.fTitle = rem.title;
      this.fDescription = rem.description || '';
      this.fEntityType = rem.entityType || 'none';
      this.fEntityId = rem.entityId || '';
      this.fDueDate = datePart || store.formatLocalDateTime(new Date()).slice(0, 10);
      this.fDueTime = (timePart || '10:00').slice(0, 5);
      this.fPriority = rem.priority;
      this.fStatus = rem.status;
      this.fOwnerId = rem.ownerId || store.currentUserId;
      this.fAssigneeIds = [...(rem.assigneeIds || [])];
      this.fTags = (rem.tags || []).join(', ');
      this.fAttachmentIds = rem.attachmentIds ? [...rem.attachmentIds] : [];
      this.fPendingFiles = [];

      this.fTemplateCode = rem.recurrence.templateCode || 'ONCE';
      this.fSkipWeekends = Boolean(rem.recurrence.skipWeekends);
      this.fOccurrenceCount = rem.recurrence.occurrenceCount || 0;

      const parsed = recurrenceToRRule(rem.recurrence);
      this.applyRuleToFields(parsed);

      this.fRules = rem.notifications.rules.map((r) => ({
        ...r,
        recipientUserIds: r.recipientUserIds ? [...r.recipientUserIds] : undefined,
      }));
      this.fSoundEnabled = Boolean(rem.notifications.soundEnabled);
      this.fRequireAck = Boolean(rem.notifications.requireAck);
      this.fQuietHoursRespect = rem.notifications.quietHoursRespect !== false;
      this.fRepeatNagMinutes = rem.notifications.repeatNagMinutes || 0;
      this.fEscalationUserId = rem.notifications.escalationUserId || '';
      return;
    }

    const defaultEntityType: ReminderEntityType =
      this.presetEntityType && REMINDER_ENTITY_TYPES.includes(this.presetEntityType as ReminderEntityType)
        ? (this.presetEntityType as ReminderEntityType)
        : 'project';
    const entityOptions = store.getReminderEntityOptions(defaultEntityType);
    const defaultEntityId =
      defaultEntityType === 'none'
        ? ''
        : this.presetEntityId || entityOptions[0]?.value || '';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = store.formatLocalDateTime(tomorrow).slice(0, 10);
    const owner = store.currentUserId || store.users[0]?.id || 'user-1';

    this.fTitle = '';
    this.fDescription = '';
    this.fEntityType = defaultEntityType;
    this.fEntityId = defaultEntityId;
    this.fDueDate = tomorrowStr;
    this.fDueTime = '10:00';
    this.fPriority = 'medium';
    this.fStatus = 'active';
    this.fOwnerId = owner;
    this.fAssigneeIds = [owner];
    this.fTags = '';
    this.fAttachmentIds = [];
    this.fPendingFiles = [];

    this.fTemplateCode = 'ONCE';
    this.fSkipWeekends = false;
    this.fOccurrenceCount = 0;
    this.applyRuleToFields(null);

    this.fRules = [
      {
        id: `rnr-${Date.now().toString(36)}`,
        channel: 'in_app',
        offsetValue: 30,
        offsetUnit: 'minutes',
        recipientMode: 'assignees',
        enabled: true,
      },
    ];
    this.fSoundEnabled = false;
    this.fRequireAck = false;
    this.fQuietHoursRespect = true;
    this.fRepeatNagMinutes = 0;
    this.fEscalationUserId = '';
  }

  private closeModal() {
    this.open = false;
  }

  private handleEntityTypeChange(nextType: ReminderEntityType) {
    this.fEntityType = nextType;
    if (nextType === 'none') {
      this.fEntityId = '';
    } else {
      const opts = store.getReminderEntityOptions(nextType);
      this.fEntityId = opts[0]?.value || '';
    }
  }

  private applyRecurrenceTemplate(code: string) {
    this.fTemplateCode = code;
    const templates = store.getRecurrenceTemplates();
    const rec = templates.find((item) => item.code === code);
    if (!rec || !rec.extra) return;

    const rruleStr = String(rec.extra.rrule || '').trim();
    const rawFreq = String(rec.extra.freq || 'NONE').toUpperCase();
    const interval = Math.max(1, Number(rec.extra.interval || 1));
    const skipWeekends = Boolean(rec.extra.skipWeekends);
    const leadMin = Number(rec.extra.defaultLeadMinutes ?? 30);

    this.fSkipWeekends = skipWeekends;

    if (!rruleStr || rawFreq === 'NONE' || code === 'ONCE') {
      this.applyRuleToFields(null);
    } else {
      const parsed = parseRRule(rruleStr);
      if (parsed.ok) {
        this.applyRuleToFields(parsed.rule);
      } else {
        const freq = RFC5545_FREQS.includes(rawFreq as Rfc5545Freq)
          ? (rawFreq as Rfc5545Freq)
          : 'WEEKLY';
        this.applyRuleToFields({ freq, interval, wkst: 'MO' });
      }
    }

    if (this.fRules.length > 0 && leadMin >= 0) {
      const first = { ...this.fRules[0] };
      if (leadMin === 0) {
        first.offsetUnit = 'at_time';
        first.offsetValue = 0;
      } else if (leadMin % 1440 === 0) {
        first.offsetUnit = 'days';
        first.offsetValue = Math.round(leadMin / 1440);
      } else if (leadMin % 60 === 0) {
        first.offsetUnit = 'hours';
        first.offsetValue = Math.round(leadMin / 60);
      } else {
        first.offsetUnit = 'minutes';
        first.offsetValue = leadMin;
      }
      this.fRules = [first, ...this.fRules.slice(1)];
    }
  }

  private applyQuickPattern(
    rruleStr: string,
    templateCode: string,
    skipWeekends: boolean = false
  ) {
    const parsed = parseRRule(rruleStr);
    if (!parsed.ok) return;
    this.fTemplateCode = templateCode;
    this.fSkipWeekends = skipWeekends;
    this.applyRuleToFields(parsed.rule);
  }

  private applyRawRRule(): boolean {
    const t = getTranslation(this.currentLang);
    const raw = this.fRruleInput.trim();
    if (!raw) {
      this.fTemplateCode = 'ONCE';
      this.applyRuleToFields(null);
      return true;
    }
    const parsed = parseRRule(raw);
    if (!parsed.ok) {
      this.fRruleError = t.reminders.rruleErrors[parsed.errorCode];
      return false;
    }

    // Match against directory templates if an identical canonical rule exists
    const canonical = serializeRRule(parsed.rule, false);
    const matchingTpl = store.getRecurrenceTemplates().find((tpl) => {
      const tplRaw = String(tpl.extra?.rrule || '').trim();
      if (!tplRaw) return false;
      const tplParsed = parseRRule(tplRaw);
      return tplParsed.ok && serializeRRule(tplParsed.rule, false) === canonical;
    });
    this.fTemplateCode = matchingTpl ? matchingTpl.code : 'CUSTOM';
    this.applyRuleToFields(parsed.rule);
    return true;
  }

  private async copyRRule() {
    const t = getTranslation(this.currentLang);
    const rule = this.buildCurrentRfcRule();
    const text = rule ? serializeRRule(rule, true) : this.fRruleInput.trim();
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
      store.addNotification('info', t.reminders.rruleCopiedToast, text);
    } catch {
      store.addNotification('info', t.reminders.rruleCopiedToast, text);
    }
  }

  private toggleWeekday(day: Rfc5545Weekday) {
    const exists = this.fByDay.some((b) => b.day === day);
    let next: Rfc5545ByDay[];
    if (exists) {
      // Allow emptying BYDAY in MONTHLY/YEARLY so BYMONTHDAY alone works (e.g. every 15th)
      if (this.fFreq === 'WEEKLY' && this.fByDay.length <= 1) {
        return;
      }
      next = this.fByDay.filter((b) => b.day !== day);
    } else {
      const nth =
        (this.fFreq === 'MONTHLY' || this.fFreq === 'YEARLY') && this.fByDayOrdinal !== 0
          ? this.fByDayOrdinal
          : undefined;
      next = [...this.fByDay, nth ? { day, nth } : { day }];
      next.sort(
        (a, b) => RFC5545_WEEKDAYS.indexOf(a.day) - RFC5545_WEEKDAYS.indexOf(b.day)
      );
    }
    this.fByDay = next;
    this.fTemplateCode = 'CUSTOM';
    this.syncRruleTextFromControls();
  }

  private toggleMonth(month1to12: number) {
    const exists = this.fByMonth.includes(month1to12);
    this.fByMonth = exists
      ? this.fByMonth.filter((m) => m !== month1to12)
      : [...this.fByMonth, month1to12].sort((a, b) => a - b);
    this.fTemplateCode = 'CUSTOM';
    this.syncRruleTextFromControls();
  }

  private addAssignee(userId: string) {
    if (!userId || this.fAssigneeIds.includes(userId)) return;
    this.fAssigneeIds = [...this.fAssigneeIds, userId];
  }

  private removeAssignee(userId: string) {
    this.fAssigneeIds = this.fAssigneeIds.filter((id) => id !== userId);
  }

  private addRuleRecipient(ruleId: string, userId: string) {
    if (!userId) return;
    this.fRules = this.fRules.map((r) =>
      r.id === ruleId
        ? {
            ...r,
            recipientUserIds: r.recipientUserIds?.includes(userId)
              ? r.recipientUserIds
              : [...(r.recipientUserIds || []), userId],
          }
        : r
    );
  }

  private removeRuleRecipient(ruleId: string, userId: string) {
    this.fRules = this.fRules.map((r) =>
      r.id === ruleId
        ? { ...r, recipientUserIds: (r.recipientUserIds || []).filter((id) => id !== userId) }
        : r
    );
  }

  private addNotificationRule() {
    const channels: ReminderNotificationChannel[] = [
      'email',
      'toast',
      'telegram',
      'push',
      'webhook',
      'in_app',
    ];
    const used = new Set(this.fRules.map((r) => r.channel));
    const nextChannel = channels.find((c) => !used.has(c)) || 'in_app';
    this.fRules = [
      ...this.fRules,
      {
        id: `rnr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`,
        channel: nextChannel,
        offsetValue: 1,
        offsetUnit: 'hours',
        recipientMode: 'owner',
        enabled: true,
      },
    ];
  }

  private updateRule(id: string, patch: Partial<ReminderNotificationRule>) {
    this.fRules = this.fRules.map((r) => (r.id === id ? { ...r, ...patch } : r));
  }

  private removeRule(id: string) {
    if (this.fRules.length <= 1) return;
    this.fRules = this.fRules.filter((r) => r.id !== id);
  }

  private resolveAttachmentContext(): {
    projectId?: string;
    companyId?: string;
    contractId?: string;
    counterpartyId?: string;
    taskId?: string;
  } {
    const id = this.fEntityId;
    if (!id || this.fEntityType === 'none') return {};
    switch (this.fEntityType) {
      case 'project': {
        const p = store.projects.find((x) => x.id === id);
        return { projectId: id, companyId: p?.companyId, counterpartyId: p?.counterpartyId };
      }
      case 'company':
        return { companyId: id };
      case 'counterparty':
        return { counterpartyId: id };
      case 'contract': {
        const c = store.contracts.find((x) => x.id === id);
        return {
          contractId: id,
          projectId: c?.projectId,
          companyId: c?.companyId,
          counterpartyId: c?.counterpartyId,
        };
      }
      case 'task': {
        const tk = store.tasks.find((x) => x.id === id);
        const p = tk ? store.projects.find((x) => x.id === tk.projectId) : undefined;
        return { taskId: id, projectId: tk?.projectId, companyId: p?.companyId };
      }
      case 'invoice': {
        const inv = store.invoices.find((x) => x.id === id);
        return {
          contractId: inv?.contractId,
          companyId: inv?.companyId,
          counterpartyId: inv?.counterpartyId,
        };
      }
      case 'calculation': {
        const calc = store.calculations.find((x) => x.id === id);
        return {
          contractId: calc?.contractId,
          projectId: calc?.projectId,
          companyId: calc?.companyId,
          counterpartyId: calc?.counterpartyId,
        };
      }
      case 'payment': {
        const pay = store.payments.find((x) => x.id === id);
        return {
          contractId: pay?.contractId,
          companyId: pay?.companyId,
          counterpartyId: pay?.counterpartyId,
        };
      }
      case 'requirement': {
        const req = store.requirements.find((x) => x.id === id);
        return { projectId: req?.projectId };
      }
      case 'expense': {
        const exp = store.expenses.find((x) => x.id === id);
        return { projectId: exp?.projectId, taskId: exp?.taskId };
      }
      default:
        return {};
    }
  }

  private handleSave() {
    const t = getTranslation(this.currentLang);
    const title = this.fTitle.trim();
    if (!title) {
      this.formError = t.common.required;
      return;
    }
    if (!this.fDueDate) {
      this.formError = t.common.required;
      return;
    }

    // If user typed directly in the RRULE field without pressing Apply, validate & sync it
    const currentRule = this.buildCurrentRfcRule();
    const expectedText = currentRule ? serializeRRule(currentRule, true) : '';
    if (this.fRruleInput.trim() !== expectedText) {
      const applied = this.applyRawRRule();
      if (!applied) {
        return;
      }
    }

    const dueAt = `${this.fDueDate}T${(this.fDueTime || '10:00').slice(0, 5)}`;
    const recurrence = this.buildDraftRecurrence();

    const tags = this.fTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const ctx = this.resolveAttachmentContext();
    const attachmentIds = commitPendingAttachments({
      ...ctx,
      category: 'other',
      tags: [...tags],
      existingDocumentIds: this.fAttachmentIds,
      pendingFiles: this.fPendingFiles,
      description: this.fDescription.trim(),
      versionNote: title,
    });

    const payload = {
      title,
      description: this.fDescription.trim(),
      entityType: this.fEntityType,
      entityId: this.fEntityType === 'none' ? undefined : this.fEntityId || undefined,
      dueAt,
      status: this.reminder ? this.fStatus : ('active' as ReminderStatus),
      priority: this.fPriority,
      ownerId: this.fOwnerId || store.currentUserId,
      assigneeIds:
        this.fAssigneeIds.length > 0
          ? [...this.fAssigneeIds]
          : [this.fOwnerId || store.currentUserId],
      recurrence,
      notifications: {
        rules: this.fRules.map((r) => ({ ...r })),
        soundEnabled: this.fSoundEnabled,
        requireAck: this.fRequireAck,
        quietHoursRespect: this.fQuietHoursRespect,
        repeatNagMinutes: this.fRepeatNagMinutes,
        escalationUserId: this.fEscalationUserId || undefined,
      },
      tags,
      attachmentIds,
    };

    let saved: Reminder;
    if (this.reminder) {
      saved = {
        ...this.reminder,
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      store.updateReminder(saved);
    } else {
      saved = store.addReminder(payload);
    }

    this.fPendingFiles = [];
    this.dispatchEvent(
      new CustomEvent('saved', { detail: { reminder: saved }, bubbles: true, composed: true })
    );
    this.closeModal();
  }

  render() {
    const t = getTranslation(this.currentLang);
    const isEdit = Boolean(this.reminder);
    const useEnNames = t.common.locale.startsWith('en');

    const entityTypeOptions = REMINDER_ENTITY_TYPES.map((et) => ({
      value: et,
      label: t.entityTypes[et] || et,
    }));
    const entityOptions = store.getReminderEntityOptions(this.fEntityType).map((o) => ({
      value: o.value,
      label: o.label,
      subtitle: o.subtitle,
    }));

    const userSelectorOptions = store.users.map((u) => ({
      value: u.id,
      label: u.name,
      subtitle: u.role,
    }));

    const templateOptions = store.getRecurrenceTemplates().map((rec) => ({
      value: rec.code,
      label: useEnNames && rec.nameEn ? rec.nameEn : rec.name,
    }));

    const freqOptions: Array<{ value: Rfc5545Freq | 'NONE'; label: string }> = [
      { value: 'NONE', label: t.reminders.rfcFreqs.NONE },
      ...RFC5545_FREQS.map((f) => ({ value: f, label: t.reminders.rfcFreqs[f] })),
    ];

    const wkstOptions = RFC5545_WEEKDAYS.map((w) => ({
      value: w,
      label: `${t.reminders.rfcWeekdaysShort[w]} (${w})`,
    }));

    const ordinalOptions = [
      { value: '0', label: t.reminders.byDayNthOptions.any },
      { value: '1', label: t.reminders.byDayNthOptions.pos1 },
      { value: '2', label: t.reminders.byDayNthOptions.pos2 },
      { value: '3', label: t.reminders.byDayNthOptions.pos3 },
      { value: '4', label: t.reminders.byDayNthOptions.pos4 },
      { value: '-1', label: t.reminders.byDayNthOptions.neg1 },
    ];

    const setPosOptions = [
      { value: '', label: t.reminders.setPosPresets.none },
      { value: '1', label: t.reminders.setPosPresets.first },
      { value: '-1', label: t.reminders.setPosPresets.last },
      ...(this.fBySetPosText &&
      this.fBySetPosText !== '1' &&
      this.fBySetPosText !== '-1'
        ? [{ value: this.fBySetPosText, label: `BYSETPOS=${this.fBySetPosText}` }]
        : []),
    ];

    const endTypeOptions: Array<{ value: RecurrenceEndType; label: string }> = [
      { value: 'never', label: t.reminders.endTypes.never },
      { value: 'until_date', label: t.reminders.endTypes.until_date },
      { value: 'max_occurrences', label: t.reminders.endTypes.max_occurrences },
    ];

    const priorityOptions: Array<{ value: ReminderPriority; label: string }> = [
      { value: 'low', label: t.priority.low },
      { value: 'medium', label: t.priority.medium },
      { value: 'high', label: t.priority.high },
      { value: 'urgent', label: t.priority.urgent },
    ];

    const statusOptions: Array<{ value: ReminderStatus; label: string }> = [
      { value: 'active', label: t.reminders.statuses.active },
      { value: 'snoozed', label: t.reminders.statuses.snoozed },
      { value: 'paused', label: t.reminders.statuses.paused },
      { value: 'completed', label: t.reminders.statuses.completed },
      { value: 'cancelled', label: t.reminders.statuses.cancelled },
    ];

    const channelOptions: Array<{ value: ReminderNotificationChannel; label: string }> = (
      ['in_app', 'toast', 'email', 'push', 'telegram', 'webhook'] as ReminderNotificationChannel[]
    ).map((ch) => ({ value: ch, label: t.reminders.channels[ch] }));

    const leadUnitOptions: Array<{ value: ReminderLeadUnit; label: string }> = (
      ['at_time', 'minutes', 'hours', 'days', 'weeks'] as ReminderLeadUnit[]
    ).map((u) => ({ value: u, label: t.reminders.leadUnits[u] }));

    const recipientOptions: Array<{ value: ReminderRecipientMode; label: string }> = (
      ['owner', 'assignees', 'custom_users'] as ReminderRecipientMode[]
    ).map((m) => ({ value: m, label: t.reminders.recipientModes[m] }));

    const repeatNagOptions = [
      { value: '0', label: t.reminders.repeatNagOff },
      { value: '15', label: t.reminders.repeatNagMinutesOpt(15) },
      { value: '30', label: t.reminders.repeatNagMinutesOpt(30) },
      { value: '60', label: t.reminders.repeatNagMinutesOpt(60) },
    ];

    const escalationOptions = [
      { value: '', label: t.reminders.noEscalation },
      ...store.users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` })),
    ];

    const draftRecurrence = this.buildDraftRecurrence();
    const baseDueStr = `${this.fDueDate || store.formatLocalDateTime(new Date()).slice(0, 10)}T${this.fDueTime || '10:00'}`;
    const previewDates =
      this.fFreq !== 'NONE'
        ? store.getUpcomingReminderOccurrences(baseDueStr, draftRecurrence, 4)
        : [];
    const humanSummary =
      this.fFreq !== 'NONE'
        ? formatRRuleHumanSummary(draftRecurrence, {
            freqEvery: t.reminders.rfcFreqEvery,
            weekdaysShortMap: t.reminders.rfcWeekdaysShort,
            monthsShort: t.reminders.monthsShort,
            nthPrefix: t.reminders.nthPrefix,
            monthDayPrefix: t.reminders.monthDayPrefix,
            setPosLabel: t.reminders.setPosLabel,
          })
        : '';

    const showByDay =
      this.fFreq === 'WEEKLY' || this.fFreq === 'MONTHLY' || this.fFreq === 'YEARLY';
    const showMonthControls = this.fFreq === 'MONTHLY' || this.fFreq === 'YEARLY';

    return html`
      <app-modal
        ?open="${this.open}"
        size="lg"
        title="${isEdit ? t.reminders.modalTitleEdit : t.reminders.modalTitleCreate}"
        @close="${() => this.closeModal()}"
      >
        <div class="reminder-form-scroll">
          ${this.formError ? html`<div class="form-error">${this.formError}</div>` : ''}

          <!-- Section 1: Object & Schedule -->
          <section class="form-section">
            <div class="section-head">
              <span class="section-title">
                <span class="section-title-icon">${iconBell(16)}</span>
                <span>${t.reminders.sectionBase}</span>
              </span>
            </div>

            <app-form-grid columns="2">
              <app-input
                class="col-span-2"
                required
                label="${t.reminders.fieldTitle}"
                placeholder="${t.reminders.fieldTitlePlaceholder}"
                .value="${this.fTitle}"
                @input="${(e: Event) => {
                  this.fTitle = eventValue(e);
                  this.formError = '';
                }}"
              ></app-input>

              <app-select
                label="${t.reminders.fieldEntityType}"
                .value="${this.fEntityType}"
                .options="${entityTypeOptions}"
                @change="${(e: Event) =>
                  this.handleEntityTypeChange(eventValue(e) as ReminderEntityType)}"
              ></app-select>

              ${this.fEntityType === 'none'
                ? html`
                    <div class="switch-field">
                      <label class="field-caption">${t.reminders.fieldEntityObject}</label>
                      <div class="hint-box">${t.reminders.fieldNoEntityHint}</div>
                    </div>
                  `
                : html`
                    <app-entity-selector
                      label="${t.reminders.fieldEntityObject}"
                      .value="${this.fEntityId}"
                      .options="${entityOptions}"
                      @change="${(e: Event) => (this.fEntityId = eventValue(e))}"
                    ></app-entity-selector>
                  `}

              <div class="datetime-pair">
                <app-date-input
                  label="${t.reminders.fieldDueAt}"
                  .value="${this.fDueDate}"
                  @change="${(e: Event) => (this.fDueDate = eventValue(e))}"
                ></app-date-input>
                <app-input
                  type="time"
                  label="${t.reminders.fieldTimeLabel}"
                  .value="${this.fDueTime}"
                  @input="${(e: Event) => (this.fDueTime = eventValue(e))}"
                ></app-input>
              </div>

              <app-select
                label="${t.reminders.fieldPriority}"
                .value="${this.fPriority}"
                .options="${priorityOptions}"
                @change="${(e: Event) =>
                  (this.fPriority = eventValue(e) as ReminderPriority)}"
              ></app-select>

              <app-entity-selector
                label="${t.reminders.fieldOwner}"
                .value="${this.fOwnerId}"
                .options="${userSelectorOptions}"
                @change="${(e: Event) => (this.fOwnerId = eventValue(e))}"
              ></app-entity-selector>

              ${isEdit
                ? html`
                    <app-select
                      label="${t.reminders.fieldStatus}"
                      .value="${this.fStatus}"
                      .options="${statusOptions}"
                      @change="${(e: Event) =>
                        (this.fStatus = eventValue(e) as ReminderStatus)}"
                    ></app-select>
                  `
                : html`
                    <app-input
                      label="${t.reminders.fieldTags}"
                      placeholder="${t.reminders.fieldTagsPlaceholder}"
                      .value="${this.fTags}"
                      @input="${(e: Event) => (this.fTags = eventValue(e))}"
                    ></app-input>
                  `}

              ${isEdit
                ? html`
                    <app-input
                      class="col-span-2"
                      label="${t.reminders.fieldTags}"
                      placeholder="${t.reminders.fieldTagsPlaceholder}"
                      .value="${this.fTags}"
                      @input="${(e: Event) => (this.fTags = eventValue(e))}"
                    ></app-input>
                  `
                : ''}

              <div class="col-span-2">
                <app-entity-selector
                  label="${t.reminders.fieldAssignees}"
                  .value="${''}"
                  .options="${userSelectorOptions}"
                  @change="${(e: Event) => {
                    const picked = eventValue(e);
                    this.addAssignee(picked);
                    (e.composedPath()[0] as AppEntitySelector).value = '';
                  }}"
                ></app-entity-selector>
                ${this.fAssigneeIds.length > 0
                  ? html`
                      <div class="chip-list">
                        ${this.fAssigneeIds.map((uid) => {
                          const user = store.users.find((u) => u.id === uid);
                          return html`
                            <span class="assignee-chip">
                              <span>${user?.name || uid}</span>
                              <button
                                type="button"
                                class="chip-remove-btn"
                                @click="${() => this.removeAssignee(uid)}"
                              >
                                ${iconX(12)}
                              </button>
                            </span>
                          `;
                        })}
                      </div>
                    `
                  : ''}
              </div>

              <app-textarea
                class="col-span-2"
                rows="2"
                label="${t.reminders.fieldDesc}"
                placeholder="${t.reminders.fieldDescPlaceholder}"
                .value="${this.fDescription}"
                @input="${(e: Event) => (this.fDescription = eventValue(e))}"
              ></app-textarea>
            </app-form-grid>
          </section>

          <!-- Section 2: RFC 5545 Recurrence & Directory Templates -->
          <section class="form-section">
            <div class="section-head">
              <span class="section-title">
                <span class="section-title-icon">${iconRepeat(16)}</span>
                <span>${t.reminders.sectionRecurrence}</span>
              </span>
            </div>

            <div class="template-row">
              <div class="template-select-wrap">
                <app-select
                  label="${t.reminders.fieldTemplate}"
                  .value="${this.fTemplateCode}"
                  .options="${templateOptions}"
                  @change="${(e: Event) => this.applyRecurrenceTemplate(eventValue(e))}"
                ></app-select>
              </div>
            </div>

            <div class="quick-patterns-bar">
              <span class="quick-patterns-label">${t.reminders.quickPatternsTitle}</span>
              <div class="quick-patterns-btns">
                <button
                  type="button"
                  class="pattern-btn ${this.fRruleInput === 'RRULE:FREQ=MONTHLY;BYMONTHDAY=13;BYDAY=FR' ? 'is-active' : ''}"
                  @click="${() =>
                    this.applyQuickPattern(
                      'RRULE:FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13',
                      'FRIDAY_13',
                      false
                    )}"
                >
                  ${t.reminders.quickFriday13}
                </button>
                <button
                  type="button"
                  class="pattern-btn ${this.fRruleInput === 'RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1' ? 'is-active' : ''}"
                  @click="${() =>
                    this.applyQuickPattern(
                      'RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1',
                      'LAST_WORKDAY',
                      false
                    )}"
                >
                  ${t.reminders.quickLastWorkday}
                </button>
                <button
                  type="button"
                  class="pattern-btn ${this.fRruleInput === 'RRULE:FREQ=MONTHLY;BYMONTHDAY=-1' ? 'is-active' : ''}"
                  @click="${() =>
                    this.applyQuickPattern(
                      'RRULE:FREQ=MONTHLY;BYMONTHDAY=-1',
                      'CUSTOM',
                      false
                    )}"
                >
                  ${t.reminders.quickLastDay}
                </button>
                <button
                  type="button"
                  class="pattern-btn ${this.fRruleInput === 'RRULE:FREQ=MONTHLY;INTERVAL=3' ? 'is-active' : ''}"
                  @click="${() =>
                    this.applyQuickPattern(
                      'RRULE:FREQ=MONTHLY;INTERVAL=3',
                      'QUARTERLY',
                      true
                    )}"
                >
                  ${t.reminders.quickQuarterly}
                </button>
              </div>
            </div>

            <app-form-grid columns="2">
              <app-select
                label="${t.reminders.fieldUnit}"
                .value="${this.fFreq}"
                .options="${freqOptions}"
                @change="${(e: Event) => {
                  const next = eventValue(e) as Rfc5545Freq | 'NONE';
                  this.fFreq = next;
                  this.fTemplateCode = next === 'NONE' ? 'ONCE' : 'CUSTOM';
                  if (next === 'WEEKLY' && this.fByDay.length === 0) {
                    this.fByDay = [{ day: 'MO' }];
                  }
                  if (next !== 'MONTHLY' && next !== 'YEARLY') {
                    this.fByDayOrdinal = 0;
                    this.fByDay = this.fByDay.map((b) => ({ day: b.day }));
                  }
                  this.syncRruleTextFromControls();
                }}"
              ></app-select>

              <app-number-input
                label="${t.reminders.fieldInterval}"
                min="1"
                max="365"
                step="1"
                ?disabled="${this.fFreq === 'NONE'}"
                .value="${this.fInterval}"
                @change="${(e: Event) => {
                  this.fInterval = Math.max(1, Number(eventValue(e)) || 1);
                  this.fTemplateCode = 'CUSTOM';
                  this.syncRruleTextFromControls();
                }}"
              ></app-number-input>

              ${showByDay
                ? html`
                    <div class="weekdays-field col-span-2">
                      <span class="field-caption">${t.reminders.fieldDaysOfWeek}</span>
                      <div class="weekdays-row">
                        ${RFC5545_WEEKDAYS.map((wd) => {
                          const active = this.fByDay.some((b) => b.day === wd);
                          return html`
                            <button
                              type="button"
                              class="weekday-btn ${active ? 'is-active' : ''}"
                              @click="${() => this.toggleWeekday(wd)}"
                            >
                              ${t.reminders.rfcWeekdaysShort[wd]}
                            </button>
                          `;
                        })}
                      </div>
                    </div>
                  `
                : ''}

              ${showMonthControls
                ? html`
                    <app-select
                      label="${t.reminders.fieldByDayOrdinal}"
                      .value="${String(this.fByDayOrdinal)}"
                      .options="${ordinalOptions}"
                      @change="${(e: Event) => {
                        const ord = Number(eventValue(e)) || 0;
                        this.fByDayOrdinal = ord;
                        if (this.fByDay.length > 0) {
                          this.fByDay = this.fByDay.map((b) =>
                            ord !== 0 ? { day: b.day, nth: ord } : { day: b.day }
                          );
                        }
                        this.fTemplateCode = 'CUSTOM';
                        this.syncRruleTextFromControls();
                      }}"
                    ></app-select>

                    <app-select
                      label="${t.reminders.fieldBySetPos}"
                      .value="${this.fBySetPosText}"
                      .options="${setPosOptions}"
                      @change="${(e: Event) => {
                        this.fBySetPosText = eventValue(e);
                        this.fTemplateCode = 'CUSTOM';
                        this.syncRruleTextFromControls();
                      }}"
                    ></app-select>

                    <app-input
                      class="col-span-2"
                      label="${t.reminders.fieldDayOfMonth}"
                      placeholder="${t.reminders.fieldByMonthDayPlaceholder}"
                      .value="${this.fByMonthDayText}"
                      @input="${(e: Event) => {
                        this.fByMonthDayText = eventValue(e);
                        this.fTemplateCode = 'CUSTOM';
                        this.syncRruleTextFromControls();
                      }}"
                    ></app-input>

                    <div class="weekdays-field col-span-2">
                      <span class="field-caption">${t.reminders.fieldByMonth}</span>
                      <div class="months-grid">
                        ${t.reminders.monthsShort.map((mLabel, idx) => {
                          const mNum = idx + 1;
                          const active = this.fByMonth.includes(mNum);
                          return html`
                            <button
                              type="button"
                              class="month-btn ${active ? 'is-active' : ''}"
                              @click="${() => this.toggleMonth(mNum)}"
                            >
                              ${mLabel}
                            </button>
                          `;
                        })}
                      </div>
                    </div>
                  `
                : ''}

              ${this.fFreq !== 'NONE'
                ? html`
                    <app-select
                      label="${t.reminders.fieldWkst}"
                      .value="${this.fWkst}"
                      .options="${wkstOptions}"
                      @change="${(e: Event) => {
                        this.fWkst = eventValue(e) as Rfc5545Weekday;
                        this.fTemplateCode = 'CUSTOM';
                        this.syncRruleTextFromControls();
                      }}"
                    ></app-select>

                    <div class="switch-field">
                      <label class="switch-ghost-label">${t.reminders.fieldSkipWeekends}</label>
                      <div class="switch-box">
                        <app-switch
                          label="${t.reminders.fieldSkipWeekends}"
                          ?checked="${this.fSkipWeekends}"
                          @change="${(e: CustomEvent<{ checked: boolean }>) =>
                            (this.fSkipWeekends = Boolean(e.detail?.checked))}"
                        ></app-switch>
                      </div>
                    </div>

                    <app-select
                      label="${t.reminders.fieldEndType}"
                      .value="${this.fEndType}"
                      .options="${endTypeOptions}"
                      @change="${(e: Event) => {
                        this.fEndType = eventValue(e) as RecurrenceEndType;
                        this.syncRruleTextFromControls();
                      }}"
                    ></app-select>

                    ${this.fEndType === 'until_date'
                      ? html`
                          <app-date-input
                            label="${t.reminders.fieldEndDate}"
                            .value="${this.fEndDate}"
                            @change="${(e: Event) => {
                              this.fEndDate = eventValue(e);
                              this.syncRruleTextFromControls();
                            }}"
                          ></app-date-input>
                        `
                      : this.fEndType === 'max_occurrences'
                      ? html`
                          <app-number-input
                            label="${t.reminders.fieldMaxOccurrences}"
                            min="1"
                            max="999"
                            step="1"
                            .value="${this.fMaxOccurrences}"
                            @change="${(e: Event) => {
                              this.fMaxOccurrences = Math.max(1, Number(eventValue(e)) || 1);
                              this.syncRruleTextFromControls();
                            }}"
                          ></app-number-input>
                        `
                      : ''}
                  `
                : ''}
            </app-form-grid>

            <!-- RFC 5545 RRULE Canonical Text Representation -->
            <div class="rrule-editor-box">
              <div class="rrule-input-row">
                <div class="rrule-input-wrap">
                  <app-input
                    class="rrule-mono-input"
                    label="${t.reminders.rruleInputLabel}"
                    placeholder="${t.reminders.rruleInputPlaceholder}"
                    .value="${this.fRruleInput}"
                    @input="${(e: Event) => {
                      this.fRruleInput = eventValue(e);
                      this.fRruleError = '';
                    }}"
                    @keydown="${(e: KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        this.applyRawRRule();
                      }
                    }}"
                  ></app-input>
                </div>
                <div class="rrule-actions">
                  <app-button
                    size="md"
                    variant="outline"
                    @click="${() => this.applyRawRRule()}"
                  >
                    <span>${t.reminders.rruleApplyBtn}</span>
                  </app-button>
                  <app-button
                    size="md"
                    variant="ghost"
                    title="${t.reminders.rruleCopyBtn}"
                    ?disabled="${!this.fRruleInput.trim()}"
                    @click="${() => this.copyRRule()}"
                  >
                    <span slot="icon-start">${iconCopy(14)}</span>
                    <span>${t.reminders.rruleCopyBtn}</span>
                  </app-button>
                </div>
              </div>

              ${this.fRruleError
                ? html`<div class="rrule-error-msg">${this.fRruleError}</div>`
                : humanSummary
                ? html`
                    <div class="rrule-summary-line">
                      <span class="rrule-summary-label">${t.reminders.rruleSummaryLabel}</span>
                      <span class="rrule-summary-text">${humanSummary}</span>
                    </div>
                  `
                : ''}
            </div>

            <div class="preview-box">
              <span class="preview-label">${t.reminders.previewNextTitle}</span>
              ${this.fFreq === 'NONE'
                ? html`<span class="field-caption">${t.reminders.previewSingleOnly}</span>`
                : previewDates.length === 0
                ? html`<span class="field-caption">${t.reminders.previewNoMatch}</span>`
                : html`
                    <div class="preview-dates">
                      ${previewDates.map(
                        (dt) => html`
                          <span class="preview-date-chip">
                            ${store.parseLocalDateTime(dt).toLocaleString(t.common.locale, {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        `
                      )}
                    </div>
                  `}
            </div>
          </section>

          <!-- Section 3: Notification Rules & Policies -->
          <section class="form-section">
            <div class="section-head">
              <span class="section-title">
                <span class="section-title-icon">${iconBellRing(16)}</span>
                <span>${t.reminders.sectionNotifications}</span>
              </span>
              <app-button
                size="sm"
                variant="outline"
                @click="${() => this.addNotificationRule()}"
              >
                <span slot="icon-start">${iconPlus(14)}</span>
                <span>${t.reminders.addRuleBtn}</span>
              </app-button>
            </div>

            <div class="rules-stack">
              ${this.fRules.map(
                (rule) => html`
                  <div class="rule-card ${rule.enabled ? '' : 'is-disabled'}">
                    <div class="rule-top-row">
                      <div class="rule-toggle-wrap">
                        <app-switch
                          ?checked="${rule.enabled}"
                          title="${t.reminders.ruleEnabledLabel}"
                          @change="${(e: CustomEvent<{ checked: boolean }>) =>
                            this.updateRule(rule.id, { enabled: Boolean(e.detail?.checked) })}"
                        ></app-switch>
                      </div>

                      <app-select
                        size="sm"
                        label="${t.reminders.ruleChannelLabel}"
                        .value="${rule.channel}"
                        .options="${channelOptions}"
                        @change="${(e: Event) =>
                          this.updateRule(rule.id, {
                            channel: eventValue(e) as ReminderNotificationChannel,
                          })}"
                      ></app-select>

                      <app-number-input
                        size="sm"
                        label="${t.reminders.ruleOffsetLabel}"
                        min="0"
                        max="365"
                        step="1"
                        ?disabled="${rule.offsetUnit === 'at_time'}"
                        .value="${rule.offsetUnit === 'at_time' ? 0 : rule.offsetValue}"
                        @change="${(e: Event) =>
                          this.updateRule(rule.id, {
                            offsetValue: Math.max(0, Number(eventValue(e)) || 0),
                          })}"
                      ></app-number-input>

                      <app-select
                        size="sm"
                        label="${t.reminders.ruleUnitLabel}"
                        .value="${rule.offsetUnit}"
                        .options="${leadUnitOptions}"
                        @change="${(e: Event) => {
                          const unit = eventValue(e) as ReminderLeadUnit;
                          this.updateRule(rule.id, {
                            offsetUnit: unit,
                            offsetValue: unit === 'at_time' ? 0 : rule.offsetValue || 15,
                          });
                        }}"
                      ></app-select>

                      <app-select
                        size="sm"
                        label="${t.reminders.ruleRecipientsLabel}"
                        .value="${rule.recipientMode}"
                        .options="${recipientOptions}"
                        @change="${(e: Event) =>
                          this.updateRule(rule.id, {
                            recipientMode: eventValue(e) as ReminderRecipientMode,
                          })}"
                      ></app-select>

                      <app-button
                        size="sm"
                        variant="ghost"
                        title="${t.reminders.removeRuleTitle}"
                        ?disabled="${this.fRules.length <= 1}"
                        @click="${() => this.removeRule(rule.id)}"
                      >
                        <span slot="icon-start">${iconTrash(14)}</span>
                      </app-button>
                    </div>

                    <div class="rule-sub-row ${rule.recipientMode === 'custom_users' ? 'has-custom-users' : ''}">
                      <app-input
                        size="sm"
                        placeholder="${t.reminders.ruleCustomMessagePlaceholder}"
                        .value="${rule.customMessage || ''}"
                        @input="${(e: Event) =>
                          this.updateRule(rule.id, { customMessage: eventValue(e) })}"
                      ></app-input>

                      ${rule.recipientMode === 'custom_users'
                        ? html`
                            <app-entity-selector
                              size="sm"
                              .value="${''}"
                              .options="${userSelectorOptions}"
                              @change="${(e: Event) => {
                                const picked = eventValue(e);
                                this.addRuleRecipient(rule.id, picked);
                                (e.composedPath()[0] as AppEntitySelector).value = '';
                              }}"
                            ></app-entity-selector>
                            ${(rule.recipientUserIds || []).length > 0
                              ? html`
                                  <div class="chip-list">
                                    ${(rule.recipientUserIds || []).map((uid) => {
                                      const user = store.users.find((u) => u.id === uid);
                                      return html`
                                        <span class="assignee-chip">
                                          <span>${user?.name || uid}</span>
                                          <button
                                            type="button"
                                            class="chip-remove-btn"
                                            @click="${() => this.removeRuleRecipient(rule.id, uid)}"
                                          >
                                            ${iconX(12)}
                                          </button>
                                        </span>
                                      `;
                                    })}
                                  </div>
                                `
                              : ''}
                          `
                        : ''}
                    </div>
                  </div>
                `
              )}
            </div>

            <div class="policies-grid">
              <app-switch
                label="${t.reminders.policySound}"
                ?checked="${this.fSoundEnabled}"
                @change="${(e: CustomEvent<{ checked: boolean }>) =>
                  (this.fSoundEnabled = Boolean(e.detail?.checked))}"
              ></app-switch>
              <app-switch
                label="${t.reminders.policyAck}"
                ?checked="${this.fRequireAck}"
                @change="${(e: CustomEvent<{ checked: boolean }>) =>
                  (this.fRequireAck = Boolean(e.detail?.checked))}"
              ></app-switch>
              <app-switch
                label="${t.reminders.policyQuietHours}"
                ?checked="${this.fQuietHoursRespect}"
                @change="${(e: CustomEvent<{ checked: boolean }>) =>
                  (this.fQuietHoursRespect = Boolean(e.detail?.checked))}"
              ></app-switch>
            </div>

            <app-form-grid columns="2">
              <app-select
                size="sm"
                label="${t.reminders.policyRepeatNag}"
                .value="${String(this.fRepeatNagMinutes)}"
                .options="${repeatNagOptions}"
                @change="${(e: Event) =>
                  (this.fRepeatNagMinutes = Number(eventValue(e)) || 0)}"
              ></app-select>

              <app-select
                size="sm"
                label="${t.reminders.policyEscalation}"
                .value="${this.fEscalationUserId}"
                .options="${escalationOptions}"
                @change="${(e: Event) => (this.fEscalationUserId = eventValue(e))}"
              ></app-select>
            </app-form-grid>
          </section>

          <!-- Section 4: Attached Documents -->
          <section class="form-section">
            <div class="section-head">
              <span class="section-title">
                <span class="section-title-icon">${iconPaperclip(16)}</span>
                <span>${t.reminders.detailAttachments}</span>
              </span>
            </div>

            <app-project-attachments
              compact
              project-id="${this.resolveAttachmentContext().projectId || ''}"
              label="${t.reminders.detailAttachments}"
              .documentIds="${this.fAttachmentIds}"
              .pendingFiles="${this.fPendingFiles}"
              @attachments-change="${(e: CustomEvent<AttachmentsChangeDetail>) => {
                this.fAttachmentIds = [...e.detail.documentIds];
                this.fPendingFiles = [...e.detail.pendingFiles];
              }}"
            ></app-project-attachments>
          </section>
        </div>

        <div slot="footer" class="footer-actions">
          <app-button variant="outline" @click="${() => this.closeModal()}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSave()}">
            <span slot="icon-start">${iconCalendar()}</span>
            <span>${t.common.save}</span>
          </app-button>
        </div>
      </app-modal>
    `;
  }
}

import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import {
  RecurrenceEndType,
  RecurrenceUnit,
  Reminder,
  ReminderEntityType,
  ReminderLeadUnit,
  ReminderNotificationChannel,
  ReminderNotificationRule,
  ReminderPriority,
  ReminderRecurrence,
  ReminderRecipientMode,
  ReminderStatus,
} from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-reminder-form.css';
import { eventValue } from '../event-value';
import {
  iconBell,
  iconBellRing,
  iconCalendar,
  iconDatabase,
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
import '../app-switch/app-switch';
import '../app-button/app-button';
import '../app-link/app-link';

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
  @state() private fDueDate = '2026-11-19';
  @state() private fDueTime = '10:00';
  @state() private fPriority: ReminderPriority = 'medium';
  @state() private fStatus: ReminderStatus = 'active';
  @state() private fOwnerId = '';
  @state() private fAssigneeIds: string[] = [];
  @state() private fTags = '';

  // Recurrence fields
  @state() private fTemplateCode = 'ONCE';
  @state() private fUnit: RecurrenceUnit = 'none';
  @state() private fInterval = 1;
  @state() private fDaysOfWeek: number[] = [];
  @state() private fDayOfMonth = 15;
  @state() private fSkipWeekends = false;
  @state() private fEndType: RecurrenceEndType = 'never';
  @state() private fEndDate = '';
  @state() private fMaxOccurrences = 5;
  @state() private fOccurrenceCount = 0;

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

  private initFields() {
    this.formError = '';
    if (this.reminder) {
      const rem = this.reminder;
      const [datePart, timePart] = (rem.dueAt || '').split('T');
      this.fTitle = rem.title;
      this.fDescription = rem.description || '';
      this.fEntityType = rem.entityType || 'none';
      this.fEntityId = rem.entityId || '';
      this.fDueDate = datePart || new Date().toISOString().slice(0, 10);
      this.fDueTime = (timePart || '10:00').slice(0, 5);
      this.fPriority = rem.priority;
      this.fStatus = rem.status;
      this.fOwnerId = rem.ownerId || store.currentUserId;
      this.fAssigneeIds = [...(rem.assigneeIds || [])];
      this.fTags = (rem.tags || []).join(', ');

      this.fTemplateCode = rem.recurrence.templateCode || 'ONCE';
      this.fUnit = rem.recurrence.unit || 'none';
      this.fInterval = rem.recurrence.interval || 1;
      this.fDaysOfWeek = [...(rem.recurrence.daysOfWeek || [])];
      this.fDayOfMonth = rem.recurrence.dayOfMonth || 15;
      this.fSkipWeekends = Boolean(rem.recurrence.skipWeekends);
      this.fEndType = rem.recurrence.endType || 'never';
      this.fEndDate = rem.recurrence.endDate || '';
      this.fMaxOccurrences = rem.recurrence.maxOccurrences || 5;
      this.fOccurrenceCount = rem.recurrence.occurrenceCount || 0;

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

    this.fTemplateCode = 'ONCE';
    this.fUnit = 'none';
    this.fInterval = 1;
    this.fDaysOfWeek = [1, 3, 5];
    this.fDayOfMonth = tomorrow.getDate();
    this.fSkipWeekends = false;
    this.fEndType = 'never';
    this.fEndDate = '';
    this.fMaxOccurrences = 5;
    this.fOccurrenceCount = 0;

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

    const unit = (String(rec.extra.unit || 'none') as RecurrenceUnit);
    const interval = Number(rec.extra.interval || 1);
    const skipWeekends = Boolean(rec.extra.skipWeekends);
    const leadMin = Number(rec.extra.defaultLeadMinutes ?? 30);

    this.fUnit = unit;
    this.fInterval = Math.max(1, interval);
    this.fSkipWeekends = skipWeekends;
    if (code === 'WEEKDAYS') {
      this.fDaysOfWeek = [1, 2, 3, 4, 5];
    } else if (unit === 'week' && this.fDaysOfWeek.length === 0) {
      this.fDaysOfWeek = [1];
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

  private toggleWeekday(day: number) {
    const next = new Set(this.fDaysOfWeek);
    if (next.has(day)) {
      if (next.size > 1) next.delete(day);
    } else {
      next.add(day);
    }
    this.fDaysOfWeek = Array.from(next).sort((a, b) => a - b);
    this.fTemplateCode = 'CUSTOM';
  }

  private addAssignee(userId: string) {
    if (!userId || this.fAssigneeIds.includes(userId)) return;
    this.fAssigneeIds = [...this.fAssigneeIds, userId];
  }

  private removeAssignee(userId: string) {
    this.fAssigneeIds = this.fAssigneeIds.filter((id) => id !== userId);
  }

  private addNotificationRule() {
    const channels: ReminderNotificationChannel[] = ['email', 'toast', 'telegram', 'push', 'webhook', 'in_app'];
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

  private openTemplatesDirectory() {
    this.closeModal();
    store.openDirectory('recurrence_templates');
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

    const dueAt = `${this.fDueDate}T${(this.fDueTime || '10:00').slice(0, 5)}`;
    const recurrence: ReminderRecurrence = {
      templateCode: this.fTemplateCode || 'CUSTOM',
      unit: this.fUnit,
      interval: Math.max(1, Number(this.fInterval) || 1),
      daysOfWeek: this.fUnit === 'week' ? [...this.fDaysOfWeek] : undefined,
      dayOfMonth: this.fUnit === 'month' ? Math.min(31, Math.max(1, Number(this.fDayOfMonth) || 1)) : undefined,
      skipWeekends: Boolean(this.fSkipWeekends),
      endType: this.fEndType,
      endDate: this.fEndType === 'until_date' && this.fEndDate ? this.fEndDate : undefined,
      maxOccurrences:
        this.fEndType === 'max_occurrences' ? Math.max(1, Number(this.fMaxOccurrences) || 1) : undefined,
      occurrenceCount: this.fOccurrenceCount || 0,
    };

    const tags = this.fTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title,
      description: this.fDescription.trim(),
      entityType: this.fEntityType,
      entityId: this.fEntityType === 'none' ? undefined : this.fEntityId || undefined,
      dueAt,
      status: this.reminder ? this.fStatus : ('active' as ReminderStatus),
      priority: this.fPriority,
      ownerId: this.fOwnerId || store.currentUserId,
      assigneeIds: this.fAssigneeIds.length > 0 ? [...this.fAssigneeIds] : [this.fOwnerId || store.currentUserId],
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

    this.dispatchEvent(new CustomEvent('saved', { detail: { reminder: saved }, bubbles: true, composed: true }));
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
      id: o.value,
      label: o.label,
      subtitle: o.subtitle,
    }));

    const userSelectorOptions = store.users.map((u) => ({
      id: u.id,
      label: u.name,
      subtitle: u.role,
    }));

    const templateOptions = store.getRecurrenceTemplates().map((rec) => ({
      value: rec.code,
      label: useEnNames && rec.nameEn ? rec.nameEn : rec.name,
    }));

    const unitOptions: Array<{ value: RecurrenceUnit; label: string }> = (
      ['none', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'] as RecurrenceUnit[]
    ).map((u) => ({
      value: u,
      label: t.reminders.recUnits[u],
    }));

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

    const draftRecurrence: ReminderRecurrence = {
      templateCode: this.fTemplateCode,
      unit: this.fUnit,
      interval: Math.max(1, this.fInterval || 1),
      daysOfWeek: this.fUnit === 'week' ? this.fDaysOfWeek : undefined,
      dayOfMonth: this.fUnit === 'month' ? this.fDayOfMonth : undefined,
      skipWeekends: this.fSkipWeekends,
      endType: this.fEndType,
      endDate: this.fEndDate || undefined,
      maxOccurrences: this.fMaxOccurrences,
      occurrenceCount: this.fOccurrenceCount,
    };

    const previewDates =
      this.fUnit !== 'none'
        ? store.getUpcomingReminderOccurrences(
            `${this.fDueDate || '2026-11-19'}T${this.fDueTime || '10:00'}`,
            draftRecurrence,
            3
          )
        : [];

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
                  label="&nbsp;"
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
                  value=""
                  .options="${userSelectorOptions}"
                  @change="${(e: Event) => this.addAssignee(eventValue(e))}"
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

          <!-- Section 2: Recurrence & Directory Templates -->
          <section class="form-section">
            <div class="section-head">
              <span class="section-title">
                <span class="section-title-icon">${iconRepeat(16)}</span>
                <span>${t.reminders.sectionRecurrence}</span>
              </span>
              <app-link
                variant="muted"
                size="sm"
                @click="${() => this.openTemplatesDirectory()}"
              >
                <span slot="icon-start">${iconDatabase(14)}</span>
                <span>${t.reminders.openDirectoryBtn}</span>
              </app-link>
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

            <app-form-grid columns="2">
              <app-select
                label="${t.reminders.fieldUnit}"
                .value="${this.fUnit}"
                .options="${unitOptions}"
                @change="${(e: Event) => {
                  this.fUnit = eventValue(e) as RecurrenceUnit;
                  this.fTemplateCode = this.fUnit === 'none' ? 'ONCE' : 'CUSTOM';
                }}"
              ></app-select>

              <app-number-input
                label="${t.reminders.fieldInterval}"
                min="1"
                max="365"
                step="1"
                ?disabled="${this.fUnit === 'none'}"
                .value="${this.fInterval}"
                @change="${(e: Event) => {
                  this.fInterval = Math.max(1, Number(eventValue(e)) || 1);
                  this.fTemplateCode = 'CUSTOM';
                }}"
              ></app-number-input>

              ${this.fUnit === 'week'
                ? html`
                    <div class="weekdays-field col-span-2">
                      <span class="field-caption">${t.reminders.fieldDaysOfWeek}</span>
                      <div class="weekdays-row">
                        ${[1, 2, 3, 4, 5, 6, 7].map((dayIdx) => {
                          const active = this.fDaysOfWeek.includes(dayIdx);
                          return html`
                            <button
                              type="button"
                              class="weekday-btn ${active ? 'is-active' : ''}"
                              @click="${() => this.toggleWeekday(dayIdx)}"
                            >
                              ${t.reminders.weekdaysShort[dayIdx - 1]}
                            </button>
                          `;
                        })}
                      </div>
                    </div>
                  `
                : ''}

              ${this.fUnit === 'month'
                ? html`
                    <app-number-input
                      label="${t.reminders.fieldDayOfMonth}"
                      min="1"
                      max="31"
                      step="1"
                      .value="${this.fDayOfMonth}"
                      @change="${(e: Event) =>
                        (this.fDayOfMonth = Math.min(31, Math.max(1, Number(eventValue(e)) || 1)))}"
                    ></app-number-input>
                  `
                : ''}

              ${this.fUnit !== 'none'
                ? html`
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
                      @change="${(e: Event) =>
                        (this.fEndType = eventValue(e) as RecurrenceEndType)}"
                    ></app-select>

                    ${this.fEndType === 'until_date'
                      ? html`
                          <app-date-input
                            label="${t.reminders.fieldEndDate}"
                            .value="${this.fEndDate}"
                            @change="${(e: Event) => (this.fEndDate = eventValue(e))}"
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
                            @change="${(e: Event) =>
                              (this.fMaxOccurrences = Math.max(1, Number(eventValue(e)) || 1))}"
                          ></app-number-input>
                        `
                      : ''}
                  `
                : ''}
            </app-form-grid>

            <div class="preview-box">
              <span class="preview-label">${t.reminders.previewNextTitle}</span>
              ${this.fUnit === 'none' || previewDates.length === 0
                ? html`<span class="field-caption">${t.reminders.previewSingleOnly}</span>`
                : html`
                    <div class="preview-dates">
                      ${previewDates.map(
                        (dt) => html`
                          <span class="preview-date-chip">
                            ${store.parseLocalDateTime(dt).toLocaleString(t.common.locale, {
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
                              .value="${rule.recipientUserIds?.[0] || ''}"
                              .options="${userSelectorOptions}"
                              @change="${(e: Event) => {
                                const val = eventValue(e);
                                this.updateRule(rule.id, {
                                  recipientUserIds: val ? [val] : [],
                                });
                              }}"
                            ></app-entity-selector>
                          `
                        : ''}
                    </div>
                  </div>
                `
              )}
            </div>

            <div class="policies-grid">
              <div class="policy-switch-card">
                <app-switch
                  label="${t.reminders.policySound}"
                  ?checked="${this.fSoundEnabled}"
                  @change="${(e: CustomEvent<{ checked: boolean }>) =>
                    (this.fSoundEnabled = Boolean(e.detail?.checked))}"
                ></app-switch>
              </div>
              <div class="policy-switch-card">
                <app-switch
                  label="${t.reminders.policyAck}"
                  ?checked="${this.fRequireAck}"
                  @change="${(e: CustomEvent<{ checked: boolean }>) =>
                    (this.fRequireAck = Boolean(e.detail?.checked))}"
                ></app-switch>
              </div>
              <div class="policy-switch-card">
                <app-switch
                  label="${t.reminders.policyQuietHours}"
                  ?checked="${this.fQuietHoursRespect}"
                  @change="${(e: CustomEvent<{ checked: boolean }>) =>
                    (this.fQuietHoursRespect = Boolean(e.detail?.checked))}"
                ></app-switch>
              </div>
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

import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Reminder, ReminderEntityType, ReminderNotificationRule } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-entity-reminders.css';
import {
  formatRRuleHumanSummary,
  recurrenceToRRule,
  serializeRRule,
} from '../../../domain/rfc5545';
import {
  iconBell,
  iconBellRing,
  iconCheck,
  iconClock,
  iconCopy,
  iconEdit,
  iconEye,
  iconPaperclip,
  iconPause,
  iconPlay,
  iconPlus,
  iconRepeat,
  iconTrash,
} from '../icons';
import '../app-section-card/app-section-card';
import '../app-button/app-button';
import '../app-badge/app-badge';
import '../app-status-chip/app-status-chip';
import '../app-empty-state/app-empty-state';
import '../app-confirm-dialog/app-confirm-dialog';
import '../app-reminder-form/app-reminder-form';

@customElement('app-entity-reminders')
export class AppEntityReminders extends LitElement {
  @property({ type: String, attribute: 'entity-type' }) entityType: ReminderEntityType = 'project';
  @property({ type: String, attribute: 'entity-id' }) entityId: string = '';

  @state() private currentLang = store.customization.language;
  @state() private reminders: Reminder[] = [];
  @state() private formOpen = false;
  @state() private editingReminder: Reminder | null = null;
  @state() private deleteTarget: Reminder | null = null;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => this.syncState());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('entityType') || changed.has('entityId')) {
      this.reminders = store.getRemindersForEntity(this.entityType, this.entityId);
    }
  }

  private syncState() {
    this.currentLang = store.customization.language;
    this.reminders = store.getRemindersForEntity(this.entityType, this.entityId);
  }

  private openCreateModal() {
    this.editingReminder = null;
    this.formOpen = true;
  }

  private openEditModal(rem: Reminder) {
    this.editingReminder = rem;
    this.formOpen = true;
  }

  private snoozeOneHour(rem: Reminder) {
    const base = store.parseLocalDateTime(store.getEffectiveReminderDueAt(rem));
    const now = new Date();
    const ref = base.getTime() > now.getTime() ? base : now;
    ref.setHours(ref.getHours() + 1);
    store.snoozeReminder(rem.id, store.formatLocalDateTime(ref));
  }

  private formatRuleSummary(rule: ReminderNotificationRule, t: ReturnType<typeof getTranslation>): string {
    const channelLabel = t.reminders.channels[rule.channel];
    if (rule.offsetUnit === 'at_time' || rule.offsetValue === 0) {
      return `${channelLabel} · ${t.reminders.leadUnits.at_time}`;
    }
    return `${channelLabel} · ${rule.offsetValue} ${t.reminders.leadUnits[rule.offsetUnit]}`;
  }

  private async copyRRuleText(text: string, t: ReturnType<typeof getTranslation>) {
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Fallback notification still shows copied expression
    }
    store.addNotification('info', t.reminders.rruleCopiedToast, text);
  }

  render() {
    const t = getTranslation(this.currentLang);
    const templates = store.getRecurrenceTemplates();
    const useEnNames = t.common.locale.startsWith('en');
    const activeCount = this.reminders.filter((r) => r.status === 'active' || r.status === 'snoozed').length;

    return html`
      <app-section-card
        title="${t.navigation.reminders}"
        subtitle="${this.reminders.length > 0 ? `${activeCount} / ${this.reminders.length}` : ''}"
      >
        <div slot="actions" class="header-actions">
          <app-button size="sm" variant="outline" @click="${() => store.setActiveView('reminders')}">
            <span slot="icon-start">${iconBell(14)}</span>
            <span>${t.common.all}</span>
          </app-button>
          <app-button size="sm" variant="primary" @click="${() => this.openCreateModal()}">
            <span slot="icon-start">${iconPlus(14)}</span>
            <span>${t.reminders.actionAddForEntity}</span>
          </app-button>
        </div>

        ${this.reminders.length === 0
          ? html`
              <app-empty-state
                compact
                title="${t.reminders.emptyEntityReminders}"
              ></app-empty-state>
            `
          : html`
              <div class="reminder-list">
                ${this.reminders.map((rem) => {
                  const overdue = store.isReminderOverdue(rem);
                  const dueToday = store.isReminderDueToday(rem);
                  const effectiveDue = store.getEffectiveReminderDueAt(rem);
                  const formattedDue = store.parseLocalDateTime(effectiveDue).toLocaleString(t.common.locale, {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const isRecurring = rem.recurrence.enabled;
                  const tpl = templates.find((item) => item.code === rem.recurrence.templateCode);
                  const summary = isRecurring
                    ? formatRRuleHumanSummary(rem.recurrence, {
                        freqEvery: t.reminders.rfcFreqEvery,
                        weekdaysShortMap: t.reminders.rfcWeekdaysShort,
                        monthsShort: t.reminders.monthsShort,
                        nthPrefix: t.reminders.nthPrefix,
                        monthDayPrefix: t.reminders.monthDayPrefix,
                        setPosLabel: t.reminders.setPosLabel,
                      })
                    : '';
                  const tplLabel = !isRecurring
                    ? t.reminders.rfcFreqs.NONE
                    : rem.recurrence.templateCode !== 'CUSTOM' && tpl
                    ? useEnNames && tpl.nameEn
                      ? tpl.nameEn
                      : tpl.name
                    : summary || (rem.recurrence.freq ? t.reminders.rfcFreqs[rem.recurrence.freq] : t.reminders.rfcFreqs.NONE);
                  const parsedRule = isRecurring ? recurrenceToRRule(rem.recurrence) : null;
                  const rruleToken = isRecurring
                    ? parsedRule
                      ? serializeRRule(parsedRule, true)
                      : rem.recurrence.rrule
                    : '';
                  const owner = store.users.find((u) => u.id === rem.ownerId);
                  const enabledRules = rem.notifications.rules.filter((r) => r.enabled);

                  return html`
                    <div class="reminder-row ${rem.status === 'completed' ? 'is-completed' : ''}">
                      <div class="row-top">
                        <div class="row-main">
                          <div class="row-chips">
                            <app-status-chip domain="reminder" status="${rem.status}" size="sm"></app-status-chip>
                            <app-status-chip domain="reminderPriority" status="${rem.priority}" size="sm"></app-status-chip>
                            ${overdue
                              ? html`<app-badge variant="danger" size="sm">${t.reminders.overdueLabel}</app-badge>`
                              : dueToday
                              ? html`<app-badge variant="warning" size="sm">${t.reminders.dueTodayLabel}</app-badge>`
                              : ''}
                          </div>
                          <div class="row-title ${rem.status === 'completed' ? 'is-done' : ''}">
                            <button
                              type="button"
                              class="row-title-btn"
                              title="${t.reminders.actionDetails}"
                              @click="${() => store.openReminderDetail(rem.id, false)}"
                            >
                              ${rem.title}
                            </button>
                          </div>
                          ${rem.description ? html`<div class="row-desc">${rem.description}</div>` : ''}
                        </div>
                      </div>

                      <div class="row-meta">
                        <span class="meta-token ${overdue ? 'is-overdue' : dueToday ? 'is-today' : ''}">
                          ${iconClock(13)}
                          <span>${formattedDue}</span>
                        </span>
                        <span class="meta-dot">·</span>
                        <span class="meta-token" title="${summary || tplLabel}">
                          ${iconRepeat(13)}
                          <span>${tplLabel}</span>
                        </span>
                        ${isRecurring
                          ? html`
                              <span class="meta-dot">·</span>
                              <span class="meta-token">
                                ${t.reminders.occurrenceBadge(
                                  rem.recurrence.occurrenceCount,
                                  rem.recurrence.endType === 'max_occurrences' ? rem.recurrence.maxOccurrences : undefined
                                )}
                              </span>
                            `
                          : ''}
                        ${owner
                          ? html`
                              <span class="meta-dot">·</span>
                              <span class="meta-token">${owner.name}</span>
                            `
                          : ''}
                        ${(rem.attachmentIds || []).length > 0
                          ? html`
                              <span class="meta-dot">·</span>
                              <button
                                type="button"
                                class="attachments-meta-btn"
                                title="${t.reminders.actionDetails}"
                                @click="${() => store.openReminderDetail(rem.id, false)}"
                              >
                                ${iconPaperclip(11)}
                                <span>${t.reminders.detailAttachmentsCount((rem.attachmentIds || []).length)}</span>
                              </button>
                            `
                          : ''}
                      </div>

                      ${rruleToken
                        ? html`
                            <div class="rrule-strip">
                              <button
                                type="button"
                                class="rrule-token-btn"
                                title="${t.reminders.rruleCopyBtn}"
                                @click="${() => this.copyRRuleText(rruleToken, t)}"
                              >
                                <span class="rrule-token-text">${rruleToken}</span>
                                ${iconCopy(11)}
                              </button>
                            </div>
                          `
                        : ''}

                      ${enabledRules.length > 0
                        ? html`
                            <div class="channels-strip">
                              ${enabledRules.map(
                                (rule) => html`
                                  <span class="channel-pill">
                                    ${iconBellRing(11)}
                                    <span>${this.formatRuleSummary(rule, t)}</span>
                                  </span>
                                `
                              )}
                            </div>
                          `
                        : ''}

                      <div class="row-actions">
                        <div class="actions-left">
                          ${rem.status !== 'completed'
                            ? html`
                                <app-button
                                  size="sm"
                                  variant="primary"
                                  @click="${() => store.completeReminder(rem.id)}"
                                >
                                  <span slot="icon-start">${iconCheck(13)}</span>
                                  <span>${isRecurring ? t.reminders.actionAdvanceCycle : t.reminders.actionComplete}</span>
                                </app-button>
                                <app-button
                                  size="sm"
                                  variant="outline"
                                  @click="${() => this.snoozeOneHour(rem)}"
                                >
                                  <span slot="icon-start">${iconClock(13)}</span>
                                  <span>${t.reminders.snoozeOneHourBtn}</span>
                                </app-button>
                                ${isRecurring
                                  ? html`
                                      <app-button
                                        size="sm"
                                        variant="ghost"
                                        title="${rem.status === 'paused' ? t.reminders.actionResume : t.reminders.actionPause}"
                                        @click="${() => store.toggleReminderPause(rem.id)}"
                                      >
                                        <span slot="icon-start">
                                          ${rem.status === 'paused' ? iconPlay(13) : iconPause(13)}
                                        </span>
                                      </app-button>
                                    `
                                  : ''}
                              `
                            : ''}
                          <app-button
                            size="sm"
                            variant="ghost"
                            title="${t.reminders.actionTestNotify}"
                            @click="${() => store.triggerReminderNotification(rem.id)}"
                          >
                            <span slot="icon-start">${iconBellRing(13)}</span>
                          </app-button>
                        </div>

                        <div class="actions-right">
                          <app-button
                            size="sm"
                            variant="ghost"
                            title="${t.reminders.actionDetails}"
                            @click="${() => store.openReminderDetail(rem.id, false)}"
                          >
                            <span slot="icon-start">${iconEye(13)}</span>
                          </app-button>
                          <app-button
                            size="sm"
                            variant="ghost"
                            title="${t.common.edit}"
                            @click="${() => this.openEditModal(rem)}"
                          >
                            <span slot="icon-start">${iconEdit(13)}</span>
                          </app-button>
                          <app-button
                            size="sm"
                            variant="ghost"
                            title="${t.common.delete}"
                            @click="${() => (this.deleteTarget = rem)}"
                          >
                            <span slot="icon-start">${iconTrash(13)}</span>
                          </app-button>
                        </div>
                      </div>
                    </div>
                  `;
                })}
              </div>
            `}
      </app-section-card>

      <app-reminder-form
        ?open="${this.formOpen}"
        .reminder="${this.editingReminder}"
        preset-entity-type="${this.entityType}"
        preset-entity-id="${this.entityId}"
        @close="${() => {
          this.formOpen = false;
          this.editingReminder = null;
        }}"
      ></app-reminder-form>

      <app-confirm-dialog
        ?open="${Boolean(this.deleteTarget)}"
        variant="danger"
        title="${t.viewTexts.confirmDialogs.reminderDelete.title}"
        action="${this.deleteTarget ? t.viewTexts.confirmDialogs.reminderDelete.action(this.deleteTarget.title) : ''}"
        result="${t.viewTexts.confirmDialogs.reminderDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deleteTarget = null)}"
        @confirm="${() => {
          if (this.deleteTarget) {
            store.deleteReminder(this.deleteTarget.id);
            this.deleteTarget = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }
}

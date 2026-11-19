import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store, ReminderRelatedObject } from '../../../state/store';
import { Reminder, ReminderEntityType, ReminderNotificationRule } from '../../../types';
import { getTranslation } from '../../../i18n';
import {
  formatRRuleHumanSummary,
  recurrenceToRRule,
  serializeRRule,
} from '../../../domain/rfc5545';
import styles from './app-reminder-detail-modal.css';
import type { EntityEmblemKind } from '../app-entity-emblem/app-entity-emblem';
import type { MenuItem } from '../app-menu/app-menu';
import {
  AttachmentsChangeDetail,
  commitPendingAttachments,
} from '../app-project-attachments/app-project-attachments';
import {
  iconArrowUpRight,
  iconBell,
  iconBellRing,
  iconCheck,
  iconClock,
  iconCopy,
  iconEdit,
  iconLink,
  iconPaperclip,
  iconPause,
  iconPlay,
  iconRepeat,
  iconTrash,
  iconUsers,
} from '../icons';
import '../app-modal/app-modal';
import '../app-button/app-button';
import '../app-dropdown-button/app-dropdown-button';
import '../app-badge/app-badge';
import '../app-status-chip/app-status-chip';
import '../app-entity-emblem/app-entity-emblem';
import '../app-tags-row/app-tags-row';
import '../app-avatar/app-avatar';
import '../app-project-attachments/app-project-attachments';
import '../app-reminder-form/app-reminder-form';
import '../app-confirm-dialog/app-confirm-dialog';

const ENTITY_EMBLEM_MAP: Record<ReminderEntityType, EntityEmblemKind> = {
  company: 'company',
  counterparty: 'counterparty',
  contact: 'contact',
  contract: 'contract',
  employee: 'employee',
  invoice: 'invoice',
  calculation: 'calculation',
  payment: 'payment',
  project: 'project',
  task: 'task',
  document: 'document',
  requirement: 'requirement',
  expense: 'expense',
  none: 'reminder',
};

@customElement('app-reminder-detail-modal')
export class AppReminderDetailModal extends LitElement {
  /** Optional explicit open state for isolated preview (Storybook). */
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  /** Optional explicit reminder for isolated preview (Storybook). */
  @property({ attribute: false }) reminder: Reminder | null = null;

  @state() private currentLang = store.customization.language;
  @state() private modalReminderId: string | null = store.modalReminderId;
  @state() private reminders: Reminder[] = store.reminders;
  @state() private editingReminder: Reminder | null = null;
  @state() private deleteConfirmOpen = false;

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

  private syncState() {
    this.currentLang = store.customization.language;
    this.modalReminderId = store.modalReminderId;
    this.reminders = store.reminders;
  }

  private getActiveReminder(): Reminder | null {
    if (this.reminder) {
      return this.reminders.find((r) => r.id === this.reminder?.id) || this.reminder;
    }
    if (!this.modalReminderId) return null;
    return this.reminders.find((r) => r.id === this.modalReminderId) || null;
  }

  private closeDetailModal() {
    this.editingReminder = null;
    this.deleteConfirmOpen = false;
    if (this.reminder) {
      this.open = false;
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    } else {
      store.closeReminderDetailModal();
    }
  }

  private handleNavigateObject(obj: ReminderRelatedObject) {
    if (!obj.navigable) return;
    this.closeDetailModal();
    store.navigateToReminderEntity(obj.type, obj.id);
  }

  private handleSnoozePreset(rem: Reminder, presetId: string) {
    const now = new Date();
    const next = new Date(now.getTime());
    if (presetId === 'min15') {
      next.setMinutes(next.getMinutes() + 15);
    } else if (presetId === 'hour1') {
      next.setHours(next.getHours() + 1);
    } else if (presetId === 'hour3') {
      next.setHours(next.getHours() + 3);
    } else if (presetId === 'tomorrow9') {
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
    } else if (presetId === 'nextWeek') {
      const day = next.getDay();
      const diff = day === 0 ? 1 : 8 - day;
      next.setDate(next.getDate() + diff);
      next.setHours(9, 0, 0, 0);
    }
    store.snoozeReminder(rem.id, store.formatLocalDateTime(next));
  }

  private handleAttachmentsChange(
    rem: Reminder,
    related: ReminderRelatedObject[],
    detail: AttachmentsChangeDetail
  ) {
    const projId = related.find((o) => o.type === 'project')?.id;
    const compId = related.find((o) => o.type === 'company')?.id;
    const ctrId = related.find((o) => o.type === 'contract')?.id;
    const cpId = related.find((o) => o.type === 'counterparty')?.id;
    const taskId = related.find((o) => o.type === 'task')?.id;

    const nextIds = commitPendingAttachments({
      projectId: projId,
      companyId: compId,
      contractId: ctrId,
      counterpartyId: cpId,
      taskId,
      category: 'other',
      tags: [...rem.tags],
      existingDocumentIds: detail.documentIds,
      pendingFiles: detail.pendingFiles,
      description: rem.description || '',
      versionNote: rem.title,
    });

    store.updateReminder({
      ...rem,
      attachmentIds: nextIds,
    });
  }

  private async copyRRule(text: string) {
    if (!text) return;
    const t = getTranslation(this.currentLang);
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Clipboard fallback still confirms text via toast
    }
    store.addNotification('info', t.reminders.rruleCopiedToast, text);
  }

  private formatRuleSummary(rule: ReminderNotificationRule, t: ReturnType<typeof getTranslation>): string {
    if (rule.offsetUnit === 'at_time' || rule.offsetValue === 0) {
      return t.reminders.leadUnits.at_time;
    }
    return `${rule.offsetValue} ${t.reminders.leadUnits[rule.offsetUnit]}`;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const rem = this.getActiveReminder();
    const isModalOpen = this.reminder
      ? this.open && Boolean(rem) && !this.editingReminder && !this.deleteConfirmOpen
      : Boolean(this.modalReminderId && rem) && !this.editingReminder && !this.deleteConfirmOpen;

    if (!rem) {
      return html``;
    }

    const useEnNames = t.common.locale.startsWith('en');
    const overdue = store.isReminderOverdue(rem);
    const dueToday = store.isReminderDueToday(rem);
    const isDone = rem.status === 'completed' || rem.status === 'cancelled';
    const effectiveDue = store.getEffectiveReminderDueAt(rem);
    const formattedDue = store.parseLocalDateTime(effectiveDue).toLocaleString(t.common.locale, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const relatedObjects = store.getReminderRelatedObjects(rem);
    const projectContextId = relatedObjects.find((o) => o.type === 'project')?.id || '';

    const isRecurring = rem.recurrence.enabled;
    const templates = store.getRecurrenceTemplates();
    const tpl = templates.find((item) => item.code === rem.recurrence.templateCode);
    const humanSummary = isRecurring
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
      : humanSummary || (rem.recurrence.freq ? t.reminders.rfcFreqs[rem.recurrence.freq] : t.reminders.rfcFreqs.NONE);

    const parsedRule = isRecurring ? recurrenceToRRule(rem.recurrence) : null;
    const rruleToken = isRecurring
      ? parsedRule
        ? serializeRRule(parsedRule, true)
        : rem.recurrence.rrule
      : '';

    const upcomingDates = isRecurring
      ? store.getUpcomingReminderOccurrences(effectiveDue, rem.recurrence, 4)
      : [];

    const owner = store.users.find((u) => u.id === rem.ownerId);
    const assignees = (rem.assigneeIds || [])
      .map((id) => store.users.find((u) => u.id === id))
      .filter((u): u is NonNullable<typeof u> => Boolean(u));
    const escalationUser = rem.notifications.escalationUserId
      ? store.users.find((u) => u.id === rem.notifications.escalationUserId)
      : undefined;

    const snoozeMenuItems: MenuItem[] = [
      { id: 'min15', label: t.reminders.snoozePresets.min15 },
      { id: 'hour1', label: t.reminders.snoozePresets.hour1 },
      { id: 'hour3', label: t.reminders.snoozePresets.hour3 },
      { id: 'tomorrow9', label: t.reminders.snoozePresets.tomorrow9 },
      { id: 'nextWeek', label: t.reminders.snoozePresets.nextWeek },
    ];

    const attachmentCount = (rem.attachmentIds || []).length;

    return html`
      <app-modal
        ?open="${isModalOpen}"
        size="lg"
        title="${rem.title || t.reminders.detailTitle}"
        @close="${() => this.closeDetailModal()}"
      >
        <div class="detail-scroll">
          <!-- Status & Description -->
          <section class="detail-section">
            <div class="section-head">
              <span class="section-title">
                <span class="section-icon">${iconBell(15)}</span>
                <span>${t.reminders.detailTitle}</span>
              </span>
              <div class="status-chips-row">
                <app-status-chip domain="reminder" status="${rem.status}" size="sm"></app-status-chip>
                <app-status-chip domain="reminderPriority" status="${rem.priority}" size="sm"></app-status-chip>
                ${overdue
                  ? html`<app-badge variant="danger" size="sm">${t.reminders.overdueLabel}</app-badge>`
                  : dueToday
                  ? html`<app-badge variant="warning" size="sm">${t.reminders.dueTodayLabel}</app-badge>`
                  : ''}
                ${rem.status === 'snoozed' && rem.snoozedUntil
                  ? html`
                      <app-badge variant="info" size="sm">
                        ${t.reminders.snoozedUntilLabel(
                          store.parseLocalDateTime(rem.snoozedUntil).toLocaleString(t.common.locale, {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        )}
                      </app-badge>
                    `
                  : ''}
              </div>
            </div>

            <p class="detail-desc ${rem.description ? '' : 'is-empty'}">
              ${rem.description || t.reminders.detailNoDescription}
            </p>

            ${rem.tags.length > 0
              ? html`<app-tags-row .tags="${rem.tags}" max-visible="8"></app-tags-row>`
              : ''}
          </section>

          <!-- Linked System Objects -->
          <section class="detail-section">
            <div class="section-head">
              <span class="section-title">
                <span class="section-icon">${iconLink(15)}</span>
                <span>${t.reminders.detailLinkedObjects}</span>
              </span>
            </div>

            ${relatedObjects.length === 0
              ? html`<span class="empty-hint">${t.reminders.detailNoLinkedObjects}</span>`
              : html`
                  <div class="related-grid">
                    ${relatedObjects.map(
                      (obj) => html`
                        <button
                          type="button"
                          class="related-card ${obj.isPrimary ? 'is-primary' : ''}"
                          ?disabled="${!obj.navigable}"
                          title="${obj.navigable ? t.reminders.actionOpenEntity : ''}"
                          @click="${() => this.handleNavigateObject(obj)}"
                        >
                          <div class="related-card-left">
                            <app-entity-emblem
                              entity="${ENTITY_EMBLEM_MAP[obj.type] || 'reminder'}"
                              size="sm"
                            ></app-entity-emblem>
                            <div class="related-card-text">
                              <div class="related-card-top">
                                <span class="related-type">${obj.typeLabel}</span>
                                <span class="related-role-tag">
                                  ${obj.isPrimary
                                    ? t.reminders.detailPrimaryObject
                                    : t.reminders.detailRelatedObject}
                                </span>
                              </div>
                              <span class="related-name">${obj.label}</span>
                              ${obj.subtitle
                                ? html`<span class="related-sub">${obj.subtitle}</span>`
                                : ''}
                            </div>
                          </div>
                          ${obj.navigable
                            ? html`<span class="related-arrow">${iconArrowUpRight(15)}</span>`
                            : ''}
                        </button>
                      `
                    )}
                  </div>
                `}
          </section>

          <!-- Schedule & RFC 5545 Recurrence -->
          <section class="detail-section">
            <div class="section-head">
              <span class="section-title">
                <span class="section-icon">${iconRepeat(15)}</span>
                <span>${t.reminders.detailRecurrenceSection}</span>
              </span>
              ${isRecurring
                ? html`
                    <app-badge variant="neutral" size="sm">
                      ${t.reminders.occurrenceBadge(
                        rem.recurrence.occurrenceCount,
                        rem.recurrence.endType === 'max_occurrences' ? rem.recurrence.maxOccurrences : undefined
                      )}
                    </app-badge>
                  `
                : ''}
            </div>

            <div class="schedule-grid">
              <div class="kv-block">
                <span class="kv-label">${t.reminders.fieldDueAt}</span>
                <span class="kv-val ${overdue ? 'is-overdue' : dueToday ? 'is-today' : ''}">
                  ${iconClock(14)}
                  <span>${formattedDue}</span>
                </span>
              </div>

              <div class="kv-block">
                <span class="kv-label">${t.reminders.fieldTemplate}</span>
                <span class="kv-val">${tplLabel}</span>
              </div>
            </div>

            ${rruleToken
              ? html`
                  <div class="rrule-summary-row">
                    <span class="rrule-human">${humanSummary}</span>
                    <button
                      type="button"
                      class="rrule-token-btn"
                      title="${t.reminders.rruleCopyBtn}"
                      @click="${() => this.copyRRule(rruleToken)}"
                    >
                      <span class="rrule-token-text">${rruleToken}</span>
                      ${iconCopy(12)}
                    </button>
                  </div>
                `
              : ''}

            ${upcomingDates.length > 0
              ? html`
                  <div class="occurrences-wrap">
                    <span class="kv-label">${t.reminders.previewNextTitle}</span>
                    <div class="occurrences-list">
                      ${upcomingDates.map(
                        (dt) => html`
                          <span class="occurrence-chip">
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
                  </div>
                `
              : ''}
          </section>

          <!-- Participants -->
          <section class="detail-section">
            <div class="section-head">
              <span class="section-title">
                <span class="section-icon">${iconUsers(15)}</span>
                <span>${t.reminders.detailPeopleSection}</span>
              </span>
            </div>

            <div class="schedule-grid">
              <div class="kv-block">
                <span class="kv-label">${t.reminders.fieldOwner}</span>
                <div class="people-row">
                  ${owner
                    ? html`
                        <span class="user-pill">
                          <app-avatar name="${owner.name}" size="xs"></app-avatar>
                          <span>${owner.name}</span>
                        </span>
                      `
                    : html`<span class="empty-hint">—</span>`}
                </div>
              </div>

              <div class="kv-block">
                <span class="kv-label">${t.reminders.fieldAssignees}</span>
                <div class="people-row">
                  ${assignees.length === 0
                    ? html`<span class="empty-hint">—</span>`
                    : assignees.map(
                        (u) => html`
                          <span class="user-pill">
                            <app-avatar name="${u.name}" size="xs"></app-avatar>
                            <span>${u.name}</span>
                          </span>
                        `
                      )}
                </div>
              </div>
            </div>
          </section>

          <!-- Attached Documents -->
          <section class="detail-section">
            <div class="section-head">
              <span class="section-title">
                <span class="section-icon">${iconPaperclip(15)}</span>
                <span>${t.reminders.detailAttachments}</span>
                ${attachmentCount > 0
                  ? html`
                      <app-badge variant="primary" appearance="soft" size="sm">
                        ${t.reminders.detailAttachmentsCount(attachmentCount)}
                      </app-badge>
                    `
                  : ''}
              </span>
              <span class="section-hint">${t.reminders.detailAttachmentsHint}</span>
            </div>

            <app-project-attachments
              compact
              project-id="${projectContextId}"
              label="${t.reminders.detailAttachments}"
              .documentIds="${rem.attachmentIds || []}"
              .pendingFiles="${[]}"
              @attachments-change="${(e: CustomEvent<AttachmentsChangeDetail>) =>
                this.handleAttachmentsChange(rem, relatedObjects, e.detail)}"
            ></app-project-attachments>
          </section>

          <!-- Notification Rules & Policies -->
          <section class="detail-section">
            <div class="section-head">
              <span class="section-title">
                <span class="section-icon">${iconBellRing(15)}</span>
                <span>${t.reminders.detailNotificationsSection}</span>
              </span>
            </div>

            <div class="rules-list">
              ${rem.notifications.rules.map(
                (rule) => html`
                  <div class="rule-row ${rule.enabled ? '' : 'is-disabled'}">
                    <div class="rule-row-left">
                      <span>${t.reminders.channels[rule.channel]}</span>
                      <span>·</span>
                      <span>${this.formatRuleSummary(rule, t)}</span>
                      ${!rule.enabled
                        ? html`<app-badge size="sm" variant="neutral">${t.reminders.detailRuleDisabled}</app-badge>`
                        : ''}
                    </div>
                    <div class="rule-row-right">
                      <span>${t.reminders.recipientModes[rule.recipientMode]}</span>
                    </div>
                    ${rule.customMessage
                      ? html`<div class="rule-custom-msg">${rule.customMessage}</div>`
                      : ''}
                  </div>
                `
              )}
            </div>

            <div class="policies-row">
              <span class="kv-label">${t.reminders.detailPolicyLabel}</span>
              ${rem.notifications.requireAck
                ? html`<span class="policy-pill">${t.viewTexts.reminders.policiesAckChip}</span>`
                : ''}
              ${rem.notifications.soundEnabled
                ? html`<span class="policy-pill">${t.viewTexts.reminders.policiesSoundChip}</span>`
                : ''}
              ${rem.notifications.quietHoursRespect
                ? html`<span class="policy-pill">${t.viewTexts.reminders.policiesQuietChip}</span>`
                : ''}
              ${rem.notifications.repeatNagMinutes
                ? html`
                    <span class="policy-pill">
                      ${t.reminders.repeatNagMinutesOpt(rem.notifications.repeatNagMinutes)}
                    </span>
                  `
                : ''}
              ${escalationUser
                ? html`<span class="policy-pill">${escalationUser.name}</span>`
                : ''}
            </div>
          </section>
        </div>

        <div slot="footer" class="footer-bar">
          <div class="footer-left">
            ${!isDone
              ? html`
                  <app-button
                    size="sm"
                    variant="primary"
                    @click="${() => store.completeReminder(rem.id)}"
                  >
                    <span slot="icon-start">${iconCheck(14)}</span>
                    <span>${isRecurring ? t.reminders.actionAdvanceCycle : t.reminders.actionComplete}</span>
                  </app-button>

                  <app-dropdown-button
                    size="sm"
                    variant="outline"
                    label="${t.reminders.actionSnooze}"
                    .items="${snoozeMenuItems}"
                    @select="${(e: CustomEvent<{ id: string }>) =>
                      this.handleSnoozePreset(rem, e.detail.id)}"
                  ></app-dropdown-button>

                  ${isRecurring
                    ? html`
                        <app-button
                          size="sm"
                          variant="ghost"
                          title="${rem.status === 'paused' ? t.reminders.actionResume : t.reminders.actionPause}"
                          @click="${() => store.toggleReminderPause(rem.id)}"
                        >
                          <span slot="icon-start">
                            ${rem.status === 'paused' ? iconPlay(14) : iconPause(14)}
                          </span>
                          <span>${rem.status === 'paused' ? t.reminders.actionResume : t.reminders.actionPause}</span>
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
              <span slot="icon-start">${iconBellRing(14)}</span>
              <span>${t.reminders.actionTestNotify}</span>
            </app-button>
          </div>

          <div class="footer-right">
            <app-button
              size="sm"
              variant="outline"
              @click="${() => (this.editingReminder = rem)}"
            >
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.reminders.actionEditParams}</span>
            </app-button>

            <app-button
              size="sm"
              variant="ghost"
              action="delete"
              title="${t.common.delete}"
              @click="${() => (this.deleteConfirmOpen = true)}"
            >
              <span slot="icon-start">${iconTrash(14)}</span>
            </app-button>

            <app-button
              size="sm"
              variant="ghost"
              @click="${() => this.closeDetailModal()}"
            >
              <span>${t.common.close}</span>
            </app-button>
          </div>
        </div>
      </app-modal>

      <app-reminder-form
        ?open="${Boolean(this.editingReminder)}"
        .reminder="${this.editingReminder}"
        @close="${() => (this.editingReminder = null)}"
      ></app-reminder-form>

      <app-confirm-dialog
        ?open="${this.deleteConfirmOpen}"
        variant="danger"
        title="${t.viewTexts.confirmDialogs.reminderDelete.title}"
        action="${t.viewTexts.confirmDialogs.reminderDelete.action(rem.title)}"
        result="${t.viewTexts.confirmDialogs.reminderDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deleteConfirmOpen = false)}"
        @confirm="${() => {
          this.deleteConfirmOpen = false;
          store.deleteReminder(rem.id);
          if (this.reminder) {
            this.closeDetailModal();
          }
        }}"
      ></app-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-reminder-detail-modal': AppReminderDetailModal;
  }
}

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ReminderRelatedObject, store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  formatRRuleHumanSummary,
  recurrenceToRRule,
  serializeRRule,
} from '../../../domain/rfc5545';
import {
  Reminder,
  ReminderEntityType,
  ReminderNotificationRule,
} from '../../../types';
import { eventValue } from '../../common/event-value';
import type { EntityEmblemKind } from '../../common/app-entity-emblem/app-entity-emblem';
import type { MenuItem } from '../../common/app-menu/app-menu';
import {
  AttachmentsChangeDetail,
  commitPendingAttachments,
} from '../../common/app-project-attachments/app-project-attachments';
import {
  iconArrowUpRight,
  iconBell,
  iconBellRing,
  iconCheck,
  iconChevronLeft,
  iconClock,
  iconCopy,
  iconEdit,
  iconLink,
  iconPaperclip,
  iconPause,
  iconPlay,
  iconRepeat,
  iconTrash,
} from '../../common/icons';
import '../../common/app-avatar/app-avatar';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-dropdown-button/app-dropdown-button';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-entity-emblem/app-entity-emblem';
import '../../common/app-entity-selector/app-entity-selector';
import '../../common/app-link/app-link';
import '../../common/app-project-attachments/app-project-attachments';
import '../../common/app-reminder-form/app-reminder-form';
import '../../common/app-section-card/app-section-card';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-tags-row/app-tags-row';
import detailShellStyles from '../../common/app-detail-shell/app-detail-shell.css';
import styles from './app-reminder-detail.css';

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

@customElement('app-reminder-detail')
export class AppReminderDetail extends LitElement {
  @state() private reminders: Reminder[] = store.reminders;
  @state() private detailReminderId: string = store.detailReminderId || '';
  @state() private currentLang = store.customization.language;

  @state() private editModalOpen = false;
  @state() private confirmDeleteOpen = false;

  private unsubscribe?: () => void;

  static styles = [detailShellStyles, styles];

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
    this.reminders = store.reminders;
    this.currentLang = store.customization.language;
    const candidate = store.detailReminderId || this.detailReminderId;
    if (candidate && this.reminders.some((r) => r.id === candidate)) {
      this.detailReminderId = candidate;
    } else {
      this.detailReminderId = this.reminders[0]?.id || '';
    }
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
      // Clipboard fallback still confirms via toast
    }
    store.addNotification('info', t.reminders.rruleCopiedToast, text);
  }

  private formatRuleSummary(
    rule: ReminderNotificationRule,
    t: ReturnType<typeof getTranslation>
  ): string {
    if (rule.offsetUnit === 'at_time' || rule.offsetValue === 0) {
      return t.reminders.leadUnits.at_time;
    }
    return `${rule.offsetValue} ${t.reminders.leadUnits[rule.offsetUnit]}`;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const rem = this.reminders.find((r) => r.id === this.detailReminderId) || null;

    if (!rem) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.reminderDetail.emptyNotFound}">
            <app-button
              slot="action"
              variant="primary"
              @click="${() => store.setActiveView('reminders')}"
            >
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.viewTexts.reminderDetail.backToList}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
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
    const primaryObj = relatedObjects.find((o) => o.isPrimary) || relatedObjects[0];
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
      ? store.getUpcomingReminderOccurrences(effectiveDue, rem.recurrence, 5)
      : [];

    const owner = store.users.find((u) => u.id === rem.ownerId);
    const assignees = (rem.assigneeIds || [])
      .map((id) => store.users.find((u) => u.id === id))
      .filter((u): u is NonNullable<typeof u> => Boolean(u));
    const escalationUser = rem.notifications.escalationUserId
      ? store.users.find((u) => u.id === rem.notifications.escalationUserId)
      : undefined;

    const enabledRules = rem.notifications.rules.filter((r) => r.enabled);
    const attachmentCount = (rem.attachmentIds || []).length;

    const snoozeMenuItems: MenuItem[] = [
      { id: 'min15', label: t.reminders.snoozePresets.min15 },
      { id: 'hour1', label: t.reminders.snoozePresets.hour1 },
      { id: 'hour3', label: t.reminders.snoozePresets.hour3 },
      { id: 'tomorrow9', label: t.reminders.snoozePresets.tomorrow9 },
      { id: 'nextWeek', label: t.reminders.snoozePresets.nextWeek },
    ];

    const switcherOptions = this.reminders.slice(0, 80).map((item) => {
      const info = store.getReminderEntityInfo(item.entityType, item.entityId);
      return {
        value: item.id,
        code: store.getEffectiveReminderDueAt(item).slice(0, 10),
        label: item.title,
        subtitle: `${info.typeLabel} · ${info.label}`,
        badge: t.reminders.statuses[item.status],
      };
    });

    const formatTimestamp = (iso?: string) =>
      iso
        ? new Date(iso).toLocaleString(t.common.locale, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—';

    return html`
      <div class="page-shell">
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="outline"
              size="sm"
              @click="${() => store.setActiveView('reminders')}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${t.viewTexts.reminderDetail.backToList}</span>
            </app-button>

            <div class="rem-switcher">
              <app-entity-selector
                size="sm"
                placeholder="${t.viewTexts.reminderDetail.switcherPlaceholder}"
                .options="${switcherOptions}"
                .value="${rem.id}"
                @change="${(e: CustomEvent<{ value: string }>) => {
                  const nextId = eventValue(e);
                  if (nextId && nextId !== rem.id) {
                    store.openReminderDetail(nextId);
                  }
                }}"
              ></app-entity-selector>
            </div>
          </div>

          <div class="nav-actions">
            ${primaryObj && primaryObj.navigable
              ? html`
                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => store.navigateToReminderEntity(primaryObj.type, primaryObj.id)}"
                  >
                    <span slot="icon-start">${iconArrowUpRight(14)}</span>
                    <span>${t.reminders.actionOpenEntity}</span>
                  </app-button>
                `
              : ''}

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

            <app-button
              size="sm"
              variant="secondary"
              @click="${() => (this.editModalOpen = true)}"
            >
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.common.edit}</span>
            </app-button>

            <app-button
              action="delete"
              size="xs"
              variant="icon"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteOpen = true)}"
            >
              <span slot="start">${iconTrash(15)}</span>
            </app-button>
          </div>
        </div>

        <section class="overview-card">
          <div class="hero-top">
            <div class="hero-identity">
              <app-entity-emblem entity="reminder" size="lg"></app-entity-emblem>
              <div class="title-block">
                <div class="hero-meta-row">
                  <app-entity-emblem entity="reminder" variant="pill" size="sm"></app-entity-emblem>
                  <span class="mono">${formattedDue}</span>
                  ${rem.snoozedUntil && rem.status === 'snoozed'
                    ? html`
                        <span aria-hidden="true">·</span>
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

                <div class="title-row">
                  <h1 class="rem-title ${isDone ? 'is-done' : ''}">${rem.title}</h1>
                  <app-status-chip domain="reminder" status="${rem.status}" appearance="soft" size="md"></app-status-chip>
                  <app-status-chip domain="reminderPriority" status="${rem.priority}" appearance="soft" size="md"></app-status-chip>
                  ${overdue
                    ? html`<app-badge variant="danger" size="sm">${t.reminders.overdueLabel}</app-badge>`
                    : dueToday
                    ? html`<app-badge variant="warning" size="sm">${t.reminders.dueTodayLabel}</app-badge>`
                    : ''}
                </div>

                <p class="rem-desc ${rem.description ? '' : 'is-empty'}">
                  ${rem.description || t.reminders.detailNoDescription}
                </p>

                ${rem.tags.length > 0
                  ? html`<app-tags-row .tags="${rem.tags}" max-visible="10"></app-tags-row>`
                  : ''}
              </div>
            </div>
          </div>

          <div class="kpi-strip">
            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.reminderDetail.kpiDueAt}</span>
              <span class="kpi-val ${overdue ? 'danger' : dueToday ? 'warning' : 'accent'}">
                ${effectiveDue.replace('T', ' ').slice(0, 16)}
              </span>
              <span class="kpi-hint">
                ${overdue
                  ? t.viewTexts.reminderDetail.kpiOverdueHint
                  : dueToday
                  ? t.viewTexts.reminderDetail.kpiTodayHint
                  : store.customization.timezone || 'UTC+3'}
              </span>
            </div>

            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.reminderDetail.kpiRecurrence}</span>
              <span class="kpi-val">${tplLabel}</span>
              <span class="kpi-hint">
                ${isRecurring
                  ? t.reminders.occurrenceBadge(
                      rem.recurrence.occurrenceCount,
                      rem.recurrence.endType === 'max_occurrences' ? rem.recurrence.maxOccurrences : undefined
                    )
                  : t.viewTexts.reminderDetail.kpiOneTimeHint}
              </span>
            </div>

            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.reminderDetail.kpiNotifyRules}</span>
              <span class="kpi-val success">${enabledRules.length}</span>
              <span class="kpi-hint">
                ${t.viewTexts.reminderDetail.kpiEnabledRulesHint(rem.notifications.rules.length)}
              </span>
            </div>

            <div class="kpi-cell">
              <span class="kpi-label">${t.viewTexts.reminderDetail.kpiLinksAndFiles}</span>
              <span class="kpi-val">${relatedObjects.length + attachmentCount}</span>
              <span class="kpi-hint">
                ${t.viewTexts.reminderDetail.kpiLinksHint(relatedObjects.length, attachmentCount)}
              </span>
            </div>
          </div>

          <div class="context-grid">
            <div class="meta-box">
              <span class="meta-label">${t.reminders.fieldOwner}</span>
              ${owner
                ? html`
                    <app-link
                      class="link-btn meta-link"
                      size="md"
                      variant="primary"
                      @click="${() => store.openEmployeeDetail(owner.id)}"
                    >
                      <span slot="start"><app-avatar name="${owner.name}" size="xs"></app-avatar></span>
                      <span>${owner.name}</span>
                    </app-link>
                  `
                : html`<span class="meta-val">—</span>`}
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.reminders.fieldAssignees}</span>
              <div class="people-row">
                ${assignees.length === 0
                  ? html`<span class="meta-val">—</span>`
                  : assignees.map(
                      (u) => html`
                        <button
                          type="button"
                          class="user-pill-btn"
                          @click="${() => store.openEmployeeDetail(u.id)}"
                        >
                          <app-avatar name="${u.name}" size="xs"></app-avatar>
                          <span>${u.name}</span>
                        </button>
                      `
                    )}
              </div>
            </div>

            <div class="meta-box">
              <span class="meta-label">${t.viewTexts.reminderDetail.metaCreatedAt}</span>
              <span class="meta-val mono">${formatTimestamp(rem.createdAt)}</span>
            </div>

            <div class="meta-box">
              <span class="meta-label">
                ${rem.completedAt
                  ? t.viewTexts.reminderDetail.metaCompletedAt
                  : t.viewTexts.reminderDetail.metaUpdatedAt}
              </span>
              <span class="meta-val mono">
                ${formatTimestamp(rem.completedAt || rem.updatedAt)}
              </span>
            </div>
          </div>
        </section>

        <!-- Linked System Objects -->
        <app-section-card
          title="${t.reminders.detailLinkedObjects}"
          subtitle="${relatedObjects.length > 0 ? `(${relatedObjects.length})` : ''}"
        >
          <span slot="icon">${iconLink(18)}</span>
          ${relatedObjects.length === 0
            ? html`<app-empty-state compact title="${t.reminders.detailNoLinkedObjects}"></app-empty-state>`
            : html`
                <div class="related-grid">
                  ${relatedObjects.map(
                    (obj) => html`
                      <button
                        type="button"
                        class="related-card ${obj.isPrimary ? 'is-primary' : ''}"
                        ?disabled="${!obj.navigable}"
                        title="${obj.navigable ? t.reminders.actionOpenEntity : ''}"
                        @click="${() => obj.navigable && store.navigateToReminderEntity(obj.type, obj.id)}"
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
                          ? html`<span class="related-arrow">${iconArrowUpRight(16)}</span>`
                          : ''}
                      </button>
                    `
                  )}
                </div>
              `}
        </app-section-card>

        <!-- Schedule & RFC 5545 Recurrence -->
        <app-section-card title="${t.reminders.detailRecurrenceSection}">
          <span slot="icon">${iconRepeat(18)}</span>
          ${isRecurring
            ? html`
                <div class="rrule-panel">
                  <div class="rrule-summary-row">
                    <span class="rrule-human">${humanSummary || tplLabel}</span>
                    ${rruleToken
                      ? html`
                          <button
                            type="button"
                            class="rrule-token-btn"
                            title="${t.reminders.rruleCopyBtn}"
                            @click="${() => this.copyRRule(rruleToken)}"
                          >
                            <span class="rrule-token-text">${rruleToken}</span>
                            ${iconCopy(13)}
                          </button>
                        `
                      : ''}
                  </div>

                  ${upcomingDates.length > 0
                    ? html`
                        <div class="occurrences-wrap">
                          <span class="meta-label">${t.reminders.previewNextTitle}</span>
                          <div class="occurrences-list">
                            ${upcomingDates.map(
                              (dt) => html`
                                <span class="occurrence-chip">
                                  ${iconClock(12)}
                                  <span>
                                    ${store.parseLocalDateTime(dt).toLocaleString(t.common.locale, {
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
                        </div>
                      `
                    : ''}
                </div>
              `
            : html`
                <p class="notes-text is-empty">${t.viewTexts.reminderDetail.noUpcomingOccurrences}</p>
              `}
        </app-section-card>

        <!-- Attached Documents -->
        <app-section-card
          title="${t.reminders.detailAttachments}"
          subtitle="${attachmentCount > 0 ? `(${attachmentCount})` : ''}"
        >
          <span slot="icon">${iconPaperclip(18)}</span>
          <div class="section-hint">${t.reminders.detailAttachmentsHint}</div>
          <app-project-attachments
            project-id="${projectContextId}"
            label="${t.reminders.detailAttachments}"
            .documentIds="${rem.attachmentIds || []}"
            .pendingFiles="${[]}"
            @attachments-change="${(e: CustomEvent<AttachmentsChangeDetail>) =>
              this.handleAttachmentsChange(rem, relatedObjects, e.detail)}"
          ></app-project-attachments>
        </app-section-card>

        <!-- Notification Rules & Policies -->
        <app-section-card
          title="${t.reminders.detailNotificationsSection}"
          subtitle="(${rem.notifications.rules.length})"
        >
          <span slot="icon">${iconBell(18)}</span>
          <div class="rules-list">
            ${rem.notifications.rules.map(
              (rule) => html`
                <div class="rule-row ${rule.enabled ? '' : 'is-disabled'}">
                  <div class="rule-row-left">
                    <span class="rule-channel">${t.reminders.channels[rule.channel]}</span>
                    <span aria-hidden="true">·</span>
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
            <span class="meta-label">${t.reminders.detailPolicyLabel}</span>
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
        </app-section-card>
      </div>

      <app-reminder-form
        ?open="${this.editModalOpen}"
        .reminder="${rem}"
        @close="${() => (this.editModalOpen = false)}"
      ></app-reminder-form>

      <app-confirm-dialog
        ?open="${this.confirmDeleteOpen}"
        size="sm"
        variant="danger"
        title="${t.viewTexts.confirmDialogs.reminderDelete.title}"
        action="${t.viewTexts.confirmDialogs.reminderDelete.action(rem.title)}"
        result="${t.viewTexts.confirmDialogs.reminderDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmDeleteOpen = false)}"
        @confirm="${() => {
          this.confirmDeleteOpen = false;
          store.deleteReminder(rem.id);
        }}"
      ></app-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-reminder-detail': AppReminderDetail;
  }
}

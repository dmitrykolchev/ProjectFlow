import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import {
  Reminder,
  ReminderEntityType,
  ReminderNotificationRule,
  ReminderPriority,
  ReminderStatus,
} from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-reminders.css';
import cardContentStyles from './app-reminders.content.css';
import { eventValue } from '../../common/event-value';
import type { FilterDef } from '../../common/app-filter-bar/app-filter-bar';
import type { MenuItem } from '../../common/app-menu/app-menu';
import type { EntityEmblemKind } from '../../common/app-entity-emblem/app-entity-emblem';
import {
  formatRRuleHumanSummary,
  recurrenceToRRule,
  serializeRRule,
} from '../../../domain/rfc5545';
import {
  iconArrowUpRight,
  iconBell,
  iconBellRing,
  iconCheck,
  iconClock,
  iconCopy,
  iconDatabase,
  iconEdit,
  iconEye,
  iconFilter,
  iconPaperclip,
  iconPause,
  iconPlay,
  iconPlus,
  iconRepeat,
  iconTrash,
} from '../../common/icons';
import '../../common/app-page-header/app-page-header';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-toggle-button/app-toggle-button';
import '../../common/app-button/app-button';
import '../../common/app-dropdown-button/app-dropdown-button';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-entity-emblem/app-entity-emblem';
import '../../common/app-tags-row/app-tags-row';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-cards-table/app-cards-table';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-reminder-form/app-reminder-form';

type ReminderScopeTab = 'all' | 'overdue' | 'today' | 'recurring' | 'completed';

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

const ENTITY_FILTER_TYPES: ReminderEntityType[] = [
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

@customElement('app-reminders')
export class AppReminders extends LitElement {
  @state() private currentLang = store.customization.language;
  @state() private reminders: Reminder[] = store.reminders;
  @state() private pageSize = store.customization.cardGridPageSize;
  @state() private currentPage = store.activePage;

  @state() private scopeTab: ReminderScopeTab = 'all';
  @state() private localSearch = '';
  @state() private filterVisible: boolean = true;
  @state() private statusFilter = 'all';
  @state() private entityTypeFilter = 'all';
  @state() private priorityFilter = 'all';

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

  private syncState() {
    this.currentLang = store.customization.language;
    this.reminders = store.reminders;
    this.pageSize = store.customization.cardGridPageSize;
    this.currentPage = store.activePage;
    this.scopeTab = (store.viewModeFor('reminders') as ReminderScopeTab) ?? 'all';
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

  private formatRuleChip(rule: ReminderNotificationRule, t: ReturnType<typeof getTranslation>): string {
    const ch = t.reminders.channels[rule.channel];
    if (rule.offsetUnit === 'at_time' || rule.offsetValue === 0) {
      return `${ch} · ${t.reminders.leadUnits.at_time}`;
    }
    return `${ch} · ${rule.offsetValue} ${t.reminders.leadUnits[rule.offsetUnit]}`;
  }

  private async copyRRuleText(text: string, t: ReturnType<typeof getTranslation>) {
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Clipboard fallback notification still confirms copied text
    }
    store.addNotification('info', t.reminders.rruleCopiedToast, text);
  }

  private openRecurrenceDirectory() {
    store.openDirectory('recurrence_templates');
  }

  render() {
    const t = getTranslation(this.currentLang);
    const templates = store.getRecurrenceTemplates();
    const useEnNames = t.common.locale.startsWith('en');

    const overdueCount = this.reminders.filter((r) => store.isReminderOverdue(r)).length;
    const dueCount = store.getDueRemindersCount();
    const recurringCount = this.reminders.filter(
      (r) => r.recurrence.enabled && r.status !== 'completed' && r.status !== 'cancelled'
    ).length;
    const activeRulesTotal = this.reminders
      .filter((r) => r.status === 'active' || r.status === 'snoozed')
      .reduce((sum, r) => sum + r.notifications.rules.filter((rule) => rule.enabled).length, 0);

    const filtered = this.reminders
      .filter((rem) => {
        if (this.scopeTab === 'overdue' && !store.isReminderOverdue(rem)) return false;
        if (this.scopeTab === 'today' && !store.isReminderDueToday(rem)) return false;
        if (this.scopeTab === 'recurring' && !rem.recurrence.enabled) return false;
        if (this.scopeTab === 'completed' && rem.status !== 'completed' && rem.status !== 'cancelled') return false;

        if (this.statusFilter !== 'all' && rem.status !== this.statusFilter) return false;
        if (this.entityTypeFilter !== 'all' && rem.entityType !== this.entityTypeFilter) return false;
        if (this.priorityFilter !== 'all' && rem.priority !== this.priorityFilter) return false;

        if (this.localSearch.trim()) {
          const q = this.localSearch.trim().toLowerCase();
          const info = store.getReminderEntityInfo(rem.entityType, rem.entityId);
          const matchTitle = rem.title.toLowerCase().includes(q);
          const matchDesc = (rem.description || '').toLowerCase().includes(q);
          const matchEntity = info.label.toLowerCase().includes(q) || (info.subtitle || '').toLowerCase().includes(q);
          const matchTag = rem.tags.some((tag) => tag.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchEntity && !matchTag) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aDone = a.status === 'completed' || a.status === 'cancelled' ? 1 : 0;
        const bDone = b.status === 'completed' || b.status === 'cancelled' ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return store.getEffectiveReminderDueAt(a).localeCompare(store.getEffectiveReminderDueAt(b));
      });

    const scopeOptions = [
      { value: 'all', label: t.viewTexts.reminders.scopeAll },
      { value: 'overdue', label: `${t.viewTexts.reminders.scopeOverdue}${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
      { value: 'today', label: t.viewTexts.reminders.scopeToday },
      { value: 'recurring', label: t.viewTexts.reminders.scopeRecurring },
      { value: 'completed', label: t.viewTexts.reminders.scopeCompleted },
    ];

    const filters: FilterDef[] = [
      {
        key: 'status',
        options: [
          { value: 'all', label: t.viewTexts.reminders.filterAllStatuses },
          ...(['active', 'snoozed', 'paused', 'completed', 'cancelled'] as ReminderStatus[]).map((s) => ({
            value: s,
            label: t.reminders.statuses[s],
          })),
        ],
      },
      {
        key: 'entityType',
        options: [
          { value: 'all', label: t.viewTexts.reminders.filterAllEntities },
          ...ENTITY_FILTER_TYPES.map((et) => ({
            value: et,
            label: t.entityTypes[et],
          })),
        ],
      },
      {
        key: 'priority',
        options: [
          { value: 'all', label: t.viewTexts.reminders.filterAllPriorities },
          ...(['urgent', 'high', 'medium', 'low'] as ReminderPriority[]).map((p) => ({
            value: p,
            label: t.priority[p],
          })),
        ],
      },
    ];

    const snoozeMenuItems: MenuItem[] = [
      { id: 'min15', label: t.reminders.snoozePresets.min15 },
      { id: 'hour1', label: t.reminders.snoozePresets.hour1 },
      { id: 'hour3', label: t.reminders.snoozePresets.hour3 },
      { id: 'tomorrow9', label: t.reminders.snoozePresets.tomorrow9 },
      { id: 'nextWeek', label: t.reminders.snoozePresets.nextWeek },
    ];

    return html`
      <app-page-header
        title="${t.navigation.reminders}"
        subtitle="${t.viewTexts.pageSubtitles.reminders}"
      >
        <span slot="icon">${iconBell(28)}</span>
        <div slot="actions" class="header-actions">
          <app-button variant="outline" size="md" @click="${() => this.openRecurrenceDirectory()}">
            <span slot="icon-start">${iconDatabase(16)}</span>
            <span>${t.viewTexts.reminders.templatesDirectoryBtn}</span>
          </app-button>
          <app-button
            variant="primary"
            size="md"
            @click="${() => {
              this.editingReminder = null;
              this.formOpen = true;
            }}"
          >
            <span slot="icon-start">${iconPlus(16)}</span>
            <span>${t.viewTexts.reminders.newButton}</span>
          </app-button>
        </div>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card
          size="compact"
          label="${t.viewTexts.reminders.kpiTotal}"
          value="${String(this.reminders.length)}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.reminders.kpiDueOverdue}"
          value="${String(dueCount)}"
          valueColor="${dueCount > 0 ? '#ef4444' : ''}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.reminders.kpiRecurring}"
          value="${String(recurringCount)}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.reminders.kpiNotificationRules}"
          value="${String(activeRulesTotal)}"
        ></app-metric-card>
      </app-kpi-strip>

      <!-- Canonical skeleton order: page header, KPI strip, display-mode switcher with the filter
           toggle, filter bar, data representation -->
      <div class="mode-row">
        <app-segmented-switch
          size="sm"
          .value="${this.scopeTab}"
          .options="${scopeOptions}"
          @change="${(e: Event) => {
            store.setActivePage(1, false);
            store.setViewMode('reminders', eventValue(e) as ReminderScopeTab);
          }}"
        ></app-segmented-switch>

        <app-toggle-button
          size="sm"
          .pressed="${this.filterVisible}"
          @change="${(e: CustomEvent<{ pressed: boolean }>) => (this.filterVisible = e.detail.pressed)}"
        >
          <span slot="icon-start">${iconFilter(14)}</span>
          <span>${t.common.filterToggle}</span>
        </app-toggle-button>
      </div>

      ${this.filterVisible
        ? html`<app-filter-bar
            style="--filter-search-min: 280px; --filter-search-max: 280px;"
            placeholder="${t.viewTexts.reminders.searchPlaceholder}"
            .searchValue="${this.localSearch}"
            .filters="${filters}"
            .values="${{
              status: this.statusFilter,
              entityType: this.entityTypeFilter,
              priority: this.priorityFilter,
            }}"
            @search-change="${(e: Event) => {
              this.localSearch = eventValue(e);
              store.setActivePage(1, false);
            }}"
            @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
              const { key, value } = e.detail;
              if (key === 'status') this.statusFilter = value;
              else if (key === 'entityType') this.entityTypeFilter = value;
              else if (key === 'priority') this.priorityFilter = value;
              store.setActivePage(1, false);
            }}"
            @reset="${() => {
              this.localSearch = '';
              this.statusFilter = 'all';
              this.entityTypeFilter = 'all';
              this.priorityFilter = 'all';
              this.scopeTab = 'all';
              store.setActivePage(1, false);
            }}"
          ></app-filter-bar>`
        : ''}

      ${filtered.length === 0
        ? html`
            <app-empty-state
              title="${t.viewTexts.reminders.emptyTitle}"
              subtitle="${t.viewTexts.reminders.emptySubtitle}"
            ></app-empty-state>
          `
        : html`
            <app-cards-table
              .contentStyles="${cardContentStyles}"
              .rows="${filtered}"
              .cardRender="${(row: Record<string, unknown>) => {
                const rem = row as unknown as Reminder;
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
                const entityInfo = store.getReminderEntityInfo(rem.entityType, rem.entityId);
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
                const isDone = rem.status === 'completed' || rem.status === 'cancelled';

                return html`
                  <div class="rem-card-head">
                      <div class="rem-chips-row">
                        <app-status-chip domain="reminder" status="${rem.status}" size="sm"></app-status-chip>
                        <app-status-chip domain="reminderPriority" status="${rem.priority}" size="sm"></app-status-chip>
                        ${overdue
                          ? html`<app-badge variant="danger" size="sm">${t.reminders.overdueLabel}</app-badge>`
                          : dueToday
                          ? html`<app-badge variant="warning" size="sm">${t.reminders.dueTodayLabel}</app-badge>`
                          : ''}
                      </div>
                    </div>

                    <h3 class="rem-card-title ${isDone ? 'is-done' : ''}">
                      <button
                        type="button"
                        class="rem-card-title-btn"
                        title="${t.reminders.actionDetails}"
                        @click="${() => store.openReminderDetail(rem.id)}"
                      >
                        ${rem.title}
                      </button>
                    </h3>
                    ${rem.description ? html`<p class="rem-card-desc">${rem.description}</p>` : ''}

                    <div class="rem-entity-bar">
                      <button
                        type="button"
                        class="rem-entity-btn"
                        ?disabled="${!entityInfo.navigable}"
                        title="${entityInfo.navigable ? t.reminders.actionOpenEntity : ''}"
                        @click="${() => store.navigateToReminderEntity(rem.entityType, rem.entityId)}"
                      >
                        <app-entity-emblem
                          entity="${ENTITY_EMBLEM_MAP[rem.entityType] || 'reminder'}"
                          size="xs"
                        ></app-entity-emblem>
                        <span class="rem-entity-col">
                          <span class="rem-entity-type">${entityInfo.typeLabel}</span>
                          <span class="rem-entity-name">${entityInfo.label}</span>
                        </span>
                        ${entityInfo.navigable ? iconArrowUpRight(14) : ''}
                      </button>
                    </div>

                    <div class="rem-schedule">
                      <span class="rem-meta-item ${overdue ? 'is-overdue' : dueToday ? 'is-today' : ''}">
                        ${iconClock(13)}
                        <span>${formattedDue}</span>
                      </span>
                      <span class="rem-meta-dot">·</span>
                      <span class="rem-meta-item" title="${summary || tplLabel}">
                        ${iconRepeat(13)}
                        <span>${tplLabel}</span>
                      </span>
                      ${isRecurring
                        ? html`
                            <span class="rem-meta-dot">·</span>
                            <span class="rem-meta-item">
                              ${t.reminders.occurrenceBadge(
                                rem.recurrence.occurrenceCount,
                                rem.recurrence.endType === 'max_occurrences' ? rem.recurrence.maxOccurrences : undefined
                              )}
                            </span>
                          `
                        : ''}
                      ${owner
                        ? html`
                            <span class="rem-meta-dot">·</span>
                            <span class="rem-meta-item">${owner.name}</span>
                          `
                        : ''}
                      ${(rem.attachmentIds || []).length > 0
                        ? html`
                            <span class="rem-meta-dot">·</span>
                            <button
                              type="button"
                              class="rem-attach-btn"
                              title="${t.reminders.actionDetails}"
                              @click="${() => store.openReminderDetail(rem.id)}"
                            >
                              ${iconPaperclip(12)}
                              <span>${t.reminders.detailAttachmentsCount((rem.attachmentIds || []).length)}</span>
                            </button>
                          `
                        : ''}
                    </div>

                    ${rruleToken
                      ? html`
                          <div class="rem-rrule-row">
                            <button
                              type="button"
                              class="rem-rrule-btn"
                              title="${t.reminders.rruleCopyBtn}"
                              @click="${() => this.copyRRuleText(rruleToken, t)}"
                            >
                              <span class="rem-rrule-text">${rruleToken}</span>
                              ${iconCopy(12)}
                            </button>
                          </div>
                        `
                      : ''}

                    ${rem.tags.length > 0
                      ? html`<app-tags-row .tags="${rem.tags}" max-visible="4"></app-tags-row>`
                      : ''}

                    <div class="rem-rules-box">
                      <div class="rem-rules-list">
                        ${enabledRules.map(
                          (rule) => html`
                            <span class="rem-rule-chip">
                              ${iconBellRing(11)}
                              <span>${this.formatRuleChip(rule, t)}</span>
                            </span>
                          `
                        )}
                        ${rem.notifications.requireAck
                          ? html`<span class="rem-policy-chip">${t.viewTexts.reminders.policiesAckChip}</span>`
                          : ''}
                        ${rem.notifications.soundEnabled
                          ? html`<span class="rem-policy-chip">${t.viewTexts.reminders.policiesSoundChip}</span>`
                          : ''}
                        ${rem.notifications.quietHoursRespect
                          ? html`<span class="rem-policy-chip">${t.viewTexts.reminders.policiesQuietChip}</span>`
                          : ''}
                      </div>
                    </div>

                    <div class="rem-footer-actions">
                      <div class="rem-footer-left">
                        ${!isDone
                          ? html`
                              <app-button
                                size="sm"
                                variant="primary"
                                @click="${() => store.completeReminder(rem.id)}"
                              >
                                <span slot="icon-start">${iconCheck(13)}</span>
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
                                        ${rem.status === 'paused' ? iconPlay(13) : iconPause(13)}
                                      </span>
                                    </app-button>
                                  `
                                : ''}
                            `
                          : ''}
                      </div>

                      <div class="rem-footer-right">
                        <app-button
                          size="sm"
                          variant="ghost"
                          title="${t.reminders.actionDetails}"
                          @click="${() => store.openReminderDetail(rem.id)}"
                        >
                          <span slot="icon-start">${iconEye(14)}</span>
                        </app-button>
                        <app-button
                          size="sm"
                          variant="ghost"
                          title="${t.reminders.actionTestNotify}"
                          @click="${() => store.triggerReminderNotification(rem.id)}"
                        >
                          <span slot="icon-start">${iconBellRing(14)}</span>
                        </app-button>
                        <app-button
                          size="sm"
                          variant="ghost"
                          title="${t.common.edit}"
                          @click="${() => {
                            this.editingReminder = rem;
                            this.formOpen = true;
                          }}"
                        >
                          <span slot="icon-start">${iconEdit(14)}</span>
                        </app-button>
                        <app-button
                          size="sm"
                          variant="ghost"
                          title="${t.common.delete}"
                          @click="${() => (this.deleteTarget = rem)}"
                        >
                          <span slot="icon-start">${iconTrash(14)}</span>
                        </app-button>
                      </div>
                    </div>
                `;
              }}"
              .cardClass="${(row: Record<string, unknown>) => {
                const rem = row as unknown as Reminder;
                return rem.status === 'completed' || rem.status === 'cancelled' ? 'is-dimmed' : '';
              }}"
              page-size="${this.pageSize}"
              page="${this.currentPage}"
              locale="${t.common.locale}"
              wide-collapse
              @page-change="${(e: CustomEvent<{ page: number }>) => {
                this.currentPage = e.detail.page;
                store.setActivePage(e.detail.page, true);
              }}"
              @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
                this.currentPage = 1;
                store.setActivePage(1, false);
                store.setCardGridPageSize(e.detail.pageSize);
              }}"
            ></app-cards-table>
          `}

      <app-reminder-form
        ?open="${this.formOpen}"
        .reminder="${this.editingReminder}"
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

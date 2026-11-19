import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  Calculation,
  TimeEntry,
  TimeEntryStatus,
} from '../../../types';
import { formatMoney } from '../../common/app-money/app-money';
import { eventValue } from '../../common/event-value';
import {
  AttachmentsChangeDetail,
  commitPendingAttachments,
} from '../../common/app-project-attachments/app-project-attachments';
import {
  iconCalculator,
  iconCheck,
  iconChevronLeft,
  iconClock,
  iconEdit,
  iconFileText,
  iconFolder,
  iconPaperclip,
  iconTrash,
} from '../../common/icons';
import '../../common/app-avatar/app-avatar';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import {
  DetailSwitchDetail,
} from '../../common/app-detail-shell/app-detail-shell';
import '../../common/app-detail-shell/app-detail-shell';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-entity-emblem/app-entity-emblem';
import '../../common/app-link/app-link';
import '../../common/app-project-attachments/app-project-attachments';
import '../../common/app-section-card/app-section-card';
import '../../common/app-select/app-select';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-time-entry-form/app-time-entry-form';
import detailShellStyles from '../../common/app-detail-shell/app-detail-shell.css';
import styles from './app-timeentry-detail.css';

const HOURLY_RATE_RUB = 3200;

@customElement('app-timeentry-detail')
export class AppTimeEntryDetail extends LitElement {
  @state() private timeEntries: TimeEntry[] = store.timeEntries;
  @state() private calculations: Calculation[] = store.calculations;
  @state() private detailTimeEntryId = store.detailTimeEntryId;
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
    this.timeEntries = store.timeEntries;
    this.calculations = store.calculations;
    this.currentLang = store.customization.language;
    const candidate = store.detailTimeEntryId || this.detailTimeEntryId;
    if (candidate && this.timeEntries.some((te) => te.id === candidate)) {
      this.detailTimeEntryId = candidate;
    } else {
      this.detailTimeEntryId = this.timeEntries[0]?.id || '';
    }
  }

  private handleAttachmentsChange(
    entry: TimeEntry,
    detail: AttachmentsChangeDetail
  ) {
    const project = store.projects.find((p) => p.id === entry.projectId);
    const nextIds = commitPendingAttachments({
      projectId: entry.projectId,
      companyId: project?.companyId,
      counterpartyId: project?.counterpartyId,
      taskId: entry.taskId,
      uploadedById: entry.userId,
      category: 'report',
      tags: ['time-entry', entry.category],
      existingDocumentIds: detail.documentIds,
      pendingFiles: detail.pendingFiles,
      description: entry.description || '',
      versionNote: `${entry.date} · ${entry.hours}h`,
    });
    store.updateTimeEntry({
      ...entry,
      documentIds: nextIds,
    });
  }

  render() {
    const t = getTranslation(this.currentLang);
    const entry = this.timeEntries.find((te) => te.id === this.detailTimeEntryId) || null;

    if (!entry) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.timeentryDetail.emptyNotFound}">
            <app-button
              slot="action"
              variant="primary"
              @click="${() => store.setActiveView('time-tracking')}"
            >
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.viewTexts.timeentryDetail.backToList}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const project = store.projects.find((p) => p.id === entry.projectId);
    const task = store.tasks.find((tk) => tk.id === entry.taskId);
    const user = store.users.find((u) => u.id === entry.userId);
    const company = project?.companyId
      ? store.companies.find((c) => c.id === project.companyId)
      : undefined;
    const cp = project?.counterpartyId
      ? store.counterparties.find((c) => c.id === project.counterpartyId)
      : undefined;

    const hUnit = t.viewTexts.timeTracking.hoursUnit;
    const estCostRub = Math.round(entry.hours * HOURLY_RATE_RUB);
    const docIds = entry.documentIds || [];

    const linkedCalcs = this.calculations
      .map((calc) => {
        const matchedItems = calc.items.filter(
          (item) => item.itemType === 'time_entry' && item.sourceId === entry.id
        );
        return {
          calc,
          amount: matchedItems.reduce((sum, i) => sum + (i.billable ? i.amount : 0), 0),
          matched: matchedItems.length > 0,
        };
      })
      .filter((row) => row.matched);

    const siblingEntries = this.timeEntries
      .filter((te) => te.taskId === entry.taskId && te.id !== entry.id)
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));

    const switcherOptions = this.timeEntries.slice(0, 80).map((item) => {
      const itTask = store.tasks.find((tk) => tk.id === item.taskId);
      const itUser = store.users.find((u) => u.id === item.userId);
      return {
        value: item.id,
        code: item.date,
        label: itTask ? `${itTask.id} · ${itTask.title}` : item.taskId,
        subtitle: `${itUser?.name || item.userId} · ${t.timeTracking.categories[item.category]}`,
        meta: `${item.hours.toFixed(1)} ${hUnit}`,
        badge: t.timeTracking.statuses[item.status],
      };
    });

    const statusOptions: Array<{ value: TimeEntryStatus; label: string; color: string }> = [
      { value: 'logged', label: t.timeTracking.statuses.logged, color: '#64748b' },
      { value: 'submitted', label: t.timeTracking.statuses.submitted, color: '#f59e0b' },
      { value: 'approved', label: t.timeTracking.statuses.approved, color: '#10b981' },
    ];

    const createdFormatted = new Date(entry.createdAt).toLocaleString(t.common.locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return html`
      <app-detail-shell
        entity="timeEntry"
        backLabel="${t.viewTexts.timeentryDetail.backToList}"
        switcherPlaceholder="${t.viewTexts.timeentryDetail.switcherPlaceholder}"
        .switcherOptions="${switcherOptions}"
        switcherValue="${entry.id}"
        @detail-back="${() => store.setActiveView('time-tracking')}"
        @entity-switch="${(e: CustomEvent<DetailSwitchDetail>) => {
          const nextId = e.detail.value;
          if (nextId && nextId !== entry.id) {
            store.openTimeEntryDetail(nextId);
          }
        }}"
      >
        ${task
          ? html`
              <app-button
                slot="nav-actions"
                size="sm"
                variant="outline"
                @click="${() => store.openTaskDetail(task.id)}"
              >
                <span slot="icon-start">${iconFileText(14)}</span>
                <span>${t.viewTexts.timeentryDetail.openTaskBtn}</span>
              </app-button>
            `
          : ''}

        ${project
          ? html`
              <app-button
                slot="nav-actions"
                size="sm"
                variant="outline"
                @click="${() => store.openProjectDetail(project.id)}"
              >
                <span slot="icon-start">${iconFolder(14)}</span>
                <span>${t.viewTexts.timeentryDetail.openProjectBtn}</span>
              </app-button>
            `
          : ''}

        ${entry.status !== 'approved'
          ? html`
              <app-button
                slot="nav-actions"
                size="sm"
                variant="primary"
                @click="${() => store.updateTimeEntry({ ...entry, status: 'approved' })}"
              >
                <span slot="icon-start">${iconCheck(14)}</span>
                <span>${t.viewTexts.timeTracking.approveEntryTitle}</span>
              </app-button>
            `
          : ''}

        <app-button
          slot="nav-actions"
          size="sm"
          variant="secondary"
          @click="${() => (this.editModalOpen = true)}"
        >
          <span slot="icon-start">${iconEdit(14)}</span>
          <span>${t.common.edit}</span>
        </app-button>

        <app-button
          slot="nav-actions"
          action="delete"
          size="xs"
          variant="icon"
          title="${t.common.delete}"
          @click="${() => (this.confirmDeleteOpen = true)}"
        >
          <span slot="start">${iconTrash(15)}</span>
        </app-button>

        <app-entity-emblem
          slot="hero-meta"
          entity="timeEntry"
          variant="pill"
          size="sm"
        ></app-entity-emblem>
        <span slot="hero-meta" class="mono">${entry.date}</span>
        <span slot="hero-meta" aria-hidden="true">·</span>
        <span slot="hero-meta">${t.timeTracking.categories[entry.category]}</span>
        ${project
          ? html`
              <span slot="hero-meta" aria-hidden="true">·</span>
              <app-link
                slot="hero-meta"
                class="link-btn hdr-link"
                size="md"
                variant="primary"
                @click="${() => store.openProjectDetail(project.id)}"
              >
                <span class="mono">${project.key}</span>
              </app-link>
            `
          : ''}

        <h1 slot="title" class="entry-title">
          ${task ? `${task.id} · ${task.title}` : entry.taskId}
        </h1>
        <app-status-chip
          slot="title"
          domain="timeEntry"
          status="${entry.status}"
          appearance="soft"
          size="md"
        ></app-status-chip>
        <app-badge
          slot="title"
          variant="${entry.billable ? 'info' : 'default'}"
          appearance="soft"
          size="sm"
        >
          ${entry.billable
            ? t.viewTexts.timeTracking.badgeBillableShort
            : t.viewTexts.timeTracking.badgeInternalShort}
        </app-badge>

        <div slot="hero-sub" class="entry-sub">
          ${user
            ? html`
                <span class="user-inline">
                  <app-avatar name="${user.name}" size="xs"></app-avatar>
                  <span>${user.name}</span>
                </span>
              `
            : ''}
        </div>

        <div slot="hero-side" class="status-control-box">
          <app-select
            size="sm"
            label="${t.viewTexts.timeentryDetail.changeStatusLabel}"
            .value="${entry.status}"
            .options="${statusOptions}"
            @change="${(e: CustomEvent<{ value: string }>) => {
              const nextStatus = eventValue(e) as TimeEntryStatus;
              if (nextStatus && nextStatus !== entry.status) {
                store.updateTimeEntry({ ...entry, status: nextStatus });
              }
            }}"
          ></app-select>
        </div>

        <div slot="kpi" class="kpi-cell">
          <span class="kpi-label">${t.viewTexts.timeentryDetail.kpiHours}</span>
          <span class="kpi-val accent">${entry.hours.toFixed(2)} ${hUnit}</span>
          <span class="kpi-hint">${entry.date}</span>
        </div>
        <div slot="kpi" class="kpi-cell">
          <span class="kpi-label">${t.viewTexts.timeentryDetail.kpiEstimatedCost}</span>
          <span class="kpi-val ${entry.billable ? 'success' : ''}">
            ${formatMoney(entry.billable ? estCostRub : 0, 'RUB')}
          </span>
          <span class="kpi-hint">
            ${t.viewTexts.timeentryDetail.kpiRateHint(
              (entry.billable ? HOURLY_RATE_RUB : 0).toLocaleString(t.common.locale)
            )}
          </span>
        </div>
        <div slot="kpi" class="kpi-cell">
          <span class="kpi-label">${t.viewTexts.timeentryDetail.kpiBillingStatus}</span>
          <span class="kpi-val">
            ${entry.billable
              ? t.viewTexts.timeTracking.badgeBillableShort
              : t.viewTexts.timeTracking.badgeInternalShort}
          </span>
          <span class="kpi-hint">
            ${entry.billable
              ? t.viewTexts.timeentryDetail.kpiBillableHint
              : t.viewTexts.timeentryDetail.kpiInternalHint}
          </span>
        </div>
        <div slot="kpi" class="kpi-cell">
          <span class="kpi-label">${t.viewTexts.timeentryDetail.kpiAttachments}</span>
          <span class="kpi-val">${docIds.length}</span>
          <span class="kpi-hint">${t.viewTexts.timeentryDetail.kpiFilesHint}</span>
        </div>

        <div slot="context" class="meta-box">
          <span class="meta-label">${t.viewTexts.timeentryDetail.labelProject}</span>
          ${project
            ? html`
                <app-link
                  class="link-btn meta-link"
                  size="md"
                  variant="primary"
                  @click="${() => store.openProjectDetail(project.id)}"
                >
                  <span slot="start" class="mono">[${project.key}]</span>
                  <span>${project.name}</span>
                </app-link>
              `
            : html`<span class="meta-val">—</span>`}
        </div>

        <div slot="context" class="meta-box">
          <span class="meta-label">${t.viewTexts.timeentryDetail.labelTask}</span>
          ${task
            ? html`
                <app-link
                  class="link-btn meta-link"
                  size="md"
                  variant="primary"
                  @click="${() => store.openTaskDetail(task.id)}"
                >
                  <span slot="start" class="mono">${task.id}</span>
                  <span>${task.title}</span>
                </app-link>
              `
            : html`<span class="meta-val">${t.viewTexts.timeTracking.removedTask}</span>`}
        </div>

        <div slot="context" class="meta-box">
          <span class="meta-label">${t.viewTexts.timeentryDetail.labelEmployee}</span>
          ${user
            ? html`
                <app-link
                  class="link-btn meta-link"
                  size="md"
                  variant="primary"
                  @click="${() => store.openEmployeeDetail(user.id)}"
                >
                  <span>${user.name}</span>
                </app-link>
                <span class="kpi-hint">${user.role}</span>
              `
            : html`<span class="meta-val">—</span>`}
        </div>

        <div slot="context" class="meta-box">
          <span class="meta-label">${t.viewTexts.timeentryDetail.labelCategory}</span>
          <span class="meta-val">${t.timeTracking.categories[entry.category]}</span>
        </div>

        <div slot="context" class="meta-box">
          <span class="meta-label">${t.viewTexts.timeentryDetail.labelCompany}</span>
          ${company
            ? html`
                <app-link
                  class="link-btn meta-link"
                  size="md"
                  variant="primary"
                  @click="${() => store.openCompanyDetail(company.id)}"
                >
                  <span>${company.name}</span>
                </app-link>
              `
            : html`<span class="meta-val">—</span>`}
        </div>

        <div slot="context" class="meta-box">
          <span class="meta-label">${t.viewTexts.timeentryDetail.labelCounterparty}</span>
          ${cp
            ? html`
                <app-link
                  class="link-btn meta-link"
                  size="md"
                  variant="primary"
                  @click="${() => store.openCounterpartyDetail(cp.id)}"
                >
                  <span>${cp.name}</span>
                </app-link>
              `
            : html`<span class="meta-val">${createdFormatted}</span>`}
          ${cp ? html`<span class="kpi-hint mono">${createdFormatted}</span>` : ''}
        </div>

        <!-- Description -->
        <app-section-card title="${t.viewTexts.timeentryDetail.descriptionTitle}">
          <span slot="icon">${iconFileText(18)}</span>
          <p class="notes-text ${entry.description ? '' : 'is-empty'}">
            ${entry.description || t.viewTexts.timeentryDetail.emptyDescription}
          </p>
        </app-section-card>

        <!-- Attachments -->
        <app-section-card
          title="${t.viewTexts.timeentryDetail.attachmentsTitle}"
          subtitle="${docIds.length > 0 ? `(${docIds.length})` : ''}"
        >
          <span slot="icon">${iconPaperclip(18)}</span>
          <div class="section-hint">${t.viewTexts.timeentryDetail.attachmentsHint}</div>
          <app-project-attachments
            project-id="${entry.projectId}"
            label="${t.viewTexts.timeentryDetail.attachmentsTitle}"
            .documentIds="${docIds}"
            .pendingFiles="${[]}"
            @attachments-change="${(e: CustomEvent<AttachmentsChangeDetail>) =>
              this.handleAttachmentsChange(entry, e.detail)}"
          ></app-project-attachments>
        </app-section-card>

        <!-- Linked Calculations -->
        <app-section-card
          title="${t.viewTexts.timeentryDetail.calculationsTitle}"
          subtitle="${linkedCalcs.length > 0 ? `(${linkedCalcs.length})` : ''}"
        >
          <span slot="icon">${iconCalculator(18)}</span>
          ${linkedCalcs.length === 0
            ? html`<app-empty-state compact title="${t.viewTexts.timeentryDetail.calculationsEmpty}"></app-empty-state>`
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${t.viewTexts.timeentryDetail.thCalcNumber}</th>
                        <th>${t.viewTexts.timeentryDetail.thCalcPeriod}</th>
                        <th>${t.viewTexts.timeentryDetail.thCalcAmount}</th>
                        <th>${t.viewTexts.timeentryDetail.thCalcStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${linkedCalcs.map(
                        ({ calc, amount }) => html`
                          <tr>
                            <td>
                              <app-link
                                class="link-btn task-link"
                                size="md"
                                variant="primary"
                                @click="${() => store.openCalculationDetail(calc.id)}"
                              >
                                <span class="mono">${calc.number}</span>
                              </app-link>
                            </td>
                            <td class="mono">${calc.periodStart} → ${calc.periodEnd}</td>
                            <td class="mono">${formatMoney(amount, calc.currency)}</td>
                            <td>
                              <app-status-chip domain="calculation" status="${calc.status}" size="sm"></app-status-chip>
                            </td>
                          </tr>
                        `
                      )}
                    </tbody>
                  </table>
                </div>
              `}
        </app-section-card>

        <!-- Sibling Time Entries for Task -->
        <app-section-card
          title="${t.viewTexts.timeentryDetail.siblingEntriesTitle}"
          subtitle="${siblingEntries.length > 0 ? `(${siblingEntries.length})` : ''}"
        >
          <span slot="icon">${iconClock(18)}</span>
          ${siblingEntries.length === 0
            ? html`<app-empty-state compact title="${t.viewTexts.timeentryDetail.siblingEntriesEmpty}"></app-empty-state>`
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${t.viewTexts.timeentryDetail.thSiblingDate}</th>
                        <th>${t.viewTexts.timeentryDetail.thSiblingUser}</th>
                        <th>${t.viewTexts.timeentryDetail.thSiblingHours}</th>
                        <th>${t.viewTexts.timeentryDetail.thSiblingDesc}</th>
                        <th>${t.viewTexts.timeentryDetail.thSiblingStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${siblingEntries.map((sib) => {
                        const sibUser = store.users.find((u) => u.id === sib.userId);
                        return html`
                          <tr>
                            <td class="mono">
                              <app-link
                                class="link-btn task-link"
                                size="md"
                                variant="primary"
                                @click="${() => store.openTimeEntryDetail(sib.id)}"
                              >
                                <span>${sib.date}</span>
                              </app-link>
                            </td>
                            <td>${sibUser?.name || sib.userId}</td>
                            <td class="mono">${sib.hours.toFixed(1)} ${hUnit}</td>
                            <td>${sib.description || t.timeTracking.categories[sib.category]}</td>
                            <td>
                              <app-status-chip domain="timeEntry" status="${sib.status}" size="sm"></app-status-chip>
                            </td>
                          </tr>
                        `;
                      })}
                    </tbody>
                  </table>
                </div>
              `}
        </app-section-card>
      </app-detail-shell>

      <app-time-entry-form
        .open="${this.editModalOpen}"
        .entry="${entry}"
        @close="${() => (this.editModalOpen = false)}"
        @saved="${() => (this.editModalOpen = false)}"
      ></app-time-entry-form>

      <app-confirm-dialog
        .open="${this.confirmDeleteOpen}"
        size="sm"
        variant="danger"
        title="${t.viewTexts.confirmDialogs.timeEntryDelete.title}"
        action="${t.viewTexts.confirmDialogs.timeEntryDelete.action(entry.hours, entry.taskId)}"
        result="${t.viewTexts.confirmDialogs.timeEntryDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmDeleteOpen = false)}"
        @confirm="${() => {
          this.confirmDeleteOpen = false;
          store.deleteTimeEntry(entry.id);
        }}"
      ></app-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-timeentry-detail': AppTimeEntryDetail;
  }
}

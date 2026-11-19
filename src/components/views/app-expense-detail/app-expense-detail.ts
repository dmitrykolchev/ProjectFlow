import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  Calculation,
  Expense,
  ExpenseStatus,
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
  iconEdit,
  iconFileText,
  iconFolder,
  iconPaperclip,
  iconTrash,
  iconWallet,
  iconX,
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
import '../../common/app-entity-reminders/app-entity-reminders';
import '../../common/app-expense-form/app-expense-form';
import '../../common/app-link/app-link';
import '../../common/app-project-attachments/app-project-attachments';
import '../../common/app-section-card/app-section-card';
import '../../common/app-select/app-select';
import '../../common/app-status-chip/app-status-chip';
import detailShellStyles from '../../common/app-detail-shell/app-detail-shell.css';
import styles from './app-expense-detail.css';

const FX_TO_RUB: Record<string, number> = {
  RUB: 1,
  USD: 92,
  EUR: 100,
};

@customElement('app-expense-detail')
export class AppExpenseDetail extends LitElement {
  @state() private expenses: Expense[] = store.expenses;
  @state() private calculations: Calculation[] = store.calculations;
  @state() private detailExpenseId = store.detailExpenseId;
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
    this.expenses = store.expenses;
    this.calculations = store.calculations;
    this.currentLang = store.customization.language;
    const candidate = store.detailExpenseId || this.detailExpenseId;
    if (candidate && this.expenses.some((e) => e.id === candidate)) {
      this.detailExpenseId = candidate;
    } else {
      this.detailExpenseId = this.expenses[0]?.id || '';
    }
  }

  private toRub(amount: number, currency: Expense['currency']): number {
    return Math.round(amount * (FX_TO_RUB[currency] ?? 1));
  }

  private handleAttachmentsChange(
    expense: Expense,
    detail: AttachmentsChangeDetail
  ) {
    const project = store.projects.find((p) => p.id === expense.projectId);
    const nextIds = commitPendingAttachments({
      projectId: expense.projectId,
      companyId: project?.companyId,
      counterpartyId: project?.counterpartyId,
      taskId: expense.taskId,
      uploadedById: expense.userId,
      category: 'act_invoice',
      tags: ['expense', expense.category],
      existingDocumentIds: detail.documentIds,
      pendingFiles: detail.pendingFiles,
      description: expense.notes || expense.title,
      versionNote: `${expense.date} · ${expense.title}`,
    });
    store.updateExpense({
      ...expense,
      documentIds: nextIds,
    });
  }

  render() {
    const t = getTranslation(this.currentLang);
    const expense = this.expenses.find((e) => e.id === this.detailExpenseId) || null;

    if (!expense) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.expenseDetail.emptyNotFound}">
            <app-button
              slot="action"
              variant="primary"
              @click="${() => store.setActiveView('expenses')}"
            >
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.viewTexts.expenseDetail.backToList}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const project = store.projects.find((p) => p.id === expense.projectId);
    const task = expense.taskId
      ? store.tasks.find((tk) => tk.id === expense.taskId)
      : undefined;
    const user = store.users.find((u) => u.id === expense.userId);
    const company = project?.companyId
      ? store.companies.find((c) => c.id === project.companyId)
      : undefined;

    const rubAmount = this.toRub(expense.amount, expense.currency);
    const docIds = expense.documentIds || [];

    const linkedCalcs = this.calculations
      .map((calc) => {
        const matchedItems = calc.items.filter(
          (item) => item.itemType === 'expense' && item.sourceId === expense.id
        );
        return {
          calc,
          amount: matchedItems.reduce((sum, i) => sum + (i.billable ? i.amount : 0), 0),
          matched: matchedItems.length > 0,
        };
      })
      .filter((row) => row.matched);

    const switcherOptions = this.expenses.slice(0, 80).map((item) => {
      const itProj = store.projects.find((p) => p.id === item.projectId);
      return {
        value: item.id,
        code: item.date,
        label: item.title,
        subtitle: `${itProj ? `[${itProj.key}] ` : ''}${item.vendor || t.expenses.categories[item.category]}`,
        meta: formatMoney(item.amount, item.currency),
        badge: t.expenses.statuses[item.status],
      };
    });

    const statusOptions: Array<{ value: ExpenseStatus; label: string; color: string }> = [
      { value: 'draft', label: t.expenses.statuses.draft, color: '#64748b' },
      { value: 'pending', label: t.expenses.statuses.pending, color: '#f59e0b' },
      { value: 'approved', label: t.expenses.statuses.approved, color: '#10b981' },
      { value: 'reimbursed', label: t.expenses.statuses.reimbursed, color: '#0284c7' },
      { value: 'rejected', label: t.expenses.statuses.rejected, color: '#ef4444' },
    ];

    const createdFormatted = new Date(expense.createdAt).toLocaleString(t.common.locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return html`
      <app-detail-shell
        entity="expense"
        backLabel="${t.viewTexts.expenseDetail.backToList}"
        switcherPlaceholder="${t.viewTexts.expenseDetail.switcherPlaceholder}"
        .switcherOptions="${switcherOptions}"
        switcherValue="${expense.id}"
        @detail-back="${() => store.setActiveView('expenses')}"
        @entity-switch="${(e: CustomEvent<DetailSwitchDetail>) => {
          const nextId = e.detail.value;
          if (nextId && nextId !== expense.id) {
            store.openExpenseDetail(nextId);
          }
        }}"
      >
        ${project
          ? html`
              <app-button
                slot="nav-actions"
                size="sm"
                variant="outline"
                @click="${() => store.openProjectDetail(project.id)}"
              >
                <span slot="icon-start">${iconFolder(14)}</span>
                <span>${t.viewTexts.expenseDetail.openProjectBtn}</span>
              </app-button>
            `
          : ''}

        ${task
          ? html`
              <app-button
                slot="nav-actions"
                size="sm"
                variant="outline"
                @click="${() => store.openTaskDetail(task.id)}"
              >
                <span slot="icon-start">${iconFileText(14)}</span>
                <span>${t.viewTexts.expenseDetail.openTaskBtn}</span>
              </app-button>
            `
          : ''}

        ${expense.status === 'pending' || expense.status === 'draft'
          ? html`
              <app-button
                slot="nav-actions"
                size="sm"
                variant="ghost"
                @click="${() => store.updateExpense({ ...expense, status: 'rejected' })}"
              >
                <span slot="icon-start">${iconX(14)}</span>
                <span>${t.viewTexts.expenseDetail.rejectBtn}</span>
              </app-button>
              <app-button
                slot="nav-actions"
                size="sm"
                variant="primary"
                @click="${() => store.updateExpense({ ...expense, status: 'approved' })}"
              >
                <span slot="icon-start">${iconCheck(14)}</span>
                <span>${t.viewTexts.expenseDetail.approveBtn}</span>
              </app-button>
            `
          : expense.status === 'approved'
          ? html`
              <app-button
                slot="nav-actions"
                size="sm"
                variant="primary"
                @click="${() => store.updateExpense({ ...expense, status: 'reimbursed' })}"
              >
                <span slot="icon-start">${iconWallet(14)}</span>
                <span>${t.viewTexts.expenseDetail.reimburseBtn}</span>
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
          entity="expense"
          variant="pill"
          size="sm"
        ></app-entity-emblem>
        <span slot="hero-meta" class="mono">${expense.date}</span>
        <span slot="hero-meta" aria-hidden="true">·</span>
        <span slot="hero-meta">${t.expenses.categories[expense.category]}</span>
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

        <h1 slot="title" class="expense-title">${expense.title}</h1>
        <app-status-chip
          slot="title"
          domain="expense"
          status="${expense.status}"
          appearance="soft"
          size="md"
        ></app-status-chip>
        <app-badge
          slot="title"
          variant="${expense.billable ? 'info' : 'default'}"
          appearance="soft"
          size="sm"
        >
          ${expense.billable
            ? t.viewTexts.expenseDetail.kpiBillableTrue
            : t.viewTexts.expenseDetail.kpiBillableFalse}
        </app-badge>

        <div slot="hero-sub" class="expense-sub">
          ${expense.vendor ? html`<span>${expense.vendor}</span>` : ''}
          ${expense.vendor && user ? html`<span aria-hidden="true">·</span>` : ''}
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
            label="${t.viewTexts.expenseDetail.changeStatusLabel}"
            .value="${expense.status}"
            .options="${statusOptions}"
            @change="${(e: CustomEvent<{ value: string }>) => {
              const nextStatus = eventValue(e) as ExpenseStatus;
              if (nextStatus && nextStatus !== expense.status) {
                store.updateExpense({ ...expense, status: nextStatus });
              }
            }}"
          ></app-select>
        </div>

        <div slot="kpi" class="kpi-cell">
          <span class="kpi-label">${t.viewTexts.expenseDetail.kpiAmount}</span>
          <span class="kpi-val accent">${formatMoney(expense.amount, expense.currency)}</span>
          <span class="kpi-hint">${expense.currency} · ${expense.date}</span>
        </div>
        <div slot="kpi" class="kpi-cell">
          <span class="kpi-label">${t.viewTexts.expenseDetail.kpiRubEquivalent}</span>
          <span class="kpi-val success">${formatMoney(rubAmount, 'RUB')}</span>
          <span class="kpi-hint">${t.expenses.categories[expense.category]}</span>
        </div>
        <div slot="kpi" class="kpi-cell">
          <span class="kpi-label">${t.viewTexts.expenseDetail.kpiRebilling}</span>
          <span class="kpi-val">
            ${expense.billable
              ? t.viewTexts.expenseDetail.kpiBillableTrue
              : t.viewTexts.expenseDetail.kpiBillableFalse}
          </span>
          <span class="kpi-hint">
            ${expense.billable
              ? t.viewTexts.expenseDetail.kpiBillableTrueHint
              : t.viewTexts.expenseDetail.kpiBillableFalseHint}
          </span>
        </div>
        <div slot="kpi" class="kpi-cell">
          <span class="kpi-label">${t.viewTexts.expenseDetail.kpiAttachments}</span>
          <span class="kpi-val">${docIds.length}</span>
          <span class="kpi-hint">${t.viewTexts.expenseDetail.kpiFilesHint}</span>
        </div>

        <div slot="context" class="meta-box">
          <span class="meta-label">${t.viewTexts.expenseDetail.labelProject}</span>
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
          <span class="meta-label">${t.viewTexts.expenseDetail.labelTask}</span>
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
            : html`<span class="meta-val">${t.viewTexts.expenseDetail.labelNoTask}</span>`}
        </div>

        <div slot="context" class="meta-box">
          <span class="meta-label">${t.viewTexts.expenseDetail.labelSubmittedBy}</span>
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
          <span class="meta-label">${t.viewTexts.expenseDetail.labelVendor}</span>
          <span class="meta-val">${expense.vendor || '—'}</span>
        </div>

        <div slot="context" class="meta-box">
          <span class="meta-label">${t.viewTexts.expenseDetail.labelCompany}</span>
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
          <span class="meta-label">${t.viewTexts.expenseDetail.labelCreatedAt}</span>
          <span class="meta-val mono">${createdFormatted}</span>
        </div>

        <!-- Justification Notes -->
        <app-section-card title="${t.viewTexts.expenseDetail.notesTitle}">
          <span slot="icon">${iconFileText(18)}</span>
          <p class="notes-text ${expense.notes ? '' : 'is-empty'}">
            ${expense.notes || t.viewTexts.expenseDetail.emptyNotes}
          </p>
        </app-section-card>

        <!-- Receipts & Supporting Documents -->
        <app-section-card
          title="${t.viewTexts.expenseDetail.attachmentsTitle}"
          subtitle="${docIds.length > 0 ? `(${docIds.length})` : ''}"
        >
          <span slot="icon">${iconPaperclip(18)}</span>
          <div class="section-hint">${t.viewTexts.expenseDetail.attachmentsHint}</div>
          <app-project-attachments
            project-id="${expense.projectId}"
            label="${t.viewTexts.expenseDetail.attachmentsTitle}"
            .documentIds="${docIds}"
            .pendingFiles="${[]}"
            @attachments-change="${(e: CustomEvent<AttachmentsChangeDetail>) =>
              this.handleAttachmentsChange(expense, e.detail)}"
          ></app-project-attachments>
        </app-section-card>

        <!-- Linked Calculations -->
        <app-section-card
          title="${t.viewTexts.expenseDetail.calculationsTitle}"
          subtitle="${linkedCalcs.length > 0 ? `(${linkedCalcs.length})` : ''}"
        >
          <span slot="icon">${iconCalculator(18)}</span>
          ${linkedCalcs.length === 0
            ? html`<app-empty-state compact title="${t.viewTexts.expenseDetail.calculationsEmpty}"></app-empty-state>`
            : html`
                <div class="table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${t.viewTexts.expenseDetail.thCalcNumber}</th>
                        <th>${t.viewTexts.expenseDetail.thCalcPeriod}</th>
                        <th>${t.viewTexts.expenseDetail.thCalcAmount}</th>
                        <th>${t.viewTexts.expenseDetail.thCalcStatus}</th>
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

        <app-entity-reminders entity-type="expense" .entityId="${expense.id}"></app-entity-reminders>
      </app-detail-shell>

      <app-expense-form
        .open="${this.editModalOpen}"
        .expense="${expense}"
        @close="${() => (this.editModalOpen = false)}"
        @saved="${() => (this.editModalOpen = false)}"
      ></app-expense-form>

      <app-confirm-dialog
        .open="${this.confirmDeleteOpen}"
        size="sm"
        variant="danger"
        title="${t.viewTexts.confirmDialogs.expenseDelete.title}"
        action="${t.viewTexts.confirmDialogs.expenseDelete.action(expense.title)}"
        result="${t.viewTexts.confirmDialogs.expenseDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmDeleteOpen = false)}"
        @confirm="${() => {
          this.confirmDeleteOpen = false;
          store.deleteExpense(expense.id);
        }}"
      ></app-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-expense-detail': AppExpenseDetail;
  }
}

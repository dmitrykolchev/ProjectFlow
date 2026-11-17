import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { formatMoney } from '../../common/app-money/app-money';
import { getTranslation } from '../../../i18n';
import { Expense, ExpenseCategory, ExpenseStatus } from '../../../types';
import {
  iconCheck,
  iconEdit,
  iconPlus,
  iconTrash,
  iconWallet,
  iconX,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import { mapProjectOptions } from '../../common/entity-selector-options';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-expense-form/app-expense-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-pagination/app-pagination';
import { paginateItems } from '../../common/paginate';
import styles from './app-expenses.css';
import { eventValue } from '../../common/event-value';

const HOURLY_RATE_RUB = 3200;

@customElement('app-expenses')
export class AppExpenses extends LitElement {
  @state() private expenses: Expense[] = store.expenses;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private projectFilter = 'all';
  @state() private categoryFilter: 'all' | ExpenseCategory = 'all';
  @state() private statusFilter: 'all' | ExpenseStatus = 'all';
  @state() private viewMode: 'registry' | 'budgets' = 'registry';
  @state() private currentPage = 1;
  @state() private tablePageSize = store.customization.tablePageSize;
  @state() private cardPageSize = store.customization.cardGridPageSize;

  // Form modal
  @state() private modalOpen = false;
  @state() private editingExpense: Expense | null = null;
  @state() private presetExpenseProjectId: string | null = null;
  @state() private presetExpenseTaskId: string | null = null;

  @state() private deletingExpense: Expense | null = null;

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
    this.currentPage = store.activeView === 'expenses' ? store.activePage : 1;
    this.expenses = store.expenses;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.tablePageSize = store.customization.tablePageSize;
    this.cardPageSize = store.customization.cardGridPageSize;
  }

  private toRub(amount: number, currency: 'RUB' | 'USD' | 'EUR'): number {
    if (currency === 'USD') return amount * 96;
    if (currency === 'EUR') return amount * 104;
    return amount;
  }


  private getFiltered(): Expense[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return [...this.expenses]
      .filter((exp) => {
        if (this.projectFilter !== 'all' && exp.projectId !== this.projectFilter) return false;
        if (this.categoryFilter !== 'all' && exp.category !== this.categoryFilter) return false;
        if (this.statusFilter !== 'all' && exp.status !== this.statusFilter) return false;
        if (!query) return true;
        const proj = store.projects.find((p) => p.id === exp.projectId);
        const task = exp.taskId ? store.tasks.find((tk) => tk.id === exp.taskId) : undefined;
        const user = store.users.find((u) => u.id === exp.userId);
        return (
          exp.title.toLowerCase().includes(query) ||
          (exp.vendor?.toLowerCase().includes(query) ?? false) ||
          exp.notes.toLowerCase().includes(query) ||
          (exp.taskId?.toLowerCase().includes(query) ?? false) ||
          (task?.title.toLowerCase().includes(query) ?? false) ||
          (proj?.name.toLowerCase().includes(query) ?? false) ||
          (user?.name.toLowerCase().includes(query) ?? false)
        );
      })
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  }

  render() {
    const t = getTranslation(this.currentLang);
    const filtered = this.getFiltered();

    const nonRejected = filtered.filter((e) => e.status !== 'rejected');
    const totalRub = Math.round(nonRejected.reduce((acc, e) => acc + this.toRub(e.amount, e.currency), 0));
    const approvedRub = Math.round(
      filtered
        .filter((e) => e.status === 'approved' || e.status === 'reimbursed')
        .reduce((acc, e) => acc + this.toRub(e.amount, e.currency), 0)
    );
    const pendingList = filtered.filter((e) => e.status === 'pending');
    const pendingRub = Math.round(
      pendingList.reduce((acc, e) => acc + this.toRub(e.amount, e.currency), 0)
    );
    const billableRub = Math.round(
      nonRejected
        .filter((e) => e.billable)
        .reduce((acc, e) => acc + this.toRub(e.amount, e.currency), 0)
    );

    const projectFilterOptions = [
      { value: 'all', label: t.viewTexts.expenses.filterAllProjects },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}`, color: p.color })),
    ];

    const categoryOptions: { value: ExpenseCategory; label: string }[] = [
      { value: 'infrastructure', label: t.expenses.categories.infrastructure },
      { value: 'software', label: t.expenses.categories.software },
      { value: 'contractors', label: t.expenses.categories.contractors },
      { value: 'equipment', label: t.expenses.categories.equipment },
      { value: 'travel', label: t.expenses.categories.travel },
      { value: 'marketing', label: t.expenses.categories.marketing },
      { value: 'other', label: t.expenses.categories.other },
    ];

    const categoryFilterOptions = [
      { value: 'all', label: t.viewTexts.expenses.filterAllCategories },
      ...categoryOptions,
    ];

    const statusOptions: { value: ExpenseStatus; label: string; color: string }[] = [
      { value: 'draft', label: t.expenses.statuses.draft, color: '#64748b' },
      { value: 'pending', label: t.expenses.statuses.pending, color: '#f59e0b' },
      { value: 'approved', label: t.expenses.statuses.approved, color: '#10b981' },
      { value: 'reimbursed', label: t.expenses.statuses.reimbursed, color: '#0284c7' },
      { value: 'rejected', label: t.expenses.statuses.rejected, color: '#ef4444' },
    ];

    const statusFilterOptions = [
      { value: 'all', label: t.viewTexts.expenses.filterAllStatuses },
      ...statusOptions,
    ];

    return html`
      <app-page-header title="${t.expenses.title}" subtitle="${t.expenses.subtitle}">
        <span slot="icon">${iconWallet(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${t.expenses.addExpense}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${t.expenses.totalExpenses}" value="${totalRub.toLocaleString(t.common.locale)} ₽" subtitle="${nonRejected.length} ${t.viewTexts.expenses.kpiActiveEntries}"></app-metric-card>
        <app-metric-card size="compact" label="${t.expenses.approvedAmount}" value="${approvedRub.toLocaleString(t.common.locale)} ₽" valueColor="#10b981" subtitle="${totalRub > 0 ? Math.round((approvedRub / totalRub) * 100) : 0}% ${t.viewTexts.expenses.kpiOfExpenses}"></app-metric-card>
        <app-metric-card size="compact" label="${t.expenses.pendingCount}" value="${pendingList.length}" valueColor="${pendingList.length > 0 ? '#f59e0b' : ''}" subtitle="${pendingRub.toLocaleString(t.common.locale)} ₽ ${t.viewTexts.expenses.kpiAwaiting}"></app-metric-card>
        <app-metric-card size="compact" label="${t.expenses.billableAmount}" value="${billableRub.toLocaleString(t.common.locale)} ₽" subtitle="${t.viewTexts.expenses.kpiClientBillable}"></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px; --filter-select-width: 185px;"
        placeholder="${t.viewTexts.expenses.searchPlaceholder}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'project', options: projectFilterOptions },
          { key: 'category', options: categoryFilterOptions },
          { key: 'status', options: statusFilterOptions },
        ]}"
        .values="${{ project: this.projectFilter, category: this.categoryFilter, status: this.statusFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => {
          this.localSearch = eventValue(e);
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'project') this.projectFilter = eventValue(e);
          if (e.detail.key === 'category') this.categoryFilter = eventValue(e) as 'all' | ExpenseCategory;
          if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | ExpenseStatus;
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
      >
        <app-segmented-switch
          size="sm"
          .value="${this.viewMode}"
          .options="${[
            { value: 'registry', label: t.expenses.viewRegistry },
            { value: 'budgets', label: t.expenses.viewBudgets },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.viewMode = eventValue(e) as 'registry' | 'budgets';
            this.currentPage = 1; store.setActivePage(1, false);
          }}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${this.viewMode === 'budgets'
        ? this.renderBudgetsView(t)
        : filtered.length === 0
        ? html`<app-empty-state title="${t.viewTexts.expenses.emptyNoExpenses}"></app-empty-state>`
        : this.renderRegistryTable(filtered, t)}

      ${this.renderFormModal(t)}
      ${this.renderDeleteModal(t)}
    `;
  }

  private renderRegistryTable(
    filtered: Expense[],
    t: ReturnType<typeof getTranslation>
  ) {
    const paged = paginateItems(filtered, this.currentPage, this.tablePageSize);

    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t.viewTexts.expenses.thDate}</th>
              <th>${t.viewTexts.expenses.thExpenseVendor}</th>
              <th>${t.viewTexts.expenses.thProjectTask}</th>
              <th>${t.viewTexts.expenses.thCategory}</th>
              <th>${t.viewTexts.expenses.thOwner}</th>
              <th>${t.viewTexts.expenses.thAmount}</th>
              <th>${t.viewTexts.expenses.thStatus}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.map((exp) => {
              const proj = store.projects.find((p) => p.id === exp.projectId);
              const task = exp.taskId ? store.tasks.find((tk) => tk.id === exp.taskId) : undefined;
              const user = store.users.find((u) => u.id === exp.userId);

              return html`
                <tr>
                  <td class="mono" style="white-space: nowrap;">${exp.date}</td>
                  <td>
                    <div class="exp-title">${exp.title}</div>
                    <div class="exp-vendor">
                      ${exp.vendor || '—'}${exp.notes ? ` · ${exp.notes}` : ''}
                    </div>
                  </td>
                  <td>
                    <div>
                      ${proj
                        ? html`
                            <span class="project-pill">
                              <span class="dot" style="background: ${proj.color};"></span>
                              <span>${proj.key}</span>
                            </span>
                          `
                        : '—'}
                    </div>
                    ${exp.taskId
                      ? html`
                          <button
                            type="button"
                            class="task-chip-btn"
                            title="${task?.title || exp.taskId}"
                            @click="${() => {
                              if (task) store.openTaskDetail(task.id);
                            }}"
                          >
                            ${exp.taskId}
                          </button>
                        `
                      : ''}
                  </td>
                  <td>
                    <app-badge variant="default" appearance="soft" size="sm">
                      ${t.expenses.categories[exp.category]}
                    </app-badge>
                  </td>
                  <td style="white-space: nowrap;">${user?.name || exp.userId}</td>
                  <td class="amount-cell">
                    <div>${formatMoney(exp.amount, exp.currency)}</div>
                    ${exp.billable
                      ? html`<div class="billable-sub">${t.viewTexts.expenses.billableSub}</div>`
                      : ''}
                  </td>
                  <td>
                    <app-status-chip
                      domain="expense"
                      status="${exp.status}"
                      appearance="soft"
                      size="sm"
                    ></app-status-chip>
                  </td>
                  <td>
                    <div class="actions-row">
                      ${exp.status === 'pending'
                        ? html`
                            <app-button
                              class="approve-action"
                              size="sm"
                              variant="icon"
                              title="${t.viewTexts.expenses.approveTitle}"
                              @click="${() => store.updateExpense({ ...exp, status: 'approved' })}"
                            >
                              <span slot="start">${iconCheck(14)}</span>
                            </app-button>
                            <app-button
                              class="danger-action"
                              size="sm"
                              variant="icon"
                              title="${t.viewTexts.expenses.rejectTitle}"
                              @click="${() => store.updateExpense({ ...exp, status: 'rejected' })}"
                            >
                              <span slot="start">${iconX(14)}</span>
                            </app-button>
                          `
                        : ''}
                        <app-button
                          size="sm"
                          variant="icon"
                          title="${t.common.edit}"
                          @click="${() => this.openEditModal(exp)}"
                        >
                          <span slot="start">${iconEdit(14)}</span>
                        </app-button>
                        <app-button
                          class="danger-action"
                          size="sm"
                          variant="icon"
                          title="${t.common.delete}"
                          @click="${() => (this.deletingExpense = exp)}"
                        >
                          <span slot="start">${iconTrash(14)}</span>
                        </app-button>
                    </div>
                  </td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
      <app-pagination
        layout-mode="table"
        .totalItems="${paged.totalItems}"
        .page="${paged.page}"
        .pageSize="${paged.pageSize}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1; store.setActivePage(1, false);
          store.setTablePageSize(e.detail.pageSize);
        }}"
      ></app-pagination>
    `;
  }

  private renderBudgetsView(t: ReturnType<typeof getTranslation>) {
    const visibleProjects =
      this.projectFilter === 'all'
        ? store.projects
        : store.projects.filter((p) => p.id === this.projectFilter);

    const paged = paginateItems(visibleProjects, this.currentPage, this.cardPageSize);

    return html`
      <div class="budgets-grid">
        ${paged.items.map((proj) => {
          const projExpenses = this.expenses.filter(
            (e) => e.projectId === proj.id && e.status !== 'rejected'
          );
          const directRub = Math.round(
            projExpenses.reduce((s, e) => s + this.toRub(e.amount, e.currency), 0)
          );
          const projHours = store.timeEntries
            .filter((te) => te.projectId === proj.id)
            .reduce((s, te) => s + te.hours, 0);
          const laborRub = Math.round(projHours * HOURLY_RATE_RUB);
          const totalSpend = directRub + laborRub;
          const budget = proj.budget || 0;
          const usedPct = budget > 0 ? Math.min(100, Math.round((totalSpend / budget) * 100)) : 0;
          const fillClass = usedPct >= 95 ? 'is-over' : usedPct >= 75 ? 'is-warn' : '';

          return html`
            <div class="budget-card">
              <div class="budget-head">
                <div class="budget-proj-title">
                  <span class="dot" style="background: ${proj.color};"></span>
                  <span>[${proj.key}] ${proj.name}</span>
                </div>
                <app-button
                  size="sm"
                  variant="ghost"
                  @click="${() => store.openProjectDetail(proj.id)}"
                >
                  ${t.viewTexts.expenses.openCardButton}
                </app-button>
              </div>

              <div class="budget-metrics">
                <div class="bm-item">
                  <span class="bm-label">${t.viewTexts.expenses.bmDirect}</span>
                  <span class="bm-val">${directRub.toLocaleString(t.common.locale)} ₽</span>
                </div>
                <div class="bm-item">
                  <span class="bm-label">${t.viewTexts.expenses.laborLabel(projHours.toFixed(0))}</span>
                  <span class="bm-val">${laborRub.toLocaleString(t.common.locale)} ₽</span>
                </div>
                <div class="bm-item">
                  <span class="bm-label">${t.viewTexts.expenses.bmProjectBudget}</span>
                  <span class="bm-val">${budget ? `${budget.toLocaleString(t.common.locale)} ₽` : '—'}</span>
                </div>
              </div>

              <div class="budget-progress-wrap">
                <div class="budget-progress-head">
                  <span>${t.viewTexts.expenses.bmUtilization}</span>
                  <span class="mono" style="font-weight: 700;">
                    ${totalSpend.toLocaleString(t.common.locale)} ₽ (${usedPct}%)
                  </span>
                </div>
                <div class="budget-track">
                  <div class="budget-fill ${fillClass}" style="width: ${usedPct}%;"></div>
                </div>
              </div>

              <div class="budget-footer">
                <span style="font-size: 0.76rem; color: var(--text-muted);">
                  ${projExpenses.length} ${t.viewTexts.expenses.expenseItemsCount}
                </span>
                <app-button
                  size="sm"
                  variant="secondary"
                  @click="${() => this.openCreateModal(proj.id)}"
                >
                  <span slot="icon-start">${iconPlus(13)}</span>
                  <span>${t.viewTexts.expenses.addExpenseButton}</span>
                </app-button>
              </div>
            </div>
          `;
        })}
      </div>
      <app-pagination
        layout-mode="cards"
        .totalItems="${paged.totalItems}"
        .page="${paged.page}"
        .pageSize="${paged.pageSize}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1; store.setActivePage(1, false);
          store.setCardGridPageSize(e.detail.pageSize);
        }}"
      ></app-pagination>
    `;
  }

  private renderFormModal(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-expense-form
        .open="${this.modalOpen}"
        .expense="${this.editingExpense}"
        .presetProjectId="${this.presetExpenseProjectId}"
        .presetTaskId="${this.presetExpenseTaskId}"
        @close="${() => (this.modalOpen = false)}"
        @saved="${() => (this.modalOpen = false)}"
      ></app-expense-form>
    `;
  }

  private renderDeleteModal(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingExpense)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.expenseDelete.title}"
        action="${t.viewTexts.confirmDialogs.expenseDelete.action(this.deletingExpense?.title || '')}"
        result="${t.viewTexts.confirmDialogs.expenseDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingExpense = null)}"
        @confirm="${() => {
          if (this.deletingExpense) {
            store.deleteExpense(this.deletingExpense.id);
            this.deletingExpense = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private openCreateModal(presetProjectId?: string, presetTaskId?: string) {
    this.editingExpense = null;
    this.presetExpenseProjectId =
      presetProjectId ?? (this.projectFilter !== 'all' ? this.projectFilter : null);
    this.presetExpenseTaskId = presetTaskId ?? null;
    this.modalOpen = true;
  }

  private openEditModal(exp: Expense) {
    this.editingExpense = exp;
    this.modalOpen = true;
  }
}
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { Expense, ExpenseCategory, ExpenseStatus } from '../../../types';
import {
  iconCheck,
  iconEdit,
  iconPlus,
  iconSearch,
  iconTrash,
  iconX,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-switch/app-switch';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import styles from './app-expenses.css';

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

  // Form modal
  @state() private modalOpen = false;
  @state() private editingId: string | null = null;
  @state() private formTitle = '';
  @state() private formProjectId = '';
  @state() private formTaskId = '';
  @state() private formUserId = '';
  @state() private formDate = '';
  @state() private formCategory: ExpenseCategory = 'infrastructure';
  @state() private formAmount = 15000;
  @state() private formCurrency: 'RUB' | 'USD' | 'EUR' = 'RUB';
  @state() private formBillable = true;
  @state() private formStatus: ExpenseStatus = 'pending';
  @state() private formVendor = '';
  @state() private formNotes = '';
  @state() private formError = '';

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
    this.expenses = store.expenses;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
  }

  private toRub(amount: number, currency: 'RUB' | 'USD' | 'EUR'): number {
    if (currency === 'USD') return amount * 96;
    if (currency === 'EUR') return amount * 104;
    return amount;
  }

  private formatMoney(amount: number, currency: 'RUB' | 'USD' | 'EUR'): string {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
    return `${amount.toLocaleString('ru-RU')} ${symbol}`;
  }

  private getStatusVariant(
    status: ExpenseStatus
  ): 'default' | 'warning' | 'success' | 'info' | 'danger' {
    switch (status) {
      case 'approved':
        return 'success';
      case 'reimbursed':
        return 'info';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'danger';
      default:
        return 'default';
    }
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
    const isRu = this.currentLang === 'ru';
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
      { value: 'all', label: isRu ? 'Все проекты' : 'All projects' },
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
      { value: 'all', label: isRu ? 'Все категории' : 'All categories' },
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
      { value: 'all', label: isRu ? 'Все статусы' : 'All statuses' },
      ...statusOptions,
    ];

    return html`
      <div class="view-header">
        <div class="header-titles">
          <h1 class="view-title">${t.expenses.title}</h1>
          <p class="view-subtitle">${t.expenses.subtitle}</p>
        </div>
        <app-button variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${t.expenses.addExpense}</span>
        </app-button>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">${t.expenses.totalExpenses}</span>
          <span class="kpi-value">${totalRub.toLocaleString('ru-RU')} ₽</span>
          <span class="kpi-sub">${nonRejected.length} ${isRu ? 'активных записей' : 'active entries'}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${t.expenses.approvedAmount}</span>
          <span class="kpi-value" style="color: #10b981;">${approvedRub.toLocaleString('ru-RU')} ₽</span>
          <span class="kpi-sub">
            ${totalRub > 0 ? Math.round((approvedRub / totalRub) * 100) : 0}% ${isRu ? 'от суммы расходов' : 'of expenses'}
          </span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${t.expenses.pendingCount}</span>
          <span class="kpi-value" style="color: ${pendingList.length > 0 ? '#f59e0b' : 'inherit'};">
            ${pendingList.length}
          </span>
          <span class="kpi-sub">${pendingRub.toLocaleString('ru-RU')} ₽ ${isRu ? 'к согласованию' : 'awaiting'}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${t.expenses.billableAmount}</span>
          <span class="kpi-value">${billableRub.toLocaleString('ru-RU')} ₽</span>
          <span class="kpi-sub">${isRu ? 'Покрывается заказчиками' : 'Client billable'}</span>
        </div>
      </div>

      <div class="toolbar">
        <div class="toolbar-filters">
          <div class="filter-search">
            <app-input
              placeholder="${isRu ? 'Поиск по статье, поставщику, задаче...' : 'Search item, vendor, task...'}"
              .value="${this.localSearch}"
              clearable
              @input="${(e: CustomEvent<{ value: string }>) => (this.localSearch = e.detail.value)}"
            >
              <span slot="icon">${iconSearch(15)}</span>
            </app-input>
          </div>
          <div class="filter-select">
            <app-select
              .value="${this.projectFilter}"
              .options="${projectFilterOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.projectFilter = e.detail.value)}"
            ></app-select>
          </div>
          <div class="filter-select">
            <app-select
              .value="${this.categoryFilter}"
              .options="${categoryFilterOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.categoryFilter = e.detail.value as 'all' | ExpenseCategory)}"
            ></app-select>
          </div>
          <div class="filter-select">
            <app-select
              .value="${this.statusFilter}"
              .options="${statusFilterOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.statusFilter = e.detail.value as 'all' | ExpenseStatus)}"
            ></app-select>
          </div>
        </div>

        <app-segmented-switch
          size="sm"
          .value="${this.viewMode}"
          .options="${[
            { value: 'registry', label: t.expenses.viewRegistry },
            { value: 'budgets', label: t.expenses.viewBudgets },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) =>
            (this.viewMode = e.detail.value as 'registry' | 'budgets')}"
        ></app-segmented-switch>
      </div>

      ${this.viewMode === 'budgets'
        ? this.renderBudgetsView(isRu)
        : filtered.length === 0
        ? html`<div class="empty-state">${isRu ? 'Расходы не найдены' : 'No expenses found'}</div>`
        : this.renderRegistryTable(filtered, t, isRu)}

      ${this.renderFormModal(t, isRu, categoryOptions, statusOptions)}
      ${this.renderDeleteModal(isRu)}
    `;
  }

  private renderRegistryTable(
    filtered: Expense[],
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${isRu ? 'Дата' : 'Date'}</th>
              <th>${isRu ? 'Статья расхода / Поставщик' : 'Expense / Vendor'}</th>
              <th>${isRu ? 'Проект и задача' : 'Project & Task'}</th>
              <th>${isRu ? 'Категория' : 'Category'}</th>
              <th>${isRu ? 'Инициатор' : 'Owner'}</th>
              <th>${isRu ? 'Сумма' : 'Amount'}</th>
              <th>${isRu ? 'Статус' : 'Status'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((exp) => {
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
                              if (task) store.openEditTaskModal(task);
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
                    <div>${this.formatMoney(exp.amount, exp.currency)}</div>
                    ${exp.billable
                      ? html`<div class="billable-sub">${isRu ? 'Перевыставляется' : 'Billable'}</div>`
                      : ''}
                  </td>
                  <td>
                    <app-badge
                      variant="${this.getStatusVariant(exp.status)}"
                      appearance="soft"
                      size="sm"
                    >
                      ${t.expenses.statuses[exp.status]}
                    </app-badge>
                  </td>
                  <td>
                    <div class="actions-row">
                      ${exp.status === 'pending'
                        ? html`
                            <button
                              type="button"
                              class="icon-btn approve"
                              title="${isRu ? 'Утвердить' : 'Approve'}"
                              @click="${() => store.updateExpense({ ...exp, status: 'approved' })}"
                            >
                              ${iconCheck(14)}
                            </button>
                            <button
                              type="button"
                              class="icon-btn danger"
                              title="${isRu ? 'Отклонить' : 'Reject'}"
                              @click="${() => store.updateExpense({ ...exp, status: 'rejected' })}"
                            >
                              ${iconX(14)}
                            </button>
                          `
                        : ''}
                      <button
                        type="button"
                        class="icon-btn"
                        title="${t.common.edit}"
                        @click="${() => this.openEditModal(exp)}"
                      >
                        ${iconEdit(14)}
                      </button>
                      <button
                        type="button"
                        class="icon-btn danger"
                        title="${t.common.delete}"
                        @click="${() => (this.deletingExpense = exp)}"
                      >
                        ${iconTrash(14)}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderBudgetsView(isRu: boolean) {
    const visibleProjects =
      this.projectFilter === 'all'
        ? store.projects
        : store.projects.filter((p) => p.id === this.projectFilter);

    return html`
      <div class="budgets-grid">
        ${visibleProjects.map((proj) => {
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
                  ${isRu ? 'Карточка' : 'Open'}
                </app-button>
              </div>

              <div class="budget-metrics">
                <div class="bm-item">
                  <span class="bm-label">${isRu ? 'Прямые расходы' : 'Direct Expenses'}</span>
                  <span class="bm-val">${directRub.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div class="bm-item">
                  <span class="bm-label">${isRu ? `Трудозатраты (${projHours.toFixed(0)} ч)` : `Labor (${projHours.toFixed(0)}h)`}</span>
                  <span class="bm-val">${laborRub.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div class="bm-item">
                  <span class="bm-label">${isRu ? 'Бюджет проекта' : 'Project Budget'}</span>
                  <span class="bm-val">${budget ? `${budget.toLocaleString('ru-RU')} ₽` : '—'}</span>
                </div>
              </div>

              <div class="budget-progress-wrap">
                <div class="budget-progress-head">
                  <span>${isRu ? 'Освоение бюджета (ФОТ + расходы)' : 'Budget utilization'}</span>
                  <span class="mono" style="font-weight: 700;">
                    ${totalSpend.toLocaleString('ru-RU')} ₽ (${usedPct}%)
                  </span>
                </div>
                <div class="budget-track">
                  <div class="budget-fill ${fillClass}" style="width: ${usedPct}%;"></div>
                </div>
              </div>

              <div class="budget-footer">
                <span style="font-size: 0.76rem; color: var(--text-muted);">
                  ${projExpenses.length} ${isRu ? 'статей расхода' : 'expense items'}
                </span>
                <app-button
                  size="sm"
                  variant="secondary"
                  @click="${() => this.openCreateModal(proj.id)}"
                >
                  <span slot="icon-start">${iconPlus(13)}</span>
                  <span>${isRu ? 'Добавить расход' : 'Add Expense'}</span>
                </app-button>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderFormModal(
    t: ReturnType<typeof getTranslation>,
    isRu: boolean,
    categoryOptions: { value: ExpenseCategory; label: string }[],
    statusOptions: { value: ExpenseStatus; label: string; color: string }[]
  ) {
    const projectOptions = store.projects.map((p) => ({
      value: p.id,
      label: `[${p.key}] ${p.name}`,
      color: p.color,
    }));

    const taskOptions = [
      { value: '', label: isRu ? 'Без привязки к задаче (на проект)' : 'Project-level expense' },
      ...store.tasks
        .filter((tk) => tk.projectId === this.formProjectId)
        .slice(0, 80)
        .map((tk) => ({ value: tk.id, label: `${tk.id} · ${tk.title}` })),
    ];

    const userOptions = store.users.map((u) => ({ value: u.id, label: u.name }));
    const currencyOptions = [
      { value: 'RUB', label: 'RUB (₽)' },
      { value: 'USD', label: 'USD ($)' },
      { value: 'EUR', label: 'EUR (€)' },
    ];

    return html`
      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingId
          ? isRu
            ? 'Редактирование расхода'
            : 'Edit Expense'
          : isRu
          ? 'Новый расход'
          : 'New Expense'}"
        @close="${() => (this.modalOpen = false)}"
      >
        <div class="form-grid">
          <div class="col-span-2">
            <app-input
              label="${isRu ? 'Наименование расхода' : 'Expense Title'}"
              placeholder="${isRu ? 'Например: Облачный кластер Kubernetes (Staging)' : 'e.g. Cloud staging cluster'}"
              .value="${this.formTitle}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formTitle = e.detail.value;
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Проект' : 'Project'}"
              .value="${this.formProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.formProjectId = e.detail.value;
                this.formTaskId = '';
              }}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Задача (опционально)' : 'Linked Task (optional)'}"
              .value="${this.formTaskId}"
              .options="${taskOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formTaskId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Категория' : 'Category'}"
              .value="${this.formCategory}"
              .options="${categoryOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formCategory = e.detail.value as ExpenseCategory)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Сотрудник / Инициатор' : 'Submitted By'}"
              .value="${this.formUserId}"
              .options="${userOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formUserId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Сумма' : 'Amount'}"
              .value="${this.formAmount}"
              min="0"
              step="500"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formAmount = e.detail.value)}"
            ></app-number-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Валюта' : 'Currency'}"
              .value="${this.formCurrency}"
              .options="${currencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formCurrency = e.detail.value as 'RUB' | 'USD' | 'EUR')}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата расхода' : 'Date'}"
              .value="${this.formDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formDate = e.detail.value)}"
            ></app-date-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.formStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = e.detail.value as ExpenseStatus)}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Поставщик / Контрагент' : 'Vendor'}"
              placeholder="Yandex Cloud, JetBrains..."
              .value="${this.formVendor}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formVendor = e.detail.value)}"
            ></app-input>
          </div>
          <div style="display: flex; align-items: flex-end;">
            <div class="switch-field" style="width: 100%;">
              <span>${isRu ? 'Перевыставить заказчику' : 'Billable to client'}</span>
              <app-switch
                size="sm"
                ?checked="${this.formBillable}"
                @change="${(e: CustomEvent<{ checked: boolean }>) => (this.formBillable = e.detail.checked)}"
              ></app-switch>
            </div>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Обоснование и комментарии' : 'Notes'}"
              .value="${this.formNotes}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formNotes = e.detail.value)}"
            ></app-textarea>
          </div>
        </div>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${this.handleSaveModal}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteModal(isRu: boolean) {
    return html`
      <app-modal
        ?open="${Boolean(this.deletingExpense)}"
        size="sm"
        title="${isRu ? 'Удалить запись о расходе?' : 'Delete expense?'}"
        @close="${() => (this.deletingExpense = null)}"
      >
        <p class="confirm-text">
          ${isRu
            ? `Вы уверены, что хотите удалить расход «${this.deletingExpense?.title || ''}»?`
            : `Are you sure you want to delete "${this.deletingExpense?.title || ''}"?`}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.deletingExpense = null)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              if (this.deletingExpense) {
                store.deleteExpense(this.deletingExpense.id);
                this.deletingExpense = null;
              }
            }}"
          >
            ${isRu ? 'Удалить' : 'Delete'}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private openCreateModal(presetProjectId?: string) {
    this.editingId = null;
    this.formTitle = '';
    this.formProjectId = presetProjectId || (this.projectFilter !== 'all' ? this.projectFilter : store.projects[0]?.id || '');
    this.formTaskId = '';
    this.formUserId = store.users[0]?.id || '';
    this.formDate = new Date().toISOString().slice(0, 10);
    this.formCategory = 'infrastructure';
    this.formAmount = 15000;
    this.formCurrency = 'RUB';
    this.formBillable = true;
    this.formStatus = 'pending';
    this.formVendor = '';
    this.formNotes = '';
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(exp: Expense) {
    this.editingId = exp.id;
    this.formTitle = exp.title;
    this.formProjectId = exp.projectId;
    this.formTaskId = exp.taskId || '';
    this.formUserId = exp.userId;
    this.formDate = exp.date;
    this.formCategory = exp.category;
    this.formAmount = exp.amount;
    this.formCurrency = exp.currency;
    this.formBillable = exp.billable;
    this.formStatus = exp.status;
    this.formVendor = exp.vendor || '';
    this.formNotes = exp.notes;
    this.formError = '';
    this.modalOpen = true;
  }

  private handleSaveModal() {
    if (!this.formTitle.trim()) {
      this.formError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }

    const payload = {
      title: this.formTitle.trim(),
      projectId: this.formProjectId || store.projects[0]?.id || '',
      taskId: this.formTaskId || undefined,
      userId: this.formUserId || store.users[0]?.id || '',
      date: this.formDate || new Date().toISOString().slice(0, 10),
      category: this.formCategory,
      amount: Math.max(0, Number(this.formAmount) || 0),
      currency: this.formCurrency,
      billable: this.formBillable,
      status: this.formStatus,
      vendor: this.formVendor.trim() || undefined,
      notes: this.formNotes.trim(),
    };

    if (this.editingId) {
      const existing = this.expenses.find((e) => e.id === this.editingId);
      store.updateExpense({
        id: this.editingId,
        createdAt: existing?.createdAt || new Date().toISOString(),
        ...payload,
      });
    } else {
      store.addExpense(payload);
    }

    this.modalOpen = false;
  }
}

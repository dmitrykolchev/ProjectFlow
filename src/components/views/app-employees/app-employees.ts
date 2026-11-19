import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { EmployeeStatus, User } from '../../../types';
import { getTranslation } from '../../../i18n';
import { presenceFromStatus } from '../../../domain/presence-tokens';
import { iconChevronRight, iconEdit, iconPlus, iconTrash, iconUsers } from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/card-footer/card-footer';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-employee-form/app-employee-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-persona/app-persona';
import '../../common/app-pagination/app-pagination';
import { paginateItems } from '../../common/paginate';
import styles from './app-employees.css';
import { eventValue } from '../../common/event-value';

@customElement('app-employees')
export class AppEmployees extends LitElement {
  @state() private employees: User[] = store.users;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private companyFilter = 'all';
  @state() private statusFilter: 'all' | EmployeeStatus = 'all';
  @state() private displayMode: 'cards' | 'table' = 'cards';
  @state() private currentPage = 1;
  @state() private cardPageSize = store.customization.cardGridPageSize;
  @state() private tablePageSize = store.customization.tablePageSize;

  @state() private modalOpen = false;
  @state() private editingEmployee: User | null = null;

  @state() private deletingEmployee: User | null = null;

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
    this.currentPage = store.activeView === 'employees' ? store.activePage : 1;
    this.employees = store.users;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.cardPageSize = store.customization.cardGridPageSize;
    this.tablePageSize = store.customization.tablePageSize;
  }

  private getStatusLabel(
    status: EmployeeStatus | undefined,
    t: ReturnType<typeof getTranslation>
  ): { text: string; variant: 'success' | 'info' | 'warning' | 'primary' } {
    const tx = t.viewTexts.employees;
    switch (status || 'active') {
      case 'remote':
        return { text: tx.statusRemote, variant: 'info' };
      case 'vacation':
        return { text: tx.statusVacation, variant: 'warning' };
      case 'onboarding':
        return { text: tx.statusOnboarding, variant: 'primary' };
      default:
        return { text: tx.statusActive, variant: 'success' };
    }
  }

  private getFilteredEmployees(): User[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.employees.filter((emp) => {
      if (this.companyFilter !== 'all' && emp.companyId !== this.companyFilter) return false;
      if (this.statusFilter !== 'all' && (emp.status || 'active') !== this.statusFilter) return false;
      if (!query) return true;
      return (
        emp.name.toLowerCase().includes(query) ||
        emp.role.toLowerCase().includes(query) ||
        (emp.department || '').toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        (emp.location || '').toLowerCase().includes(query)
      );
    });
  }

  render() {
    const t = getTranslation(this.currentLang);
    const filtered = this.getFilteredEmployees();
    const activeOnline = this.employees.filter((e) => (e.status || 'active') !== 'vacation').length;
    const departments = new Set(this.employees.map((e) => e.department).filter(Boolean)).size;
    const avgRate = this.employees.length
      ? Math.round(
          this.employees.reduce((s, e) => s + (e.hourlyRate || 3500), 0) / this.employees.length
        )
      : 0;

    const companyOptions = [
      { value: 'all', label: t.viewTexts.employees.filterAllCompanies },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];

    const statusOptions = [
      { value: 'all', label: t.viewTexts.employees.filterAllStatuses },
      { value: 'active', label: t.viewTexts.employees.statusActive, color: '#10b981' },
      { value: 'remote', label: t.viewTexts.employees.statusRemote, color: '#0284c7' },
      { value: 'vacation', label: t.viewTexts.employees.statusVacation, color: '#f59e0b' },
      { value: 'onboarding', label: t.viewTexts.employees.statusOnboarding, color: '#6366f1' },
    ];

    return html`
      <app-page-header
        title="${t.viewTexts.employees.pageTitle}"
        subtitle="${t.viewTexts.pageSubtitles.employees}"
      >
        <span slot="icon">${iconUsers(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${t.viewTexts.employees.addEmployeeButton}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${t.viewTexts.employees.kpiTotalEmployees}" value="${this.employees.length}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.employees.kpiAvailable}" value="${activeOnline}" valueColor="var(--color-success, #10b981)"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.employees.kpiDepartments}" value="${departments}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.employees.kpiAvgRate}" value="${avgRate.toLocaleString(t.common.locale)} ${t.viewTexts.employees.rateUnit}"></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px; --filter-select-width: 185px;"
        placeholder="${t.viewTexts.employees.searchPlaceholder}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'company', options: companyOptions },
          { key: 'status', options: statusOptions },
        ]}"
        .values="${{ company: this.companyFilter, status: this.statusFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => {
          this.localSearch = eventValue(e);
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'company') this.companyFilter = eventValue(e);
          if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | EmployeeStatus;
          this.currentPage = 1; store.setActivePage(1, false);
        }}"
      >
        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: t.viewTexts.employees.viewCards },
            { value: 'table', label: t.viewTexts.employees.viewTable },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.displayMode = eventValue(e) as 'cards' | 'table';
            this.currentPage = 1; store.setActivePage(1, false);
          }}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${filtered.length === 0
        ? html`<app-empty-state title="${t.viewTexts.employees.emptyNoEmployees}"></app-empty-state>`
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, t)
        : this.renderTable(filtered, t)}

      <app-employee-form
        .open="${this.modalOpen}"
        .employee="${this.editingEmployee}"
        @close="${() => (this.modalOpen = false)}"
        @saved="${() => (this.modalOpen = false)}"
      ></app-employee-form>

      <app-confirm-dialog
        .open="${Boolean(this.deletingEmployee)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.employeeDelete.title}"
        action="${t.viewTexts.confirmDialogs.employeeDelete.action(this.deletingEmployee?.name || '')}"
        result="${t.viewTexts.confirmDialogs.employeeDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingEmployee = null)}"
        @confirm="${() => {
          if (this.deletingEmployee) {
            store.deleteEmployee(this.deletingEmployee.id);
            this.deletingEmployee = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private renderCards(list: User[], t: ReturnType<typeof getTranslation>) {
    const paged = paginateItems(list, this.currentPage, this.cardPageSize);

    return html`
      <div class="cards-grid">
        ${paged.items.map((emp) => {
          const company = store.companies.find((c) => c.id === emp.companyId);
          const taskCount = store.tasks.filter((t) => t.assigneeId === emp.id).length;
          const projCount = store.projects.filter((p) =>
            (p.members || []).some((m) => m.userId === emp.id)
          ).length;
          const badge = this.getStatusLabel(emp.status, t);

          return html`
            <article class="employee-card">
              <div class="card-head">
                <app-persona
                  size="48"
                  .initials="${emp.avatar}"
                  .presence="${presenceFromStatus(emp.status)}"
                  .primaryText="${emp.name}"
                  .secondaryText="${emp.role}"
                  @click="${() => store.openEmployeeDetail(emp.id)}"
                ></app-persona>
                <app-badge variant="${badge.variant}" appearance="soft">${badge.text}</app-badge>
              </div>

              <div class="details-list">
                <div class="detail-row">
                  <span class="detail-label">${t.viewTexts.employees.detailDept}</span>
                  <span class="detail-val">${emp.department || '—'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${t.viewTexts.employees.detailCompany}</span>
                  <span class="detail-val">${company?.name || '—'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email</span>
                  <span class="detail-val">${emp.email}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${t.viewTexts.employees.detailPhoneCity}</span>
                  <span class="detail-val">${emp.phone || '—'} · ${emp.location || '—'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${t.viewTexts.employees.detailRate}</span>
                  <span class="detail-val mono">${(emp.hourlyRate || 3500).toLocaleString(t.common.locale)} ${t.viewTexts.employees.rateUnit}</span>
                </div>
              </div>

              <card-footer>
                <div slot="start" class="stats-row">
                  <span>${t.viewTexts.employees.projectsCountLabel}: <strong>${projCount}</strong></span>
                  <span>${t.viewTexts.employees.tasksCountLabel}: <strong>${taskCount}</strong></span>
                </div>
                <app-button
                  slot="end"
                  size="sm"
                  variant="icon"
                  title="${t.viewTexts.employees.openProfileButton}"
                  @click="${() => store.openEmployeeDetail(emp.id)}"
                >
                  <span slot="start">${iconChevronRight(15)}</span>
                </app-button>
                <app-button
                  slot="end"
                  size="sm"
                  variant="icon"
                  title="${t.common.edit}"
                  @click="${() => this.openEditModal(emp)}"
                >
                  <span slot="start">${iconEdit(14)}</span>
                </app-button>
                <app-button
                  slot="end"
                  size="sm"
                  variant="icon"
                  action="delete"
                  title="${t.common.delete}"
                  @click="${() => (this.deletingEmployee = emp)}"
                >
                  <span slot="start">${iconTrash(14)}</span>
                </app-button>
              </card-footer>
            </article>
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

  private renderTable(list: User[], t: ReturnType<typeof getTranslation>) {
    const paged = paginateItems(list, this.currentPage, this.tablePageSize);

    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t.viewTexts.employees.thEmployee}</th>
              <th>${t.viewTexts.employees.thDepartment}</th>
              <th>${t.viewTexts.employees.thCompany}</th>
              <th>${t.viewTexts.employees.thContacts}</th>
              <th>${t.viewTexts.employees.thProjectsTasks}</th>
              <th>${t.viewTexts.employees.thRate}</th>
              <th>${t.viewTexts.employees.thStatus}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${paged.items.map((emp) => {
              const company = store.companies.find((c) => c.id === emp.companyId);
              const taskCount = store.tasks.filter((t) => t.assigneeId === emp.id).length;
              const projCount = store.projects.filter((p) =>
                (p.members || []).some((m) => m.userId === emp.id)
              ).length;
              const badge = this.getStatusLabel(emp.status, t);

              return html`
                <tr>
                  <td>
                    <app-persona
                      size="32"
                      .initials="${emp.avatar}"
                      .presence="${presenceFromStatus(emp.status)}"
                      .primaryText="${emp.name}"
                      .secondaryText="${emp.role}"
                      @click="${() => store.openEmployeeDetail(emp.id)}"
                    ></app-persona>
                  </td>
                  <td>${emp.department || '—'}</td>
                  <td>${company?.name || '—'}</td>
                  <td>
                    <div>${emp.email}</div>
                    <div style="font-size: 0.74rem; color: var(--text-muted);">${emp.phone || '—'}</div>
                  </td>
                  <td class="mono">${projCount} / ${taskCount}</td>
                  <td class="mono">${(emp.hourlyRate || 3500).toLocaleString(t.common.locale)} ${t.viewTexts.employees.rateUnit}</td>
                  <td>
                    <app-badge variant="${badge.variant}" appearance="soft">${badge.text}</app-badge>
                  </td>
                  <td>
                    <div class="actions-row">
                      <app-button
                        size="sm"
                        variant="icon"
                        title="${t.viewTexts.employees.openProfileButton}"
                        @click="${() => store.openEmployeeDetail(emp.id)}"
                      >
                        <span slot="start">${iconChevronRight(15)}</span>
                      </app-button>
                      <app-button
                        size="sm"
                        variant="icon"
                        title="${t.common.edit}"
                        @click="${() => this.openEditModal(emp)}"
                      >
                        <span slot="start">${iconEdit(14)}</span>
                      </app-button>
                      <app-button
                        action="delete"
                        size="sm"
                        variant="icon"
                        title="${t.common.delete}"
                        @click="${() => (this.deletingEmployee = emp)}"
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

  private openCreateModal() {
    this.editingEmployee = null;
    this.modalOpen = true;
  }

  private openEditModal(emp: User) {
    this.editingEmployee = emp;
    this.modalOpen = true;
  }
}
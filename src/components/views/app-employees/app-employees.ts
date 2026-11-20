import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { EmployeeStatus, User } from '../../../types';
import { getTranslation } from '../../../i18n';
import { effectivePresence } from '../../../domain/presence-tokens';
import { iconChevronRight, iconEdit, iconFilter, iconPlus, iconTrash, iconUsers } from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/card-footer/card-footer';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-toggle-button/app-toggle-button';
import '../../common/app-employee-form/app-employee-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-persona/app-persona';
import '../../common/app-data-table/app-data-table';
import '../../common/app-table-column/app-table-column';
import '../../common/app-cards-table/app-cards-table';
import styles from './app-employees.css';
import tableContentStyles from './app-employees.table.content.css';
import cardContentStyles from './app-employees.content.css';
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
  @state() private filterVisible: boolean = true;
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
    this.displayMode = (store.viewModeFor('employees') as 'cards' | 'table') ?? 'cards';
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

      <div class="mode-row">
        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: t.viewTexts.employees.viewCards },
            { value: 'table', label: t.viewTexts.employees.viewTable },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.currentPage = 1; store.setActivePage(1, false);
            store.setViewMode('employees', eventValue(e) as 'cards' | 'table');
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
          ></app-filter-bar>`
        : ''}

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
    const empCard = (row: Record<string, unknown>) => {
      const emp = row as unknown as User;
      const company = store.companies.find((c) => c.id === emp.companyId);
      const taskCount = store.tasks.filter((x) => x.assigneeId === emp.id).length;
      const projCount = store.projects.filter((p) =>
        (p.members || []).some((m) => m.userId === emp.id)
      ).length;
      const badge = this.getStatusLabel(emp.status, t);

      return html`
        <div class="card-head">
          <app-persona
            size="48"
            .initials="${emp.avatar}"
            .presence="${effectivePresence(emp)}"
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
            <span class="detail-val">${(emp.hourlyRate || 3500).toLocaleString(t.common.locale)} ${t.viewTexts.employees.rateUnit}</span>
          </div>
        </div>

        <card-footer>
          <div slot="start" class="emp-stats-row">
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
      `;
    };

    return html`
      <app-cards-table
        .contentStyles="${cardContentStyles}"
        .rows="${list}"
        .cardRender="${empCard}"
        page-size="${this.cardPageSize}"
        page="${this.currentPage}"
        locale="${t.common.locale}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1; store.setActivePage(1, false);
          store.setCardGridPageSize(e.detail.pageSize);
        }}"
      ></app-cards-table>
    `;
  }

  private renderTable(list: User[], t: ReturnType<typeof getTranslation>) {
    const personaCell = (row: Record<string, unknown>) => {
      const emp = row as unknown as User;
      return html`
        <app-persona
          size="32"
          .initials="${emp.avatar}"
          .presence="${effectivePresence(emp)}"
          .primaryText="${emp.name}"
          .secondaryText="${emp.role}"
          @click="${() => store.openEmployeeDetail(emp.id)}"
        ></app-persona>
      `;
    };
    const contactsCell = (row: Record<string, unknown>) => {
      const emp = row as unknown as User;
      return html`
        <div>${emp.email}</div>
        <div style="font-size: 0.74rem; color: var(--text-muted);">${emp.phone || '—'}</div>
      `;
    };

    return html`
      <div class="table-card">
        <app-data-table
          .contentStyles="${tableContentStyles}"
          .rows="${list}"
          page-size="${this.tablePageSize}"
          page="${this.currentPage}"
          locale="${t.common.locale}"
          @page-change="${(e: CustomEvent<{ page: number }>) => {
            this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
            this.scrollTop = 0;
          }}"
          @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
            this.currentPage = 1; store.setActivePage(1, false);
            store.setTablePageSize(e.detail.pageSize);
          }}"
        >
          <app-table-column field="name" label="${t.viewTexts.employees.thEmployee}" .cellRender="${personaCell}"></app-table-column>
          <app-table-column
            field="department"
            label="${t.viewTexts.employees.thDepartment}"
            .cellRender="${(row: Record<string, unknown>) =>
              html`${(row as unknown as User).department || '—'}`}"
          ></app-table-column>
          <app-table-column
            field="companyId"
            label="${t.viewTexts.employees.thCompany}"
            .cellRender="${(row: Record<string, unknown>) => {
              const emp = row as unknown as User;
              return html`${store.companies.find((c) => c.id === emp.companyId)?.name || '—'}`;
            }}"
          ></app-table-column>
          <app-table-column field="email" label="${t.viewTexts.employees.thContacts}" .cellRender="${contactsCell}"></app-table-column>
          <app-table-column
            field="id"
            label="${t.viewTexts.employees.thProjectsTasks}"
            mono
            .cellRender="${(row: Record<string, unknown>) => {
              const emp = row as unknown as User;
              const projCount = store.projects.filter((p) =>
                (p.members || []).some((m) => m.userId === emp.id)
              ).length;
              const taskCount = store.tasks.filter((tk) => tk.assigneeId === emp.id).length;
              return html`${projCount} / ${taskCount}`;
            }}"
          ></app-table-column>
          <app-table-column
            field="hourlyRate"
            label="${t.viewTexts.employees.thRate}"
            mono
            .cellRender="${(row: Record<string, unknown>) => {
              const emp = row as unknown as User;
              return html`${(emp.hourlyRate || 3500).toLocaleString(t.common.locale)} ${t.viewTexts.employees.rateUnit}`;
            }}"
          ></app-table-column>
          <app-table-column
            field="status"
            label="${t.viewTexts.employees.thStatus}"
            .cellRender="${(row: Record<string, unknown>) => {
              const emp = row as unknown as User;
              const badge = this.getStatusLabel(emp.status, t);
              return html`
                <app-badge variant="${badge.variant}" appearance="soft">${badge.text}</app-badge>
              `;
            }}"
          ></app-table-column>
          <app-table-column
            field=""
            label=""
            .cellRender="${(row: Record<string, unknown>) => {
              const emp = row as unknown as User;
              return html`
                <div class="emp-actions-row">
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
              `;
            }}"
          ></app-table-column>
        </app-data-table>
      </div>
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

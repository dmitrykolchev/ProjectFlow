import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { EmployeeStatus, User } from '../../../types';
import { iconChevronRight, iconEdit, iconPlus, iconTrash, iconUsers } from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-avatar/app-avatar';
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

  @state() private modalOpen = false;
  @state() private editingId: string | null = null;
  @state() private formName = '';
  @state() private formRole = '';
  @state() private formDepartment = '';
  @state() private formCompanyId = '';
  @state() private formEmail = '';
  @state() private formPhone = '';
  @state() private formLocation = '';
  @state() private formStatus: EmployeeStatus = 'active';
  @state() private formHireDate = '';
  @state() private formHourlyRate = 3500;
  @state() private formError = '';

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
    this.employees = store.users;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
  }

  private getStatusLabel(status: EmployeeStatus | undefined, isRu: boolean): { text: string; variant: 'success' | 'info' | 'warning' | 'primary' } {
    switch (status || 'active') {
      case 'remote':
        return { text: isRu ? 'Удалённо' : 'Remote', variant: 'info' };
      case 'vacation':
        return { text: isRu ? 'Отпуск' : 'Vacation', variant: 'warning' };
      case 'onboarding':
        return { text: isRu ? 'Адаптация' : 'Onboarding', variant: 'primary' };
      default:
        return { text: isRu ? 'В штате' : 'Active', variant: 'success' };
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
    const isRu = this.currentLang === 'ru';
    const filtered = this.getFilteredEmployees();
    const activeOnline = this.employees.filter((e) => (e.status || 'active') !== 'vacation').length;
    const departments = new Set(this.employees.map((e) => e.department).filter(Boolean)).size;
    const avgRate = this.employees.length
      ? Math.round(
          this.employees.reduce((s, e) => s + (e.hourlyRate || 3500), 0) / this.employees.length
        )
      : 0;

    const companyOptions = [
      { value: 'all', label: isRu ? 'Все компании' : 'All companies' },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];

    const statusOptions = [
      { value: 'all', label: isRu ? 'Все статусы' : 'All statuses' },
      { value: 'active', label: isRu ? 'В штате' : 'Active', color: '#10b981' },
      { value: 'remote', label: isRu ? 'Удалённо' : 'Remote', color: '#0284c7' },
      { value: 'vacation', label: isRu ? 'Отпуск' : 'Vacation', color: '#f59e0b' },
      { value: 'onboarding', label: isRu ? 'Адаптация' : 'Onboarding', color: '#6366f1' },
    ];

    return html`
      <app-page-header
        title="${isRu ? 'Сотрудники' : 'Employees'}"
        subtitle="${isRu
          ? 'Штат компании, специализации, ставки, текущие проекты и загрузка по задачам'
          : 'Team directory, roles, hourly rates, project assignments, and task workload'}"
      >
        <span slot="icon">${iconUsers(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${isRu ? 'Добавить сотрудника' : 'Add Employee'}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${isRu ? 'Всего сотрудников' : 'Total Employees'}" value="${this.employees.length}"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Доступны к работе' : 'Available'}" value="${activeOnline}" valueColor="var(--color-success, #10b981)"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Отделов' : 'Departments'}" value="${departments}"></app-metric-card>
        <app-metric-card size="compact" label="${isRu ? 'Средняя ставка' : 'Avg Rate'}" value="${avgRate.toLocaleString('ru-RU')} ₽/ч"></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px; --filter-select-width: 185px;"
        placeholder="${isRu ? 'Поиск по ФИО, должности, отделу...' : 'Search name, role, dept...'}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'company', options: companyOptions },
          { key: 'status', options: statusOptions },
        ]}"
        .values="${{ company: this.companyFilter, status: this.statusFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => (this.localSearch = eventValue(e))}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'company') this.companyFilter = eventValue(e);
          if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | EmployeeStatus;
        }}"
      >
        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: isRu ? 'Карточки' : 'Cards' },
            { value: 'table', label: isRu ? 'Таблица' : 'Table' },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) =>
            (this.displayMode = eventValue(e) as 'cards' | 'table')}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${filtered.length === 0
        ? html`<app-empty-state title="${isRu ? 'Сотрудники не найдены' : 'No employees found'}"></app-empty-state>`
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, isRu)
        : this.renderTable(filtered, isRu)}

      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingId
          ? isRu
            ? 'Профиль сотрудника'
            : 'Edit Employee'
          : isRu
          ? 'Новый сотрудник'
          : 'New Employee'}"
        @close="${() => (this.modalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-input
              label="${isRu ? 'ФИО' : 'Full Name'}"
              .value="${this.formName}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formName = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Должность' : 'Position / Role'}"
              .value="${this.formRole}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formRole = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Отдел' : 'Department'}"
              .value="${this.formDepartment}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formDepartment = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Компания' : 'Company'}"
              .value="${this.formCompanyId}"
              .options="${[
                { value: '', label: isRu ? 'Не указана' : 'None' },
                ...store.companies.map((c) => ({ value: c.id, label: c.name })),
              ]}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCompanyId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="Email"
              type="email"
              .value="${this.formEmail}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formEmail = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Телефон' : 'Phone'}"
              .value="${this.formPhone}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formPhone = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Город / Локация' : 'Location'}"
              .value="${this.formLocation}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formLocation = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.formStatus}"
              .options="${statusOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as EmployeeStatus)}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата найма' : 'Hire Date'}"
              .value="${this.formHireDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formHireDate = eventValue(e))}"
            ></app-date-input>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Ставка (₽/ч)' : 'Hourly Rate (₽/h)'}"
              .value="${this.formHourlyRate}"
              min="500"
              max="25000"
              step="100"
              unit="₽"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formHourlyRate = eventValue(e))}"
            ></app-number-input>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${isRu ? 'Отмена' : 'Cancel'}
          </app-button>
          <app-button variant="primary" @click="${this.handleSave}">
            ${isRu ? 'Сохранить' : 'Save'}
          </app-button>
        </div>
      </app-modal>

      <app-confirm-dialog
        .open="${Boolean(this.deletingEmployee)}"
        size="sm"
        title="${isRu ? 'Удалить сотрудника?' : 'Delete employee?'}"
        action="${isRu
          ? `Сотрудник «${this.deletingEmployee?.name || ''}» будет удалён из справочника.`
          : `Employee "${this.deletingEmployee?.name || ''}" will be removed from the directory.`}"
        result="${isRu
          ? 'Записи времени и участие в проектных командах будут потеряны.'
          : 'Time entries and project team memberships will be lost.'}"
        .actionLabel="${isRu ? 'Выполняемое действие:' : 'Action performed:'}"
        .resultLabel="${isRu ? 'Ожидаемый результат:' : 'Expected result:'}"
        .cancelLabel="${isRu ? 'Отмена' : 'Cancel'}"
        .confirmLabel="${isRu ? 'Удалить' : 'Delete'}"
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

  private renderCards(list: User[], isRu: boolean) {
    return html`
      <div class="cards-grid">
        ${list.map((emp) => {
          const company = store.companies.find((c) => c.id === emp.companyId);
          const taskCount = store.tasks.filter((t) => t.assigneeId === emp.id).length;
          const projCount = store.projects.filter((p) =>
            (p.members || []).some((m) => m.userId === emp.id)
          ).length;
          const badge = this.getStatusLabel(emp.status, isRu);

          return html`
            <article class="employee-card">
              <div class="card-head">
                <div class="person-box">
                  <app-avatar size="md" initials="${emp.avatar}" title="${emp.name}" style="cursor: pointer;" @click="${() => store.openEmployeeDetail(emp.id)}"></app-avatar>
                  <div class="person-info">
                    <div class="person-name">
                      <button
                        type="button"
                        class="person-link-btn"
                        @click="${() => store.openEmployeeDetail(emp.id)}"
                      >
                        ${emp.name}
                      </button>
                    </div>
                    <div class="person-role">${emp.role}</div>
                  </div>
                </div>
                <app-badge variant="${badge.variant}" appearance="soft">${badge.text}</app-badge>
              </div>

              <div class="details-list">
                <div class="detail-row">
                  <span class="detail-label">${isRu ? 'Отдел' : 'Dept'}</span>
                  <span class="detail-val">${emp.department || '—'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${isRu ? 'Компания' : 'Company'}</span>
                  <span class="detail-val">${company?.name || '—'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email</span>
                  <span class="detail-val">${emp.email}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${isRu ? 'Телефон / Город' : 'Phone / City'}</span>
                  <span class="detail-val">${emp.phone || '—'} · ${emp.location || '—'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">${isRu ? 'Ставка' : 'Rate'}</span>
                  <span class="detail-val mono">${(emp.hourlyRate || 3500).toLocaleString('ru-RU')} ₽/ч</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="stats-row">
                  <span>${isRu ? 'Проекты' : 'Projects'}: <strong>${projCount}</strong></span>
                  <span>${isRu ? 'Задачи' : 'Tasks'}: <strong>${taskCount}</strong></span>
                </div>
                <div class="actions-row">
                  <button
                    type="button"
                    class="icon-btn"
                    title="${isRu ? 'Профиль сотрудника' : 'Open Profile'}"
                    @click="${() => store.openEmployeeDetail(emp.id)}"
                  >
                    ${iconChevronRight(15)}
                  </button>
                  <button
                    type="button"
                    class="icon-btn"
                    title="${isRu ? 'Редактировать' : 'Edit'}"
                    @click="${() => this.openEditModal(emp)}"
                  >
                    ${iconEdit(14)}
                  </button>
                  <button
                    type="button"
                    class="icon-btn danger"
                    title="${isRu ? 'Удалить' : 'Delete'}"
                    @click="${() => (this.deletingEmployee = emp)}"
                  >
                    ${iconTrash(14)}
                  </button>
                </div>
              </div>
            </article>
          `;
        })}
      </div>
    `;
  }

  private renderTable(list: User[], isRu: boolean) {
    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${isRu ? 'Сотрудник' : 'Employee'}</th>
              <th>${isRu ? 'Отдел' : 'Department'}</th>
              <th>${isRu ? 'Компания' : 'Company'}</th>
              <th>${isRu ? 'Контакты' : 'Contacts'}</th>
              <th>${isRu ? 'Проектов / Задач' : 'Projects / Tasks'}</th>
              <th>${isRu ? 'Ставка' : 'Rate'}</th>
              <th>${isRu ? 'Статус' : 'Status'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list.map((emp) => {
              const company = store.companies.find((c) => c.id === emp.companyId);
              const taskCount = store.tasks.filter((t) => t.assigneeId === emp.id).length;
              const projCount = store.projects.filter((p) =>
                (p.members || []).some((m) => m.userId === emp.id)
              ).length;
              const badge = this.getStatusLabel(emp.status, isRu);

              return html`
                <tr>
                  <td>
                    <div class="person-box">
                      <app-avatar size="sm" initials="${emp.avatar}" title="${emp.name}" style="cursor: pointer;" @click="${() => store.openEmployeeDetail(emp.id)}"></app-avatar>
                      <div class="person-info">
                        <div class="person-name" style="font-size: 0.85rem;">
                          <button
                            type="button"
                            class="person-link-btn"
                            @click="${() => store.openEmployeeDetail(emp.id)}"
                          >
                            ${emp.name}
                          </button>
                        </div>
                        <div class="person-role">${emp.role}</div>
                      </div>
                    </div>
                  </td>
                  <td>${emp.department || '—'}</td>
                  <td>${company?.name || '—'}</td>
                  <td>
                    <div>${emp.email}</div>
                    <div style="font-size: 0.74rem; color: var(--text-muted);">${emp.phone || '—'}</div>
                  </td>
                  <td class="mono">${projCount} / ${taskCount}</td>
                  <td class="mono">${(emp.hourlyRate || 3500).toLocaleString('ru-RU')} ₽/ч</td>
                  <td>
                    <app-badge variant="${badge.variant}" appearance="soft">${badge.text}</app-badge>
                  </td>
                  <td>
                    <div class="actions-row">
                      <button
                        type="button"
                        class="icon-btn"
                        title="${isRu ? 'Профиль сотрудника' : 'Open Profile'}"
                        @click="${() => store.openEmployeeDetail(emp.id)}"
                      >
                        ${iconChevronRight(15)}
                      </button>
                      <button
                        type="button"
                        class="icon-btn"
                        @click="${() => this.openEditModal(emp)}"
                      >
                        ${iconEdit(14)}
                      </button>
                      <button
                        type="button"
                        class="icon-btn danger"
                        @click="${() => (this.deletingEmployee = emp)}"
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

  private openCreateModal() {
    this.editingId = null;
    this.formName = '';
    this.formRole = '';
    this.formDepartment = '';
    this.formCompanyId = store.companies[0]?.id || '';
    this.formEmail = '';
    this.formPhone = '';
    this.formLocation = 'Москва';
    this.formStatus = 'active';
    this.formHireDate = new Date().toISOString().slice(0, 10);
    this.formHourlyRate = 3500;
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(emp: User) {
    this.editingId = emp.id;
    this.formName = emp.name;
    this.formRole = emp.role;
    this.formDepartment = emp.department || '';
    this.formCompanyId = emp.companyId || '';
    this.formEmail = emp.email;
    this.formPhone = emp.phone || '';
    this.formLocation = emp.location || '';
    this.formStatus = emp.status || 'active';
    this.formHireDate = emp.hireDate || '';
    this.formHourlyRate = emp.hourlyRate || 3500;
    this.formError = '';
    this.modalOpen = true;
  }

  private handleSave() {
    if (!this.formName.trim()) {
      this.formError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }

    const baseData = {
      name: this.formName.trim(),
      role: this.formRole.trim() || 'Specialist',
      department: this.formDepartment.trim() || 'Разработка',
      companyId: this.formCompanyId || undefined,
      email: this.formEmail.trim() || 'team@projectflow.dev',
      phone: this.formPhone.trim() || '—',
      location: this.formLocation.trim() || 'Москва',
      status: this.formStatus,
      hireDate: this.formHireDate || undefined,
      hourlyRate: this.formHourlyRate,
    };

    if (this.editingId) {
      const existing = this.employees.find((u) => u.id === this.editingId);
      store.updateEmployee({
        id: this.editingId,
        avatar: existing?.avatar || '',
        ...baseData,
      });
    } else {
      store.addEmployee(baseData);
    }

    this.modalOpen = false;
  }
}
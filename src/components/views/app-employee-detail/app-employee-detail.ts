import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { EmployeeStatus, TimeEntryCategory, User } from '../../../types';
import {
  iconChevronLeft,
  iconChevronRight,
  iconClock,
  iconEdit,
  iconFolder,
  iconKanban,
  iconMessageSquare,
  iconPlus,
  iconTrash,
  iconWallet,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-meta-grid/app-meta-grid';
import styles from './app-employee-detail.css';

@customElement('app-employee-detail')
export class AppEmployeeDetail extends LitElement {
  @state() private employees: User[] = store.users;
  @state() private detailEmployeeId: string = store.detailEmployeeId || store.users[0]?.id || '';
  @state() private currentLang = store.customization.language;
  @state() private taskFilter: 'all' | 'active' | 'done' = 'active';
  @state() private activityTab: 'time' | 'expenses' = 'time';

  // Edit profile modal
  @state() private editModalOpen = false;
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

  @state() private confirmDeleteOpen = false;

  // Quick Time modal
  @state() private timeModalOpen = false;
  @state() private timeTaskId = '';
  @state() private timeHours = 2;
  @state() private timeDate = new Date().toISOString().slice(0, 10);
  @state() private timeCategory: TimeEntryCategory = 'development';
  @state() private timeDesc = '';

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
    const candidate = store.detailEmployeeId || this.detailEmployeeId;
    if (candidate && this.employees.some((u) => u.id === candidate)) {
      this.detailEmployeeId = candidate;
    } else {
      this.detailEmployeeId = this.employees[0]?.id || '';
    }
  }

  private getStatusMeta(
    status: EmployeeStatus | undefined,
    isRu: boolean
  ): { text: string; variant: 'success' | 'info' | 'warning' | 'primary' } {
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

  render() {
    const t = getTranslation(this.currentLang);
    const isRu = this.currentLang === 'ru';
    const emp = this.employees.find((u) => u.id === this.detailEmployeeId) || null;

    if (!emp) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${isRu ? 'Сотрудник не найден' : 'Employee not found'}">
            <app-button slot="action" variant="primary" @click="${() => store.setActiveView('employees')}">
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.employeeDetail.backToEmployees}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const company = store.companies.find((c) => c.id === emp.companyId);
    const statusMeta = this.getStatusMeta(emp.status, isRu);

    const empProjects = store.projects
      .map((p) => {
        const roles = (p.members || []).filter((m) => m.userId === emp.id);
        return roles.length > 0 ? { project: p, roles } : null;
      })
      .filter((x): x is { project: (typeof store.projects)[number]; roles: NonNullable<(typeof store.projects)[number]['members']> } =>
        Boolean(x)
      );

    const totalAllocation = empProjects.reduce(
      (sum, entry) => sum + entry.roles.reduce((rs, r) => rs + r.allocation, 0),
      0
    );

    const empTasks = store.tasks.filter((tk) => tk.assigneeId === emp.id);
    const activeTasksCount = empTasks.filter((tk) => tk.status !== 'done').length;
    const filteredTasks = empTasks.filter((tk) => {
      if (this.taskFilter === 'active') return tk.status !== 'done';
      if (this.taskFilter === 'done') return tk.status === 'done';
      return true;
    });

    const empTimeEntries = store.timeEntries
      .filter((te) => te.userId === emp.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const totalHours = empTimeEntries.reduce((sum, te) => sum + te.hours, 0);
    const billableHours = empTimeEntries
      .filter((te) => te.billable)
      .reduce((sum, te) => sum + te.hours, 0);

    const empExpenses = store.expenses
      .filter((ex) => ex.userId === emp.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    const hourlyRate = emp.hourlyRate || 3500;
    const estimatedValue = Math.round(billableHours * hourlyRate);

    const empSwitchOptions = this.employees.map((u) => ({
      value: u.id,
      label: `${u.name} · ${u.role}`,
    }));

    return html`
      <div class="page-shell">
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="outline"
              size="sm"
              @click="${() => store.setActiveView('employees')}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${t.employeeDetail.backToEmployees}</span>
            </app-button>

            <div class="emp-switcher">
              <app-select
                size="sm"
                .value="${emp.id}"
                .options="${empSwitchOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  store.openEmployeeDetail(e.detail.value)}"
              ></app-select>
            </div>
          </div>

          <div class="nav-actions">
            <app-button
              size="sm"
              variant="primary"
              @click="${() => this.openQuickTimeModal(emp)}"
            >
              <span slot="icon-start">${iconPlus(15)}</span>
              <span>${t.employeeDetail.logTime}</span>
            </app-button>
            <app-button
              size="sm"
              variant="secondary"
              @click="${() => this.openEditModal(emp)}"
            >
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.common.edit}</span>
            </app-button>
            <button
              type="button"
              class="icon-btn danger"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteOpen = true)}"
            >
              ${iconTrash(15)}
            </button>
          </div>
        </div>

        <!-- Profile Hero Card -->
        <section class="overview-card">
          <div class="hero-top">
            <div class="hero-identity">
              <div class="avatar-lg">${emp.avatar}</div>
              <div class="title-block">
                <div class="title-row">
                  <h1 class="emp-title">${emp.name}</h1>
                  <app-badge variant="${statusMeta.variant}" appearance="soft" size="sm">
                    ${statusMeta.text}
                  </app-badge>
                </div>
                <div class="emp-sub">
                  <span>${emp.role}</span>
                  ${emp.department ? html`<span aria-hidden="true">·</span><span>${emp.department}</span>` : ''}
                  ${company ? html`<span aria-hidden="true">·</span><span>${company.name}</span>` : ''}
                  ${emp.location ? html`<span aria-hidden="true">·</span><span>${emp.location}</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          <div class="kpi-strip">
            <div class="kpi-cell">
              <span class="kpi-label">${t.employeeDetail.totalAllocation}</span>
              <span class="kpi-val ${totalAllocation > 100 ? 'warn' : 'accent'}">${totalAllocation}%</span>
              <span class="kpi-hint">${empProjects.length} ${isRu ? 'проектов' : 'projects'}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.employeeDetail.assignedTasks}</span>
              <span class="kpi-val">${activeTasksCount} / ${empTasks.length}</span>
              <span class="kpi-hint">${isRu ? 'в работе / всего' : 'active / total'}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.employeeDetail.loggedHours}</span>
              <span class="kpi-val">${totalHours.toFixed(1)} ${isRu ? 'ч' : 'h'}</span>
              <span class="kpi-hint">
                ${billableHours.toFixed(1)} ${isRu ? 'ч billable' : 'h billable'}
              </span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.employeeDetail.estimatedValue}</span>
              <span class="kpi-val success">${estimatedValue.toLocaleString('ru-RU')} ₽</span>
              <span class="kpi-hint mono">${hourlyRate.toLocaleString('ru-RU')} ₽/ч</span>
            </div>
          </div>

          <app-meta-grid
            columns="3"
            .items="${[
              { label: 'Email', value: emp.email || '—' },
              { label: isRu ? 'Телефон' : 'Phone', value: emp.phone || '—', mono: true },
              { label: isRu ? 'Отдел' : 'Department', value: emp.department || '—' },
              { label: isRu ? 'Компания' : 'Company', value: company?.name || '—' },
              { label: isRu ? 'Дата найма' : 'Hire Date', value: emp.hireDate || '—', mono: true },
              { label: isRu ? 'Ставка' : 'Hourly Rate', value: `${hourlyRate.toLocaleString('ru-RU')} ₽/ч`, mono: true },
            ]}"
          ></app-meta-grid>
        </section>

        <!-- Projects & Assigned Tasks -->
        <div class="two-col-grid">
          <section class="section-card">
            <div class="section-header">
              <h2 class="section-title">
                ${iconFolder(18)}
                <span>${t.employeeDetail.projectsTitle}</span>
                <span class="section-sub">(${empProjects.length})</span>
              </h2>
            </div>

            ${empProjects.length === 0
              ? html`<app-empty-state compact title="${t.employeeDetail.noProjects}"></app-empty-state>`
              : html`
                  <div class="rows-list">
                    ${empProjects.map(({ project, roles }) => {
                      const roleNames = roles.map((r) => t.projectRoles[r.role]).join(', ');
                      const allocSum = roles.reduce((s, r) => s + r.allocation, 0);
                      return html`
                        <div class="list-row clickable" @click="${() => store.openProjectDetail(project.id)}">
                          <div class="row-main">
                            <div class="row-title">
                              <span class="color-dot" style="background: ${project.color};"></span>
                              <span class="row-key">${project.key}</span>
                              <span>${project.name}</span>
                            </div>
                            <div class="row-sub">
                              <span>${roleNames}</span>
                              <span>· ${isRu ? 'Прогресс' : 'Progress'}: ${project.progress}%</span>
                            </div>
                          </div>
                          <div class="row-right" @click="${(e: Event) => e.stopPropagation()}">
                            <span class="alloc-chip">${allocSum}%</span>
                            <button
                              type="button"
                              class="icon-btn"
                              title="${t.projectChat.title}"
                              @click="${() => store.openProjectChat(project.id)}"
                            >
                              ${iconMessageSquare(14)}
                            </button>
                            <button
                              type="button"
                              class="icon-btn"
                              title="${t.projectDetail.openProject}"
                              @click="${() => store.openProjectDetail(project.id)}"
                            >
                              ${iconChevronRight(15)}
                            </button>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
          </section>

          <section class="section-card">
            <div class="section-header">
              <h2 class="section-title">
                ${iconKanban()}
                <span>${t.employeeDetail.tasksTitle}</span>
                <span class="section-sub">(${filteredTasks.length})</span>
              </h2>
              <app-segmented-switch
                size="sm"
                .value="${this.taskFilter}"
                .options="${[
                  { value: 'active', label: isRu ? 'Активные' : 'Active' },
                  { value: 'done', label: isRu ? 'Готовые' : 'Done' },
                  { value: 'all', label: t.common.all },
                ]}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.taskFilter = e.detail.value as 'all' | 'active' | 'done')}"
              ></app-segmented-switch>
            </div>

            ${filteredTasks.length === 0
              ? html`<app-empty-state compact title="${t.employeeDetail.noTasks}"></app-empty-state>`
              : html`
                  <div class="rows-list">
                    ${filteredTasks.slice(0, 12).map((task) => {
                      return html`
                        <div class="list-row clickable" @click="${() => store.openTaskDetail(task.id)}">
                          <div class="row-main">
                            <div class="row-title">
                              <span class="row-key">${task.id}</span>
                              <span>${task.title}</span>
                            </div>
                            <div class="row-sub">
                              <span>${t.priority[task.priority]}</span>
                              <span class="mono">· ${task.dueDate}</span>
                              <span class="mono">· ${task.loggedHours}/${task.estimatedHours} ${isRu ? 'ч' : 'h'}</span>
                            </div>
                          </div>
                          <div class="row-right">
                            <app-badge
                              variant="${task.status === 'done'
                                ? 'success'
                                : task.status === 'review'
                                ? 'warning'
                                : task.status === 'in_progress'
                                ? 'primary'
                                : 'default'}"
                              appearance="soft"
                              size="sm"
                            >
                              ${t.status[task.status]}
                            </app-badge>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
          </section>
        </div>

        <!-- Time Entries & Expenses -->
        <section class="section-card">
          <div class="section-header">
            <h2 class="section-title">
              ${this.activityTab === 'time' ? iconClock(18) : iconWallet(18)}
              <span>
                ${this.activityTab === 'time'
                  ? t.employeeDetail.timeTitle
                  : t.employeeDetail.expensesTitle}
              </span>
              <span class="section-sub">
                (${this.activityTab === 'time' ? empTimeEntries.length : empExpenses.length})
              </span>
            </h2>
            <app-segmented-switch
              size="sm"
              .value="${this.activityTab}"
              .options="${[
                { value: 'time', label: `${t.employeeDetail.timeTitle} (${empTimeEntries.length})` },
                { value: 'expenses', label: `${t.employeeDetail.expensesTitle} (${empExpenses.length})` },
              ]}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.activityTab = e.detail.value as 'time' | 'expenses')}"
            ></app-segmented-switch>
          </div>

          ${this.activityTab === 'time'
            ? empTimeEntries.length === 0
              ? html`<app-empty-state compact title="${t.employeeDetail.noTimeEntries}"></app-empty-state>`
              : html`
                  <div class="table-scroll">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>${isRu ? 'Дата' : 'Date'}</th>
                          <th>${isRu ? 'Проект / Задача' : 'Project / Task'}</th>
                          <th>${isRu ? 'Описание' : 'Notes'}</th>
                          <th>${isRu ? 'Часы' : 'Hours'}</th>
                          <th>${isRu ? 'Тип' : 'Billing'}</th>
                          <th>${isRu ? 'Статус' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${empTimeEntries.map((te) => {
                          const proj = store.projects.find((p) => p.id === te.projectId);
                          return html`
                            <tr>
                              <td class="mono">${te.date}</td>
                              <td>
                                <span class="mono" style="color: var(--accent-primary); font-weight: 700;">
                                  ${te.taskId}
                                </span>
                                ${proj ? html`<span style="color: var(--text-muted);"> · ${proj.key}</span>` : ''}
                              </td>
                              <td>${te.description || t.timeTracking.categories[te.category]}</td>
                              <td class="mono" style="font-weight: 700;">${te.hours.toFixed(1)} ${isRu ? 'ч' : 'h'}</td>
                              <td>
                                <app-badge variant="${te.billable ? 'success' : 'default'}" appearance="outline" size="sm">
                                  ${te.billable ? 'Billable' : 'Non-billable'}
                                </app-badge>
                              </td>
                              <td>
                                <app-badge
                                  variant="${te.status === 'approved'
                                    ? 'success'
                                    : te.status === 'submitted'
                                    ? 'warning'
                                    : 'default'}"
                                  appearance="soft"
                                  size="sm"
                                >
                                  ${t.timeTracking.statuses[te.status]}
                                </app-badge>
                              </td>
                            </tr>
                          `;
                        })}
                      </tbody>
                    </table>
                  </div>
                `
            : empExpenses.length === 0
            ? html`<app-empty-state compact title="${t.employeeDetail.noExpenses}"></app-empty-state>`
            : html`
                <div class="table-scroll">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>${isRu ? 'Дата' : 'Date'}</th>
                        <th>${isRu ? 'Наименование' : 'Title'}</th>
                        <th>${isRu ? 'Проект' : 'Project'}</th>
                        <th>${isRu ? 'Сумма' : 'Amount'}</th>
                        <th>${isRu ? 'Статус' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${empExpenses.map((exp) => {
                        const proj = store.projects.find((p) => p.id === exp.projectId);
                        const sym = exp.currency === 'USD' ? '$' : exp.currency === 'EUR' ? '€' : '₽';
                        return html`
                          <tr>
                            <td class="mono">${exp.date}</td>
                            <td>${exp.title}</td>
                            <td>${proj ? `[${proj.key}] ${proj.name}` : '—'}</td>
                            <td class="mono" style="font-weight: 700;">
                              ${exp.amount.toLocaleString('ru-RU')} ${sym}
                            </td>
                            <td>
                              <app-badge
                                variant="${exp.status === 'approved' || exp.status === 'reimbursed'
                                  ? 'success'
                                  : exp.status === 'pending'
                                  ? 'warning'
                                  : exp.status === 'rejected'
                                  ? 'danger'
                                  : 'default'}"
                                appearance="soft"
                                size="sm"
                              >
                                ${t.expenses.statuses[exp.status]}
                              </app-badge>
                            </td>
                          </tr>
                        `;
                      })}
                    </tbody>
                  </table>
                </div>
              `}
        </section>
      </div>

      ${this.renderEditModal(isRu, t)}
      ${this.renderDeleteModal(emp, isRu, t)}
      ${this.renderQuickTimeModal(emp, empTasks, isRu, t)}
    `;
  }

  private renderEditModal(isRu: boolean, t: ReturnType<typeof getTranslation>) {
    const statusOptions = [
      { value: 'active', label: isRu ? 'В штате' : 'Active', color: '#10b981' },
      { value: 'remote', label: isRu ? 'Удалённо' : 'Remote', color: '#0284c7' },
      { value: 'vacation', label: isRu ? 'Отпуск' : 'Vacation', color: '#f59e0b' },
      { value: 'onboarding', label: isRu ? 'Адаптация' : 'Onboarding', color: '#6366f1' },
    ];

    return html`
      <app-modal
        ?open="${this.editModalOpen}"
        size="lg"
        title="${isRu ? 'Редактирование профиля' : 'Edit Employee'}"
        @close="${() => (this.editModalOpen = false)}"
      >
        <div class="form-grid">
          <div>
            <app-input
              label="${isRu ? 'ФИО' : 'Full Name'}"
              .value="${this.formName}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formName = e.detail.value;
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Должность' : 'Role'}"
              .value="${this.formRole}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formRole = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Отдел' : 'Department'}"
              .value="${this.formDepartment}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formDepartment = e.detail.value)}"
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
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCompanyId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="Email"
              type="email"
              .value="${this.formEmail}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formEmail = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Телефон' : 'Phone'}"
              .value="${this.formPhone}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formPhone = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${isRu ? 'Город' : 'Location'}"
              .value="${this.formLocation}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formLocation = e.detail.value)}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${isRu ? 'Статус' : 'Status'}"
              .value="${this.formStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = e.detail.value as EmployeeStatus)}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата найма' : 'Hire Date'}"
              .value="${this.formHireDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formHireDate = e.detail.value)}"
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
              @change="${(e: CustomEvent<{ value: number }>) => (this.formHourlyRate = e.detail.value)}"
            ></app-number-input>
          </div>
        </div>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.editModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${this.handleSaveEdit}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteModal(emp: User, isRu: boolean, t: ReturnType<typeof getTranslation>) {
    return html`
      <app-modal
        ?open="${this.confirmDeleteOpen}"
        size="sm"
        title="${isRu ? 'Удалить сотрудника?' : 'Delete employee?'}"
        @close="${() => (this.confirmDeleteOpen = false)}"
      >
        <p class="confirm-text">
          ${isRu
            ? `Удалить сотрудника «${emp.name}» из справочника и проектных команд?`
            : `Remove "${emp.name}" from directory and project teams?`}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.confirmDeleteOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              this.confirmDeleteOpen = false;
              store.deleteEmployee(emp.id);
            }}"
          >
            ${t.common.delete}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderQuickTimeModal(
    emp: User,
    empTasks: typeof store.tasks,
    isRu: boolean,
    t: ReturnType<typeof getTranslation>
  ) {
    const taskPool = empTasks.length > 0 ? empTasks : store.tasks;
    const taskOpts = taskPool.slice(0, 60).map((tk) => ({
      value: tk.id,
      label: `${tk.id} · ${tk.title}`,
    }));
    const catOpts = [
      { value: 'development', label: t.timeTracking.categories.development },
      { value: 'design', label: t.timeTracking.categories.design },
      { value: 'testing', label: t.timeTracking.categories.testing },
      { value: 'research', label: t.timeTracking.categories.research },
      { value: 'devops', label: t.timeTracking.categories.devops },
      { value: 'meeting', label: t.timeTracking.categories.meeting },
      { value: 'management', label: t.timeTracking.categories.management },
    ];

    return html`
      <app-modal
        ?open="${this.timeModalOpen}"
        size="md"
        title="${isRu ? `Списание времени · ${emp.name}` : `Log Time · ${emp.name}`}"
        @close="${() => (this.timeModalOpen = false)}"
      >
        <div class="form-grid">
          <div class="col-span-2">
            <app-select
              label="${isRu ? 'Задача' : 'Task'}"
              .value="${this.timeTaskId}"
              .options="${taskOpts}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.timeTaskId = e.detail.value)}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${isRu ? 'Дата' : 'Date'}"
              .value="${this.timeDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.timeDate = e.detail.value)}"
            ></app-date-input>
          </div>
          <div>
            <app-number-input
              label="${isRu ? 'Часы' : 'Hours'}"
              .value="${this.timeHours}"
              min="0.25"
              max="24"
              step="0.5"
              unit="ч"
              @change="${(e: CustomEvent<{ value: number }>) => (this.timeHours = e.detail.value)}"
            ></app-number-input>
          </div>
          <div class="col-span-2">
            <app-select
              label="${isRu ? 'Категория работ' : 'Category'}"
              .value="${this.timeCategory}"
              .options="${catOpts}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.timeCategory = e.detail.value as TimeEntryCategory)}"
            ></app-select>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${isRu ? 'Комментарий' : 'Notes'}"
              .value="${this.timeDesc}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.timeDesc = e.detail.value)}"
            ></app-textarea>
          </div>
        </div>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.timeModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button
            variant="primary"
            ?disabled="${!this.timeTaskId || this.timeHours <= 0}"
            @click="${() => {
              const task = store.tasks.find((tk) => tk.id === this.timeTaskId);
              if (!task) return;
              store.addTimeEntry({
                taskId: task.id,
                projectId: task.projectId,
                userId: emp.id,
                date: this.timeDate || new Date().toISOString().slice(0, 10),
                hours: this.timeHours,
                billable: true,
                category: this.timeCategory,
                status: 'logged',
                description: this.timeDesc.trim(),
              });
              this.timeModalOpen = false;
            }}"
          >
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private openEditModal(emp: User) {
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
    this.editModalOpen = true;
  }

  private handleSaveEdit() {
    if (!this.formName.trim()) {
      this.formError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }
    const existing = this.employees.find((u) => u.id === this.detailEmployeeId);
    store.updateEmployee({
      id: this.detailEmployeeId,
      avatar: existing?.avatar || '',
      name: this.formName.trim(),
      role: this.formRole.trim() || 'Specialist',
      department: this.formDepartment.trim() || 'Разработка',
      companyId: this.formCompanyId || undefined,
      email: this.formEmail.trim() || 'team@projectflow.dev',
      phone: this.formPhone.trim() || '—',
      location: this.formLocation.trim() || 'Москва',
      status: this.formStatus,
      hireDate: this.formHireDate || undefined,
      hourlyRate: Math.max(100, Number(this.formHourlyRate) || 3500),
    });
    this.editModalOpen = false;
  }

  private openQuickTimeModal(emp: User) {
    const firstTask =
      store.tasks.find((tk) => tk.assigneeId === emp.id && tk.status !== 'done') ||
      store.tasks.find((tk) => tk.assigneeId === emp.id) ||
      store.tasks[0];
    this.timeTaskId = firstTask?.id || '';
    this.timeHours = 2;
    this.timeDate = new Date().toISOString().slice(0, 10);
    this.timeCategory = 'development';
    this.timeDesc = '';
    this.timeModalOpen = true;
  }
}

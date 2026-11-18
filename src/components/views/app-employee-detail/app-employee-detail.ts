import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { User } from '../../../types';
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
import '../../common/app-link/app-link';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-select/app-select';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-time-entry-form/app-time-entry-form';
import '../../common/app-employee-form/app-employee-form';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-meta-grid/app-meta-grid';
import '../../common/app-avatar/app-avatar';
import '../../common/app-section-card/app-section-card';
import '../../common/app-entity-emblem/app-entity-emblem';
import '../../common/app-entity-reminders/app-entity-reminders';
import styles from './app-employee-detail.css';
import { eventValue } from '../../common/event-value';

@customElement('app-employee-detail')
export class AppEmployeeDetail extends LitElement {
  @state() private employees: User[] = store.users;
  @state() private detailEmployeeId: string = store.detailEmployeeId || store.users[0]?.id || '';
  @state() private currentLang = store.customization.language;
  @state() private taskFilter: 'all' | 'active' | 'done' = 'active';
  @state() private activityTab: 'time' | 'expenses' = 'time';

  // Edit profile modal
  @state() private editModalOpen = false;

  @state() private confirmDeleteOpen = false;

  // Quick Time modal
  @state() private timeModalOpen = false;
  @state() private presetQuickUserId: string | null = null;
  @state() private presetQuickProjectId: string | null = null;
  @state() private presetQuickTaskId: string | null = null;

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

  render() {
    const t = getTranslation(this.currentLang);
    const emp = this.employees.find((u) => u.id === this.detailEmployeeId) || null;

    if (!emp) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.employeeDetail.emptyNotFound}">
            <app-button slot="action" variant="primary" @click="${() => store.setActiveView('employees')}">
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.employeeDetail.backToEmployees}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const company = store.companies.find((c) => c.id === emp.companyId);

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
                  store.openEmployeeDetail(eventValue(e))}"
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

        <!-- Profile Hero Card -->
        <section class="overview-card">
          <div class="hero-top">
            <div class="hero-identity">
              <div class="avatar-emblem-wrap">
                <app-avatar size="lg" initials="${emp.avatar}" title="${emp.name}"></app-avatar>
                <app-entity-emblem class="avatar-entity-badge" entity="employee" size="sm"></app-entity-emblem>
              </div>
              <div class="title-block">
                <div class="title-row">
                  <app-entity-emblem entity="employee" variant="pill" size="sm"></app-entity-emblem>
                  <h1 class="emp-title">${emp.name}</h1>
                  <app-status-chip domain="employee" status="${emp.status || 'active'}" appearance="soft" size="sm"></app-status-chip>
                </div>
                <div class="emp-sub">
                  <span>${emp.role}</span>
                  ${emp.department ? html`<span aria-hidden="true">·</span><span>${emp.department}</span>` : ''}
                  ${company
                    ? html`
                        <span aria-hidden="true">·</span>
                        <app-link
                          class="link-btn"
                          size="md"
                          variant="primary"
                          @click="${() => store.openCompanyDetail(company.id)}"
                        >
                          ${company.name}
                        </app-link>
                      `
                    : ''}
                  ${emp.location ? html`<span aria-hidden="true">·</span><span>${emp.location}</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          <div class="kpi-strip">
            <div class="kpi-cell">
              <span class="kpi-label">${t.employeeDetail.totalAllocation}</span>
              <span class="kpi-val ${totalAllocation > 100 ? 'warn' : 'accent'}">${totalAllocation}%</span>
              <span class="kpi-hint">${empProjects.length} ${t.viewTexts.employeeDetail.projectsSuffix}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.employeeDetail.assignedTasks}</span>
              <span class="kpi-val">${activeTasksCount} / ${empTasks.length}</span>
              <span class="kpi-hint">${t.viewTexts.employeeDetail.activeTotalHint}</span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.employeeDetail.loggedHours}</span>
              <span class="kpi-val">${totalHours.toFixed(1)} ${t.viewTexts.calculations.hoursUnitShort}</span>
              <span class="kpi-hint">
                ${billableHours.toFixed(1)} ${t.viewTexts.employeeDetail.billableSuffix}
              </span>
            </div>
            <div class="kpi-cell">
              <span class="kpi-label">${t.employeeDetail.estimatedValue}</span>
              <span class="kpi-val success">${estimatedValue.toLocaleString(t.common.locale)} ₽</span>
              <span class="kpi-hint mono">${hourlyRate.toLocaleString(t.common.locale)} ${t.viewTexts.employees.rateUnit}</span>
            </div>
          </div>

          <app-meta-grid
            columns="3"
            .items="${[
              { label: 'Email', value: emp.email || '—' },
              { label: t.viewTexts.counterparties.labelPhone, value: emp.phone || '—', mono: true },
              { label: t.viewTexts.employees.labelDepartment, value: emp.department || '—' },
              { label: t.viewTexts.employees.labelCompany, value: company?.name || '—' },
              { label: t.viewTexts.employees.labelHireDate, value: emp.hireDate || '—', mono: true },
              { label: t.viewTexts.employeeDetail.rateLabel, value: `${hourlyRate.toLocaleString(t.common.locale)} ${t.viewTexts.employees.rateUnit}`, mono: true },
            ]}"
          ></app-meta-grid>
        </section>

        <!-- Projects & Assigned Tasks -->
        <div class="two-col-grid">
          <app-section-card title="${t.employeeDetail.projectsTitle}" subtitle="(${empProjects.length})">
            <span slot="icon">${iconFolder(18)}</span>
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
                              <span>· ${t.viewTexts.projects.thProgress}: ${project.progress}%</span>
                            </div>
                          </div>
                          <div class="row-right" @click="${(e: Event) => e.stopPropagation()}">
                            <span class="alloc-chip">${allocSum}%</span>
                            <app-button
                              size="xs"
                              variant="icon"
                              title="${t.projectChat.title}"
                              @click="${() => store.openProjectChat(project.id)}"
                            >
                              <span slot="start">${iconMessageSquare(14)}</span>
                            </app-button>
                            <app-button
                              size="xs"
                              variant="icon"
                              title="${t.projectDetail.openProject}"
                              @click="${() => store.openProjectDetail(project.id)}"
                            >
                              <span slot="start">${iconChevronRight(15)}</span>
                            </app-button>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
          </app-section-card>

          <app-section-card title="${t.employeeDetail.tasksTitle}" subtitle="(${filteredTasks.length})">
            <span slot="icon">${iconKanban()}</span>
              <app-segmented-switch
                slot="actions"
                size="sm"
                .value="${this.taskFilter}"
                .options="${[
                  { value: 'active', label: t.viewTexts.employeeDetail.filterActive },
                  { value: 'done', label: t.viewTexts.employeeDetail.filterDone },
                  { value: 'all', label: t.common.all },
                ]}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.taskFilter = eventValue(e) as 'all' | 'active' | 'done')}"
              ></app-segmented-switch>

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
                              <span class="mono">· ${task.loggedHours}/${task.estimatedHours} ${t.viewTexts.calculations.hoursUnitShort}</span>
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
          </app-section-card>
        </div>

        <!-- Time Entries & Expenses -->
        <app-section-card
          title="${this.activityTab === 'time' ? t.employeeDetail.timeTitle : t.employeeDetail.expensesTitle}"
          subtitle="(${this.activityTab === 'time' ? empTimeEntries.length : empExpenses.length})"
        >
          <span slot="icon">${this.activityTab === 'time' ? iconClock(18) : iconWallet(18)}</span>
            <app-segmented-switch
              slot="actions"
              size="sm"
              .value="${this.activityTab}"
              .options="${[
                { value: 'time', label: `${t.employeeDetail.timeTitle} (${empTimeEntries.length})` },
                { value: 'expenses', label: `${t.employeeDetail.expensesTitle} (${empExpenses.length})` },
              ]}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.activityTab = eventValue(e) as 'time' | 'expenses')}"
            ></app-segmented-switch>

          ${this.activityTab === 'time'
            ? empTimeEntries.length === 0
              ? html`<app-empty-state compact title="${t.employeeDetail.noTimeEntries}"></app-empty-state>`
              : html`
                  <div class="table-scroll">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th>${t.viewTexts.expenses.thDate}</th>
                          <th>${t.viewTexts.employeeDetail.thProjectTask}</th>
                          <th>${t.viewTexts.employeeDetail.thNotes}</th>
                          <th>${t.viewTexts.timeTracking.labelHours}</th>
                          <th>${t.viewTexts.calculations.thBillingType}</th>
                          <th>${t.viewTexts.counterparties.thStatus}</th>
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
                              <td class="mono" style="font-weight: 700;">${te.hours.toFixed(1)} ${t.viewTexts.calculations.hoursUnitShort}</td>
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
                        <th>${t.viewTexts.expenses.thDate}</th>
                        <th>${t.viewTexts.employeeDetail.thTitle}</th>
                        <th>${t.viewTexts.timeTracking.labelProject}</th>
                        <th>${t.viewTexts.expenses.thAmount}</th>
                        <th>${t.viewTexts.counterparties.thStatus}</th>
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
                              ${exp.amount.toLocaleString(t.common.locale)} ${sym}
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
        </app-section-card>

        <app-entity-reminders entity-type="employee" .entityId="${emp.id}"></app-entity-reminders>
      </div>

      ${this.renderEditModal(t)}
      ${this.renderDeleteModal(emp, t)}
      ${this.renderQuickTimeModal(emp, empTasks, t)}
    `;
  }

  private renderEditModal(t: ReturnType<typeof getTranslation>) {
    const emp = store.users.find((u) => u.id === this.detailEmployeeId) || null;

    return html`
      <app-employee-form
        .open="${this.editModalOpen}"
        .employee="${emp}"
        @close="${() => (this.editModalOpen = false)}"
        @saved="${() => (this.editModalOpen = false)}"
      ></app-employee-form>
    `;
  }

  private renderDeleteModal(emp: User, t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${this.confirmDeleteOpen}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.employeeDelete.title}"
        action="${t.viewTexts.confirmDialogs.employeeDelete.action(emp.name)}"
        result="${t.viewTexts.confirmDialogs.employeeDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmDeleteOpen = false)}"
        @confirm="${() => {
          this.confirmDeleteOpen = false;
          store.deleteEmployee(emp.id);
        }}"
      ></app-confirm-dialog>
    `;
  }

  private renderQuickTimeModal(
    emp: User,
    empTasks: typeof store.tasks,
    t: ReturnType<typeof getTranslation>
  ) {
    const firstTask = empTasks.find((tk) => tk.status !== 'done') || empTasks[0] || store.tasks[0];

    return html`
      <app-time-entry-form
        .open="${this.timeModalOpen}"
        .presetUserId="${emp.id}"
        .presetProjectId="${firstTask?.projectId || null}"
        .presetTaskId="${firstTask?.id || null}"
        .contextTitle="${t.viewTexts.projectDetail.quickTimeTitle(emp.name)}"
        @close="${() => (this.timeModalOpen = false)}"
        @saved="${() => (this.timeModalOpen = false)}"
      ></app-time-entry-form>
    `;
  }

  private openEditModal(emp: User) {
    this.editModalOpen = true;
  }

  private openQuickTimeModal(emp: User) {
    const firstTask =
      store.tasks.find((tk) => tk.assigneeId === emp.id && tk.status !== 'done') ||
      store.tasks.find((tk) => tk.assigneeId === emp.id) ||
      store.tasks[0];
    this.presetQuickUserId = emp.id;
    this.presetQuickProjectId = firstTask?.projectId || null;
    this.presetQuickTaskId = firstTask?.id || null;
    this.timeModalOpen = true;
  }
}
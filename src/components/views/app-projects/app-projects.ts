import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { Project, ProjectRole, ProjectStatus } from '../../../types';
import { iconChevronRight, iconEdit, iconFolder, iconKanban, iconPlus, iconTrash } from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-progress-bar/app-progress-bar';
import styles from './app-projects.css';
import { eventValue } from '../../common/event-value';

const ALL_PROJECT_ROLES: ProjectRole[] = [
  'pm',
  'tech_lead',
  'architect',
  'developer',
  'designer',
  'qa',
  'analyst',
  'devops',
];

const PROJECT_COLOR_SWATCHES = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
  '#ec4899',
  '#8b5cf6',
  '#ef4444',
];

@customElement('app-projects')
export class AppProjects extends LitElement {
  @state() private projects: Project[] = store.projects;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private statusFilter: 'all' | ProjectStatus = 'all';
  @state() private companyFilter = 'all';
  @state() private displayMode: 'cards' | 'table' = 'cards';

  // Create / edit modal
  @state() private modalOpen = false;
  @state() private editingId: string | null = null;
  @state() private formName = '';
  @state() private formKey = '';
  @state() private formDescription = '';
  @state() private formColor = '#6366f1';
  @state() private formStatus: ProjectStatus = 'active';
  @state() private formDueDate = '';
  @state() private formCompanyId = '';
  @state() private formCounterpartyId = '';
  @state() private formBudget = 5000000;
  @state() private formProgress = 0;
  @state() private formError = '';

  @state() private deletingProject: Project | null = null;

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
    this.projects = store.projects;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
  }

  private getFilteredProjects(): Project[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.projects.filter((p) => {
      if (this.statusFilter !== 'all' && (p.status || 'active') !== this.statusFilter) return false;
      if (this.companyFilter !== 'all' && p.companyId !== this.companyFilter) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.key.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    });
  }

  render() {
    const t = getTranslation(this.currentLang);
    const filtered = this.getFilteredProjects();

    const activeCount = this.projects.filter((p) => (p.status || 'active') === 'active').length;
    const totalAssignments = this.projects.reduce((sum, p) => sum + (p.members?.length || 0), 0);
    const avgProgress = this.projects.length
      ? Math.round(this.projects.reduce((sum, p) => sum + p.progress, 0) / this.projects.length)
      : 0;

    const statusOptions = [
      { value: 'all', label: t.viewTexts.projects.filterAllStatuses },
      { value: 'planning', label: t.projectStatuses.planning, color: '#0284c7' },
      { value: 'active', label: t.projectStatuses.active, color: '#10b981' },
      { value: 'on_hold', label: t.projectStatuses.on_hold, color: '#f59e0b' },
      { value: 'completed', label: t.projectStatuses.completed, color: '#6366f1' },
    ];

    const companyFilterOptions = [
      { value: 'all', label: t.viewTexts.projects.filterAllCompanies },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];

    return html`
      <app-page-header
        title="${t.navigation.projects}"
        subtitle="${t.viewTexts.pageSubtitles.projects}"
      >
        <span slot="icon">${iconFolder(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${t.viewTexts.projects.newProjectButton}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${t.viewTexts.projects.kpiTotalProjects}" value="${this.projects.length}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.projects.kpiActive}" value="${activeCount}" valueColor="var(--color-success, #10b981)"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.projects.kpiRoleAssignments}" value="${totalAssignments}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.projects.kpiAvgProgress}" value="${avgProgress}%"></app-metric-card>
      </app-kpi-strip>

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px;"
        placeholder="${t.viewTexts.projects.searchPlaceholder}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'status', options: statusOptions },
          { key: 'company', options: companyFilterOptions },
        ]}"
        .values="${{ status: this.statusFilter, company: this.companyFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => (this.localSearch = eventValue(e))}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | ProjectStatus;
          if (e.detail.key === 'company') this.companyFilter = eventValue(e);
        }}"
      >
        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: t.viewTexts.projects.viewCards },
            { value: 'table', label: t.viewTexts.projects.viewTable },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) =>
            (this.displayMode = eventValue(e) as 'cards' | 'table')}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${filtered.length === 0
        ? html`<app-empty-state title="${t.viewTexts.projects.emptyNoProjects}"></app-empty-state>`
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, t)
        : this.renderTable(filtered, t)}

      ${this.renderProjectModal(t, statusOptions)}
      ${this.renderDeleteModal(t)}
    `;
  }

  private renderCards(list: Project[], t: ReturnType<typeof getTranslation>) {
    return html`
      <div class="cards-grid">
        ${list.map((proj) => {
          const company = store.companies.find((c) => c.id === proj.companyId);
          const counterparty = store.counterparties.find((c) => c.id === proj.counterpartyId);
          const tasksCount = store.tasks.filter((task) => task.projectId === proj.id).length;
          const members = proj.members || [];
          const uniqueMembers = new Set(members.map((m) => m.userId)).size;
          const statusKey = (proj.status || 'active') as ProjectStatus;

          const roleCounts = ALL_PROJECT_ROLES.map((role) => ({
            role,
            count: members.filter((m) => m.role === role).length,
          })).filter((item) => item.count > 0);

          return html`
            <article class="project-card" @click="${() => store.openProjectDetail(proj.id)}">
              <div class="proj-card-head">
                <div class="proj-title-row">
                  <span class="color-dot" style="background: ${proj.color};"></span>
                  <span class="proj-key">${proj.key}</span>
                  <h3 class="proj-name">${proj.name}</h3>
                </div>
                <app-status-chip domain="project" status="${proj.status || 'active'}" appearance="soft" size="sm"></app-status-chip>
              </div>

              <p class="proj-desc">${proj.description}</p>

              <app-progress-bar show-label color="${proj.color}" value="${proj.progress}"></app-progress-bar>

              <div class="proj-meta-grid">
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.projects.metaCompany}</span>
                  <span class="meta-val">${company?.name || '—'}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.projects.metaClient}</span>
                  <span class="meta-val">${counterparty?.name || '—'}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.projects.metaBudget}</span>
                  <span class="meta-val mono">
                    ${proj.budget ? `${(proj.budget / 1_000_000).toFixed(1)}M ₽` : '—'}
                  </span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.projects.metaDueTasks}</span>
                  <span class="meta-val mono">${proj.dueDate} · ${tasksCount}</span>
                </div>
              </div>

              <div class="team-summary-line">
                ${roleCounts.length === 0
                  ? html`<span>${t.viewTexts.projects.noTeamRoles}</span>`
                  : html`
                      <span>${t.viewTexts.projects.teamMembersLabel}: <strong>${uniqueMembers}</strong></span>
                      ${roleCounts.map(
                        (rc) => html`
                          <span class="sep">·</span>
                          <span>${t.projectRoles[rc.role]}: <strong>${rc.count}</strong></span>
                        `
                      )}
                    `}
              </div>

              <div class="proj-card-footer" @click="${(e: Event) => e.stopPropagation()}">
                <div class="footer-left-actions">
                  <app-button
                    size="sm"
                    variant="primary"
                    @click="${() => store.openProjectDetail(proj.id)}"
                  >
                    <span>${t.projectDetail.openProject}</span>
                    <span slot="icon-end">${iconChevronRight(14)}</span>
                  </app-button>

                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => {
                      store.selectProject(proj.id);
                      store.setActiveView('kanban');
                    }}"
                  >
                    <span slot="icon-start">${iconKanban()}</span>
                    <span>${t.viewTexts.projects.tasksButton}</span>
                  </app-button>
                </div>

                <div class="actions-row">
                  <button
                    type="button"
                    class="icon-btn"
                    title="${t.common.edit}"
                    @click="${() => this.openEditModal(proj)}"
                  >
                    ${iconEdit(14)}
                  </button>
                  <button
                    type="button"
                    class="icon-btn danger"
                    title="${t.common.delete}"
                    @click="${() => (this.deletingProject = proj)}"
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

  private renderTable(list: Project[], t: ReturnType<typeof getTranslation>) {
    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t.viewTexts.projects.thProject}</th>
              <th>${t.viewTexts.projects.thCompanyClient}</th>
              <th>${t.viewTexts.projects.thTeam}</th>
              <th>${t.viewTexts.projects.thTasks}</th>
              <th>${t.viewTexts.projects.thProgress}</th>
              <th>${t.viewTexts.projects.thBudget}</th>
              <th>${t.viewTexts.projects.thDueDate}</th>
              <th>${t.viewTexts.projects.thStatus}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list.map((proj) => {
              const company = store.companies.find((c) => c.id === proj.companyId);
              const counterparty = store.counterparties.find((c) => c.id === proj.counterpartyId);
              const tasksCount = store.tasks.filter((tk) => tk.projectId === proj.id).length;
              const members = proj.members || [];
              const uniqueMembers = new Set(members.map((m) => m.userId)).size;
              const statusKey = (proj.status || 'active') as ProjectStatus;

              return html`
                <tr @click="${() => store.openProjectDetail(proj.id)}">
                  <td>
                    <div class="proj-title-row">
                      <span class="color-dot" style="background: ${proj.color};"></span>
                      <span class="proj-key">${proj.key}</span>
                      <span style="font-weight: 600;">${proj.name}</span>
                    </div>
                  </td>
                  <td>
                    <div>${company?.name || '—'}</div>
                    <div style="font-size: 0.74rem; color: var(--text-muted);">${counterparty?.name || '—'}</div>
                  </td>
                  <td class="mono">${uniqueMembers} (${members.length})</td>
                  <td class="mono">${tasksCount}</td>
                  <td class="mono">${proj.progress}%</td>
                  <td class="mono">${proj.budget ? `${(proj.budget / 1_000_000).toFixed(1)}M ₽` : '—'}</td>
                  <td class="mono">${proj.dueDate}</td>
                  <td>
                    <app-status-chip domain="project" status="${proj.status || 'active'}" appearance="soft" size="sm"></app-status-chip>
                  </td>
                  <td @click="${(e: Event) => e.stopPropagation()}">
                    <div class="actions-row">
                      <button
                        type="button"
                        class="icon-btn"
                        title="${t.projectDetail.openProject}"
                        @click="${() => store.openProjectDetail(proj.id)}"
                      >
                        ${iconChevronRight(14)}
                      </button>
                      <button
                        type="button"
                        class="icon-btn"
                        title="${t.common.edit}"
                        @click="${() => this.openEditModal(proj)}"
                      >
                        ${iconEdit(14)}
                      </button>
                      <button
                        type="button"
                        class="icon-btn danger"
                        title="${t.common.delete}"
                        @click="${() => (this.deletingProject = proj)}"
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

  private renderProjectModal(
    t: ReturnType<typeof getTranslation>,
    statusOptions: { value: string; label: string; color?: string }[]
  ) {
    const companyOptions = [
      { value: '', label: t.viewTexts.projects.optionNoCompany },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];
    const counterpartyOptions = [
      { value: '', label: t.viewTexts.projects.optionInternalProject },
      ...store.counterparties.map((c) => ({ value: c.id, label: c.name })),
    ];

    return html`
      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingId ? t.viewTexts.projects.modalTitleEdit : t.viewTexts.projects.modalTitleCreate}"
        @close="${() => (this.modalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-input
              label="${t.viewTexts.projects.labelProjectName}"
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
              label="${t.viewTexts.projects.labelProjectKey}"
              placeholder="CORE"
              .value="${this.formKey}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.formKey = eventValue(e).toUpperCase())}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.projects.labelStatus}"
              .value="${this.formStatus}"
              .options="${statusOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as ProjectStatus)}"
            ></app-select>
          </div>
          <div>
            <app-date-input
              label="${t.viewTexts.projects.labelDueDate}"
              .value="${this.formDueDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formDueDate = eventValue(e))}"
            ></app-date-input>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.projects.labelCompany}"
              .value="${this.formCompanyId}"
              .options="${companyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCompanyId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.projects.labelCounterparty}"
              .value="${this.formCounterpartyId}"
              .options="${counterpartyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCounterpartyId = eventValue(e))}"
            ></app-select>
          </div>
          <div>
            <app-number-input
              label="${t.viewTexts.projects.labelBudgetRub}"
              .value="${this.formBudget}"
              min="0"
              step="100000"
              unit="₽"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formBudget = eventValue(e))}"
            ></app-number-input>
          </div>
          <div>
            <app-number-input
              label="${t.viewTexts.projects.labelProgressPct}"
              .value="${this.formProgress}"
              min="0"
              max="100"
              step="5"
              unit="%"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formProgress = eventValue(e))}"
            ></app-number-input>
          </div>
          <div class="col-span-2">
            <span class="meta-label">${t.viewTexts.projects.projectColorLabel}</span>
            <div class="color-swatches">
              ${PROJECT_COLOR_SWATCHES.map(
                (hex) => html`
                  <button
                    type="button"
                    class="color-swatch ${this.formColor === hex ? 'is-active' : ''}"
                    style="background: ${hex};"
                    @click="${() => (this.formColor = hex)}"
                  ></button>
                `
              )}
            </div>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.projects.labelDescription}"
              .value="${this.formDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formDescription = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${this.handleSaveProject}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteModal(t: ReturnType<typeof getTranslation>) {
    const tx = t.viewTexts;
    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingProject)}"
        size="sm"
        title="${tx.confirmDialogs.projectDelete.title}"
        action="${tx.confirmDialogs.projectDelete.action(this.deletingProject?.name || '')}"
        result="${tx.confirmDialogs.projectDelete.result}"
        .actionLabel="${tx.confirmSectionLabels.action}"
        .resultLabel="${tx.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingProject = null)}"
        @confirm="${() => {
          if (this.deletingProject) {
            store.deleteProject(this.deletingProject.id);
            this.deletingProject = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private openCreateModal() {
    this.editingId = null;
    this.formName = '';
    this.formKey = '';
    this.formDescription = '';
    this.formColor = '#6366f1';
    this.formStatus = 'planning';
    this.formDueDate = `${new Date().getFullYear()}-12-31`;
    this.formCompanyId = store.companies[0]?.id || '';
    this.formCounterpartyId = store.counterparties[0]?.id || '';
    this.formBudget = 5000000;
    this.formProgress = 0;
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(proj: Project) {
    this.editingId = proj.id;
    this.formName = proj.name;
    this.formKey = proj.key;
    this.formDescription = proj.description;
    this.formColor = proj.color;
    this.formStatus = proj.status || 'active';
    this.formDueDate = proj.dueDate;
    this.formCompanyId = proj.companyId || '';
    this.formCounterpartyId = proj.counterpartyId || '';
    this.formBudget = proj.budget || 0;
    this.formProgress = proj.progress;
    this.formError = '';
    this.modalOpen = true;
  }

  private handleSaveProject() {
    if (!this.formName.trim()) {
      this.formError = this.currentLang === 'ru' ? 'Обязательное поле' : 'Required';
      return;
    }

    const derivedKey =
      this.formKey.trim().toUpperCase() ||
      this.formName
        .trim()
        .replace(/[^A-Za-zА-Яа-я0-9]/g, '')
        .slice(0, 4)
        .toUpperCase() ||
      'PROJ';

    if (this.editingId) {
      const existing = this.projects.find((p) => p.id === this.editingId);
      store.updateProject({
        id: this.editingId,
        name: this.formName.trim(),
        key: derivedKey,
        description: this.formDescription.trim(),
        color: this.formColor,
        status: this.formStatus,
        dueDate: this.formDueDate || new Date().toISOString().slice(0, 10),
        companyId: this.formCompanyId || undefined,
        counterpartyId: this.formCounterpartyId || undefined,
        budget: Math.max(0, Number(this.formBudget) || 0),
        progress: Math.max(0, Math.min(100, Number(this.formProgress) || 0)),
        members: existing?.members || [],
      });
    } else {
      store.addProject({
        name: this.formName.trim(),
        key: derivedKey,
        description: this.formDescription.trim(),
        color: this.formColor,
        status: this.formStatus,
        dueDate: this.formDueDate || new Date().toISOString().slice(0, 10),
        companyId: this.formCompanyId || undefined,
        counterpartyId: this.formCounterpartyId || undefined,
        budget: Math.max(0, Number(this.formBudget) || 0),
        progress: Math.max(0, Math.min(100, Number(this.formProgress) || 0)),
        members: [],
      });
    }

    this.modalOpen = false;
  }
}
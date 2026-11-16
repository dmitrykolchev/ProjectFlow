import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import styles from './app-header.css';
import { iconBell, iconPlus, iconSearch, iconSun, iconMoon, iconMenu, iconZap } from '../../common/icons';
import '../../common/app-button/app-button';
import '../../common/app-entity-emblem/app-entity-emblem';
import type { EntityEmblemKind } from '../../common/app-entity-emblem/app-entity-emblem';

const DETAIL_ENTITY_MAP: Record<string, EntityEmblemKind> = {
  'project-detail': 'project',
  'task-detail': 'task',
  'requirement-detail': 'requirement',
  'company-detail': 'company',
  'counterparty-detail': 'counterparty',
  'contract-detail': 'contract',
  'calculation-detail': 'calculation',
  'employee-detail': 'employee',
};

@customElement('app-header')
export class AppHeader extends LitElement {
  @state() private activeView = store.activeView;
  @state() private selectedProjectId = store.selectedProjectId;
  @state() private detailProjectId = store.detailProjectId;
  @state() private detailContractId = store.detailContractId;
  @state() private detailTaskId = store.detailTaskId;
  @state() private detailRequirementId = store.detailRequirementId;
  @state() private detailCompanyId = store.detailCompanyId;
  @state() private detailCounterpartyId = store.detailCounterpartyId;
  @state() private detailCalculationId = store.detailCalculationId;
  @state() private detailEmployeeId = store.detailEmployeeId;
  @state() private searchQuery = store.searchQuery;
  @state() private currentLang = store.customization.language;
  @state() private theme = store.customization.theme;
  @state() private activityCount = store.activityLog.length;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => {
      this.syncState();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private syncState() {
    this.activeView = store.activeView;
    this.selectedProjectId = store.selectedProjectId;
    this.detailProjectId = store.detailProjectId;
    this.detailContractId = store.detailContractId;
    this.detailTaskId = store.detailTaskId;
    this.detailRequirementId = store.detailRequirementId;
    this.detailCompanyId = store.detailCompanyId;
    this.detailCounterpartyId = store.detailCounterpartyId;
    this.detailCalculationId = store.detailCalculationId;
    this.detailEmployeeId = store.detailEmployeeId;
    this.searchQuery = store.searchQuery;
    this.currentLang = store.customization.language;
    this.theme = store.customization.theme;
    this.activityCount = store.activityLog.length;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const activeProject = store.projects.find((p) => p.id === this.selectedProjectId);
    const projectName = activeProject ? activeProject.name : t.common.all;
    const detailProject =
      this.activeView === 'project-detail'
        ? store.projects.find((p) => p.id === this.detailProjectId)
        : undefined;
    const detailContract =
      this.activeView === 'contract-detail'
        ? store.contracts.find((c) => c.id === this.detailContractId)
        : undefined;
    const detailTask =
      this.activeView === 'task-detail'
        ? store.tasks.find((tk) => tk.id === this.detailTaskId)
        : undefined;
    const detailRequirement =
      this.activeView === 'requirement-detail'
        ? store.requirements.find((r) => r.id === this.detailRequirementId)
        : undefined;
    const detailCompany =
      this.activeView === 'company-detail'
        ? store.companies.find((c) => c.id === this.detailCompanyId)
        : undefined;
    const detailCounterparty =
      this.activeView === 'counterparty-detail'
        ? store.counterparties.find((c) => c.id === this.detailCounterpartyId)
        : undefined;
    const detailCalculation =
      this.activeView === 'calculation-detail'
        ? store.calculations.find((c) => c.id === this.detailCalculationId)
        : undefined;
    const detailEmployee =
      this.activeView === 'employee-detail'
        ? store.users.find((u) => u.id === this.detailEmployeeId)
        : undefined;

    const viewNames: Record<string, string> = {
      dashboard: t.navigation.dashboard,
      projects: t.navigation.projects,
      'project-detail': detailProject ? `${detailProject.key} · ${detailProject.name}` : t.navigation.projects,
      requirements: t.navigation.requirements,
      'requirement-detail': detailRequirement
        ? `${detailRequirement.code} · ${detailRequirement.title}`
        : t.navigation.requirements,
      kanban: t.navigation.kanban,
      'task-detail': detailTask ? `${detailTask.id} · ${detailTask.title}` : t.navigation.kanban,
      'knowledge-base': t.navigation.knowledgeBase,
      documents: t.navigation.documents,
      'project-chat': t.navigation.projectChat,
      gantt: t.navigation.gantt,
      grid: t.navigation.grid,
      calendar: t.navigation.calendar,
      analytics: t.navigation.analytics,
      companies: t.navigation.companies,
      'company-detail': detailCompany ? detailCompany.name : t.navigation.companies,
      employees: t.navigation.employees,
      'employee-detail': detailEmployee ? detailEmployee.name : t.navigation.employees,
      counterparties: t.navigation.counterparties,
      'counterparty-detail': detailCounterparty
        ? detailCounterparty.name
        : t.navigation.counterparties,
      contracts: t.navigation.contracts,
      'contract-detail': detailContract ? `${detailContract.number} · ${detailContract.title}` : t.navigation.contracts,
      calculations: t.navigation.calculations,
      'calculation-detail': detailCalculation
        ? detailCalculation.number
        : t.navigation.calculations,
      payments: t.navigation.payments,
      'time-tracking': t.navigation.timeTracking,
      expenses: t.navigation.expenses,
      settings: t.navigation.settings,
      storybook: t.navigation.storybook,
      'design-tokens': t.navigation.designTokens,
      'material-icons': t.navigation.materialIcons,
    };

    const detailEntity = DETAIL_ENTITY_MAP[this.activeView];

    return html`
      <header class="header-container">
        <div class="left-zone">
          <button
            class="mobile-menu-btn"
            @click="${() => store.toggleSidebar()}"
            aria-label="Toggle Navigation"
          >
            ${iconMenu(18)}
          </button>
          <div class="breadcrumbs">
            <span class="crumb-root">${t.navigation.projects}</span>
            <span class="crumb-separator">/</span>
            <span class="crumb-root">${projectName}</span>
            <span class="crumb-separator">/</span>
            <span class="crumb-current">
              ${detailEntity
                ? html`<app-entity-emblem
                    entity="${detailEntity}"
                    size="xs"
                    .color="${detailProject?.color || ''}"
                  ></app-entity-emblem>`
                : ''}
              <span class="crumb-current-text">${viewNames[this.activeView] || this.activeView}</span>
            </span>
          </div>
        </div>

        <div class="right-zone">
          <div class="search-wrapper">
            <span class="search-icon">${iconSearch(14)}</span>
            <input
              type="text"
              class="search-input"
              placeholder="${t.common.search}"
              .value="${this.searchQuery}"
              @input="${(e: Event) => store.setSearchQuery((e.target as HTMLInputElement).value)}"
            />
          </div>

          <button
            class="icon-action-btn"
            @click="${() => store.toggleTheme()}"
            title="${this.theme === 'cyberpunk' ? 'Cyberpunk → Dark' : this.theme === 'dark' ? 'Dark → Light' : 'Light → Cyberpunk'}"
            aria-label="Toggle Theme"
          >
            ${this.theme === 'cyberpunk' ? iconZap(16) : this.theme === 'dark' ? iconSun(16) : iconMoon(16)}
          </button>

          <button
            class="icon-action-btn"
            @click="${() => store.toggleActivityPanel()}"
            title="${t.activity.title}"
            aria-label="Activity Log"
          >
            ${iconBell(16)}
            ${this.activityCount > 0 ? html`<span class="badge-dot"></span>` : ''}
          </button>

          <app-button
            variant="primary"
            size="md"
            @click="${() => store.openCreateTaskModal()}"
          >
            <span slot="icon-start">${iconPlus(16)}</span>
            <span>${t.common.create}</span>
          </app-button>
        </div>
      </header>
    `;
  }
}

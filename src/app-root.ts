import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from './state/store';
import { ActiveView } from './types';
import { getTranslation } from './i18n';
import {
  iconDashboard,
  iconKanban,
  iconGantt,
  iconTable,
  iconCalendar,
  iconAnalytics,
  iconActivity,
  iconStorybook,
  iconLayers,
  iconSettings,
  iconFolder,
  iconBuilding,
  iconUsers,
  iconHandshake,
  iconFileText,
  iconClock,
  iconWallet,
  iconCreditCard,
  iconMessageSquare,
  iconBookOpen,
  iconFolderOpen,
  iconGrid,
} from './components/common/icons';
import './components/layout/app-sidebar/app-sidebar';
import './components/layout/sidebar-group/sidebar-group';
import './components/layout/sidebar-item/sidebar-item';
import './components/layout/app-header/app-header';
import './components/common/app-toast/app-toast';
import './components/common/app-activity-panel/app-activity-panel';
import './components/common/app-task-modal/app-task-modal';
import { eventValue } from './components/common/event-value';

const VIEW_LOADERS: Record<ActiveView, () => Promise<unknown>> = {
  dashboard: () => import('./components/views/app-dashboard/app-dashboard'),
  kanban: () => import('./components/views/app-kanban/app-kanban'),
  'task-detail': () => import('./components/views/app-task-detail/app-task-detail'),
  gantt: () => import('./components/views/app-gantt/app-gantt'),
  grid: () =>
    Promise.all([
      import('./components/views/app-data-grid/app-data-grid'),
      import('./components/views/data-grid-column/data-grid-column'),
    ]),
  calendar: () => import('./components/views/app-calendar/app-calendar'),
  analytics: () => import('./components/views/app-analytics/app-analytics'),
  projects: () => import('./components/views/app-projects/app-projects'),
  'project-detail': () => import('./components/views/app-project-detail/app-project-detail'),
  requirements: () => import('./components/views/app-requirements/app-requirements'),
  'requirement-detail': () =>
    import('./components/views/app-requirement-detail/app-requirement-detail'),
  'project-chat': () => import('./components/views/app-project-chat/app-project-chat'),
  'knowledge-base': () => import('./components/views/app-knowledge-base/app-knowledge-base'),
  documents: () => import('./components/views/app-documents/app-documents'),
  companies: () => import('./components/views/app-companies/app-companies'),
  'company-detail': () => import('./components/views/app-company-detail/app-company-detail'),
  employees: () => import('./components/views/app-employees/app-employees'),
  'employee-detail': () => import('./components/views/app-employee-detail/app-employee-detail'),
  counterparties: () => import('./components/views/app-counterparties/app-counterparties'),
  'counterparty-detail': () =>
    import('./components/views/app-counterparty-detail/app-counterparty-detail'),
  contracts: () => import('./components/views/app-contracts/app-contracts'),
  'contract-detail': () => import('./components/views/app-contract-detail/app-contract-detail'),
  calculations: () => import('./components/views/app-calculations/app-calculations'),
  payments: () => import('./components/views/app-payments/app-payments'),
  'time-tracking': () => import('./components/views/app-time-tracking/app-time-tracking'),
  expenses: () => import('./components/views/app-expenses/app-expenses'),
  settings: () => import('./components/views/app-settings/app-settings'),
  storybook: () => import('./components/views/app-storybook/app-storybook'),
  'design-tokens': () => import('./components/views/app-design-tokens/app-design-tokens'),
  'material-icons': () => import('./components/views/app-material-icons/app-material-icons'),
};

@customElement('app-root')
export class AppRoot extends LitElement {
  @state() private activeView: ActiveView = store.activeView;
  @state() private sidebarCollapsed: boolean = store.customization.sidebarCollapsed;
  @state() private currentLang = store.customization.language;
  @state() private taskCount = store.tasks.length;
  @state() private requirementsCount = store.requirements.length;
  @state() private chatCount = store.chatMessages.length;
  @state() private knowledgeCount = store.knowledgeArticles.length;
  @state() private documentCount = store.documents.length;
  @state() private loadedViews: Set<ActiveView> = new Set();

  private loadingViews: Set<ActiveView> = new Set();
  private unsubscribe?: () => void;

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
    this.sidebarCollapsed = store.customization.sidebarCollapsed;
    this.currentLang = store.customization.language;
    this.taskCount = store.tasks.length;
    this.requirementsCount = store.requirements.length;
    this.chatCount = store.chatMessages.length;
    this.knowledgeCount = store.knowledgeArticles.length;
    this.documentCount = store.documents.length;
    this.ensureViewLoaded(this.activeView);
  }

  private async ensureViewLoaded(view: ActiveView) {
    if (this.loadedViews.has(view) || this.loadingViews.has(view)) return;
    const loader = VIEW_LOADERS[view];
    if (!loader) return;
    this.loadingViews.add(view);
    try {
      await loader();
      const next = new Set(this.loadedViews);
      next.add(view);
      this.loadedViews = next;
    } finally {
      this.loadingViews.delete(view);
    }
  }

  static styles = css`
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      box-sizing: border-box;
      display: flex;
      width: 100%;
      max-width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-canvas, #090d16);
      color: var(--text-primary, #f8fafc);
    }

    .main-layout {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
    }

    .content-area {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-width: 0;
      width: 100%;
    }

    .view-loader {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: var(--text-muted, #64748b);
      font-size: 0.875rem;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 2.5px solid var(--border-subtle, #1e293b);
      border-top-color: var(--accent-primary, #6366f1);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  render() {
    const t = getTranslation(this.currentLang);
    const isViewReady = this.loadedViews.has(this.activeView);

    return html`
      <app-sidebar
        ?collapsed="${this.sidebarCollapsed}"
        .activeValue="${this.activeView === 'project-detail'
          ? 'projects'
          : this.activeView === 'requirement-detail'
          ? 'requirements'
          : this.activeView === 'task-detail'
          ? 'kanban'
          : this.activeView === 'contract-detail'
          ? 'contracts'
          : this.activeView === 'counterparty-detail'
          ? 'counterparties'
          : this.activeView === 'employee-detail'
          ? 'employees'
          : this.activeView === 'company-detail'
          ? 'companies'
          : this.activeView}"
        @sidebar-select="${this.handleSidebarSelect}"
      >
        <sidebar-group group-id="workspace" label="${t.navigation.groupWorkspace}">
          <sidebar-item
            value="dashboard"
            label="${t.navigation.dashboard}"
            .icon="${iconDashboard()}"
          ></sidebar-item>

          <sidebar-item
            value="projects"
            label="${t.navigation.projects}"
            .icon="${iconFolder()}"
          ></sidebar-item>

          <sidebar-item
            value="requirements"
            label="${t.navigation.requirements}"
            badge="${String(this.requirementsCount)}"
            .icon="${iconLayers()}"
          ></sidebar-item>

          <sidebar-item
            value="kanban"
            label="${t.navigation.kanban}"
            badge="${String(this.taskCount)}"
            .icon="${iconKanban()}"
          ></sidebar-item>

          <sidebar-item
            value="gantt"
            label="${t.navigation.gantt}"
            .icon="${iconGantt()}"
          ></sidebar-item>

          <sidebar-item
            value="time-tracking"
            label="${t.navigation.timeTracking}"
            .icon="${iconClock()}"
          ></sidebar-item>

          <sidebar-item
            value="expenses"
            label="${t.navigation.expenses}"
            .icon="${iconWallet()}"
          ></sidebar-item>

          <sidebar-item
            value="project-chat"
            label="${t.navigation.projectChat}"
            badge="${String(this.chatCount)}"
            .icon="${iconMessageSquare()}"
          ></sidebar-item>

          <sidebar-item
            value="knowledge-base"
            label="${t.navigation.knowledgeBase}"
            badge="${String(this.knowledgeCount)}"
            .icon="${iconBookOpen()}"
          ></sidebar-item>

          <sidebar-item
            value="documents"
            label="${t.navigation.documents}"
            badge="${String(this.documentCount)}"
            .icon="${iconFolderOpen()}"
          ></sidebar-item>
        </sidebar-group>

        <sidebar-group group-id="views" label="${t.navigation.groupPlanning}">
          <sidebar-item
            value="grid"
            label="${t.navigation.grid}"
            .icon="${iconTable()}"
          ></sidebar-item>

          <sidebar-item
            value="calendar"
            label="${t.navigation.calendar}"
            .icon="${iconCalendar()}"
          ></sidebar-item>

          <sidebar-item
            value="analytics"
            label="${t.navigation.analytics}"
            .icon="${iconAnalytics()}"
          ></sidebar-item>
        </sidebar-group>

        <sidebar-group group-id="directory" label="${t.navigation.groupDirectory}">
          <sidebar-item
            value="companies"
            label="${t.navigation.companies}"
            .icon="${iconBuilding()}"
          ></sidebar-item>

          <sidebar-item
            value="employees"
            label="${t.navigation.employees}"
            .icon="${iconUsers()}"
          ></sidebar-item>

          <sidebar-item
            value="counterparties"
            label="${t.navigation.counterparties}"
            .icon="${iconHandshake()}"
          ></sidebar-item>

          <sidebar-item
            value="contracts"
            label="${t.navigation.contracts}"
            .icon="${iconFileText()}"
          ></sidebar-item>

          <sidebar-item
            value="calculations"
            label="${t.navigation.calculations}"
            .icon="${iconTable()}"
          ></sidebar-item>

          <sidebar-item
            value="payments"
            label="${t.navigation.payments}"
            .icon="${iconCreditCard()}"
          ></sidebar-item>
        </sidebar-group>

        <sidebar-group group-id="system" label="${t.navigation.groupSystem}">
          <sidebar-item
            value="activity"
            label="${t.navigation.activity}"
            .icon="${iconActivity()}"
          ></sidebar-item>

          <sidebar-item
            value="storybook"
            label="${t.navigation.storybook}"
            .icon="${iconStorybook()}"
          ></sidebar-item>

          <sidebar-item
            value="material-icons"
            label="${t.navigation.materialIcons}"
            .icon="${iconGrid(18)}"
          ></sidebar-item>

          <sidebar-item
            value="design-tokens"
            label="${t.navigation.designTokens}"
            .icon="${iconLayers()}"
          ></sidebar-item>

          <sidebar-item
            value="settings"
            label="${t.navigation.settings}"
            .icon="${iconSettings()}"
          ></sidebar-item>
        </sidebar-group>
      </app-sidebar>

      <div class="main-layout">
        <app-header></app-header>

        <main class="content-area">
          ${!isViewReady
            ? html`
                <div class="view-loader">
                  <div class="spinner"></div>
                  <span>${t.common.loading}</span>
                </div>
              `
            : this.renderActiveView(t)}
        </main>
      </div>

      <!-- Modals and Overlays -->
      <app-task-modal></app-task-modal>
      <app-activity-panel></app-activity-panel>
      <app-toast></app-toast>
    `;
  }

  private renderActiveView(t: ReturnType<typeof getTranslation>) {
    switch (this.activeView) {
      case 'dashboard':
        return html`<app-dashboard></app-dashboard>`;
      case 'kanban':
        return html`<app-kanban></app-kanban>`;
      case 'task-detail':
        return html`<app-task-detail></app-task-detail>`;
      case 'gantt':
        return html`<app-gantt></app-gantt>`;
      case 'grid':
        return html`
          <app-data-grid>
            <data-grid-column field="id" header="${t.grid.columns.id}" width="110" min-width="80" sortable cell-type="key"></data-grid-column>
            <data-grid-column field="title" header="${t.grid.columns.title}" width="310" min-width="180" sortable cell-type="title"></data-grid-column>
            <data-grid-column field="status" header="${t.grid.columns.status}" width="145" sortable groupable cell-type="status"></data-grid-column>
            <data-grid-column field="priority" header="${t.grid.columns.priority}" width="135" sortable groupable cell-type="priority"></data-grid-column>
            <data-grid-column field="assigneeId" header="${t.grid.columns.assignee}" width="155" sortable groupable cell-type="assignee"></data-grid-column>
            <data-grid-column field="dates" header="${t.grid.columns.dates}" width="150" sortable cell-type="dates"></data-grid-column>
            <data-grid-column field="progress" header="${t.grid.columns.progress}" width="140" sortable cell-type="progress"></data-grid-column>
            <data-grid-column field="tags" header="${t.grid.columns.tags}" width="180" cell-type="tags"></data-grid-column>
          </app-data-grid>
        `;
      case 'calendar':
        return html`<app-calendar></app-calendar>`;
      case 'analytics':
        return html`<app-analytics></app-analytics>`;
      case 'projects':
        return html`<app-projects></app-projects>`;
      case 'project-detail':
        return html`<app-project-detail></app-project-detail>`;
      case 'requirements':
        return html`<app-requirements></app-requirements>`;
      case 'requirement-detail':
        return html`<app-requirement-detail></app-requirement-detail>`;
      case 'project-chat':
        return html`<app-project-chat></app-project-chat>`;
      case 'knowledge-base':
        return html`<app-knowledge-base></app-knowledge-base>`;
      case 'documents':
        return html`<app-documents></app-documents>`;
      case 'companies':
        return html`<app-companies></app-companies>`;
      case 'company-detail':
        return html`<app-company-detail></app-company-detail>`;
      case 'employees':
        return html`<app-employees></app-employees>`;
      case 'employee-detail':
        return html`<app-employee-detail></app-employee-detail>`;
      case 'counterparties':
        return html`<app-counterparties></app-counterparties>`;
      case 'counterparty-detail':
        return html`<app-counterparty-detail></app-counterparty-detail>`;
      case 'contracts':
        return html`<app-contracts></app-contracts>`;
      case 'contract-detail':
        return html`<app-contract-detail></app-contract-detail>`;
      case 'calculations':
        return html`<app-calculations></app-calculations>`;
      case 'payments':
        return html`<app-payments></app-payments>`;
      case 'time-tracking':
        return html`<app-time-tracking></app-time-tracking>`;
      case 'expenses':
        return html`<app-expenses></app-expenses>`;
      case 'settings':
        return html`<app-settings></app-settings>`;
      case 'storybook':
        return html`<app-storybook></app-storybook>`;
      case 'design-tokens':
        return html`<app-design-tokens></app-design-tokens>`;
      case 'material-icons':
        return html`<app-material-icons></app-material-icons>`;
      default:
        return html`<app-dashboard></app-dashboard>`;
    }
  }

  private handleSidebarSelect(e: CustomEvent<{ value: string }>) {
    const val = eventValue(e);
    if (val === 'activity') {
      store.toggleActivityPanel();
      return;
    }
    store.setActiveView(val as ActiveView);
  }
}
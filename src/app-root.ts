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
  iconSettings,
} from './components/common/icons';
import './components/layout/app-sidebar/app-sidebar';
import './components/layout/sidebar-item/sidebar-item';
import './components/layout/app-header/app-header';
import './components/common/app-toast/app-toast';
import './components/common/app-activity-panel/app-activity-panel';
import './components/common/app-task-modal/app-task-modal';

const VIEW_LOADERS: Record<ActiveView, () => Promise<unknown>> = {
  dashboard: () => import('./components/views/app-dashboard/app-dashboard'),
  kanban: () => import('./components/views/app-kanban/app-kanban'),
  gantt: () => import('./components/views/app-gantt/app-gantt'),
  grid: () =>
    Promise.all([
      import('./components/views/app-data-grid/app-data-grid'),
      import('./components/views/data-grid-column/data-grid-column'),
    ]),
  calendar: () => import('./components/views/app-calendar/app-calendar'),
  analytics: () => import('./components/views/app-analytics/app-analytics'),
  settings: () => import('./components/views/app-settings/app-settings'),
  storybook: () => import('./components/views/app-storybook/app-storybook'),
};

@customElement('app-root')
export class AppRoot extends LitElement {
  @state() private activeView: ActiveView = store.activeView;
  @state() private sidebarCollapsed: boolean = store.customization.sidebarCollapsed;
  @state() private currentLang = store.customization.language;
  @state() private taskCount = store.tasks.length;
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
        .activeValue="${this.activeView}"
        @sidebar-select="${this.handleSidebarSelect}"
      >
        <div class="nav-section-title">${t.navigation.projects}</div>

        <sidebar-item
          value="dashboard"
          label="${t.navigation.dashboard}"
          .icon="${iconDashboard()}"
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

        <div class="nav-section-title" style="margin-top: 0.75rem;">${t.common.actions}</div>

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
          value="settings"
          label="${t.navigation.settings}"
          .icon="${iconSettings()}"
        ></sidebar-item>
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
      case 'settings':
        return html`<app-settings></app-settings>`;
      case 'storybook':
        return html`<app-storybook></app-storybook>`;
      default:
        return html`<app-dashboard></app-dashboard>`;
    }
  }

  private handleSidebarSelect(e: CustomEvent<{ value: string }>) {
    const val = e.detail.value;
    if (val === 'activity') {
      store.toggleActivityPanel();
      return;
    }
    store.setActiveView(val as ActiveView);
  }
}

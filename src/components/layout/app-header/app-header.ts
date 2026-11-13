import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import styles from './app-header.css';
import { iconBell, iconPlus, iconSearch, iconSun, iconMoon, iconMenu } from '../../common/icons';
import '../../common/app-button/app-button';

@customElement('app-header')
export class AppHeader extends LitElement {
  @state() private activeView = store.activeView;
  @state() private selectedProjectId = store.selectedProjectId;
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
    this.searchQuery = store.searchQuery;
    this.currentLang = store.customization.language;
    this.theme = store.customization.theme;
    this.activityCount = store.activityLog.length;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const activeProject = store.projects.find((p) => p.id === this.selectedProjectId);
    const projectName = activeProject ? activeProject.name : t.common.all;

    const viewNames: Record<string, string> = {
      dashboard: t.navigation.dashboard,
      kanban: t.navigation.kanban,
      gantt: t.navigation.gantt,
      grid: t.navigation.grid,
      calendar: t.navigation.calendar,
      analytics: t.navigation.analytics,
      settings: t.navigation.settings,
      storybook: t.navigation.storybook,
    };

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
            <span class="crumb-current">${viewNames[this.activeView] || this.activeView}</span>
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
            title="Theme"
            aria-label="Toggle Theme"
          >
            ${this.theme === 'dark' ? iconSun(16) : iconMoon(16)}
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

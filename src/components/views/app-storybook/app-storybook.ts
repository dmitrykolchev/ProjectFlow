import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ComponentStoryMeta } from '../../../types/storybook';
import styles from './app-storybook.css';

// Import all component story definitions
import buttonMeta from '../../common/app-button/app-button.story';
import buttonGroupMeta from '../../common/app-button-group/app-button-group.story';
import toggleButtonMeta from '../../common/app-toggle-button/app-toggle-button.story';
import dropdownButtonMeta from '../../common/app-dropdown-button/app-dropdown-button.story';
import splitButtonMeta from '../../common/app-split-button/app-split-button.story';
import menuMeta from '../../common/app-menu/app-menu.story';
import badgeMeta from '../../common/app-badge/app-badge.story';
import segmentedSwitchMeta from '../../common/app-segmented-switch/app-segmented-switch.story';
import radioGroupMeta from '../../common/app-radio-group/app-radio-group.story';
import inputMeta from '../../common/app-input/app-input.story';
import textareaMeta from '../../common/app-textarea/app-textarea.story';
import numberMeta from '../../common/app-number-input/app-number-input.story';
import dateMeta from '../../common/app-date-input/app-date-input.story';
import selectMeta from '../../common/app-select/app-select.story';
import comboboxMeta from '../../common/app-combobox/app-combobox.story';
import checkboxMeta from '../../common/app-checkbox/app-checkbox.story';
import switchMeta from '../../common/app-switch/app-switch.story';
import modalMeta from '../../common/app-modal/app-modal.story';
import modalPortalMeta from '../../common/app-modal-portal/app-modal-portal.story';
import toastMeta from '../../common/app-toast/app-toast.story';
import activityMeta from '../../common/app-activity-panel/app-activity-panel.story';
import taskModalMeta from '../../common/app-task-modal/app-task-modal.story';

import headerMeta from '../../layout/app-header/app-header.story';
import sidebarMeta from '../../layout/app-sidebar/app-sidebar.story';
import sidebarGroupMeta from '../../layout/sidebar-group/sidebar-group.story';
import sidebarItemMeta from '../../layout/sidebar-item/sidebar-item.story';

import metricCardMeta from '../../dashboard/app-metric-card/app-metric-card.story';
import chartCardMeta from '../../dashboard/app-chart-card/app-chart-card.story';
import projectProgressMeta from '../../dashboard/app-project-progress/app-project-progress.story';
import projectOverviewMeta from '../../dashboard/app-project-overview/app-project-overview.story';

import dashboardMeta from '../app-dashboard/app-dashboard.story';
import kanbanMeta from '../app-kanban/app-kanban.story';
import ganttMeta from '../app-gantt/app-gantt.story';
import dataGridMeta from '../app-data-grid/app-data-grid.story';
import dataGridColumnMeta from '../data-grid-column/data-grid-column.story';
import calendarMeta from '../app-calendar/app-calendar.story';
import analyticsMeta from '../app-analytics/app-analytics.story';
import projectsMeta from '../app-projects/app-projects.story';
import projectDetailMeta from '../app-project-detail/app-project-detail.story';
import projectChatMeta from '../app-project-chat/app-project-chat.story';
import companiesMeta from '../app-companies/app-companies.story';
import employeesMeta from '../app-employees/app-employees.story';
import employeeDetailMeta from '../app-employee-detail/app-employee-detail.story';
import counterpartiesMeta from '../app-counterparties/app-counterparties.story';
import counterpartyDetailMeta from '../app-counterparty-detail/app-counterparty-detail.story';
import contractsMeta from '../app-contracts/app-contracts.story';
import contractDetailMeta from '../app-contract-detail/app-contract-detail.story';
import calculationsMeta from '../app-calculations/app-calculations.story';
import paymentsMeta from '../app-payments/app-payments.story';
import timeTrackingMeta from '../app-time-tracking/app-time-tracking.story';
import expensesMeta from '../app-expenses/app-expenses.story';
import settingsMeta from '../app-settings/app-settings.story';

const ALL_STORIES: ComponentStoryMeta[] = [
  buttonMeta,
  buttonGroupMeta,
  toggleButtonMeta,
  dropdownButtonMeta,
  splitButtonMeta,
  menuMeta,
  badgeMeta,
  segmentedSwitchMeta,
  radioGroupMeta,
  checkboxMeta,
  switchMeta,
  inputMeta,
  textareaMeta,
  numberMeta,
  dateMeta,
  selectMeta,
  comboboxMeta,
  modalMeta,
  modalPortalMeta,
  taskModalMeta,
  toastMeta,
  activityMeta,
  headerMeta,
  sidebarMeta,
  sidebarGroupMeta,
  sidebarItemMeta,
  metricCardMeta,
  chartCardMeta,
  projectProgressMeta,
  projectOverviewMeta,
  dashboardMeta,
  kanbanMeta,
  ganttMeta,
  dataGridMeta,
  dataGridColumnMeta,
  calendarMeta,
  analyticsMeta,
  projectsMeta,
  projectDetailMeta,
  projectChatMeta,
  companiesMeta,
  employeesMeta,
  employeeDetailMeta,
  counterpartiesMeta,
  counterpartyDetailMeta,
  contractsMeta,
  contractDetailMeta,
  calculationsMeta,
  paymentsMeta,
  timeTrackingMeta,
  expensesMeta,
  settingsMeta,
];

@customElement('app-storybook')
export class AppStorybook extends LitElement {
  @state() private selectedComponentName: string = 'app-button';
  @state() private searchQuery: string = '';
  @state() private activeTab: 'preview' | 'code' | 'props' = 'preview';
  @state() private viewportWidth: 'full' | 'tablet' | 'mobile' = 'full';

  static styles = styles;

  private get selectedMeta(): ComponentStoryMeta {
    return (
      ALL_STORIES.find((s) => s.component === this.selectedComponentName) ||
      ALL_STORIES[0]
    );
  }

  render() {
    const meta = this.selectedMeta;
    const query = this.searchQuery.toLowerCase().trim();

    const filteredStories = ALL_STORIES.filter((s) => {
      if (!query) return true;
      return (
        s.title.toLowerCase().includes(query) ||
        s.component.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    });

    const categories = Array.from(new Set(filteredStories.map((s) => s.category || 'General')));

    const viewportMaxWidth =
      this.viewportWidth === 'mobile'
        ? '375px'
        : this.viewportWidth === 'tablet'
        ? '768px'
        : '100%';

    return html`
      <div class="storybook-layout">
        <!-- Sidebar -->
        <aside class="sb-sidebar">
          <div class="sb-header">
            <div class="sb-brand">
              <span class="sb-logo-badge">STORYBOOK</span>
              <span class="sb-title">Lit Components (${ALL_STORIES.length})</span>
            </div>
            <input
              type="text"
              class="sb-search-box"
              placeholder="Поиск по компонентам..."
              .value="${this.searchQuery}"
              @input="${(e: InputEvent) => {
                this.searchQuery = (e.target as HTMLInputElement).value;
              }}"
            />
          </div>

          <div class="sb-nav">
            ${categories.map((cat) => {
              const catStories = filteredStories.filter((s) => (s.category || 'General') === cat);
              return html`
                <div class="sb-group">
                  <span class="sb-group-title">${cat}</span>
                  ${catStories.map((story) => {
                    const isSelected = story.component === this.selectedComponentName;
                    return html`
                      <div
                        class="sb-item ${isSelected ? 'is-selected' : ''}"
                        @click="${() => (this.selectedComponentName = story.component)}"
                      >
                        <span>${story.title.split('/')[1] || story.title}</span>
                        <span class="sb-item-count">${story.stories.length}</span>
                      </div>
                    `;
                  })}
                </div>
              `;
            })}
          </div>
        </aside>

        <!-- Canvas Area -->
        <main class="sb-canvas-area">
          <header class="sb-canvas-toolbar">
            <div class="sb-meta-header">
              <div class="sb-component-title">
                <span>${meta.title}</span>
                <span class="sb-tag">&lt;${meta.component}&gt;</span>
              </div>
              <div class="sb-component-desc">${meta.description}</div>
            </div>

            <div class="sb-viewports-controls">
              <button
                class="sb-tool-btn ${this.viewportWidth === 'full' ? 'is-active' : ''}"
                @click="${() => (this.viewportWidth = 'full')}"
                title="Desktop 100%"
              >
                100%
              </button>
              <button
                class="sb-tool-btn ${this.viewportWidth === 'tablet' ? 'is-active' : ''}"
                @click="${() => (this.viewportWidth = 'tablet')}"
                title="Tablet 768px"
              >
                768px
              </button>
              <button
                class="sb-tool-btn ${this.viewportWidth === 'mobile' ? 'is-active' : ''}"
                @click="${() => (this.viewportWidth = 'mobile')}"
                title="Mobile 375px"
              >
                375px
              </button>
            </div>
          </header>

          <div class="sb-tabs-row">
            <button
              class="sb-tab ${this.activeTab === 'preview' ? 'is-active' : ''}"
              @click="${() => (this.activeTab = 'preview')}"
            >
              Stories (${meta.stories.length})
            </button>
            <button
              class="sb-tab ${this.activeTab === 'code' ? 'is-active' : ''}"
              @click="${() => (this.activeTab = 'code')}"
            >
              Код и импорт
            </button>
            <button
              class="sb-tab ${this.activeTab === 'props' ? 'is-active' : ''}"
              @click="${() => (this.activeTab = 'props')}"
            >
              Спецификация API
            </button>
          </div>

          <div class="sb-canvas-body">
            <div class="sb-viewport-wrapper" style="max-width: ${viewportMaxWidth};">
              ${this.activeTab === 'preview'
                ? html`
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                      ${meta.stories.map(
                        (story) => html`
                          <div class="sb-story-card">
                            <div class="sb-story-header">
                              <div>
                                <span class="sb-story-name">${story.name}</span>
                                ${story.description
                                  ? html`<div class="sb-story-desc">${story.description}</div>`
                                  : ''}
                              </div>
                            </div>
                            <div class="sb-story-stage">
                              ${story.render()}
                            </div>
                          </div>
                        `
                      )}
                    </div>
                  `
                : this.activeTab === 'code'
                ? this.renderCodeSnippet(meta)
                : this.renderPropsDocs(meta)}
            </div>
          </div>
        </main>
      </div>
    `;
  }

  private renderCodeSnippet(meta: ComponentStoryMeta) {
    const pascalName = meta.component
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    const isCommon =
      meta.category !== 'Dashboard' &&
      meta.category !== 'Layout' &&
      meta.category !== 'Views';

    const importLine = isCommon
      ? `import { ${pascalName} } from '@/src/components/common';`
      : `import '@/src/components/${
          meta.category === 'Dashboard'
            ? 'dashboard'
            : meta.category === 'Layout'
            ? 'layout'
            : 'views'
        }/${meta.component}/${meta.component}';`;

    const importSnippet = `// TypeScript / Lit
${importLine}

// HTML Template
<${meta.component}></${meta.component}>`;

    return html`
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <h3 style="font-size: 1rem; font-weight: 600;">Как использовать компонент</h3>
        <pre class="sb-code-box">${importSnippet}</pre>
        <p style="font-size: 0.8125rem; color: var(--text-secondary, #94a3b8);">
          Все компоненты построены на чистом Lit, инкапсулируют стили через Shadow DOM и модульный CSS,
          и реагируют на кастомные свойства CSS темы приложения.
        </p>
      </div>
    `;
  }

  private renderPropsDocs(meta: ComponentStoryMeta) {
    return html`
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        <h3 style="font-size: 1rem; font-weight: 600;">Спецификация &lt;${meta.component}&gt;</h3>
        <table class="sb-props-table">
          <thead>
            <tr>
              <th>Свойство / Аттрибут</th>
              <th>Тип</th>
              <th>По умолчанию</th>
              <th>Описание</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="sb-prop-name">disabled</span></td>
              <td><span class="sb-prop-type">boolean</span></td>
              <td>false</td>
              <td>Отключает интерактивность компонента</td>
            </tr>
            <tr>
              <td><span class="sb-prop-name">size</span></td>
              <td><span class="sb-prop-type">'sm' | 'md' | 'lg'</span></td>
              <td>'md'</td>
              <td>Размер и визуальная плотность элемента</td>
            </tr>
            <tr>
              <td><span class="sb-prop-name">variant</span></td>
              <td><span class="sb-prop-type">string</span></td>
              <td>'default'</td>
              <td>Визуальная тема стиля компонента</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }
}

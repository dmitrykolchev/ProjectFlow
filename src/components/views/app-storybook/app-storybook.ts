import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { buildSnippet, getComponentProps } from '../../../domain/component-meta';
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
import entitySelectorMeta from '../../common/app-entity-selector/app-entity-selector.story';
import comboboxMeta from '../../common/app-combobox/app-combobox.story';
import checkboxMeta from '../../common/app-checkbox/app-checkbox.story';
import switchMeta from '../../common/app-switch/app-switch.story';
import modalMeta from '../../common/app-modal/app-modal.story';
import modalPortalMeta from '../../common/app-modal-portal/app-modal-portal.story';
import toastMeta from '../../common/app-toast/app-toast.story';
import activityMeta from '../../common/app-activity-panel/app-activity-panel.story';
import taskModalMeta from '../../common/app-task-modal/app-task-modal.story';
import emptyStateMeta from '../../common/app-empty-state/app-empty-state.story';
import kpiStripMeta from '../../common/app-kpi-strip/app-kpi-strip.story';
import sectionCardMeta from '../../common/app-section-card/app-section-card.story';
import statusChipMeta from '../../common/app-status-chip/app-status-chip.story';
import filterBarMeta from '../../common/app-filter-bar/app-filter-bar.story';
import formGridMeta from '../../common/app-form-grid/app-form-grid.story';
import confirmDialogMeta from '../../common/app-confirm-dialog/app-confirm-dialog.story';
import metaGridMeta from '../../common/app-meta-grid/app-meta-grid.story';
import progressBarMeta from '../../common/app-progress-bar/app-progress-bar.story';
import avatarMeta from '../../common/app-avatar/app-avatar.story';
import moneyMeta from '../../common/app-money/app-money.story';
import paginationMeta from '../../common/app-pagination/app-pagination.story';
import fileDropzoneMeta from '../../common/app-file-dropzone/app-file-dropzone.story';
import documentPreviewerMeta from '../../common/app-document-previewer/app-document-previewer.story';
import taskAiPanelMeta from '../../common/app-task-ai-panel/app-task-ai-panel.story';
import projectRequirementsMeta from '../../common/app-project-requirements/app-project-requirements.story';

import headerMeta from '../../layout/app-header/app-header.story';
import sidebarMeta from '../../layout/app-sidebar/app-sidebar.story';
import sidebarGroupMeta from '../../layout/sidebar-group/sidebar-group.story';
import sidebarItemMeta from '../../layout/sidebar-item/sidebar-item.story';
import pageHeaderMeta from '../../common/app-page-header/app-page-header.story';

import metricCardMeta from '../../dashboard/app-metric-card/app-metric-card.story';
import chartCardMeta from '../../dashboard/app-chart-card/app-chart-card.story';
import projectProgressMeta from '../../dashboard/app-project-progress/app-project-progress.story';
import projectOverviewMeta from '../../dashboard/app-project-overview/app-project-overview.story';

import dashboardMeta from '../app-dashboard/app-dashboard.story';
import kanbanMeta from '../app-kanban/app-kanban.story';
import taskDetailMeta from '../app-task-detail/app-task-detail.story';
import ganttMeta from '../app-gantt/app-gantt.story';
import dataGridMeta from '../app-data-grid/app-data-grid.story';
import dataGridColumnMeta from '../data-grid-column/data-grid-column.story';
import calendarMeta from '../app-calendar/app-calendar.story';
import analyticsMeta from '../app-analytics/app-analytics.story';
import projectsMeta from '../app-projects/app-projects.story';
import projectDetailMeta from '../app-project-detail/app-project-detail.story';
import requirementsMeta from '../app-requirements/app-requirements.story';
import requirementDetailMeta from '../app-requirement-detail/app-requirement-detail.story';
import projectChatMeta from '../app-project-chat/app-project-chat.story';
import knowledgeBaseMeta from '../app-knowledge-base/app-knowledge-base.story';
import documentsMeta from '../app-documents/app-documents.story';
import companiesMeta from '../app-companies/app-companies.story';
import companyDetailMeta from '../app-company-detail/app-company-detail.story';
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
  entitySelectorMeta,
  comboboxMeta,
  modalMeta,
  modalPortalMeta,
  taskModalMeta,
  emptyStateMeta,
  kpiStripMeta,
  sectionCardMeta,
  statusChipMeta,
  filterBarMeta,
  formGridMeta,
  confirmDialogMeta,
  metaGridMeta,
  progressBarMeta,
  avatarMeta,
  moneyMeta,
  paginationMeta,
  fileDropzoneMeta,
  documentPreviewerMeta,
  taskAiPanelMeta,
  projectRequirementsMeta,
  toastMeta,
  activityMeta,
  headerMeta,
  sidebarMeta,
  sidebarGroupMeta,
  sidebarItemMeta,
  pageHeaderMeta,
  metricCardMeta,
  chartCardMeta,
  projectProgressMeta,
  projectOverviewMeta,
  dashboardMeta,
  kanbanMeta,
  taskDetailMeta,
  ganttMeta,
  dataGridMeta,
  dataGridColumnMeta,
  calendarMeta,
  analyticsMeta,
  projectsMeta,
  projectDetailMeta,
  requirementsMeta,
  requirementDetailMeta,
  projectChatMeta,
  knowledgeBaseMeta,
  documentsMeta,
  companiesMeta,
  companyDetailMeta,
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
  @state() private viewportWidth: 'full' | 'tablet' | 'mobile' = 'full';
  @state() private playgroundCode: string = buildSnippet('app-button');

  /** User edits per component, preserved while browsing the storybook. */
  private playgroundEdits: Map<string, string> = new Map();

  static styles = styles;

  private get selectedMeta(): ComponentStoryMeta {
    return (
      ALL_STORIES.find((s) => s.component === this.selectedComponentName) ||
      ALL_STORIES[0]
    );
  }

  private selectComponent(name: string) {
    this.selectedComponentName = name;
    this.playgroundCode = this.playgroundEdits.get(name) ?? buildSnippet(name);
  }

  private handleEditorInput(value: string) {
    this.playgroundCode = value;
    this.playgroundEdits.set(this.selectedComponentName, value);
  }

  private resetPlayground() {
    const tag = this.selectedComponentName;
    this.playgroundEdits.delete(tag);
    this.playgroundCode = buildSnippet(tag);
  }

  private async copyPlayground() {
    const t = getTranslation(store.customization.language);
    let ok = false;
    try {
      await navigator.clipboard.writeText(this.playgroundCode);
      ok = true;
    } catch {
      // Fallback for contexts where the async clipboard API is unavailable.
      const ta = document.createElement('textarea');
      ta.value = this.playgroundCode;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
    }
    store.addNotification(
      ok ? 'success' : 'warning',
      t.viewTexts.storybook.copyBtn,
      ok ? t.viewTexts.storybook.copiedToast : t.viewTexts.storybook.copyFailedToast,
    );
  }

  render() {
    const t = getTranslation(store.customization.language);
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
              placeholder="${t.viewTexts.storybook.searchPlaceholder}"
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
                        @click="${() => this.selectComponent(story.component)}"
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

          <div class="sb-canvas-body">
            <div class="sb-viewport-wrapper" style="max-width: ${viewportMaxWidth};">
              <!-- Stories -->
              <section class="sb-section">
                <h3 class="sb-section-title">${t.viewTexts.storybook.storiesSection(meta.stories.length)}</h3>
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
              </section>

              <!-- Live Playground -->
              <section class="sb-section">
                <div class="sb-section-head">
                  <h3 class="sb-section-title">${t.viewTexts.storybook.playgroundTitle}</h3>
                  <div class="sb-playground-actions">
                    <button class="sb-tool-btn" @click="${() => this.resetPlayground()}">
                      ${t.viewTexts.storybook.resetBtn}
                    </button>
                    <button class="sb-tool-btn" @click="${() => this.copyPlayground()}">
                      ${t.viewTexts.storybook.copyBtn}
                    </button>
                  </div>
                </div>
                <pre class="sb-import-line">${this.buildImportLine(meta)}</pre>
                <div class="sb-playground-grid">
                  <div class="sb-editor-col">
                    <span class="sb-col-label">${t.viewTexts.storybook.editorLabel}</span>
                    <textarea
                      class="sb-code-editor"
                      spellcheck="false"
                      .value="${this.playgroundCode}"
                      @input="${(e: InputEvent) =>
                        this.handleEditorInput((e.target as HTMLTextAreaElement).value)}"
                    ></textarea>
                  </div>
                  <div class="sb-preview-col">
                    <span class="sb-col-label">${t.viewTexts.storybook.previewLabel}</span>
                    <div class="sb-preview-stage" .innerHTML="${this.playgroundCode}"></div>
                  </div>
                </div>
              </section>

              <!-- API Specification -->
              ${this.renderApiSpec(meta, t)}
            </div>
          </div>
        </main>
      </div>
    `;
  }

  private buildImportLine(meta: ComponentStoryMeta): string {
    const pascalName = meta.component
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    const isCommon =
      meta.category !== 'Dashboard' &&
      meta.category !== 'Layout' &&
      meta.category !== 'Views';

    return isCommon
      ? `import { ${pascalName} } from '@/src/components/common';`
      : `import '@/src/components/${
          meta.category === 'Dashboard'
            ? 'dashboard'
            : meta.category === 'Layout'
              ? 'layout'
              : 'views'
        }/${meta.component}/${meta.component}';`;
  }

  private renderApiSpec(meta: ComponentStoryMeta, t: ReturnType<typeof getTranslation>) {
    const props = getComponentProps(meta.component);
    const doc = meta.propsDoc || {};

    return html`
      <section class="sb-section">
        <div class="sb-section-head">
          <h3 class="sb-section-title">${t.viewTexts.storybook.apiSpecTitle(meta.component)}</h3>
          ${props.length > 0
            ? html`<span class="sb-props-count">${t.viewTexts.storybook.propsCount(props.length)}</span>`
            : ''}
        </div>

        ${props.length === 0
          ? html`<p class="sb-no-props">${t.viewTexts.storybook.noProps}</p>`
          : html`
              <table class="sb-props-table">
                <thead>
                  <tr>
                    <th>${t.viewTexts.storybook.thProp}</th>
                    <th>${t.viewTexts.storybook.thAttr}</th>
                    <th>${t.viewTexts.storybook.thType}</th>
                    <th>${t.viewTexts.storybook.thDefault}</th>
                    <th>${t.viewTexts.storybook.thDescription}</th>
                  </tr>
                </thead>
                <tbody>
                  ${props.map(
                    (p) => html`
                      <tr>
                        <td><span class="sb-prop-name">${p.prop}</span></td>
                        <td>
                          ${p.attribute
                            ? html`<code class="sb-prop-attr">${p.attribute}</code>`
                            : html`<span class="sb-prop-only">.prop</span>`}
                        </td>
                        <td><span class="sb-prop-type">${p.type}</span></td>
                        <td><code class="sb-prop-default">${p.defaultValue || '—'}</code></td>
                        <td>${doc[p.prop] || ''}</td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            `}
      </section>
    `;
  }
}

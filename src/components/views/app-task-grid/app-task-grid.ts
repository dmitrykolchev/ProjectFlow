import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { iconFilter, iconTable } from '../../common/icons';
import '../../common/app-page-header/app-page-header';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-toggle-button/app-toggle-button';
import '../../common/app-filter-bar/app-filter-bar';
import '../app-data-grid/app-data-grid';
import '../../common/app-data-grid-column/app-data-grid-column';
import { mapProjectOptions, mapUserOptions } from '../../common/entity-selector-options';
import { eventValue } from '../../common/event-value';
import styles from './app-task-grid.css';

/**
 * The task table view. Canonical skeleton order: page header, display-mode switcher row (the
 * Standard/Compact density app-segmented-switch size="sm" plus the filter toggle), the filter bar
 * (search 280px with the project, status, priority and assignee filters bound to the store task
 * filters), and the data representation: app-data-grid in store mode inside the framed card. The
 * grid keeps its own toolbar (bulk actions, grouping, column menu, export) and hides its internal
 * density switch through the hide-density-switch hook because the view owns the mode row.
 */
@customElement('app-task-grid')
export class AppTaskGrid extends LitElement {
  static styles = styles;

  @state() private currentLang = store.customization.language;
  @state() private density = store.customization.density;
  @state() private filterVisible: boolean = true;
  @state() private searchQuery = store.searchQuery;
  @state() private projectFilter = store.selectedProjectId;
  @state() private statusFilter = store.filterStatus;
  @state() private priorityFilter = store.filterPriority;
  @state() private assigneeFilter = store.filterAssignee;

  private unsubscribe: (() => void) | null = null;

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
    this.currentLang = store.customization.language;
    this.density = store.customization.density;
    this.searchQuery = store.searchQuery;
    this.projectFilter = store.selectedProjectId;
    this.statusFilter = store.filterStatus;
    this.priorityFilter = store.filterPriority;
    this.assigneeFilter = store.filterAssignee;
  }

  render() {
    const t = getTranslation(this.currentLang);

    const projectOptions = [
      { value: 'all', label: t.viewTexts.taskGrid.filterAllProjects },
      ...mapProjectOptions(store.projects, t),
    ];

    const assigneeOptions = [
      { value: 'all', label: t.viewTexts.taskGrid.filterAllAssignees },
      ...mapUserOptions(store.users, t),
    ];

    const statusOptions = [
      { value: 'all', label: t.viewTexts.taskGrid.filterAllStatuses },
      { value: 'backlog', label: t.status.backlog },
      { value: 'todo', label: t.status.todo },
      { value: 'in_progress', label: t.status.in_progress },
      { value: 'review', label: t.status.review },
      { value: 'done', label: t.status.done },
    ];

    const priorityOptions = [
      { value: 'all', label: t.viewTexts.taskGrid.filterAllPriorities },
      { value: 'low', label: t.priority.low },
      { value: 'medium', label: t.priority.medium },
      { value: 'high', label: t.priority.high },
      { value: 'urgent', label: t.priority.urgent },
    ];

    return html`
      <app-page-header
        title="${t.navigation.grid}"
        subtitle="${t.viewTexts.pageSubtitles.grid}"
      >
        <span slot="icon">${iconTable(28)}</span>
      </app-page-header>

      <div class="mode-row">
        <app-segmented-switch
          size="sm"
          title="${t.grid.densitySwitchTitle}"
          .value="${this.density === 'compact' ? 'compact' : 'standard'}"
          .options="${[
            { value: 'standard', label: t.grid.standardMode },
            { value: 'compact', label: t.grid.compactMode },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            store.setActivePage(1, false);
            store.setViewMode('grid', eventValue(e));
            store.setDensity(eventValue(e) === 'compact' ? 'compact' : 'comfortable');
          }}"
        ></app-segmented-switch>

        <app-toggle-button
          size="sm"
          .pressed="${this.filterVisible}"
          @change="${(e: CustomEvent<{ pressed: boolean }>) => (this.filterVisible = e.detail.pressed)}"
        >
          <span slot="icon-start">${iconFilter(14)}</span>
          <span>${t.common.filterToggle}</span>
        </app-toggle-button>
      </div>

      ${this.filterVisible
        ? html`<app-filter-bar
            style="--filter-search-min: 280px; --filter-search-max: 280px;"
            placeholder="${t.grid.searchPlaceholder}"
            .searchValue="${this.searchQuery}"
            show-reset
            .filters="${[
              { key: 'project', type: 'entity', options: projectOptions },
              { key: 'status', options: statusOptions },
              { key: 'priority', options: priorityOptions },
              { key: 'assignee', type: 'entity', options: assigneeOptions },
            ]}"
            .values="${{
              project: this.projectFilter,
              status: this.statusFilter,
              priority: this.priorityFilter,
              assignee: this.assigneeFilter,
            }}"
            @search-change="${(e: CustomEvent<{ value: string }>) => {
              store.setSearchQuery(eventValue(e));
              store.setActivePage(1, false);
            }}"
            @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
              const val = eventValue(e);
              if (e.detail.key === 'project') store.selectProject(val);
              if (e.detail.key === 'status') store.setFilterStatus(val);
              if (e.detail.key === 'priority') store.setFilterPriority(val);
              if (e.detail.key === 'assignee') store.setFilterAssignee(val);
              store.setActivePage(1, false);
            }}"
            @reset="${() => {
              store.setSearchQuery('');
              store.selectProject('all');
              store.setFilterStatus('all');
              store.setFilterPriority('all');
              store.setFilterAssignee('all');
              store.setActivePage(1, false);
            }}"
          ></app-filter-bar>`
        : ''}

      <div class="data-grid-frame">
        <app-data-grid hide-density-switch empty-text="${t.grid.noMatchingRecords}">
          <app-data-grid-column field="id" caption="${t.grid.columns.id}" width="110" min-width="80" sortable cell-type="key"></app-data-grid-column>
          <app-data-grid-column field="title" caption="${t.grid.columns.title}" width="310" min-width="180" sortable cell-type="title"></app-data-grid-column>
          <app-data-grid-column field="status" caption="${t.grid.columns.status}" width="145" sortable groupable cell-type="status"></app-data-grid-column>
          <app-data-grid-column field="priority" caption="${t.grid.columns.priority}" width="135" sortable groupable cell-type="priority"></app-data-grid-column>
          <app-data-grid-column field="assigneeId" caption="${t.grid.columns.assignee}" width="155" sortable groupable cell-type="assignee"></app-data-grid-column>
          <app-data-grid-column field="dates" caption="${t.grid.columns.dates}" width="150" sortable cell-type="dates"></app-data-grid-column>
          <app-data-grid-column field="progress" caption="${t.grid.columns.progress}" width="140" sortable cell-type="progress"></app-data-grid-column>
          <app-data-grid-column field="tags" caption="${t.grid.columns.tags}" width="180" cell-type="tags"></app-data-grid-column>
        </app-data-grid>
      </div>
    `;
  }
}

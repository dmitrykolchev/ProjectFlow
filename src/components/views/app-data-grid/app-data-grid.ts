import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Task } from '../../../types';
import { getTranslation } from '../../../i18n';
import '../../common/app-avatar/app-avatar';
import styles from './app-data-grid.css';
import {
  iconDownload,
  iconTrash,
  iconCheck,
  iconChevronRight,
  iconLayers,
} from '../../common/icons';
import '../../common/app-button/app-button';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-badge/app-badge';
import '../../common/app-toggle-button/app-toggle-button';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-pagination/app-pagination';
import { DataGridColumn } from '../data-grid-column/data-grid-column';
import '../data-grid-column/data-grid-column';
import { PortalHandle, portalManager } from '../../common/app-modal-portal/app-modal-portal';

export interface GridSortRule {
  field: string;
  direction: 'asc' | 'desc';
}

interface ColumnConfig {
  field: string;
  header: string;
  width: number;
  minWidth: number;
  sortable: boolean;
  groupable: boolean;
  resizable: boolean;
  reorderable: boolean;
  visible: boolean;
  align: 'left' | 'center' | 'right';
  cellType: string;
  renderer?: (row: Record<string, unknown>, value: unknown) => unknown;
  groupFormatter?: (value: unknown) => string;
}

const PRIORITY_ORDER: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

const STATUS_ORDER: Record<string, number> = {
  backlog: 1,
  todo: 2,
  in_progress: 3,
  review: 4,
  done: 5,
};

const ROW_HEIGHT_COMFORTABLE = 42;
const ROW_HEIGHT_COMPACT = 36;
const ROW_OVERSCAN = 8;

type VirtualRowItem =
  | {
      kind: 'group';
      key: string;
      level: number;
      groupPath: string;
      fieldLabel: string;
      displayLabel: string;
      count: number;
      isCollapsed: boolean;
    }
  | {
      kind: 'data';
      key: string;
      row: Record<string, unknown>;
    };

@customElement('app-data-grid')
export class AppDataGrid extends LitElement {
  @property({ type: Array }) rows?: Record<string, unknown>[];
  @property({ type: Boolean }) selectable: boolean = true;
  @property({ type: Boolean }) virtual: boolean = true;
  /** Comma-separated fields for multi-level grouping, e.g. "status,priority" */
  @property({ type: String, attribute: 'group-by' }) groupBy: string = '';
  /** Comma-separated rules for multi-column sorting, e.g. "priority:desc,dates:asc" */
  @property({ type: String, attribute: 'sort-by' }) sortBy: string = '';

  @state() private storeTasks: Task[] = [];
  @state() private columns: ColumnConfig[] = [];
  @state() private columnOrder: string[] = [];
  @state() private columnWidths: Record<string, number> = {};
  @state() private hiddenColumns: Set<string> = new Set();

  @state() private selectedIds: Set<string> = new Set();
  @state() private confirmBulkDeleteOpen = false;
  @state() private sortRules: GridSortRule[] = [];
  @state() private multiSortEnabled: boolean = false;
  @state() private groupByFields: string[] = [];
  @state() private collapsedGroups: Set<string> = new Set();

  @state() private currentPage: number = 1;
  @state() private rowsPerPage: number = store.customization.tablePageSize;
  @state() private showColumnMenu: boolean = false;
  @state() private columnMenuRight: number = 12;
  @state() private columnMenuTop: number | null = null;
  @state() private columnMenuBottom: number | null = null;
  @state() private columnMenuMaxHeight: number = 280;
  @state() private currentLang = store.customization.language;
  @state() private currentDensity = store.customization.density;

  // Virtual scroll window state
  @state() private visStartRow: number = 0;
  @state() private visEndRow: number = 30;

  // Drag reorder state
  @state() private draggingField: string | null = null;
  @state() private dropTargetField: string | null = null;
  @state() private dropPosition: 'before' | 'after' = 'before';
  @state() private isGroupDropOver: boolean = false;
  @state() private draggingGroupChip: string | null = null;

  // Resize state
  @state() private resizingField: string | null = null;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  private unsubscribe?: () => void;
  private tableResizeObserver?: ResizeObserver;
  private scrollRafId: number | null = null;
  private currentScrollTop = 0;
  private viewportHeight = 520;
  private columnMenuPortal: PortalHandle | null = null;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => {
      this.syncState();
    });
    this.addEventListener('column-change', () => this.readSlottedColumns());
    window.addEventListener('resize', this.handleWindowResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
    if (this.tableResizeObserver) {
      this.tableResizeObserver.disconnect();
      this.tableResizeObserver = undefined;
    }
    if (this.scrollRafId !== null) {
      cancelAnimationFrame(this.scrollRafId);
      this.scrollRafId = null;
    }
    window.removeEventListener('pointermove', this.handleResizeMove);
    window.removeEventListener('pointerup', this.handleResizeEnd);
    window.removeEventListener('resize', this.handleWindowResize);
    this.closeColumnMenuPortal();
  }

  private handleWindowResize = () => {
    if (this.showColumnMenu) {
      this.updateColumnMenuPosition();
    }
  };

  private closeColumnMenuPortal() {
    if (this.columnMenuPortal) {
      this.columnMenuPortal.close();
      this.columnMenuPortal = null;
    }
  }

  private updateColumnMenuPosition() {
    const trigger = this.shadowRoot?.querySelector('.column-visibility-btn') as HTMLElement | null;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    this.columnMenuRight = Math.max(8, Math.round(window.innerWidth - rect.right));
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
      this.columnMenuTop = Math.round(rect.bottom + 4);
      this.columnMenuBottom = null;
      this.columnMenuMaxHeight = Math.max(120, Math.min(300, spaceBelow));
    } else {
      this.columnMenuTop = null;
      this.columnMenuBottom = Math.round(window.innerHeight - rect.top + 4);
      this.columnMenuMaxHeight = Math.max(120, Math.min(300, spaceAbove));
    }
  }

  private toggleColumnMenu() {
    if (!this.showColumnMenu) {
      this.updateColumnMenuPosition();
      this.showColumnMenu = true;
    } else {
      this.showColumnMenu = false;
    }
  }

  private renderColumnMenuPopover(): TemplateResult {
    const vertStyle =
      this.columnMenuBottom !== null
        ? `bottom: ${this.columnMenuBottom}px; top: auto;`
        : `top: ${this.columnMenuTop ?? 0}px; bottom: auto;`;
    const popoverStyle = `right: ${this.columnMenuRight}px; left: auto; ${vertStyle} max-height: ${this.columnMenuMaxHeight}px;`;

    return html`
      <div class="column-menu-popover" style="${popoverStyle}">
        ${this.columns.map((col) => {
          const isVisible = !this.hiddenColumns.has(col.field);
          return html`
            <app-checkbox
              ?checked="${isVisible}"
              label="${col.header}"
              @change="${() => this.toggleColumnVisibility(col.field)}"
            ></app-checkbox>
          `;
        })}
      </div>
    `;
  }

  willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('groupBy')) {
      this.groupByFields = this.groupBy
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      this.collapsedGroups = new Set();
    }
    if (changed.has('sortBy')) {
      const parsed = this.sortBy
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((token): GridSortRule => {
          const [field, dir] = token.split(':');
          return {
            field: field.trim(),
            direction: dir?.trim().toLowerCase() === 'desc' ? 'desc' : 'asc',
          };
        })
        .filter((r) => Boolean(r.field));
      this.sortRules = parsed;
      if (parsed.length > 1) {
        this.multiSortEnabled = true;
      }
    }
  }

  firstUpdated() {
    this.readSlottedColumns();
    const container = this.shadowRoot?.querySelector('.table-container') as HTMLElement | null;
    if (container) {
      this.viewportHeight = container.clientHeight || 520;
      this.tableResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.viewportHeight = entry.contentRect.height || 520;
          this.recomputeVirtualWindow();
        }
      });
      this.tableResizeObserver.observe(container);
      this.recomputeVirtualWindow();
    }
  }

  updated(changed: Map<PropertyKey, unknown>) {
    if (
      changed.has('sortRules') ||
      changed.has('groupByFields') ||
      changed.has('virtual') ||
      changed.has('rows') ||
      changed.has('storeTasks') ||
      changed.has('collapsedGroups') ||
      changed.has('currentDensity')
    ) {
      if (changed.has('sortRules') || changed.has('groupByFields') || changed.has('virtual')) {
        const container = this.shadowRoot?.querySelector('.table-container') as HTMLElement | null;
        if (container) {
          container.scrollTop = 0;
        }
        this.currentScrollTop = 0;
      }
      this.recomputeVirtualWindow();
    }

    if (this.showColumnMenu) {
      const template = this.renderColumnMenuPopover();
      if (!this.columnMenuPortal) {
        this.columnMenuPortal = portalManager.mountTemplate({
          kind: 'popup',
          styles,
          template,
          host: this,
          closeOnBackdrop: true,
          onClose: () => {
            this.showColumnMenu = false;
          },
        });
      } else {
        this.columnMenuPortal.update(template);
      }
    } else {
      this.closeColumnMenuPortal();
    }
  }

  private get rowHeightPx(): number {
    return this.currentDensity === 'compact' ? ROW_HEIGHT_COMPACT : ROW_HEIGHT_COMFORTABLE;
  }

  private syncState() {
    this.storeTasks = store.getFilteredTasks();
    this.currentLang = store.customization.language;
    this.currentDensity = store.customization.density;
    this.rowsPerPage = store.customization.tablePageSize;
    this.style.setProperty('--grid-row-height', `${this.rowHeightPx}px`);
  }

  private readSlottedColumns() {
    const slot = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
    if (!slot) return;

    const assigned = slot
      .assignedElements({ flatten: true })
      .filter((el) => el.tagName.toLowerCase() === 'data-grid-column') as DataGridColumn[];

    const parsed: ColumnConfig[] = assigned.map((col) => ({
      field: col.field,
      header: col.header || col.field,
      width: col.width || 150,
      minWidth: col.minWidth || 70,
      sortable: col.sortable,
      groupable: col.groupable,
      resizable: col.resizable,
      reorderable: col.reorderable,
      visible: col.visible,
      align: col.align || 'left',
      cellType: col.cellType || 'text',
      renderer: col.renderer,
      groupFormatter: col.groupFormatter,
    }));

    this.columns = parsed;

    const newFields = parsed.map((c) => c.field);
    const keptOrder = this.columnOrder.filter((f) => newFields.includes(f));
    const addedFields = newFields.filter((f) => !keptOrder.includes(f));
    this.columnOrder = [...keptOrder, ...addedFields];

    const widths = { ...this.columnWidths };
    for (const c of parsed) {
      if (!widths[c.field]) {
        widths[c.field] = c.width;
      }
      if (!c.visible) {
        this.hiddenColumns.add(c.field);
      }
    }
    this.columnWidths = widths;
  }

  private get orderedVisibleColumns(): ColumnConfig[] {
    return this.columnOrder
      .map((field) => this.columns.find((c) => c.field === field))
      .filter((c): c is ColumnConfig => Boolean(c && !this.hiddenColumns.has(c.field)));
  }

  private get activeRows(): Record<string, unknown>[] {
    return this.rows ?? (this.storeTasks as unknown as Record<string, unknown>[]);
  }

  private getSortedRows(): Record<string, unknown>[] {
    const allRows = this.activeRows;
    if (this.sortRules.length === 0) return [...allRows];
    return [...allRows].sort((a, b) => {
      for (const rule of this.sortRules) {
        const cmp = this.compareByField(a, b, rule.field);
        if (cmp !== 0) {
          return rule.direction === 'asc' ? cmp : -cmp;
        }
      }
      return 0;
    });
  }

  private buildVirtualItems(
    sortedRows: Record<string, unknown>[],
    t: ReturnType<typeof getTranslation>
  ): VirtualRowItem[] {
    if (this.groupByFields.length === 0) {
      return sortedRows.map((row, idx) => ({
        kind: 'data',
        key: String(row.id || `row-${idx}`),
        row,
      }));
    }

    const items: VirtualRowItem[] = [];
    const appendGroupLevel = (subset: Record<string, unknown>[], level: number, parentPath: string) => {
      const field = this.groupByFields[level];
      const groupCol = this.columns.find((c) => c.field === field);
      const groups = new Map<string, Record<string, unknown>[]>();

      for (const row of subset) {
        const key = String(row[field] ?? '—');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }

      let entries = Array.from(groups.entries());
      const fieldSort = this.sortRules.find((r) => r.field === field);
      if (fieldSort) {
        entries = entries.sort(([, rowsA], [, rowsB]) => {
          const cmp = this.compareByField(rowsA[0], rowsB[0], field);
          return fieldSort.direction === 'asc' ? cmp : -cmp;
        });
      }

      const hasChildLevel = level + 1 < this.groupByFields.length;

      for (const [groupKey, groupRows] of entries) {
        const groupPath = parentPath ? `${parentPath}|${field}=${groupKey}` : `${field}=${groupKey}`;
        const isCollapsed = this.collapsedGroups.has(groupPath);
        const displayLabel = groupCol?.groupFormatter
          ? groupCol.groupFormatter(groupKey)
          : this.formatGroupValue(field, groupKey, t);

        items.push({
          kind: 'group',
          key: `grp:${groupPath}`,
          level,
          groupPath,
          fieldLabel: groupCol?.header || field,
          displayLabel,
          count: groupRows.length,
          isCollapsed,
        });

        if (!isCollapsed) {
          if (hasChildLevel) {
            appendGroupLevel(groupRows, level + 1, groupPath);
          } else {
            for (let i = 0; i < groupRows.length; i++) {
              const row = groupRows[i];
              items.push({
                kind: 'data',
                key: `${groupPath}|${String(row.id || i)}`,
                row,
              });
            }
          }
        }
      }
    };

    appendGroupLevel(sortedRows, 0, '');
    return items;
  }

  private recomputeVirtualWindow() {
    if (!this.virtual) return;
    const t = getTranslation(this.currentLang);
    const totalCount = this.buildVirtualItems(this.getSortedRows(), t).length;
    const rowH = this.rowHeightPx;
    const maxScrollTop = Math.max(0, totalCount * rowH - this.viewportHeight);
    if (this.currentScrollTop > maxScrollTop) {
      this.currentScrollTop = maxScrollTop;
      const container = this.shadowRoot?.querySelector('.table-container') as HTMLElement | null;
      if (container && container.scrollTop > maxScrollTop) {
        container.scrollTop = maxScrollTop;
      }
    }
    const effectiveScrollTop = Math.max(0, this.currentScrollTop - rowH);
    const rawStart = Math.floor(effectiveScrollTop / rowH);
    const rawEnd = Math.ceil((this.currentScrollTop + this.viewportHeight) / rowH);
    const nextStart = Math.max(0, Math.min(Math.max(0, totalCount - 1), rawStart - ROW_OVERSCAN));
    const nextEnd = Math.min(totalCount, Math.max(nextStart + 10, rawEnd + ROW_OVERSCAN));

    if (nextStart !== this.visStartRow || nextEnd !== this.visEndRow) {
      this.visStartRow = nextStart;
      this.visEndRow = nextEnd;
    }
  }

  private handleTableScroll = (e: Event) => {
    if (!this.virtual) return;
    const target = e.target as HTMLElement;
    this.currentScrollTop = target.scrollTop;

    if (this.scrollRafId === null) {
      this.scrollRafId = requestAnimationFrame(() => {
        this.scrollRafId = null;
        this.recomputeVirtualWindow();
      });
    }
  };

  render() {
    const t = getTranslation(this.currentLang);
    const activeCols = this.orderedVisibleColumns;
    const allRows = this.activeRows;
    const sortedRows = this.getSortedRows();

    const isGrouped = this.groupByFields.length > 0;
    const virtualItems = this.virtual ? this.buildVirtualItems(sortedRows, t) : [];
    const totalVirtualCount = virtualItems.length;

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / this.rowsPerPage));
    const safePage = Math.min(this.currentPage, totalPages);
    const startIndex = (safePage - 1) * this.rowsPerPage;
    const paginatedRows = isGrouped
      ? sortedRows
      : sortedRows.slice(startIndex, startIndex + this.rowsPerPage);

    const selectionScope = this.virtual || isGrouped ? sortedRows : paginatedRows;
    const allCurrentSelected =
      selectionScope.length > 0 &&
      selectionScope.every((r) => this.selectedIds.has(String(r.id || '')));
    const someCurrentSelected = selectionScope.some((r) =>
      this.selectedIds.has(String(r.id || ''))
    );

    const availableGroupCols = this.columns.filter(
      (c) => c.groupable && !this.groupByFields.includes(c.field)
    );

    return html`
      <div class="columns-slot-hidden">
        <slot @slotchange="${this.readSlottedColumns}"></slot>
      </div>

      <div class="grid-toolbar">
        <div class="toolbar-left">
          ${this.selectable && this.selectedIds.size > 0
            ? html`
                <span class="bulk-badge">${this.selectedIds.size} ${t.grid.selected}</span>
                <app-button size="sm" variant="secondary" @click="${this.bulkMarkDone}">
                  <span slot="icon-start">${iconCheck(14)}</span>
                  <span>${t.grid.markDone}</span>
                </app-button>
                <app-button size="sm" variant="danger" @click="${this.bulkDelete}">
                  <span slot="icon-start">${iconTrash(14)}</span>
                  <span>${t.grid.deleteSelected}</span>
                </app-button>
              `
            : html`
                <span style="font-size: 0.8125rem; color: var(--text-muted, #64748b);">
                  ${t.common.total}:
                  <strong class="tabular-nums" style="color: var(--text-primary, #f8fafc);">
                    ${allRows.length}
                  </strong>
                </span>
              `}
        </div>

        <div class="toolbar-right">
          ${this.columns.some((c) => c.groupable)
            ? html`
                <div class="group-select-wrap">
                  <span>${iconLayers(14)}</span>
                  <select
                    class="group-select"
                    .value=""
                    @change="${(e: Event) => {
                      const select = e.target as HTMLSelectElement;
                      const field = select.value;
                      if (field && !this.groupByFields.includes(field)) {
                        this.groupByFields = [...this.groupByFields, field];
                        this.collapsedGroups = new Set();
                      }
                      select.value = '';
                    }}"
                  >
                    <option value="">${t.grid.addGroup}</option>
                    ${availableGroupCols.map(
                      (c) => html`<option value="${c.field}">${c.header}</option>`
                    )}
                  </select>
                </div>
              `
            : ''}

          <app-toggle-button
            size="sm"
            ?pressed="${this.virtual}"
            @change="${(e: CustomEvent<{ pressed: boolean }>) => {
              this.virtual = e.detail.pressed;
              this.currentPage = 1;
            }}"
          >
            ${t.grid.virtualMode}
          </app-toggle-button>

          <app-toggle-button
            size="sm"
            ?pressed="${this.multiSortEnabled}"
            @change="${(e: CustomEvent<{ pressed: boolean }>) => {
              this.multiSortEnabled = e.detail.pressed;
            }}"
          >
            ${t.grid.multiSort}
          </app-toggle-button>

          <app-button
            class="column-visibility-btn"
            size="sm"
            variant="outline"
            @click="${this.toggleColumnMenu}"
          >
            ${t.grid.columnVisibility}
          </app-button>

          <app-button size="sm" variant="secondary" @click="${this.exportCsv}">
            <span slot="icon-start">${iconDownload(14)}</span>
            <span>${t.common.exportCsv}</span>
          </app-button>
        </div>
      </div>

      <!-- Multi-Level Drag-to-Group Dropbar -->
      <div
        class="group-dropbar ${this.isGroupDropOver ? 'is-drag-over' : ''}"
        @dragover="${this.handleGroupBarDragOver}"
        @dragleave="${() => (this.isGroupDropOver = false)}"
        @drop="${this.handleGroupBarDrop}"
      >
        <div class="group-chips-row">
          <span>${iconLayers(13)}</span>
          ${this.groupByFields.length > 0
            ? html`
                <span>${t.grid.groupBy}:</span>
                ${this.groupByFields.map((field, index) => {
                  const header = this.columns.find((c) => c.field === field)?.header || field;
                  return html`
                    ${index > 0
                      ? html`<span class="group-level-sep">${iconChevronRight(12)}</span>`
                      : ''}
                    <div
                      class="group-chip-wrap"
                      draggable="true"
                      @dragstart="${(e: DragEvent) => this.handleGroupChipDragStart(e, field)}"
                      @dragover="${(e: DragEvent) => this.handleGroupChipDragOver(e, field)}"
                      @drop="${(e: DragEvent) => this.handleGroupChipDrop(e, field)}"
                      @dragend="${() => (this.draggingGroupChip = null)}"
                    >
                      <app-badge
                        variant="primary"
                        removable
                        @remove="${() => this.removeGroupField(field)}"
                      >
                        ${index + 1}. ${header}
                      </app-badge>
                    </div>
                  `;
                })}
              `
            : html`<span>${t.grid.dragHint}</span>`}
        </div>

        ${this.groupByFields.length > 0
          ? html`
              <div class="bar-actions">
                <button
                  type="button"
                  class="bar-link-btn"
                  @click="${() => (this.collapsedGroups = new Set())}"
                >
                  ${t.grid.expandAll}
                </button>
                <button
                  type="button"
                  class="bar-link-btn"
                  @click="${() => this.collapseAllGroups(sortedRows)}"
                >
                  ${t.grid.collapseAll}
                </button>
                <button
                  type="button"
                  class="bar-link-btn"
                  @click="${() => {
                    this.groupByFields = [];
                    this.collapsedGroups = new Set();
                  }}"
                >
                  ${t.grid.clearGroups}
                </button>
              </div>
            `
          : ''}
      </div>

      <!-- Multi-Column Sort Precedence Bar -->
      ${this.sortRules.length > 0 || this.multiSortEnabled
        ? html`
            <div class="sort-bar">
              <div class="sort-chips-row">
                ${this.sortRules.length === 0
                  ? html`<span>${t.grid.sortHint}</span>`
                  : html`
                      <span>${t.grid.multiSort}:</span>
                      ${this.sortRules.map((rule, idx) => {
                        const header =
                          this.columns.find((c) => c.field === rule.field)?.header || rule.field;
                        return html`
                          <div
                            class="sort-chip"
                            @click="${() => this.toggleSortDirection(rule.field)}"
                            title="${header}"
                          >
                            <span class="sort-chip-idx">${idx + 1}.</span>
                            <span>${header}</span>
                            <span class="sort-chip-dir">${rule.direction === 'asc' ? '▲' : '▼'}</span>
                            <button
                              type="button"
                              class="sort-chip-remove"
                              aria-label="Remove sort"
                              @click="${(e: Event) => {
                                e.stopPropagation();
                                this.removeSortRule(rule.field);
                              }}"
                            >
                              ×
                            </button>
                          </div>
                        `;
                      })}
                    `}
              </div>

              ${this.sortRules.length > 0
                ? html`
                    <div class="bar-actions">
                      <button
                        type="button"
                        class="bar-link-btn"
                        @click="${() => (this.sortRules = [])}"
                      >
                        ${t.grid.clearSorts}
                      </button>
                    </div>
                  `
                : ''}
            </div>
          `
        : ''}

      <div class="table-container" @scroll="${this.handleTableScroll}">
        <table>
          <colgroup>
            ${this.selectable ? html`<col style="width: 46px;" />` : ''}
            ${activeCols.map((col) => {
              const width = this.columnWidths[col.field] || col.width;
              return html`<col style="width: ${width}px;" />`;
            })}
          </colgroup>
          <thead>
            <tr>
              ${this.selectable
                ? html`
                    <th class="select-col" style="width: 46px;">
                      <app-checkbox
                        ?checked="${allCurrentSelected}"
                        ?indeterminate="${!allCurrentSelected && someCurrentSelected}"
                        @change="${() => this.toggleSelectAll(selectionScope)}"
                      ></app-checkbox>
                    </th>
                  `
                : ''}

              ${activeCols.map((col) => {
                const width = this.columnWidths[col.field] || col.width;
                const isDragging = this.draggingField === col.field;
                const dropClass =
                  this.dropTargetField === col.field ? `drop-${this.dropPosition}` : '';
                const sortIdx = this.sortRules.findIndex((r) => r.field === col.field);
                const sortRule = sortIdx !== -1 ? this.sortRules[sortIdx] : null;

                return html`
                  <th
                    style="width: ${width}px; text-align: ${col.align};"
                    class="${col.sortable ? 'is-sortable' : ''} ${isDragging ? 'is-dragging' : ''} ${dropClass}"
                    draggable="${col.reorderable && !this.resizingField ? 'true' : 'false'}"
                    @click="${(e: MouseEvent) => col.sortable && this.handleSort(col.field, e.shiftKey)}"
                    @dragstart="${(e: DragEvent) => this.handleColDragStart(e, col)}"
                    @dragover="${(e: DragEvent) => this.handleColDragOver(e, col)}"
                    @dragleave="${() => {
                      if (this.dropTargetField === col.field) this.dropTargetField = null;
                    }}"
                    @drop="${(e: DragEvent) => this.handleColDrop(e, col)}"
                    @dragend="${this.handleColDragEnd}"
                  >
                    <div class="th-content">
                      <span class="th-label">${col.header}</span>
                      ${sortRule
                        ? html`
                            <span class="sort-indicator">
                              ${this.sortRules.length > 1
                                ? html`<span class="sort-order-num">${sortIdx + 1}</span>`
                                : ''}
                              <span>${sortRule.direction === 'asc' ? '▲' : '▼'}</span>
                            </span>
                          `
                        : ''}
                    </div>
                    ${col.resizable
                      ? html`
                          <div
                            class="col-resizer ${this.resizingField === col.field ? 'is-resizing' : ''}"
                            @pointerdown="${(e: PointerEvent) => this.startResize(e, col)}"
                            @click="${(e: Event) => e.stopPropagation()}"
                          ></div>
                        `
                      : ''}
                  </th>
                `;
              })}
            </tr>
          </thead>

          <tbody>
            ${sortedRows.length === 0
              ? html`
                  <tr>
                    <td
                      colspan="${activeCols.length + (this.selectable ? 1 : 0)}"
                      style="text-align: center; padding: 3rem; color: var(--text-muted, #64748b);"
                    >
                      ${t.grid.noMatchingRecords}
                    </td>
                  </tr>
                `
              : this.virtual
              ? this.renderVirtualizedBody(virtualItems, activeCols, t)
              : isGrouped
              ? this.renderGroupLevel(sortedRows, 0, '', activeCols, t)
              : paginatedRows.map((row) => this.renderDataRow(row, activeCols, t))}
          </tbody>
        </table>
      </div>

      ${!this.virtual && !isGrouped
        ? html`
            <div class="grid-footer">
              <app-pagination
                variant="bare"
                compact
                layout-mode="table"
                .totalItems="${sortedRows.length}"
                .page="${safePage}"
                .pageSize="${this.rowsPerPage}"
                @page-change="${(e: CustomEvent<{ page: number }>) => {
                  this.currentPage = e.detail.page;
                }}"
                @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
                  this.rowsPerPage = e.detail.pageSize;
                  this.currentPage = 1;
                  store.setTablePageSize(e.detail.pageSize);
                }}"
              ></app-pagination>
            </div>
          `
        : this.virtual && totalVirtualCount > 0
        ? html`
            <div class="grid-footer">
              <span class="page-info">
                ${t.grid.virtualMode} · ${t.grid.showingRows}:
                <strong class="tabular-nums">${Math.min(this.visStartRow + 1, totalVirtualCount)}–${Math.min(this.visEndRow, totalVirtualCount)}</strong>
                ${t.grid.pageOf}
                <strong class="tabular-nums">${totalVirtualCount}</strong>
              </span>
              <span class="page-info">
                ${t.common.total}: <strong class="tabular-nums">${sortedRows.length}</strong>
              </span>
            </div>
          `
        : ''}
      <app-confirm-dialog
        .open="${this.confirmBulkDeleteOpen}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.bulkTaskDelete.title}"
        action="${t.viewTexts.confirmDialogs.bulkTaskDelete.action(this.selectedIds.size)}"
        result="${t.viewTexts.confirmDialogs.bulkTaskDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmBulkDeleteOpen = false)}"
        @confirm="${() => this.doBulkDelete()}"
      ></app-confirm-dialog>
    `;
  }

  private renderVirtualizedBody(
    virtualItems: VirtualRowItem[],
    activeCols: ColumnConfig[],
    t: ReturnType<typeof getTranslation>
  ) {
    const total = virtualItems.length;
    const start = Math.min(this.visStartRow, total);
    const end = Math.min(Math.max(start, this.visEndRow), total);
    const slice = virtualItems.slice(start, end);
    const rowH = this.rowHeightPx;
    const topPx = start * rowH;
    const bottomPx = Math.max(0, (total - end) * rowH);
    const colSpan = activeCols.length + (this.selectable ? 1 : 0);

    return html`
      ${topPx > 0
        ? html`<tr class="virtual-spacer-row" aria-hidden="true" style="height: ${topPx}px;"><td colspan="${colSpan}"></td></tr>`
        : ''}
      ${slice.map((item) => {
        if (item.kind === 'group') {
          const levelClass = `level-${Math.min(item.level, 3)}`;
          const indentPx = 14 + item.level * 22;
          return html`
            <tr class="group-row ${levelClass}" @click="${() => this.toggleGroupCollapse(item.groupPath)}">
              <td colspan="${colSpan}" class="group-cell" style="padding-left: ${indentPx}px;">
                <div class="group-header-inner">
                  <span class="group-chevron ${!item.isCollapsed ? 'is-expanded' : ''}">
                    ${iconChevronRight(14)}
                  </span>
                  <span class="group-field-label">${item.fieldLabel}:</span>
                  <span>${item.displayLabel}</span>
                  <app-badge size="sm" variant="neutral">${item.count}</app-badge>
                </div>
              </td>
            </tr>
          `;
        }
        return this.renderDataRow(item.row, activeCols, t);
      })}
      ${bottomPx > 0
        ? html`<tr class="virtual-spacer-row" aria-hidden="true" style="height: ${bottomPx}px;"><td colspan="${colSpan}"></td></tr>`
        : ''}
    `;
  }

  private renderGroupLevel(
    rows: Record<string, unknown>[],
    level: number,
    parentPath: string,
    activeCols: ColumnConfig[],
    t: ReturnType<typeof getTranslation>
  ): TemplateResult[] {
    const field = this.groupByFields[level];
    const groupCol = this.columns.find((c) => c.field === field);
    const groups = new Map<string, Record<string, unknown>[]>();

    for (const row of rows) {
      const raw = row[field];
      const key = String(raw ?? '—');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    // Order group headers using active sort rule for this field if present
    let entries = Array.from(groups.entries());
    const fieldSort = this.sortRules.find((r) => r.field === field);
    if (fieldSort) {
      entries = entries.sort(([, rowsA], [, rowsB]) => {
        const cmp = this.compareByField(rowsA[0], rowsB[0], field);
        return fieldSort.direction === 'asc' ? cmp : -cmp;
      });
    }

    const colSpan = activeCols.length + (this.selectable ? 1 : 0);
    const hasChildLevel = level + 1 < this.groupByFields.length;

    return entries.map(([groupKey, groupRows]) => {
      const groupPath = parentPath ? `${parentPath}|${field}=${groupKey}` : `${field}=${groupKey}`;
      const isCollapsed = this.collapsedGroups.has(groupPath);
      const displayLabel = groupCol?.groupFormatter
        ? groupCol.groupFormatter(groupKey)
        : this.formatGroupValue(field, groupKey, t);
      const levelClass = `level-${Math.min(level, 3)}`;
      const indentPx = 14 + level * 22;

      return html`
        <tr class="group-row ${levelClass}" @click="${() => this.toggleGroupCollapse(groupPath)}">
          <td colspan="${colSpan}" class="group-cell" style="padding-left: ${indentPx}px;">
            <div class="group-header-inner">
              <span class="group-chevron ${!isCollapsed ? 'is-expanded' : ''}">
                ${iconChevronRight(14)}
              </span>
              <span class="group-field-label">${groupCol?.header || field}:</span>
              <span>${displayLabel}</span>
              <app-badge size="sm" variant="neutral">${groupRows.length}</app-badge>
            </div>
          </td>
        </tr>
        ${!isCollapsed
          ? hasChildLevel
            ? this.renderGroupLevel(groupRows, level + 1, groupPath, activeCols, t)
            : groupRows.map((row) => this.renderDataRow(row, activeCols, t))
          : ''}
      `;
    });
  }

  private renderDataRow(
    row: Record<string, unknown>,
    activeCols: ColumnConfig[],
    t: ReturnType<typeof getTranslation>
  ) {
    const rowId = String(row.id || '');
    const isChecked = this.selectable && this.selectedIds.has(rowId);

    return html`
      <tr class="data-row ${isChecked ? 'is-selected' : ''}">
        ${this.selectable
          ? html`
              <td class="select-col">
                <app-checkbox
                  ?checked="${isChecked}"
                  @change="${() => this.toggleRowSelect(rowId)}"
                ></app-checkbox>
              </td>
            `
          : ''}

        ${activeCols.map((col) => {
          const val = row[col.field];
          return html`
            <td style="text-align: ${col.align};">
              ${col.renderer ? col.renderer(row, val) : this.renderBuiltInCell(col, row, val, t)}
            </td>
          `;
        })}
      </tr>
    `;
  }

  private renderBuiltInCell(
    col: ColumnConfig,
    row: Record<string, unknown>,
    val: unknown,
    t: ReturnType<typeof getTranslation>
  ) {
    const task = row as unknown as Task;

    switch (col.cellType) {
      case 'key':
        return html`<span class="key-badge">${String(val ?? '')}</span>`;

      case 'title':
        return html`
          <div class="task-title-cell" @click="${() => this.handleRowTitleClick(task)}">
            <span>${String(val ?? '')}</span>
          </div>
        `;

      case 'status': {
        const status = String(val ?? 'todo');
        const statusColor =
          status === 'done'
            ? '#10b981'
            : status === 'review'
            ? '#8b5cf6'
            : status === 'in_progress'
            ? '#f59e0b'
            : status === 'todo'
            ? '#0284c7'
            : '#64748b';
        return html`
          <div
            class="status-chip"
            @click="${() => this.rows === undefined && this.cycleStatus(task)}"
          >
            <span class="status-dot" style="background-color: ${statusColor};"></span>
            <span>${(t.status as Record<string, string>)[status] || status}</span>
          </div>
        `;
      }

      case 'priority': {
        const pri = String(val ?? 'medium');
        return html`
          <span class="priority-chip priority-${pri}">
            ${(t.priority as Record<string, string>)[pri] || pri}
          </span>
        `;
      }

      case 'assignee': {
        const assignee = store.users.find((u) => u.id === String(val ?? ''));
        return html`
          <div class="assignee-chip">
            <app-avatar size="xs" initials="${assignee ? assignee.avatar : '?'}" title="${assignee ? assignee.name : '—'}"></app-avatar>
            <span>${assignee ? assignee.name.split(' ')[0] : '—'}</span>
          </div>
        `;
      }

      case 'dates': {
        const start = String(task.startDate || '').slice(5);
        const due = String(task.dueDate || '').slice(5);
        return html`<span class="tabular-nums">${start} → ${due}</span>`;
      }

      case 'progress': {
        const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
        const doneCount = subtasks.filter((s) => s.completed).length;
        const pct =
          subtasks.length > 0
            ? Math.round((doneCount / subtasks.length) * 100)
            : task.status === 'done'
            ? 100
            : typeof val === 'number'
            ? val
            : 0;
        return html`
          <app-progress-bar size="sm" show-label value="${pct}"></app-progress-bar>
        `;
      }

      case 'tags': {
        const tags = Array.isArray(val) ? (val as string[]) : [];
        return html`
          <div class="tags-container">
            ${tags.map((tag, i) => html`<span class="tag-item">${tag}${i < tags.length - 1 ? ' ·' : ''}</span>`)}
          </div>
        `;
      }

      case 'badge':
        return html`<app-badge size="sm" variant="primary">${String(val ?? '')}</app-badge>`;

      default:
        return html`<span>${String(val ?? '')}</span>`;
    }
  }

  private formatGroupValue(field: string, value: string, t: ReturnType<typeof getTranslation>): string {
    if (field === 'status') {
      return (t.status as Record<string, string>)[value] || value;
    }
    if (field === 'priority') {
      return (t.priority as Record<string, string>)[value] || value;
    }
    if (field === 'assigneeId') {
      return store.users.find((u) => u.id === value)?.name || t.taskModal.unassigned;
    }
    if (field === 'projectId') {
      return store.projects.find((p) => p.id === value)?.name || value;
    }
    return value;
  }

  private getSortValue(row: Record<string, unknown>, field: string): string | number {
    if (field === 'dates') {
      return String(row.dueDate || '');
    }
    if (field === 'priority') {
      const key = String(row.priority || '');
      if (key in PRIORITY_ORDER) return PRIORITY_ORDER[key];
    }
    if (field === 'status') {
      const key = String(row.status || '');
      if (key in STATUS_ORDER) return STATUS_ORDER[key];
    }
    if (field === 'progress') {
      const task = row as unknown as Task;
      if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        return task.subtasks.filter((s) => s.completed).length / task.subtasks.length;
      }
      if (typeof row.progress === 'number') return row.progress;
      return task.status === 'done' ? 1 : 0;
    }
    const v = row[field];
    if (typeof v === 'number') return v;
    return String(v ?? '').toLowerCase();
  }

  private compareByField(a: Record<string, unknown>, b: Record<string, unknown>, field: string): number {
    const valA = this.getSortValue(a, field);
    const valB = this.getSortValue(b, field);
    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  }

  private handleSort(field: string, shiftKey: boolean) {
    const isMulti = shiftKey || this.multiSortEnabled;
    const existingIdx = this.sortRules.findIndex((r) => r.field === field);

    if (isMulti) {
      const next = [...this.sortRules];
      if (existingIdx === -1) {
        next.push({ field, direction: 'asc' });
      } else if (next[existingIdx].direction === 'asc') {
        next[existingIdx] = { field, direction: 'desc' };
      } else {
        next.splice(existingIdx, 1);
      }
      this.sortRules = next;
    } else {
      if (existingIdx !== -1 && this.sortRules.length === 1) {
        if (this.sortRules[0].direction === 'asc') {
          this.sortRules = [{ field, direction: 'desc' }];
        } else {
          this.sortRules = [];
        }
      } else {
        this.sortRules = [{ field, direction: 'asc' }];
      }
    }
  }

  private toggleSortDirection(field: string) {
    this.sortRules = this.sortRules.map((r) =>
      r.field === field ? { ...r, direction: r.direction === 'asc' ? 'desc' : 'asc' } : r
    );
  }

  private removeSortRule(field: string) {
    this.sortRules = this.sortRules.filter((r) => r.field !== field);
  }

  private toggleGroupCollapse(path: string) {
    const next = new Set(this.collapsedGroups);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    this.collapsedGroups = next;
  }

  private collapseAllGroups(rows: Record<string, unknown>[]) {
    const allPaths = new Set<string>();
    const collect = (subset: Record<string, unknown>[], level: number, parentPath: string) => {
      if (level >= this.groupByFields.length) return;
      const field = this.groupByFields[level];
      const map = new Map<string, Record<string, unknown>[]>();
      for (const r of subset) {
        const key = String(r[field] ?? '—');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      }
      for (const [k, groupRows] of map.entries()) {
        const path = parentPath ? `${parentPath}|${field}=${k}` : `${field}=${k}`;
        allPaths.add(path);
        collect(groupRows, level + 1, path);
      }
    };
    collect(rows, 0, '');
    this.collapsedGroups = allPaths;
  }

  private removeGroupField(field: string) {
    this.groupByFields = this.groupByFields.filter((f) => f !== field);
    this.collapsedGroups = new Set();
  }

  // --- Reordering group chips inside dropbar ---
  private handleGroupChipDragStart(e: DragEvent, field: string) {
    e.stopPropagation();
    this.draggingGroupChip = field;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `group-chip:${field}`);
    }
  }

  private handleGroupChipDragOver(e: DragEvent, targetField: string) {
    if (!this.draggingGroupChip || this.draggingGroupChip === targetField) return;
    e.preventDefault();
    e.stopPropagation();
  }

  private handleGroupChipDrop(e: DragEvent, targetField: string) {
    if (!this.draggingGroupChip || this.draggingGroupChip === targetField) return;
    e.preventDefault();
    e.stopPropagation();
    const list = [...this.groupByFields];
    const from = list.indexOf(this.draggingGroupChip);
    const to = list.indexOf(targetField);
    if (from !== -1 && to !== -1) {
      list.splice(from, 1);
      list.splice(to, 0, this.draggingGroupChip);
      this.groupByFields = list;
      this.collapsedGroups = new Set();
    }
    this.draggingGroupChip = null;
  }

  // --- Column Drag & Drop Reordering + Drag-to-Group ---
  private handleColDragStart(e: DragEvent, col: ColumnConfig) {
    if (!col.reorderable || this.resizingField) {
      e.preventDefault();
      return;
    }
    this.draggingField = col.field;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', col.field);
    }
  }

  private handleColDragOver(e: DragEvent, col: ColumnConfig) {
    if (!this.draggingField || this.draggingField === col.field || !col.reorderable) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    this.dropTargetField = col.field;
    this.dropPosition = e.clientX < mid ? 'before' : 'after';
  }

  private handleColDrop(e: DragEvent, targetCol: ColumnConfig) {
    e.preventDefault();
    if (!this.draggingField || this.draggingField === targetCol.field) {
      this.handleColDragEnd();
      return;
    }

    const order = [...this.columnOrder];
    const fromIdx = order.indexOf(this.draggingField);
    if (fromIdx === -1) {
      this.handleColDragEnd();
      return;
    }

    order.splice(fromIdx, 1);
    let toIdx = order.indexOf(targetCol.field);
    if (this.dropPosition === 'after') toIdx += 1;
    order.splice(toIdx, 0, this.draggingField);

    this.columnOrder = order;
    this.handleColDragEnd();
  }

  private handleColDragEnd() {
    this.draggingField = null;
    this.dropTargetField = null;
    this.isGroupDropOver = false;
  }

  private handleGroupBarDragOver(e: DragEvent) {
    if (!this.draggingField) return;
    const col = this.columns.find((c) => c.field === this.draggingField);
    if (col?.groupable && !this.groupByFields.includes(col.field)) {
      e.preventDefault();
      this.isGroupDropOver = true;
    }
  }

  private handleGroupBarDrop(e: DragEvent) {
    e.preventDefault();
    this.isGroupDropOver = false;
    if (!this.draggingField) return;
    const col = this.columns.find((c) => c.field === this.draggingField);
    if (col?.groupable && !this.groupByFields.includes(col.field)) {
      this.groupByFields = [...this.groupByFields, col.field];
      this.collapsedGroups = new Set();
    }
    this.handleColDragEnd();
  }

  // --- Column Resizing ---
  private startResize(e: PointerEvent, col: ColumnConfig) {
    e.preventDefault();
    e.stopPropagation();
    this.resizingField = col.field;
    this.resizeStartX = e.clientX;
    this.resizeStartWidth = this.columnWidths[col.field] || col.width;
    window.addEventListener('pointermove', this.handleResizeMove);
    window.addEventListener('pointerup', this.handleResizeEnd);
  }

  private handleResizeMove = (e: PointerEvent) => {
    if (!this.resizingField) return;
    const col = this.columns.find((c) => c.field === this.resizingField);
    const minW = col?.minWidth || 70;
    const delta = e.clientX - this.resizeStartX;
    const nextWidth = Math.max(minW, this.resizeStartWidth + delta);
    this.columnWidths = { ...this.columnWidths, [this.resizingField]: nextWidth };
  };

  private handleResizeEnd = () => {
    this.resizingField = null;
    window.removeEventListener('pointermove', this.handleResizeMove);
    window.removeEventListener('pointerup', this.handleResizeEnd);
  };

  // --- Selection & Actions ---
  private handleRowTitleClick(task: Task) {
    if (this.rows === undefined && task.id) {
      store.openTaskDetail(task.id);
    } else {
      this.dispatchEvent(
        new CustomEvent('row-click', { detail: { row: task }, bubbles: true, composed: true })
      );
    }
  }

  private toggleSelectAll(rows: Record<string, unknown>[]) {
    const allSelected =
      rows.length > 0 && rows.every((r) => this.selectedIds.has(String(r.id || '')));
    const next = new Set(this.selectedIds);
    if (allSelected) {
      rows.forEach((r) => next.delete(String(r.id || '')));
    } else {
      rows.forEach((r) => next.add(String(r.id || '')));
    }
    this.selectedIds = next;
  }

  private toggleRowSelect(id: string) {
    const next = new Set(this.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds = next;
  }

  private cycleStatus(task: Task) {
    const order = ['backlog', 'todo', 'in_progress', 'review', 'done'] as const;
    const currIdx = order.indexOf(task.status);
    const nextStatus = order[(currIdx + 1) % order.length];
    store.moveTaskStatus(task.id, nextStatus);
  }

  private bulkMarkDone() {
    store.bulkUpdateStatus(Array.from(this.selectedIds), 'done');
    this.selectedIds = new Set();
  }

  private bulkDelete() {
    if (this.selectedIds.size === 0) return;
    this.confirmBulkDeleteOpen = true;
  }

  private doBulkDelete() {
    store.bulkDeleteTasks(Array.from(this.selectedIds));
    this.selectedIds = new Set();
    this.confirmBulkDeleteOpen = false;
  }

  private toggleColumnVisibility(field: string) {
    const next = new Set(this.hiddenColumns);
    if (next.has(field)) next.delete(field);
    else next.add(field);
    this.hiddenColumns = next;
  }

  private exportCsv() {
    const cols = this.orderedVisibleColumns;
    const headers = cols.map((c) => `"${c.header.replace(/"/g, '""')}"`);
    const rows = this.activeRows.map((row) =>
      cols.map((c) => {
        const val = row[c.field];
        const str = Array.isArray(val) ? val.join('; ') : String(val ?? '');
        return `"${str.replace(/"/g, '""')}"`;
      })
    );
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projectflow_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    const t = getTranslation(this.currentLang);
    store.addNotification('info', t.common.exportCsv, t.common.exportSuccess);
  }
}

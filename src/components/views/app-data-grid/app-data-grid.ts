import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { store } from '../../../state/store';
import { Task } from '../../../types';
import { getTranslation } from '../../../i18n';
import { effectivePresence } from '../../../domain/presence-tokens';
import '../../common/app-persona/app-persona';
import '../../common/app-progress-bar/app-progress-bar';
import styles from './app-data-grid.css';

// details of the `row-click` and `selection-change` events (AGENTS.md §6)
export interface DataGridRowClickDetail {
  row: Record<string, unknown>;
  id: string;
}

export interface DataGridSelectionChangeDetail {
  selectedIds: string[];
  selectedRows: Record<string, unknown>[];
}
import {
  iconDownload,
  iconTrash,
  iconCheck,
  iconChevronRight,
  iconLayers,
  iconX,
} from '../../common/icons';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-badge/app-badge';
import '../../common/app-toggle-button/app-toggle-button';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-pagination/app-pagination';
import '../../common/app-segmented-switch/app-segmented-switch';
import { eventValue } from '../../common/event-value';
import { AppDataGridColumn, DataGridCellTemplate } from '../../common/app-data-grid-column/app-data-grid-column';
import '../../common/app-data-grid-column/app-data-grid-column';
import { PortalHandle, portalManager } from '../../common/app-modal-portal/app-modal-portal';

export interface GridSortRule {
  field: string;
  direction: 'asc' | 'desc';
}

interface EffectiveSortRule extends GridSortRule {
  isGroupSort: boolean;
}

interface ColumnConfig {
  field: string;
  caption: string;
  width: number;
  minWidth: number;
  sortable: boolean;
  groupable: boolean;
  resizable: boolean;
  reorderable: boolean;
  hidden: boolean;
  hideable: boolean;
  exportable: boolean;
  align: 'left' | 'center' | 'right';
  cellType: string;
  template?: DataGridCellTemplate;
  sortValue?: (row: Record<string, unknown>, value: unknown) => string | number;
  groupFormatter?: (value: unknown) => string;
}

const PRIORITY_ORDER: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
  critical: 5,
};

const STATUS_ORDER: Record<string, number> = {
  backlog: 1,
  draft: 1,
  todo: 2,
  logged: 2,
  pending: 2,
  in_progress: 3,
  submitted: 3,
  approved: 3,
  review: 4,
  implemented: 4,
  reimbursed: 4,
  done: 5,
  verified: 5,
  rejected: 6,
};

const ROW_HEIGHT_COMFORTABLE = 42;
const ROW_HEIGHT_COMPACT = 30;
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
  @property({ type: String, attribute: 'row-key' }) rowKey: string = 'id';
  @property({ type: Array }) selectedKeys?: string[];
  @property({ type: Boolean }) selectable: boolean = true;
  @property({ type: Boolean }) virtual: boolean = true;
  @property({ type: String, attribute: 'empty-text' }) emptyText: string = '';
  @property({ type: String, attribute: 'export-filename' }) exportFilename: string = 'projectflow_export';
  /** Comma-separated fields for multi-level grouping, e.g. "status,priority" */
  @property({ type: String, attribute: 'group-by' }) groupBy: string = '';
  /** Comma-separated rules for multi-column sorting, e.g. "priority:desc,dates:asc" */
  @property({ type: String, attribute: 'sort-by' }) sortBy: string = '';
  /** Compact high-density grid mode with tighter rows and cells */
  @property({ type: Boolean }) compact?: boolean;
  /** Hides the internal density switch for views that own the display-mode row */
  @property({ type: Boolean, attribute: 'hide-density-switch' }) hideDensitySwitch: boolean = false;

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
  @state() private localCompact: boolean | null = null;

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

  private defaultHiddenByField = new Map<string, boolean>();
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
        ${this.columns
          .filter((col) => col.hideable && col.caption.trim() !== '')
          .map((col) => {
            const isVisible = !this.hiddenColumns.has(col.field);
            return html`
              <app-checkbox
                ?checked="${isVisible}"
                label="${col.caption}"
                @change="${() => this.toggleColumnVisibility(col.field)}"
              ></app-checkbox>
            `;
          })}
      </div>
    `;
  }

  willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('selectedKeys') && this.selectedKeys !== undefined) {
      const incoming = new Set(this.selectedKeys);
      const same =
        incoming.size === this.selectedIds.size &&
        Array.from(incoming).every((id) => this.selectedIds.has(id));
      if (!same) {
        this.selectedIds = incoming;
      }
    }
    if (changed.has('groupBy')) {
      this.groupByFields = this.groupBy
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      this.collapsedGroups = new Set();
    }
    if (changed.has('compact')) {
      this.localCompact = null;
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
    // Виртуальное окно — производное значение: пересчитывается в willUpdate(),
    // чтобы сет @state не планировал второй цикл после updated()
    // (lit dev-mode «change-in-update»). Рендер того же цикла использует окно.
    if (
      changed.has('sortRules') ||
      changed.has('groupByFields') ||
      changed.has('virtual') ||
      changed.has('rows') ||
      changed.has('storeTasks') ||
      changed.has('collapsedGroups') ||
      changed.has('currentDensity') ||
      changed.has('compact') ||
      changed.has('localCompact')
    ) {
      if (changed.has('sortRules') || changed.has('groupByFields') || changed.has('virtual')) {
        this.currentScrollTop = 0;
      }
      this.recomputeVirtualWindow();
    }
  }

  firstUpdated() {
    // Чтение слотов и окна — вне цикла первого обновления (микрозадача выполняется
    // до paint): сет columns/viewportHeight/vis*Row внутри firstUpdated()
    // планировал второй цикл.
    queueMicrotask(() => {
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
    });
  }

  updated(changed: Map<PropertyKey, unknown>) {
    this.classList.toggle('is-compact', this.isCompactMode);
    this.style.setProperty('--grid-row-height', `${this.rowHeightPx}px`);

    if (
      changed.has('sortRules') ||
      changed.has('groupByFields') ||
      changed.has('virtual')
    ) {
      // DOM-сброс скролла (не реактивный) — окно пересчитано в willUpdate().
      const container = this.shadowRoot?.querySelector('.table-container') as HTMLElement | null;
      if (container) {
        container.scrollTop = 0;
      }
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

  private get isCompactMode(): boolean {
    return this.localCompact ?? this.compact ?? (this.currentDensity === 'compact');
  }

  private get rowHeightPx(): number {
    return this.isCompactMode ? ROW_HEIGHT_COMPACT : ROW_HEIGHT_COMFORTABLE;
  }

  private syncState() {
    if (this.rows === undefined && store.activeView === 'grid') {
      this.currentPage = store.activePage;
    }
    this.storeTasks = store.getFilteredTasks();
    this.currentLang = store.customization.language;
    this.currentDensity = store.customization.density;
    this.rowsPerPage = store.customization.tablePageSize;
    this.style.setProperty('--grid-row-height', `${this.rowHeightPx}px`);
  }

  private readSlottedColumns() {
    const slot = this.shadowRoot?.querySelector('.columns-slot-hidden > slot') as HTMLSlotElement | null;
    if (!slot) return;

    const assigned = slot
      .assignedElements({ flatten: true })
      .filter((el) => {
        const tag = el.tagName.toLowerCase();
        return tag === 'app-data-grid-column' || tag === 'data-grid-column';
      }) as (AppDataGridColumn & {
        caption?: string;
        header?: string;
        visible?: boolean;
        hideable?: boolean;
        exportable?: boolean;
        template?: DataGridCellTemplate;
        renderer?: DataGridCellTemplate;
        sortValue?: (row: Record<string, unknown>, value: unknown) => string | number;
        getEffectiveCaption?: () => string;
        getEffectiveHidden?: () => boolean;
        getEffectiveTemplate?: () => DataGridCellTemplate | undefined;
      })[];

    const parsed: ColumnConfig[] = assigned.map((col) => {
      const caption = col.getEffectiveCaption
        ? col.getEffectiveCaption()
        : col.caption || col.header || col.field;
      const isHidden = col.getEffectiveHidden
        ? col.getEffectiveHidden()
        : Boolean(col.hidden) || col.visible === false;
      const tpl = col.getEffectiveTemplate
        ? col.getEffectiveTemplate()
        : col.template ?? col.renderer;
      return {
        field: col.field,
        caption,
        width: col.width || 150,
        minWidth: col.minWidth || 70,
        sortable: Boolean(col.sortable),
        groupable: Boolean(col.groupable),
        resizable: col.resizable !== false,
        reorderable: col.reorderable !== false,
        hidden: isHidden,
        hideable: col.hideable !== false && col.field !== '_actions',
        exportable: col.exportable !== false && col.field !== '_actions',
        align: col.align || 'left',
        cellType: col.cellType || 'text',
        template: tpl,
        sortValue: col.sortValue,
        groupFormatter: col.groupFormatter,
      };
    });

    this.columns = parsed;

    const newFields = parsed.map((c) => c.field);
    const keptOrder = this.columnOrder.filter((f) => newFields.includes(f));
    const addedFields = newFields.filter((f) => !keptOrder.includes(f));
    this.columnOrder = [...keptOrder, ...addedFields];

    const widths = { ...this.columnWidths };
    const nextHidden = new Set(this.hiddenColumns);
    for (const c of parsed) {
      if (!widths[c.field]) {
        widths[c.field] = c.width;
      }
      const prevDefault = this.defaultHiddenByField.get(c.field);
      if (prevDefault === undefined || prevDefault !== c.hidden) {
        this.defaultHiddenByField.set(c.field, c.hidden);
        if (c.hidden) nextHidden.add(c.field);
        else nextHidden.delete(c.field);
      }
    }
    this.columnWidths = widths;
    this.hiddenColumns = nextHidden;
  }

  private get orderedVisibleColumns(): ColumnConfig[] {
    return this.columnOrder
      .map((field) => this.columns.find((c) => c.field === field))
      .filter((c): c is ColumnConfig => Boolean(c && !this.hiddenColumns.has(c.field)));
  }

  private get activeRows(): Record<string, unknown>[] {
    return this.rows ?? (this.storeTasks as unknown as Record<string, unknown>[]);
  }

  private resolveFieldValue(row: Record<string, unknown>, field: string): unknown {
    if (!field) return undefined;
    if (field in row) return row[field];
    if (!field.includes('.')) return undefined;
    return field.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, row);
  }

  private getRowId(row: Record<string, unknown>, fallbackIndex = 0): string {
    const raw = this.resolveFieldValue(row, this.rowKey) ?? row.id;
    return raw !== undefined && raw !== null && raw !== '' ? String(raw) : `row-${fallbackIndex}`;
  }

  /**
   * Keyed-render key: base = row-key value (default 'id'), fallback row-<idx>.
   * Duplicate explicit values get a deterministic #N suffix so Lit repeat never
   * throws "multiple keys"; rows without any key keep positional behavior.
   */
  private nextUniqueKey(seen: Map<string, number>, base: string): string {
    const count = seen.get(base);
    if (count === undefined) {
      seen.set(base, 1);
      return base;
    }
    seen.set(base, count + 1);
    return `${base}#${count + 1}`;
  }

  private uniqueKeys(rows: Record<string, unknown>[], prefix = ''): string[] {
    const seen = new Map<string, number>();
    return rows.map((row, idx) => this.nextUniqueKey(seen, `${prefix}${this.getRowId(row, idx)}`));
  }

  /**
   * Group columns MUST be sorted first in group hierarchy order, followed by
   * all remaining active sort rules.
   */
  private getEffectiveSortRules(): EffectiveSortRule[] {
    const rules: EffectiveSortRule[] = [];
    const seenGroupFields = new Set<string>();

    for (const gField of this.groupByFields) {
      if (seenGroupFields.has(gField)) continue;
      seenGroupFields.add(gField);
      const explicit = this.sortRules.find((r) => r.field === gField);
      rules.push({
        field: gField,
        direction: explicit ? explicit.direction : 'asc',
        isGroupSort: true,
      });
    }

    for (const rule of this.sortRules) {
      if (!seenGroupFields.has(rule.field)) {
        rules.push({
          ...rule,
          isGroupSort: false,
        });
      }
    }

    return rules;
  }

  private getSortedRows(): Record<string, unknown>[] {
    const allRows = this.activeRows;
    const effectiveRules = this.getEffectiveSortRules();
    if (effectiveRules.length === 0) return [...allRows];
    return [...allRows].sort((a, b) => {
      for (const rule of effectiveRules) {
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
    const seen = new Map<string, number>();
    if (this.groupByFields.length === 0) {
      return sortedRows.map((row, idx) => ({
        kind: 'data',
        key: this.nextUniqueKey(seen, this.getRowId(row, idx)),
        row,
      }));
    }

    const items: VirtualRowItem[] = [];
    const appendGroupLevel = (subset: Record<string, unknown>[], level: number, parentPath: string) => {
      const field = this.groupByFields[level];
      const groupCol = this.columns.find((c) => c.field === field);
      const groups = new Map<string, Record<string, unknown>[]>();

      for (const row of subset) {
        const key = String(this.resolveFieldValue(row, field) ?? '—');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }

      const fieldSort = this.sortRules.find((r) => r.field === field);
      const dir = fieldSort ? fieldSort.direction : 'asc';
      const entries = Array.from(groups.entries()).sort(([, rowsA], [, rowsB]) => {
        const cmp = this.compareByField(rowsA[0], rowsB[0], field);
        return dir === 'asc' ? cmp : -cmp;
      });

      const hasChildLevel = level + 1 < this.groupByFields.length;

      for (const [groupKey, groupRows] of entries) {
        const groupPath = parentPath ? `${parentPath}|${field}=${groupKey}` : `${field}=${groupKey}`;
        const isCollapsed = this.collapsedGroups.has(groupPath);
        const displayLabel = groupCol?.groupFormatter
          ? groupCol.groupFormatter(groupKey)
          : this.formatGroupValue(field, groupKey, t);

        items.push({
          kind: 'group',
          key: this.nextUniqueKey(seen, `grp:${groupPath}`),
          level,
          groupPath,
          fieldLabel: groupCol?.caption || field,
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
                key: this.nextUniqueKey(seen, `${groupPath}|${this.getRowId(row, i)}`),
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
    // Every tbody tr carries a 1px border-bottom under border-collapse, so the real
    // pitch of a rendered row is rowH + 1 while spacer rows have no border. Virtual
    // geometry must use the pitch: with plain rowH the computed scroll height is
    // smaller than the real one, and clamping scrollTop to it makes the last rows
    // unreachable (the shortfall grows with the row count). The rowH added to
    // maxScrollTop approximates the sticky thead, which is not taller than a row,
    // so the clamp never fires below the true maximum scroll.
    const pitch = rowH + 1;
    const maxScrollTop = Math.max(0, rowH + totalCount * pitch - this.viewportHeight);
    if (this.currentScrollTop > maxScrollTop) {
      this.currentScrollTop = maxScrollTop;
      const container = this.shadowRoot?.querySelector('.table-container') as HTMLElement | null;
      if (container && container.scrollTop > maxScrollTop) {
        container.scrollTop = maxScrollTop;
      }
    }
    const effectiveScrollTop = Math.max(0, this.currentScrollTop - rowH);
    const rawStart = Math.floor(effectiveScrollTop / pitch);
    const rawEnd = Math.ceil((this.currentScrollTop + this.viewportHeight) / pitch);
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

  private renderSortIndicator(field: string, rules: EffectiveSortRule[], t: ReturnType<typeof getTranslation>) {
    const sortIdx = rules.findIndex((r) => r.field === field);
    if (sortIdx === -1) return '';
    const sortRule = rules[sortIdx];
    return html`
      <span class="sort-indicator ${sortRule.isGroupSort ? 'is-group-sort' : ''}">
        ${sortRule.direction === 'asc'
          ? html`
              <svg
                class="sort-dir-arrow is-asc"
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="8" y1="13" x2="8" y2="3" />
                <polyline points="4 7 8 3 12 7" />
              </svg>
            `
          : html`
              <svg
                class="sort-dir-arrow is-desc"
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="8" y1="3" x2="8" y2="13" />
                <polyline points="4 9 8 13 12 9" />
              </svg>
            `}
        <span class="sort-order-num">[${sortIdx + 1}]</span>
      </span>
    `;
  }

  private renderGroupIcon(
    isGroupedCol: boolean,
    field: string,
    t: ReturnType<typeof getTranslation>,
    interactive: boolean
  ) {
    // In the column header the indicator is a real control: clicking it toggles
    // grouping for this column (the same add/remove the dropbar chips do).
    // stopPropagation keeps the click from reaching the th's sort handler. In the
    // group chips the icon stays decorative — the chip has its own remove button.
    const hint = interactive
      ? isGroupedCol
        ? t.grid.groupIconRemoveHint
        : t.grid.groupIconAddHint
      : t.grid.sortGroupHint;
    return html`
      <span
        class="th-group-icon ${isGroupedCol ? 'is-grouped' : ''}"
        role="${interactive ? 'button' : 'presentation'}"
        tabindex="${interactive ? '0' : '-1'}"
        aria-label="${hint}"
        title="${hint}"
        @click="${interactive
          ? (e: MouseEvent) => {
              e.stopPropagation();
              this.toggleColumnGroup(field);
            }
          : (e: Event) => e.stopPropagation()}"
        @keydown="${interactive
          ? (e: KeyboardEvent) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              e.stopPropagation();
              this.toggleColumnGroup(field);
            }
          : null}"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          aria-hidden="true"
        >
          <rect x="2" y="2.5" width="12" height="11" rx="1.75" />
          <line x1="2" y1="6.2" x2="14" y2="6.2" />
          <line x1="6.5" y1="6.2" x2="6.5" y2="13.5" />
        </svg>
      </span>
    `;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const activeCols = this.orderedVisibleColumns;
    const allRows = this.activeRows;
    const sortedRows = this.getSortedRows();
    const effectiveSortRules = this.getEffectiveSortRules();

    const isGrouped = this.groupByFields.length > 0;
    const virtualItems = this.virtual ? this.buildVirtualItems(sortedRows, t) : [];
    const totalVirtualCount = virtualItems.length;

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / this.rowsPerPage));
    const safePage = Math.min(this.currentPage, totalPages);
    const startIndex = (safePage - 1) * this.rowsPerPage;
    const paginatedRows = isGrouped
      ? sortedRows
      : sortedRows.slice(startIndex, startIndex + this.rowsPerPage);
    const paginatedKeys = this.uniqueKeys(paginatedRows);

    const selectionScope = this.virtual || isGrouped ? sortedRows : paginatedRows;
    const allCurrentSelected =
      selectionScope.length > 0 &&
      selectionScope.every((r, i) => this.selectedIds.has(this.getRowId(r, i)));
    const someCurrentSelected = selectionScope.some((r, i) =>
      this.selectedIds.has(this.getRowId(r, i))
    );

    const availableGroupCols = this.columns.filter(
      (c) => c.groupable && !this.groupByFields.includes(c.field)
    );

    const hasHideableCols = this.columns.some((c) => c.hideable && c.caption.trim() !== '');
    const isTaskStoreMode = this.rows === undefined;

    return html`
      <div class="columns-slot-hidden">
        <slot @slotchange="${this.readSlottedColumns}"></slot>
      </div>

      <div class="grid-toolbar">
        <div class="toolbar-left">
          ${this.selectable && this.selectedIds.size > 0
            ? html`
                <span class="bulk-badge">${this.selectedIds.size} ${t.grid.selected}</span>
                ${isTaskStoreMode
                  ? html`
                      <app-button size="sm" variant="secondary" @click="${this.bulkMarkDone}">
                        <span slot="icon-start">${iconCheck(14)}</span>
                        <span>${t.grid.markDone}</span>
                      </app-button>
                      <app-button size="sm" variant="danger" @click="${this.bulkDelete}">
                        <span slot="icon-start">${iconTrash(14)}</span>
                        <span>${t.grid.deleteSelected}</span>
                      </app-button>
                    `
                  : html`<slot name="bulk-actions"></slot>`}
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
          <slot name="toolbar-actions"></slot>

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
                      (c) => html`<option value="${c.field}">${c.caption}</option>`
                    )}
                  </select>
                </div>
              `
            : ''}

          ${this.hideDensitySwitch
            ? ''
            : html`<app-segmented-switch
                size="sm"
                title="${t.grid.densitySwitchTitle}"
                .value="${this.isCompactMode ? 'compact' : 'standard'}"
                .options="${[
                  { value: 'standard', label: t.grid.standardMode },
                  { value: 'compact', label: t.grid.compactMode },
                ]}"
                @change="${(e: CustomEvent) => {
                  this.localCompact = eventValue(e) === 'compact';
                }}"
              ></app-segmented-switch>`}

          <app-toggle-button
            size="sm"
            ?pressed="${this.virtual}"
            @change="${(e: CustomEvent<{ pressed: boolean }>) => {
              this.virtual = e.detail.pressed;
              this.currentPage = 1;
              if (isTaskStoreMode && store.activeView === 'grid') {
                store.setActivePage(1, false);
              }
            }}"
          >
            ${t.grid.virtualMode}
          </app-toggle-button>

          <app-toggle-button
            size="sm"
            title="${t.grid.sortHint}"
            ?pressed="${this.multiSortEnabled}"
            @change="${(e: CustomEvent<{ pressed: boolean }>) => {
              this.multiSortEnabled = e.detail.pressed;
            }}"
          >
            ${t.grid.multiSort}
          </app-toggle-button>

          ${this.sortRules.some((r) => !this.groupByFields.includes(r.field))
            ? html`
                <app-button
                  size="sm"
                  variant="ghost"
                  title="${t.grid.clearSorts}"
                  @click="${() => {
                    this.sortRules = this.sortRules.filter((r) =>
                      this.groupByFields.includes(r.field)
                    );
                  }}"
                >
                  <span slot="icon-start">${iconX(13)}</span>
                  <span>${t.grid.clearSorts}</span>
                </app-button>
              `
            : ''}

          ${hasHideableCols
            ? html`
                <app-button
                  class="column-visibility-btn"
                  size="sm"
                  variant="outline"
                  @click="${this.toggleColumnMenu}"
                >
                  ${t.grid.columnVisibility}
                </app-button>
              `
            : ''}

          <app-button size="sm" variant="secondary" @click="${this.exportCsv}">
            <span slot="icon-start">${iconDownload(14)}</span>
            <span>${t.common.exportCsv}</span>
          </app-button>
        </div>
      </div>

      <!-- Multi-Level Drag-to-Group Dropbar -->
      ${this.columns.some((c) => c.groupable) || this.groupByFields.length > 0
        ? html`
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
                        const caption = this.columns.find((c) => c.field === field)?.caption || field;
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
                            <span class="group-chip">
                              <span class="group-chip-label">${caption}</span>
                              ${this.renderSortIndicator(field, effectiveSortRules, t)}
                              ${this.renderGroupIcon(true, field, t, false)}
                              <button
                                type="button"
                                class="group-chip-remove"
                                aria-label="${t.grid.clearGroups}"
                                @click="${(e: Event) => {
                                  e.stopPropagation();
                                  this.removeGroupField(field);
                                }}"
                              >
                                ${iconX(11)}
                              </button>
                            </span>
                          </div>
                        `;
                      })}
                    `
                  : html`<span>${t.grid.dragHint}</span>`}
              </div>

              ${this.groupByFields.length > 0
                ? html`
                    <div class="bar-actions">
                      <app-link
                        class="bar-link-btn"
                        size="md"
                        variant="secondary"
                        @click="${() => (this.collapsedGroups = new Set())}"
                      >
                        ${t.grid.expandAll}
                      </app-link>
                      <app-link
                        class="bar-link-btn"
                        size="md"
                        variant="secondary"
                        @click="${() => this.collapseAllGroups(sortedRows)}"
                      >
                        ${t.grid.collapseAll}
                      </app-link>
                      <app-link
                        class="bar-link-btn"
                        size="md"
                        variant="secondary"
                        @click="${() => {
                          this.groupByFields = [];
                          this.collapsedGroups = new Set();
                        }}"
                      >
                        ${t.grid.clearGroups}
                      </app-link>
                    </div>
                  `
                : ''}
            </div>
          `
        : ''}

      <div class="table-container" @scroll="${this.handleTableScroll}">
        <table>
          <colgroup>
            ${this.selectable
              ? html`<col style="width: ${this.isCompactMode ? 38 : 46}px;" />`
              : ''}
            ${activeCols.map((col) => {
              const width = this.columnWidths[col.field] || col.width;
              return html`<col style="width: ${width}px;" />`;
            })}
          </colgroup>
          <thead>
            <tr>
              ${this.selectable
                ? html`
                    <th
                      class="select-col"
                      style="width: ${this.isCompactMode ? 38 : 46}px;"
                    >
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
                const sortIdx = effectiveSortRules.findIndex((r) => r.field === col.field);
                const sortRule = sortIdx !== -1 ? effectiveSortRules[sortIdx] : null;
                const isGroupedCol = this.groupByFields.includes(col.field);
                const canClickSort = col.sortable || isGroupedCol;
                const sortClasses = sortRule
                  ? `is-sorted ${sortRule.isGroupSort ? 'is-group-sort' : ''}`
                  : '';
                const headerTitle = sortRule
                  ? `${col.caption} ${sortRule.direction === 'asc' ? '↑' : '↓'} [${sortIdx + 1}]${sortRule.isGroupSort ? ` · ${t.grid.sortGroupHint}` : ''}`
                  : canClickSort
                  ? `${col.caption} (${t.grid.sortHint})`
                  : col.caption;

                return html`
                  <th
                    style="width: ${width}px; text-align: ${col.align};"
                    class="${canClickSort ? 'is-sortable' : ''} ${sortClasses} ${isDragging ? 'is-dragging' : ''} ${dropClass}"
                    aria-sort="${sortRule ? (sortRule.direction === 'asc' ? 'ascending' : 'descending') : 'none'}"
                    title="${headerTitle}"
                    draggable="${col.reorderable && !this.resizingField ? 'true' : 'false'}"
                    @click="${(e: MouseEvent) => canClickSort && this.handleSort(col.field, e.shiftKey)}"
                    @dragstart="${(e: DragEvent) => this.handleColDragStart(e, col)}"
                    @dragover="${(e: DragEvent) => this.handleColDragOver(e, col)}"
                    @dragleave="${() => {
                      if (this.dropTargetField === col.field) this.dropTargetField = null;
                    }}"
                    @drop="${(e: DragEvent) => this.handleColDrop(e, col)}"
                    @dragend="${this.handleColDragEnd}"
                  >
                    <div class="th-content align-${col.align}">
                      <div class="th-main">
                        <span class="th-label">${col.caption}</span>
                        ${this.renderSortIndicator(col.field, effectiveSortRules, t)}
                      </div>
                      ${(col.groupable || isGroupedCol) && col.caption.trim() !== ''
                        ? this.renderGroupIcon(isGroupedCol, col.field, t, true)
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
                      ${this.emptyText || t.grid.noMatchingRecords}
                    </td>
                  </tr>
                `
              : this.virtual
              ? this.renderVirtualizedBody(virtualItems, activeCols, t)
              : isGrouped
              ? this.renderGroupLevel(sortedRows, 0, '', activeCols, t)
              : repeat(
                  paginatedRows,
                  (row, idx) => paginatedKeys[idx],
                  (row, idx) => this.renderDataRow(row, activeCols, t, idx),
                )}
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
                  if (isTaskStoreMode && store.activeView === 'grid') {
                    store.setActivePage(e.detail.page);
                  }
                }}"
                @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
                  this.rowsPerPage = e.detail.pageSize;
                  this.currentPage = 1;
                  if (isTaskStoreMode && store.activeView === 'grid') {
                    store.setActivePage(1, false);
                  }
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
    // Spacer heights must match the real row pitch (row box + its 1px border-bottom),
    // exactly as recomputeVirtualWindow counts them; otherwise the scroll range and
    // the window indices drift apart and the tail rows never enter the window.
    const pitch = this.rowHeightPx + 1;
    const topPx = start * pitch;
    const bottomPx = Math.max(0, (total - end) * pitch);
    const colSpan = activeCols.length + (this.selectable ? 1 : 0);

    return html`
      ${topPx > 0
        ? html`<tr class="virtual-spacer-row" aria-hidden="true" style="height: ${topPx}px;"><td colspan="${colSpan}"></td></tr>`
        : ''}
      ${repeat(slice, (item) => item.key, (item, idx) => {
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
        return this.renderDataRow(item.row, activeCols, t, idx);
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
  ): unknown[] {
    const field = this.groupByFields[level];
    const groupCol = this.columns.find((c) => c.field === field);
    const groups = new Map<string, Record<string, unknown>[]>();

    for (const row of rows) {
      const raw = this.resolveFieldValue(row, field);
      const key = String(raw ?? '—');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    // Order group headers using group column sort rule (defaults to ascending)
    const fieldSort = this.sortRules.find((r) => r.field === field);
    const dir = fieldSort ? fieldSort.direction : 'asc';
    const entries = Array.from(groups.entries()).sort(([, rowsA], [, rowsB]) => {
      const cmp = this.compareByField(rowsA[0], rowsB[0], field);
      return dir === 'asc' ? cmp : -cmp;
    });

    const colSpan = activeCols.length + (this.selectable ? 1 : 0);
    const hasChildLevel = level + 1 < this.groupByFields.length;

    return [
      repeat(
        entries,
        ([groupKey]) => `${parentPath ? `${parentPath}|${field}=${groupKey}` : `${field}=${groupKey}`}`,
        ([groupKey, groupRows]) => {
          const groupPath = parentPath ? `${parentPath}|${field}=${groupKey}` : `${field}=${groupKey}`;
          const isCollapsed = this.collapsedGroups.has(groupPath);
          const displayLabel = groupCol?.groupFormatter
            ? groupCol.groupFormatter(groupKey)
            : this.formatGroupValue(field, groupKey, t);
          const levelClass = `level-${Math.min(level, 3)}`;
          const indentPx = 14 + level * 22;
          const groupRowKeys = this.uniqueKeys(groupRows, `${groupPath}|`);

          return html`
            <tr class="group-row ${levelClass}" @click="${() => this.toggleGroupCollapse(groupPath)}">
              <td colspan="${colSpan}" class="group-cell" style="padding-left: ${indentPx}px;">
                <div class="group-header-inner">
                  <span class="group-chevron ${!isCollapsed ? 'is-expanded' : ''}">
                    ${iconChevronRight(14)}
                  </span>
                  <span class="group-field-label">${groupCol?.caption || field}:</span>
                  <span>${displayLabel}</span>
                  <app-badge size="sm" variant="neutral">${groupRows.length}</app-badge>
                </div>
              </td>
            </tr>
            ${!isCollapsed
              ? hasChildLevel
                ? this.renderGroupLevel(groupRows, level + 1, groupPath, activeCols, t)
                : repeat(
                    groupRows,
                    (row, idx) => groupRowKeys[idx],
                    (row, idx) => this.renderDataRow(row, activeCols, t, idx),
                  )
              : ''}
          `;
        },
      ),
    ];
  }

  private renderDataRow(
    row: Record<string, unknown>,
    activeCols: ColumnConfig[],
    t: ReturnType<typeof getTranslation>,
    rowIdx: number = 0
  ) {
    const rowId = this.getRowId(row, rowIdx);
    const isChecked = this.selectable && this.selectedIds.has(rowId);

    return html`
      <tr
        class="data-row ${isChecked ? 'is-selected' : ''}"
        @click="${(e: MouseEvent) => this.handleRowClick(e, row, rowId)}"
      >
        ${this.selectable
          ? html`
              <td class="select-col" @click="${(e: Event) => e.stopPropagation()}">
                <app-checkbox
                  ?checked="${isChecked}"
                  @change="${() => this.toggleRowSelect(rowId)}"
                ></app-checkbox>
              </td>
            `
          : ''}

        ${activeCols.map((col) => {
          const val = this.resolveFieldValue(row, col.field);
          return html`
            <td style="text-align: ${col.align};">
              ${col.template ? col.template(row, val) : this.renderBuiltInCell(col, row, val, t)}
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
        // The name lives inside app-persona as primaryText (the component renders it next to the
        // avatar, truncates it with its own ellipsis and tooltip, and composes the accessible
        // name as "name — presence"). Unassigned rows keep the placeholder avatar with no text.
        return html`
          <div class="assignee-chip">
            <app-persona
              size="24"
              .initials="${assignee ? assignee.avatar : '?'}"
              .primaryText="${assignee ? assignee.name : ''}"
              .presence="${assignee ? effectivePresence(assignee) : 'none'}"
              .interactive="${false}"
            ></app-persona>
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
    if (field === 'assigneeId' || field === 'userId') {
      return store.users.find((u) => u.id === value)?.name || t.taskModal.unassigned;
    }
    if (field === 'projectId') {
      return store.projects.find((p) => p.id === value)?.name || value;
    }
    return value;
  }

  private getSortValue(row: Record<string, unknown>, field: string): string | number {
    const col = this.columns.find((c) => c.field === field);
    const val = this.resolveFieldValue(row, field);

    if (col?.sortValue) {
      return col.sortValue(row, val);
    }
    if (field === 'dates' || col?.cellType === 'dates') {
      return String(row.dueDate || val || '');
    }
    if (col?.cellType === 'priority') {
      const key = String(val || '');
      if (key in PRIORITY_ORDER) return PRIORITY_ORDER[key];
    }
    if (col?.cellType === 'status') {
      const key = String(val || '');
      if (key in STATUS_ORDER) return STATUS_ORDER[key];
    }
    if (col?.cellType === 'progress') {
      const task = row as unknown as Task;
      if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        return task.subtasks.filter((s) => s.completed).length / task.subtasks.length;
      }
      if (typeof val === 'number') return val;
      return task.status === 'done' ? 1 : 0;
    }
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 1 : 0;
    return String(val ?? '').toLowerCase();
  }

  private compareByField(a: Record<string, unknown>, b: Record<string, unknown>, field: string): number {
    const valA = this.getSortValue(a, field);
    const valB = this.getSortValue(b, field);
    if (typeof valA === 'number' && typeof valB === 'number') {
      return valA - valB;
    }
    return String(valA).localeCompare(String(valB), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  private handleSort(field: string, shiftKey: boolean) {
    const isMulti = shiftKey || this.multiSortEnabled;
    const isGroupedField = this.groupByFields.includes(field);
    const existingIdx = this.sortRules.findIndex((r) => r.field === field);

    if (isGroupedField) {
      const currDir = existingIdx !== -1 ? this.sortRules[existingIdx].direction : 'asc';
      const nextDir: 'asc' | 'desc' = currDir === 'asc' ? 'desc' : 'asc';
      const next = [...this.sortRules];
      if (existingIdx === -1) {
        next.push({ field, direction: nextDir });
      } else {
        next[existingIdx] = { field, direction: nextDir };
      }
      this.sortRules = next;
      return;
    }

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
      // Keep any explicit sort directions on grouped columns while toggling/replacing the clicked rule
      const preservedGroupRules = this.sortRules.filter((r) => this.groupByFields.includes(r.field));
      const nonGroupRules = this.sortRules.filter((r) => !this.groupByFields.includes(r.field));
      if (nonGroupRules.length === 1 && nonGroupRules[0].field === field) {
        if (nonGroupRules[0].direction === 'asc') {
          this.sortRules = [...preservedGroupRules, { field, direction: 'desc' }];
        } else {
          this.sortRules = [...preservedGroupRules];
        }
      } else {
        this.sortRules = [...preservedGroupRules, { field, direction: 'asc' }];
      }
    }
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
        const key = String(this.resolveFieldValue(r, field) ?? '—');
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

  private toggleColumnGroup(field: string) {
    if (this.groupByFields.includes(field)) {
      this.removeGroupField(field);
      return;
    }
    const col = this.columns.find((c) => c.field === field);
    if (col?.groupable) {
      this.groupByFields = [...this.groupByFields, field];
    }
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
  private handleRowClick(e: MouseEvent, row: Record<string, unknown>, rowId: string) {
    if (this.rows === undefined) return;
    const path = e.composedPath();
    const isInteractive = path.some((node) => {
      if (!(node instanceof Element)) return false;
      const tag = node.tagName.toLowerCase();
      return (
        tag === 'button' ||
        tag === 'a' ||
        tag === 'input' ||
        tag === 'select' ||
        tag === 'textarea' ||
        tag === 'app-button' ||
        tag === 'app-checkbox' ||
        tag === 'app-link' ||
        node.hasAttribute('data-no-row-click')
      );
    });
    if (isInteractive) return;
    this.dispatchEvent(
      new CustomEvent<DataGridRowClickDetail>('row-click', {
        detail: { row, id: rowId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleRowTitleClick(task: Task) {
    if (this.rows === undefined && task.id) {
      store.openTaskDetail(task.id);
    } else {
      this.dispatchEvent(
        new CustomEvent<DataGridRowClickDetail>('row-click', {
          detail: { row: task as unknown as Record<string, unknown>, id: this.getRowId(task as unknown as Record<string, unknown>) },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private emitSelectionChange() {
    const selectedIds = Array.from(this.selectedIds);
    const selectedRows = this.activeRows.filter((r, i) =>
      this.selectedIds.has(this.getRowId(r, i))
    );
    this.dispatchEvent(
      new CustomEvent<DataGridSelectionChangeDetail>('selection-change', {
        detail: { selectedIds, selectedRows },
        bubbles: true,
        composed: true,
      })
    );
  }

  private toggleSelectAll(rows: Record<string, unknown>[]) {
    const allSelected =
      rows.length > 0 && rows.every((r, i) => this.selectedIds.has(this.getRowId(r, i)));
    const next = new Set(this.selectedIds);
    if (allSelected) {
      rows.forEach((r, i) => next.delete(this.getRowId(r, i)));
    } else {
      rows.forEach((r, i) => next.add(this.getRowId(r, i)));
    }
    this.selectedIds = next;
    this.emitSelectionChange();
  }

  private toggleRowSelect(id: string) {
    const next = new Set(this.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds = next;
    this.emitSelectionChange();
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
    this.emitSelectionChange();
  }

  private bulkDelete() {
    if (this.selectedIds.size === 0) return;
    this.confirmBulkDeleteOpen = true;
  }

  private doBulkDelete() {
    store.bulkDeleteTasks(Array.from(this.selectedIds));
    this.selectedIds = new Set();
    this.confirmBulkDeleteOpen = false;
    this.emitSelectionChange();
  }

  private toggleColumnVisibility(field: string) {
    const next = new Set(this.hiddenColumns);
    if (next.has(field)) next.delete(field);
    else next.add(field);
    this.hiddenColumns = next;
  }

  private exportCsv() {
    const cols = this.orderedVisibleColumns.filter((c) => c.exportable);
    const headers = cols.map((c) => `"${c.caption.replace(/"/g, '""')}"`);
    const rows = this.activeRows.map((row) =>
      cols.map((c) => {
        const val = this.resolveFieldValue(row, c.field);
        const str = Array.isArray(val) ? val.join('; ') : String(val ?? '');
        return `"${str.replace(/"/g, '""')}"`;
      })
    );
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.exportFilename || 'projectflow_export'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    const t = getTranslation(this.currentLang);
    store.addNotification('info', t.common.exportCsv, t.common.exportSuccess);
  }
}

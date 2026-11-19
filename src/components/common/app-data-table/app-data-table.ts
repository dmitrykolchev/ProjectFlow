import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../app-empty-state/app-empty-state';
import '../app-pagination/app-pagination';
import '../app-table-column/app-table-column';
import { AppTableColumn } from '../app-table-column/app-table-column';
import { paginateItems } from '../paginate';
import styles from './app-data-table.css';

export type SortDirection = 'asc' | 'desc';

export interface DataTableSortChangeDetail {
  field: string;
  dir: SortDirection;
}

export interface DataTablePageChangeDetail {
  page: number;
  pageSize: number;
  totalItems: number;
}

/**
 * A data table with a fixed header and footer. Columns are declared as child
 * app-table-column elements (field-driven formatting, mono/code cells,
 * custom cellRender for rich cells and row actions). Sorting is internal: clicking
 * a sortable header sorts the rows and emits sort-change. Pagination is internal
 * too: rows are sliced by page-size, and the footer shows app-pagination whenever
 * there is more than one page. By default the table stretches to display every
 * rendered row; setting max-height caps the host, so the body gets its own
 * scrollbar while the header and footer stay in place.
 */
@customElement('app-data-table')
export class AppDataTable extends LitElement {
  @property({ attribute: false }) rows: Record<string, unknown>[] = [];
  @property({ type: Number, attribute: 'page-size' }) pageSize: number = 10;
  @property({ type: Number }) page: number = 1;
  @property({ type: String, attribute: 'sort-by' }) sortBy: string = '';
  @property({ type: String, attribute: 'sort-dir' }) sortDir: SortDirection = 'asc';
  @property({ type: Number, attribute: 'max-height' }) maxHeight: number = 0;
  @property({ type: String, attribute: 'empty-title' }) emptyTitle: string = '';
  @property({ type: String }) locale: string = 'ru-RU';

  @state() private currentPage: number = 1;

  static styles = styles;

  private columns: AppTableColumn[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('column-change', this.onColumnChange);
  }

  disconnectedCallback() {
    this.removeEventListener('column-change', this.onColumnChange);
    super.disconnectedCallback();
  }

  private onColumnChange = () => {
    this.syncColumns();
    this.requestUpdate();
  };

  private syncColumns() {
    this.columns = Array.from(
      this.querySelectorAll(':scope > app-table-column')
    ) as AppTableColumn[];
  }

  updated(changed: Map<PropertyKey, unknown>) {
    // The cap lives on the host so the header/footer shells stay fixed while the
    // body flexes and scrolls inside it.
    this.style.setProperty('max-height', this.maxHeight > 0 ? `${this.maxHeight}px` : 'none');
    if (changed.has('page')) {
      this.currentPage = Math.max(1, this.page);
    }
  }

  private sortedRows(): Record<string, unknown>[] {
    const rows = [...this.rows];
    if (!this.sortBy) return rows;
    const field = this.sortBy;
    const dir = this.sortDir === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''), this.locale);
      return cmp * dir;
    });
    return rows;
  }

  private toggleSort(col: AppTableColumn) {
    if (this.sortBy === col.field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = col.field;
      this.sortDir = 'asc';
    }
    this.dispatchEvent(
      new CustomEvent<DataTableSortChangeDetail>('sort-change', {
        detail: { field: col.field, dir: this.sortDir },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handlePageChange(e: CustomEvent<{ page: number }>) {
    e.stopPropagation();
    this.currentPage = e.detail.page;
    this.dispatchEvent(
      new CustomEvent<DataTablePageChangeDetail>('page-change', {
        detail: { page: e.detail.page, pageSize: this.pageSize, totalItems: this.rows.length },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handlePageSizeChange(e: CustomEvent<{ pageSize: number }>) {
    e.stopPropagation();
    this.pageSize = e.detail.pageSize;
    this.currentPage = 1;
    this.dispatchEvent(
      new CustomEvent<DataTablePageChangeDetail>('page-change', {
        detail: { page: 1, pageSize: this.pageSize, totalItems: this.rows.length },
        bubbles: true,
        composed: true,
      })
    );
    this.dispatchEvent(
      new CustomEvent<DataTablePageChangeDetail>('page-size-change', {
        detail: { page: 1, pageSize: this.pageSize, totalItems: this.rows.length },
        bubbles: true,
        composed: true,
      })
    );
  }

  private formatCellValue(col: AppTableColumn, value: unknown): TemplateResult | string {
    if (value === undefined || value === null || value === '') {
      return html`<span style="color: var(--text-muted);">—</span>`;
    }
    if (col.type === 'boolean') {
      return value
        ? html`<span class="bool-yes">${col.yesLabel}</span>`
        : html`<span class="bool-no">${col.noLabel}</span>`;
    }
    if (col.type === 'select') {
      const opt = col.options.find((o) => o.value === String(value));
      return opt ? opt.label || opt.value : String(value);
    }
    if (col.type === 'number') {
      const num = typeof value === 'number' ? value : Number(value);
      return num.toLocaleString(this.locale, { maximumFractionDigits: 5 });
    }
    return String(value);
  }

  private headerClass(col: AppTableColumn): string {
    if (col.align === 'right') return 'align-right';
    if (col.align === 'center') return 'align-center';
    return '';
  }

  private cellClass(col: AppTableColumn): string {
    const classes: string[] = [];
    if (col.code) classes.push('cell-code');
    if (col.mono) classes.push('cell-mono');
    if (col.align === 'right') classes.push('align-right');
    else if (col.align === 'center') classes.push('align-center');
    return classes.join(' ');
  }

  render() {
    this.syncColumns();
    const sorted = this.sortedRows();
    const slice = paginateItems(sorted, this.currentPage, this.pageSize);

    return html`
      <div class="table-body">
        ${sorted.length === 0
          ? html`
              <div class="empty-wrap">
                <app-empty-state compact title="${this.emptyTitle}"></app-empty-state>
              </div>
            `
          : html`
              <table class="data-table">
                <thead>
                  <tr>
                    ${this.columns.map(
                      (col) => html`
                        <th class="${this.headerClass(col)}">
                          ${col.sortable
                            ? html`
                                <button
                                  type="button"
                                  class="sort-btn ${this.sortBy === col.field ? 'is-sorted' : ''}"
                                  @click="${() => this.toggleSort(col)}"
                                >
                                  <span>${col.label}</span>
                                  ${this.sortBy === col.field
                                    ? html`<span>${this.sortDir === 'asc' ? '↑' : '↓'}</span>`
                                    : ''}
                                </button>
                              `
                            : col.label}
                        </th>
                      `
                    )}
                  </tr>
                </thead>
                <tbody>
                  ${slice.items.map(
                    (row) => html`
                      <tr>
                        ${this.columns.map(
                          (col) => html`
                            <td class="${this.cellClass(col)}">
                              ${col.cellRender
                                ? col.cellRender(row, col.getCellValue(row))
                                : this.formatCellValue(col, col.getCellValue(row))}
                            </td>
                          `
                        )}
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            `}
      </div>
      ${slice.totalItems > slice.pageSize
        ? html`
            <div class="table-footer">
              <app-pagination
                total-items="${slice.totalItems}"
                page="${slice.page}"
                page-size="${slice.pageSize}"
                layout-mode="table"
                variant="bare"
                locale="${this.locale}"
                @page-change="${this.handlePageChange}"
                @page-size-change="${this.handlePageSizeChange}"
              ></app-pagination>
            </div>
          `
        : ''}
    `;
  }
}

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../app-empty-state/app-empty-state';
import styles from './app-table-scroll.css';
import { AppTableColumn } from '../app-table-column/app-table-column';

export type SortDirection = 'asc' | 'desc';

export interface SortChangeDetail {
  field: string;
  dir: SortDirection;
}

@customElement('app-table-scroll')
export class AppTableScroll extends LitElement {
  @property({ type: Array, attribute: false }) rows: Record<string, unknown>[] = [];
  @property({ type: String, attribute: 'sort-by' }) sortBy: string = '';
  @property({ type: String, attribute: 'sort-dir' }) sortDir: SortDirection = 'asc';
  @property({ type: String, attribute: 'active-key' }) activeKey: string = 'isActive';
  @property({ type: String, attribute: 'empty-title' }) emptyTitle: string = '';
  @property({ type: String }) locale: string = 'ru-RU';
  @property({ type: Boolean }) striped: boolean = false;

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

  private toggleSort(col: AppTableColumn) {
    if (this.sortBy === col.field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = col.field;
      this.sortDir = 'asc';
    }
    this.dispatchEvent(
      new CustomEvent<SortChangeDetail>('sort-change', {
        detail: { field: col.field, dir: this.sortDir },
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderSortArrow(col: AppTableColumn) {
    if (this.sortBy !== col.field) return '';
    return html`<span>${this.sortDir === 'asc' ? '↑' : '↓'}</span>`;
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
    return html`
      ${this.rows.length === 0
        ? html`
            <div class="empty-wrap">
              <app-empty-state compact title="${this.emptyTitle}"></app-empty-state>
            </div>
          `
        : html`
            <div class="table-scroll">
              <table class="records-table ${this.striped ? 'striped' : ''}">
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
                                  ${this.renderSortArrow(col)}
                                </button>
                              `
                            : col.label}
                        </th>
                      `
                    )}
                  </tr>
                </thead>
                <tbody>
                  ${this.rows.map(
                    (row) => html`
                      <tr class="${this.activeKey && !row[this.activeKey] ? 'is-inactive' : ''}">
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
            </div>
          `}
    `;
  }
}

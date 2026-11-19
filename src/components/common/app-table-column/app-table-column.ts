import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-table-column.css';

export type TableCellType = 'text' | 'number' | 'boolean' | 'select';
export type CellAlign = 'left' | 'center' | 'right';
export type CellRenderFn = (
  row: Record<string, unknown>,
  value: unknown
) => TemplateResult | string | number;

export interface ColumnOption {
  value: string;
  label?: string;
}

@customElement('app-table-column')
export class AppTableColumn extends LitElement {
  @property({ type: String }) field: string = '';
  @property({ type: String }) label: string = '';
  @property({ type: String }) type: TableCellType = 'text';
  @property({ attribute: false }) options: ColumnOption[] = [];
  @property({ type: String }) align: CellAlign = 'left';
  @property({ type: Boolean }) mono: boolean = false;
  @property({ type: Boolean }) code: boolean = false;
  @property({ type: Boolean }) sortable: boolean = false;
  @property({ type: String, attribute: 'yes-label' }) yesLabel: string = '';
  @property({ type: String, attribute: 'no-label' }) noLabel: string = '';
  @property({ attribute: false }) cellRender?: CellRenderFn;
  @property({ attribute: false }) valueFn?: (row: Record<string, unknown>) => unknown;

  static styles = styles;

  getCellValue(row: Record<string, unknown>): unknown {
    if (this.valueFn) return this.valueFn(row);
    return row[this.field];
  }

  private emitColumnChange = () => {
    this.dispatchEvent(
      new CustomEvent('column-change', {
        bubbles: true,
        composed: true,
      })
    );
  };

  updated() {
    this.emitColumnChange();
  }

  render() {
    return html`<slot @slotchange="${this.emitColumnChange}"></slot>`;
  }
}

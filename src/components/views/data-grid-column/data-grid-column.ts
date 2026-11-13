import { LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './data-grid-column.css';

export type DataGridCellType =
  | 'text'
  | 'key'
  | 'title'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'dates'
  | 'progress'
  | 'tags'
  | 'badge';

@customElement('data-grid-column')
export class DataGridColumn extends LitElement {
  @property({ type: String }) field: string = '';
  @property({ type: String }) header: string = '';
  @property({ type: Number }) width: number = 150;
  @property({ type: Number, attribute: 'min-width' }) minWidth: number = 70;
  @property({ type: Boolean }) sortable: boolean = false;
  @property({ type: Boolean }) groupable: boolean = false;
  @property({ type: Boolean }) resizable: boolean = true;
  @property({ type: Boolean }) reorderable: boolean = true;
  @property({ type: Boolean }) visible: boolean = true;
  @property({ type: String }) align: 'left' | 'center' | 'right' = 'left';
  @property({ type: String, attribute: 'cell-type' }) cellType: DataGridCellType = 'text';

  @property({ attribute: false }) renderer?: (row: Record<string, unknown>, value: unknown) => TemplateResult | string;
  @property({ attribute: false }) groupFormatter?: (value: unknown) => string;

  static styles = styles;

  updated() {
    this.dispatchEvent(
      new CustomEvent('column-change', {
        bubbles: true,
        composed: true,
      })
    );
  }
}

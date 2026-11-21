import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-data-grid-column.css';

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

export type DataGridCellTemplate = (
  row: Record<string, unknown>,
  value: unknown
) => TemplateResult | HTMLElement | DocumentFragment | string | number;

const flexibleBooleanConverter = {
  fromAttribute(value: string | null): boolean {
    if (value === null) return false;
    const normalized = value.trim().toLowerCase();
    return normalized !== 'false' && normalized !== '0' && normalized !== 'no';
  },
  toAttribute(value: boolean): string | null {
    return value ? '' : null;
  },
};

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  if (path in obj) return obj[path];
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function interpolateTemplateString(
  raw: string,
  row: Record<string, unknown>,
  value: unknown
): string {
  return raw.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, expr: string) => {
    const key = expr.trim();
    if (key === 'value') return String(value ?? '');
    if (key.startsWith('row.')) return String(resolvePath(row, key.slice(4)) ?? '');
    return String(resolvePath(row, key) ?? '');
  });
}

function hydrateClonedFragment(
  fragment: DocumentFragment,
  row: Record<string, unknown>,
  value: unknown
): DocumentFragment {
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.includes('{{')) {
        node.textContent = interpolateTemplateString(text, row, value);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      for (const attr of Array.from(el.attributes)) {
        if (attr.value.includes('{{')) {
          el.setAttribute(attr.name, interpolateTemplateString(attr.value, row, value));
        }
      }
    }
    node = walker.nextNode();
  }
  return fragment;
}

@customElement('app-data-grid-column')
export class AppDataGridColumn extends LitElement {
  @property({ type: String }) field: string = '';
  @property({ type: String }) caption: string = '';
  @property({ type: String }) header: string = '';
  @property({ type: Number }) width: number = 150;
  @property({ type: Number, attribute: 'min-width' }) minWidth: number = 70;
  @property({ type: Boolean }) sortable: boolean = false;
  @property({ type: Boolean }) groupable: boolean = false;
  @property({ type: Boolean, converter: flexibleBooleanConverter }) resizable: boolean = true;
  @property({ type: Boolean, converter: flexibleBooleanConverter }) reorderable: boolean = true;
  @property({ type: Boolean, reflect: true }) override hidden: boolean = false;
  @property({ type: Boolean, converter: flexibleBooleanConverter }) visible: boolean = true;
  @property({ type: Boolean, converter: flexibleBooleanConverter }) hideable: boolean = true;
  @property({ type: Boolean, converter: flexibleBooleanConverter }) exportable: boolean = true;
  @property({ type: String }) align: 'left' | 'center' | 'right' = 'left';
  @property({ type: String, attribute: 'cell-type' }) cellType: DataGridCellType = 'text';

  @property({ type: Object, attribute: false }) template?: DataGridCellTemplate;
  @property({ type: Object, attribute: false }) renderer?: DataGridCellTemplate;
  @property({ type: Object, attribute: false }) sortValue?: (row: Record<string, unknown>, value: unknown) => string | number;
  @property({ type: Object, attribute: false }) groupFormatter?: (value: unknown) => string;

  static styles = styles;

  getEffectiveCaption(): string {
    return this.caption || this.header || this.field;
  }

  getEffectiveHidden(): boolean {
    return this.hidden || !this.visible;
  }

  getEffectiveTemplate(): DataGridCellTemplate | undefined {
    if (this.template) return this.template;
    if (this.renderer) return this.renderer;
    const tpl = this.querySelector(':scope > template') as HTMLTemplateElement | null;
    if (!tpl) return undefined;
    return (row: Record<string, unknown>, value: unknown) => {
      const clone = tpl.content.cloneNode(true) as DocumentFragment;
      return hydrateClonedFragment(clone, row, value);
    };
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

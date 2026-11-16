import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './app-meta-grid.css';
import { DeclarativeMetaItem, metaItemsFromElements } from '../app-meta-item/app-meta-item';

export interface MetaItem {
  label: string;
  value: string;
  mono?: boolean;
  danger?: boolean;
  // cloned graphic content from the canonical start / end slots of <app-meta-item>
  start?: Node[];
  end?: Node[];
}

@customElement('app-meta-grid')
export class AppMetaGrid extends LitElement {
  @property({ type: Array }) items: MetaItem[] = [];
  @property({ type: Number }) columns: number = 3;
  @property({ type: String }) layout: 'strip' | 'grid' = 'strip';

  @state() private declarativeItems: DeclarativeMetaItem[] = [];

  static styles = styles;

  // items from the prop and declarative <app-meta-item> children
  private allItems(): MetaItem[] {
    return [...this.items, ...this.declarativeItems];
  }

  private handleSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this.declarativeItems = metaItemsFromElements(
      slot.assignedElements({ flatten: true }) as HTMLElement[]
    );
  }

  render() {
    return html`
      <div
        class="meta-grid ${this.layout}"
        style="--meta-columns: ${this.columns};"
      >
        ${this.allItems().map(
          (item) => html`
            <div class="meta-box">
              <span class="meta-label">${item.label}</span>
              <span
                class="meta-value ${item.mono ? 'mono' : ''} ${item.danger ? 'danger' : ''}"
                >${item.start ? html`<span class="item-slot-start">${item.start}</span>` : ''}${item.value}${item.end ? html`<span class="item-slot-end">${item.end}</span>` : ''}</span
              >
            </div>
          `
        )}
      </div>

      <!-- declarative <app-meta-item> children -->
      <slot @slotchange="${this.handleSlotChange}"></slot>
    `;
  }
}

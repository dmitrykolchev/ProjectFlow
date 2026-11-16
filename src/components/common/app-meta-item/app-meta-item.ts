import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-meta-item.css';

// Shape of a declarative meta field used by app-meta-grid.
export interface DeclarativeMetaItem {
  label: string;
  value: string;
  mono?: boolean;
  danger?: boolean;
  // cloned graphic content from the canonical start / end slots of <app-meta-item>
  start?: Node[];
  end?: Node[];
}

@customElement('app-meta-item')
export class AppMetaItem extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: String }) value: string = '';
  @property({ type: Boolean }) mono: boolean = false;
  @property({ type: Boolean }) danger: boolean = false;

  static styles = styles;

  render() {
    // canonical slots: start / default / end; the host renders nothing itself
    return html`
      <slot name="start"></slot>
      <slot></slot>
      <slot name="end"></slot>
    `;
  }

  // graphic content assigned to one of the canonical slots, cloned for the parent box
  private collectSlotNodes(name: 'start' | 'end'): Node[] {
    const nodes: Node[] = [];
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).getAttribute('slot') === name) {
        nodes.push(node.cloneNode(true));
      }
    }
    return nodes;
  }

  // value falls back to the default-slot text
  private defaultText(): string {
    let text = '';
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent ?? '';
      } else if (node.nodeType === Node.ELEMENT_NODE && !(node as HTMLElement).getAttribute('slot')) {
        text += (node as HTMLElement).textContent ?? '';
      }
    }
    return text.trim();
  }

  toItem(): DeclarativeMetaItem {
    const item: DeclarativeMetaItem = { label: this.label, value: this.value || this.defaultText() };
    if (this.mono) item.mono = true;
    if (this.danger) item.danger = true;
    const start = this.collectSlotNodes('start');
    if (start.length > 0) item.start = start;
    const end = this.collectSlotNodes('end');
    if (end.length > 0) item.end = end;
    return item;
  }
}

// Collects declarative <app-meta-item> children assigned to a parent slot.
export function metaItemsFromElements(elements: HTMLElement[]): DeclarativeMetaItem[] {
  return elements
    .filter((el) => customElements.get('app-meta-item') !== undefined && el instanceof AppMetaItem)
    .map((el) => (el as AppMetaItem).toItem());
}

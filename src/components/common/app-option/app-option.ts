import { LitElement, TemplateResult, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-option.css';

// Superset of the option shapes used by app-select, app-entity-selector,
// app-combobox, app-radio-group, and app-segmented-switch.
export interface DeclarativeOption {
  value: string;
  label: string;
  color?: string;
  icon?: TemplateResult | string;
  code?: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  badgeColor?: string;
  avatar?: string;
  description?: string;
  keywords?: string[];
  disabled?: boolean;
  // cloned graphic content from the canonical start / end slots of <app-option>
  start?: Node[];
  end?: Node[];
}

// data source accepted by the dropdown components: a static array, a promise,
// or a function returning an array (sync or async)
export type OptionDataSource =
  | DeclarativeOption[]
  | Promise<DeclarativeOption[]>
  | (() => DeclarativeOption[] | Promise<DeclarativeOption[]>);

@customElement('app-option')
export class AppOption extends LitElement {
  @property({ type: String }) value: string = '';
  @property({ type: String }) label: string = '';
  @property({ type: String }) color: string = '';
  @property({ attribute: false }) icon?: TemplateResult | string;
  @property({ type: String }) code: string = '';
  @property({ type: String }) subtitle: string = '';
  @property({ type: String }) meta: string = '';
  @property({ type: String }) badge: string = '';
  @property({ type: String, attribute: 'badge-color' }) badgeColor: string = '';
  @property({ type: String }) avatar: string = '';
  @property({ type: String }) description: string = '';
  @property({ type: Array }) keywords?: string[];
  @property({ type: Boolean }) disabled: boolean = false;

  static styles = styles;

  render() {
    // canonical slots: start / default / end; the host renders nothing itself
    return html`
      <slot name="start"></slot>
      <slot></slot>
      <slot name="end"></slot>
    `;
  }

  // graphic content assigned to one of the canonical slots, cloned for the parent row
  private collectSlotNodes(name: 'start' | 'end'): Node[] {
    const nodes: Node[] = [];
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).getAttribute('slot') === name) {
        nodes.push(node.cloneNode(true));
      }
    }
    return nodes;
  }

  // label falls back to the default-slot text, value falls back to the label
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

  toOption(): DeclarativeOption {
    const label = this.label || this.defaultText();
    const option: DeclarativeOption = { value: this.value || label, label };
    if (this.color) option.color = this.color;
    if (this.icon !== undefined) option.icon = this.icon;
    if (this.code) option.code = this.code;
    if (this.subtitle) option.subtitle = this.subtitle;
    if (this.meta) option.meta = this.meta;
    if (this.badge) option.badge = this.badge;
    if (this.badgeColor) option.badgeColor = this.badgeColor;
    if (this.avatar) option.avatar = this.avatar;
    if (this.description) option.description = this.description;
    if (this.keywords) option.keywords = this.keywords;
    if (this.disabled) option.disabled = true;
    const start = this.collectSlotNodes('start');
    if (start.length > 0) option.start = start;
    const end = this.collectSlotNodes('end');
    if (end.length > 0) option.end = end;
    return option;
  }
}

// Collects declarative <app-option> children assigned to a parent slot.
export function optionsFromElements(elements: HTMLElement[]): DeclarativeOption[] {
  return elements.filter((el) => customElements.get('app-option') !== undefined && el instanceof AppOption).map((el) => (el as AppOption).toOption());
}

// Resolves a data source into an option array; returns [] for empty sources.
export async function resolveDataSource(source?: OptionDataSource): Promise<DeclarativeOption[]> {
  if (!source) return [];
  if (Array.isArray(source)) return source;
  if (typeof source === 'function') {
    const result = source();
    return await result;
  }
  return await source;
}

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ButtonSize } from '../app-button/app-button';
import type { AppTabItem } from '../app-tab-item/app-tab-item';
import styles from './app-tabs.css';

// detail of the `tab-change` event (named event-detail interface, AGENTS.md §6)
export interface TabsChangeDetail {
  value: string;
}

/**
 * Tab strip container for app-tab-item children. The active property owns the
 * selection: clicking a tab emits the canonical tab-change event and moves the
 * active state to the clicked item; setting active from code syncs the items.
 * The size publishes the canonical control scale (--tb-height / --tb-font /
 * --tb-icon / --tb-pad-x) so tabs share the same row geometry as toolbar rows.
 */
@customElement('app-tabs')
export class AppTabs extends LitElement {
  @property({ type: String, reflect: true }) size: ButtonSize = 'md';
  @property({ type: String }) active: string = '';

  static styles = styles;

  render() {
    return html`
      <div class="tab-bar size-${this.size}" role="tablist" @keydown="${this.handleKeydown}">
        <slot></slot>
      </div>
    `;
  }

  protected firstUpdated() {
    // tab-select is composed, so clicks on app-tab-item children reach the host
    this.addEventListener('tab-select', (e: Event) => {
      const value = (e as CustomEvent).detail?.value as string | undefined;
      if (value === undefined) return;
      this.active = value;
      this.dispatchEvent(
        new CustomEvent<TabsChangeDetail>('tab-change', {
          detail: { value },
          bubbles: true,
          composed: true,
        })
      );
    });

    // adopt the active state declared by an app-tab-item in markup
    if (this.active === '') {
      const declared = this.items().find((el) => el.hasAttribute('active'));
      const value = declared ? (declared as AppTabItem).value : '';
      if (value !== '') {
        this.active = value;
      }
    }
    this.syncItems();
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('active')) {
      this.syncItems();
    }
  }

  private items(): HTMLElement[] {
    return Array.from(this.children).filter(
      (el) => el.tagName.toLowerCase() === 'app-tab-item'
    ) as HTMLElement[];
  }

  private syncItems() {
    for (const el of this.items()) {
      const item = el as AppTabItem;
      item.active = item.value === this.active;
    }
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const enabled = this.items().filter((el) => !el.hasAttribute('disabled'));
    if (enabled.length === 0) return;

    const current = enabled.findIndex((el) => (el as AppTabItem).value === this.active);
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = enabled[(current + dir + enabled.length) % enabled.length];

    e.preventDefault();
    const btn = next.shadowRoot?.querySelector('button') as HTMLElement | null;
    if (btn) {
      btn.focus();
      this.active = (next as AppTabItem).value;
    }
  }
}

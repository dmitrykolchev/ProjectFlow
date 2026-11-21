import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-tab-item.css';

// detail of the `tab-select` event (named event-detail interface, AGENTS.md §6)
export interface TabItemSelectDetail {
  value: string;
}

/**
 * A single tab inside an app-tabs strip. The row geometry is inherited from the
 * parent app-tabs through custom properties (--tb-height / --tb-font /
 * --tb-icon / --tb-pad-x), so tabs match toolbar control rows; standalone use
 * falls back to the canonical md scale. Canonical start / default / end slots
 * carry leading graphics, label text, and trailing graphics.
 */
@customElement('app-tab-item')
export class AppTabItem extends LitElement {
  @property({ type: String }) value: string = '';
  @property({ type: Boolean, reflect: true }) active: boolean = false;
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;

  static styles = styles;

  render() {
    return html`
      <button
        type="button"
        class="${this.active ? 'is-active' : ''}"
        role="tab"
        aria-selected="${String(this.active)}"
        ?disabled="${this.disabled}"
        @click="${this.select}"
      >
        <!-- canonical slots: start / default / end -->
        <slot name="start"></slot>
        <slot></slot>
        <slot name="end"></slot>
      </button>
    `;
  }

  private select() {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent<TabItemSelectDetail>('tab-select', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
}

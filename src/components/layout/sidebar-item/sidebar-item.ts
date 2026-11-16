import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './sidebar-item.css';

@customElement('sidebar-item')
export class SidebarItem extends LitElement {
  @property({ type: String }) value: string = '';
  @property({ type: String }) label: string = '';
  @property({ type: String }) badge: string = '';
  @property({ type: Boolean, reflect: true }) active: boolean = false;
  @property({ type: Boolean, reflect: true }) collapsed: boolean = false;
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ attribute: false }) icon?: TemplateResult | string;

  static styles = styles;

  render() {
    return html`
      <div
        role="button"
        tabindex="${this.disabled ? -1 : 0}"
        aria-current="${this.active ? 'page' : 'false'}"
        title="${this.label}"
        class="nav-item ${this.active ? 'is-active' : ''} ${this.collapsed ? 'is-collapsed' : ''} ${this.disabled ? 'is-disabled' : ''}"
        @click="${this.handleSelect}"
        @keydown="${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.handleSelect();
          }
        }}"
      >
        <div class="nav-item-left">
          <span class="nav-icon">
            <!-- canonical start slot; icon is a legacy alias -->
            ${this.icon
              ? this.icon
              : html`<slot name="start">
                  <slot name="icon"></slot>
                </slot>`}
          </span>
          ${!this.collapsed
            ? html`<span class="nav-label">${this.label || html`<slot></slot>`}</span>`
            : ''}
        </div>
        <!-- canonical end slot for graphic elements -->
        ${!this.collapsed ? html`<slot name="end"></slot>` : ''}
        ${!this.collapsed && this.badge
          ? html`<span class="nav-badge tabular-nums">${this.badge}</span>`
          : ''}
      </div>
    `;
  }

  private handleSelect() {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent('sidebar-select', {
        detail: { value: this.value, label: this.label },
        bubbles: true,
        composed: true,
      })
    );
  }
}

import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-badge.css';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeAppearance = 'soft' | 'solid' | 'outline';
// canonical control size scale (docs/ComponentApiSpecs.md, Priority E), md default = historical look
export type BadgeSize = 'sm' | 'md' | 'lg';

@customElement('app-badge')
export class AppBadge extends LitElement {
  @property({ type: String }) variant: BadgeVariant = 'neutral';
  @property({ type: String }) appearance: BadgeAppearance = 'soft';
  @property({ type: String }) size: BadgeSize = 'md';
  @property({ type: Boolean }) dot: boolean = false;
  @property({ type: Boolean }) removable: boolean = false;

  static styles = styles;

  render() {
    return html`
      <span class="badge appearance-${this.appearance} variant-${this.variant} size-${this.size}">
        ${this.dot ? html`<span class="badge-dot" aria-hidden="true"></span>` : ''}
        <!-- canonical slots: start / default / end; icon is a legacy alias -->
        <slot name="start">
          <slot name="icon"></slot>
        </slot>
        <slot></slot>
        <slot name="end"></slot>
        ${this.removable
          ? html`
              <button
                type="button"
                class="remove-btn"
                aria-label="Remove"
                @click="${this.handleRemove}"
              >
                &times;
              </button>
            `
          : ''}
      </span>
    `;
  }

  private handleRemove(e: MouseEvent) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('remove', {
        bubbles: true,
        composed: true,
      })
    );
  }
}

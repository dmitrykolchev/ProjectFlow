import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

@customElement('app-button')
export class AppButton extends LitElement {
  @property({ type: String }) variant: ButtonVariant = 'primary';
  @property({ type: String }) size: ButtonSize = 'md';
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: Boolean }) loading: boolean = false;
  @property({ type: Boolean, attribute: 'icon-only' }) iconOnly: boolean = false;
  @property({ type: String }) type: 'button' | 'submit' | 'reset' = 'button';

  static styles = styles;

  render() {
    return html`
      <button
        type="${this.type}"
        ?disabled="${this.disabled || this.loading}"
        class="variant-${this.variant} size-${this.size} ${this.iconOnly ? 'icon-only' : ''}"
        @click="${this.handleClick}"
      >
        ${this.loading ? html`<div class="spinner" aria-hidden="true"></div>` : html`<slot name="icon-start"></slot>`}
        ${!this.iconOnly ? html`<slot></slot>` : html`<slot name="icon-only"><slot></slot></slot>`}
        <slot name="icon-end"></slot>
      </button>
    `;
  }

  private handleClick(e: MouseEvent) {
    if (this.disabled || this.loading) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}

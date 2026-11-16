import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-link.css';

export type LinkVariant = 'primary' | 'secondary' | 'danger';
// canonical control size scale (docs/ComponentApiSpecs.md, Priority E)
export type LinkSize = 'sm' | 'md' | 'lg';

@customElement('app-link')
export class AppLink extends LitElement {
  @property({ type: String }) href: string = '';
  @property({ type: String }) target: string = '';
  @property({ type: String }) variant: LinkVariant = 'primary';
  @property({ type: String }) size: LinkSize = 'md';
  @property({ type: Boolean }) disabled: boolean = false;

  static styles = styles;

  render() {
    const classes = `link variant-${this.variant} size-${this.size} ${this.disabled ? 'is-disabled' : ''}`;
    // canonical slots: start / default / end, centered on the vertical axis
    const content = html`
      <slot name="start"></slot>
      <span class="link-label"><slot></slot></span>
      <slot name="end"></slot>
    `;

    if (this.href !== '') {
      const rel = this.target === '_blank' ? 'noopener noreferrer' : '';
      return html`
        <a
          class="${classes}"
          href="${this.href}"
          target="${this.target}"
          rel="${rel}"
          aria-disabled="${this.disabled ? 'true' : 'false'}"
          tabindex="${this.disabled ? '-1' : '0'}"
          @click="${this.handleClick}"
        >
          ${content}
        </a>
      `;
    }

    return html`
      <button
        type="button"
        class="${classes}"
        ?disabled="${this.disabled}"
        @click="${this.handleClick}"
      >
        ${content}
      </button>
    `;
  }

  private handleClick(e: MouseEvent) {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}

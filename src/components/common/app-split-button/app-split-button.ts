import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ButtonSize } from '../app-button/app-button';
import { MenuItem } from '../app-menu/app-menu';
import { iconChevronDown } from '../icons';
import '../app-menu/app-menu';
import styles from './app-split-button.css';

@customElement('app-split-button')
export class AppSplitButton extends LitElement {
  @property({ type: String }) label: string = 'Save';
  @property({ type: String }) variant: 'primary' | 'secondary' | 'outline' = 'primary';
  @property({ type: String }) size: ButtonSize = 'md';
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: Array }) items: MenuItem[] = [];

  @state() private isOpen: boolean = false;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this.handleOutsideClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleOutsideClick = (e: MouseEvent) => {
    if (this.isOpen && !e.composedPath().includes(this)) {
      this.isOpen = false;
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.isOpen && e.key === 'Escape') {
      this.isOpen = false;
    }
  };

  render() {
    return html`
      <div class="split-wrapper variant-${this.variant} size-${this.size}">
        <button
          type="button"
          class="split-main"
          ?disabled="${this.disabled}"
          @click="${this.handlePrimaryClick}"
        >
          <slot name="icon-start"></slot>
          <span>${this.label}</span>
        </button>

        <button
          type="button"
          class="split-toggle"
          aria-haspopup="menu"
          aria-expanded="${this.isOpen}"
          aria-label="More options"
          ?disabled="${this.disabled}"
          @click="${this.toggleMenu}"
        >
          ${iconChevronDown(14)}
        </button>

        ${this.isOpen
          ? html`
              <div class="popover-menu">
                <app-menu
                  .items="${this.items}"
                  @select="${this.handleMenuSelect}"
                ></app-menu>
              </div>
            `
          : ''}
      </div>
    `;
  }

  private handlePrimaryClick(e: MouseEvent) {
    e.stopPropagation();
    if (this.disabled) return;
    this.isOpen = false;
    this.dispatchEvent(
      new CustomEvent('primary-click', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private toggleMenu(e: MouseEvent) {
    e.stopPropagation();
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
  }

  private handleMenuSelect(e: CustomEvent) {
    e.stopPropagation();
    this.isOpen = false;
    this.dispatchEvent(
      new CustomEvent('select', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }
}

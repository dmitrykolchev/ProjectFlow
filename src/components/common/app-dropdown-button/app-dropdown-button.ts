import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ButtonSize, ButtonVariant } from '../app-button/app-button';
import { MenuItem } from '../app-menu/app-menu';
import { iconChevronDown } from '../icons';
import '../app-button/app-button';
import '../app-menu/app-menu';
import styles from './app-dropdown-button.css';

@customElement('app-dropdown-button')
export class AppDropdownButton extends LitElement {
  @property({ type: String }) label: string = 'Actions';
  @property({ type: String }) variant: ButtonVariant = 'secondary';
  @property({ type: String }) size: ButtonSize = 'md';
  @property({ type: String }) placement: 'bottom-start' | 'bottom-end' = 'bottom-start';
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
      <div class="dropdown-wrapper">
        <app-button
          variant="${this.variant}"
          size="${this.size}"
          ?disabled="${this.disabled}"
          @click="${this.toggleMenu}"
        >
          <slot name="icon-start" slot="icon-start"></slot>
          <span>${this.label}</span>
          <span slot="icon-end" class="chevron ${this.isOpen ? 'is-open' : ''}">
            ${iconChevronDown(14)}
          </span>
        </app-button>

        ${this.isOpen
          ? html`
              <div class="popover-menu ${this.placement}">
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

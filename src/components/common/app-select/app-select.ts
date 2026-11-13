import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './app-select.css';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
}

@customElement('app-select')
export class AppSelect extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: String }) value: string = '';
  @property({ type: Array }) options: SelectOption[] = [];
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: String }) placeholder: string = 'Select...';

  @state() private isOpen: boolean = false;

  static styles = styles;

  render() {
    const selectedOpt = this.options.find((o) => o.value === this.value);

    return html`
      <div class="form-group">
        ${this.label ? html`<label>${this.label}</label>` : ''}
        <div
          class="select-trigger ${this.isOpen ? 'is-open' : ''} ${this.disabled ? 'is-disabled' : ''}"
          @click="${this.toggleOpen}"
          tabindex="${this.disabled ? -1 : 0}"
          @keydown="${this.handleKeydown}"
        >
          <div class="selected-value">
            ${selectedOpt?.color
              ? html`<span class="dot-indicator" style="background-color: ${selectedOpt.color}"></span>`
              : ''}
            <span>${selectedOpt ? selectedOpt.label : this.placeholder}</span>
          </div>
          <span class="chevron">▼</span>
        </div>

        ${this.isOpen && !this.disabled
          ? html`
              <div class="backdrop" @click="${this.closeDropdown}"></div>
              <div class="dropdown-panel">
                ${this.options.map(
                  (opt) => html`
                    <div
                      class="option-item ${opt.value === this.value ? 'is-selected' : ''}"
                      @click="${() => this.selectOption(opt.value)}"
                    >
                      <div class="option-left">
                        ${opt.color
                          ? html`<span class="dot-indicator" style="background-color: ${opt.color}"></span>`
                          : ''}
                        <span>${opt.label}</span>
                      </div>
                      ${opt.value === this.value ? html`<span class="check-mark">✓</span>` : ''}
                    </div>
                  `
                )}
              </div>
            `
          : ''}
      </div>
    `;
  }

  private toggleOpen() {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
    }
  }

  private closeDropdown() {
    this.isOpen = false;
  }

  private selectOption(val: string) {
    this.value = val;
    this.isOpen = false;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggleOpen();
    } else if (e.key === 'Escape') {
      this.closeDropdown();
    }
  }
}

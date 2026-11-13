import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-radio-group.css';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

@customElement('app-radio-group')
export class AppRadioGroup extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: String }) name: string = '';
  @property({ type: String, reflect: true }) value: string = '';
  @property({ type: Array }) options: RadioOption[] = [];
  @property({ type: String }) orientation: 'vertical' | 'horizontal' = 'vertical';
  @property({ type: String }) variant: 'default' | 'card' = 'default';
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;

  static styles = styles;

  render() {
    return html`
      <div class="radio-group-wrapper" role="radiogroup" aria-label="${this.label || this.name}">
        ${this.label ? html`<span class="group-label">${this.label}</span>` : ''}
        <div class="options-list ${this.orientation} variant-${this.variant}">
          ${this.options.map((opt, idx) => {
            const isSelected = opt.value === this.value;
            const isDisabled = this.disabled || opt.disabled;
            return html`
              <div
                role="radio"
                tabindex="${isDisabled ? -1 : 0}"
                aria-checked="${isSelected}"
                aria-disabled="${Boolean(isDisabled)}"
                class="radio-option ${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}"
                @click="${() => this.selectOption(opt)}"
                @keydown="${(e: KeyboardEvent) => this.handleKeyDown(e, idx, opt)}"
              >
                <div class="radio-circle">
                  <div class="radio-dot"></div>
                </div>
                <div class="option-content">
                  <span class="option-label">${opt.label}</span>
                  ${opt.description ? html`<span class="option-desc">${opt.description}</span>` : ''}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private handleKeyDown(e: KeyboardEvent, idx: number, opt: RadioOption) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.selectOption(opt);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (this.disabled || this.options.length === 0) return;
      const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
      for (let offset = 1; offset <= this.options.length; offset++) {
        const nextIdx = (idx + step * offset + this.options.length) % this.options.length;
        const nextOpt = this.options[nextIdx];
        if (!nextOpt.disabled) {
          this.selectOption(nextOpt);
          const radios = this.shadowRoot?.querySelectorAll('[role="radio"]');
          (radios?.[nextIdx] as HTMLElement | undefined)?.focus();
          break;
        }
      }
    }
  }

  private selectOption(opt: RadioOption) {
    if (this.disabled || opt.disabled || this.value === opt.value) return;
    this.value = opt.value;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value, option: opt },
        bubbles: true,
        composed: true,
      })
    );
  }
}

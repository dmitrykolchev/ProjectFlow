import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-segmented-switch.css';

export interface SegmentedOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@customElement('app-segmented-switch')
export class AppSegmentedSwitch extends LitElement {
  @property({ type: Array }) options: SegmentedOption[] = [];
  @property({ type: String }) value: string = '';
  @property({ type: String }) size: 'sm' | 'md' = 'md';
  @property({ type: Boolean, attribute: 'full-width', reflect: true }) fullWidth: boolean = false;
  @property({ type: Boolean }) disabled: boolean = false;

  static styles = styles;

  render() {
    return html`
      <div
        class="segmented-track size-${this.size} ${this.disabled ? 'is-disabled' : ''}"
        role="radiogroup"
      >
        ${this.options.map((opt) => {
          const isActive = opt.value === this.value;
          return html`
            <button
              type="button"
              role="radio"
              aria-checked="${isActive}"
              class="segment-btn ${isActive ? 'is-active' : ''}"
              ?disabled="${this.disabled || opt.disabled}"
              @click="${() => this.selectOption(opt)}"
            >
              ${opt.label}
            </button>
          `;
        })}
      </div>
    `;
  }

  private selectOption(opt: SegmentedOption) {
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

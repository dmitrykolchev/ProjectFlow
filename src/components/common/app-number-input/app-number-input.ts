import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-number-input.css';

@customElement('app-number-input')
export class AppNumberInput extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: Number }) value: number = 0;
  @property({ type: Number }) min: number = 0;
  @property({ type: Number }) max: number = 1000;
  @property({ type: Number }) step: number = 1;
  @property({ type: String }) unit: string = '';
  // canonical control size scale (docs/ComponentApiSpecs.md, Priority E), md default = historical look
  @property({ type: String }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: Boolean }) disabled: boolean = false;

  static styles = styles;

  render() {
    return html`
      <div class="form-group">
        ${this.label ? html`<label>${this.label}</label>` : ''}
        <div class="stepper-wrapper size-${this.size}">
          <button
            type="button"
            class="step-btn"
            ?disabled="${this.disabled || this.value <= this.min}"
            @click="${this.decrement}"
            aria-label="Decrease"
          >
            -
          </button>
          <input
            type="number"
            .value="${this.value.toString()}"
            min="${this.min}"
            max="${this.max}"
            step="${this.step}"
            ?disabled="${this.disabled}"
            @change="${this.handleInputChange}"
          />
          ${this.unit ? html`<span class="unit-tag">${this.unit}</span>` : ''}
          <button
            type="button"
            class="step-btn"
            ?disabled="${this.disabled || this.value >= this.max}"
            @click="${this.increment}"
            aria-label="Increase"
          >
            +
          </button>
        </div>
      </div>
    `;
  }

  private decrement() {
    this.setValue(Math.max(this.min, this.value - this.step));
  }

  private increment() {
    this.setValue(Math.min(this.max, this.value + this.step));
  }

  private handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const val = parseFloat(input.value);
    if (!isNaN(val)) {
      this.setValue(Math.min(this.max, Math.max(this.min, val)));
    }
  }

  private setValue(newVal: number) {
    this.value = newVal;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
}

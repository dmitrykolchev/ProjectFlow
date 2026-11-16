import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-input.css';

export type InputSize = 'sm' | 'md' | 'lg'; // canonical control scale (docs/ComponentApiSpecs.md, Priority E)

@customElement('app-input')
export class AppInput extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: String }) placeholder: string = '';
  @property({ type: String }) value: string = '';
  @property({ type: String }) type: string = 'text';
  @property({ type: Boolean }) required: boolean = false;
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: String }) error: string = '';
  @property({ type: String }) helper: string = '';
  @property({ type: Boolean, attribute: 'clearable' }) clearable: boolean = false;
  // canonical control size scale, md default = historical pixel-identical look
  @property({ type: String }) size: InputSize = 'md';

  static styles = styles;

  render() {
    return html`
      <div class="form-group">
        ${this.label
          ? html`
              <label>
                ${this.label}
                ${this.required ? html`<span class="required-star">*</span>` : ''}
              </label>
            `
          : ''}
        <div class="input-wrapper size-${this.size} ${this.error ? 'has-error' : ''} ${this.disabled ? 'is-disabled' : ''}">
          <div class="icon-slot">
            <slot name="icon"></slot>
          </div>
          <input
            type="${this.type}"
            .value="${this.value || ''}"
            placeholder="${this.placeholder}"
            ?required="${this.required}"
            ?disabled="${this.disabled}"
            @input="${this.handleInput}"
            @change="${this.handleChange}"
          />
          ${this.clearable && this.value && !this.disabled
            ? html`
                <button type="button" class="clear-btn" @click="${this.handleClear}" aria-label="Clear">
                  &times;
                </button>
              `
            : ''}
        </div>
        ${this.error
          ? html`<div class="error-text">${this.error}</div>`
          : this.helper
          ? html`<div class="helper-text">${this.helper}</div>`
          : ''}
      </div>
    `;
  }

  private handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(
      new CustomEvent('input', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleClear() {
    this.value = '';
    this.dispatchEvent(
      new CustomEvent('input', {
        detail: { value: '' },
        bubbles: true,
        composed: true,
      })
    );
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: '' },
        bubbles: true,
        composed: true,
      })
    );
  }
}

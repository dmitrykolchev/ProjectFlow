import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-textarea.css';

@customElement('app-textarea')
export class AppTextarea extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: String }) placeholder: string = '';
  @property({ type: String }) value: string = '';
  @property({ type: Number }) rows: number = 3;
  @property({ type: Boolean }) required: boolean = false;
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: String }) error: string = '';
  @property({ type: Number }) maxlength: number = 0;

  static styles = styles;

  render() {
    return html`
      <div class="form-group">
        <div class="label-row">
          ${this.label
            ? html`
                <label>
                  ${this.label}
                  ${this.required ? html`<span class="required-star">*</span>` : ''}
                </label>
              `
            : html`<span></span>`}
          ${this.maxlength > 0
            ? html`<span class="char-count">${(this.value || '').length}/${this.maxlength}</span>`
            : ''}
        </div>
        <textarea
          rows="${this.rows}"
          placeholder="${this.placeholder}"
          .value="${this.value || ''}"
          ?required="${this.required}"
          ?disabled="${this.disabled}"
          maxlength="${this.maxlength > 0 ? this.maxlength : undefined}"
          class="${this.error ? 'has-error' : ''}"
          @input="${this.handleInput}"
          @change="${this.handleChange}"
        ></textarea>
        ${this.error ? html`<div class="error-text">${this.error}</div>` : ''}
      </div>
    `;
  }

  private handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.value = textarea.value;
    this.dispatchEvent(
      new CustomEvent('input', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleChange(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.value = textarea.value;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
}

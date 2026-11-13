import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-checkbox.css';

@customElement('app-checkbox')
export class AppCheckbox extends LitElement {
  @property({ type: Boolean, reflect: true }) checked: boolean = false;
  @property({ type: Boolean, reflect: true }) indeterminate: boolean = false;
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: String }) label: string = '';

  static styles = styles;

  render() {
    const ariaChecked = this.indeterminate ? 'mixed' : this.checked ? 'true' : 'false';

    return html`
      <div
        class="checkbox-container"
        role="checkbox"
        tabindex="${this.disabled ? -1 : 0}"
        aria-checked="${ariaChecked}"
        aria-disabled="${this.disabled}"
        @click="${this.toggle}"
        @keydown="${this.handleKeyDown}"
      >
        <div class="box ${this.checked ? 'is-checked' : ''} ${this.indeterminate ? 'is-indeterminate' : ''}">
          ${this.indeterminate
            ? html`<span class="icon-mark">−</span>`
            : this.checked
            ? html`<span class="icon-mark">✓</span>`
            : ''}
        </div>
        ${this.label ? html`<span class="label-text">${this.label}</span>` : html`<slot></slot>`}
      </div>
    `;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.toggle();
    }
  }

  private toggle() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.indeterminate = false;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { checked: this.checked },
        bubbles: true,
        composed: true,
      })
    );
  }
}

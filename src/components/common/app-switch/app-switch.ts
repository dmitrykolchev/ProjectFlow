import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-switch.css';

@customElement('app-switch')
export class AppSwitch extends LitElement {
  @property({ type: Boolean }) checked: boolean = false;
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: String }) label: string = '';

  static styles = styles;

  render() {
    return html`
      <div class="switch-container" @click="${this.toggle}">
        <div class="track ${this.checked ? 'is-checked' : ''}">
          <div class="thumb"></div>
        </div>
        ${this.label ? html`<span class="label-text">${this.label}</span>` : html`<slot></slot>`}
      </div>
    `;
  }

  private toggle() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { checked: this.checked },
        bubbles: true,
        composed: true,
      })
    );
  }
}

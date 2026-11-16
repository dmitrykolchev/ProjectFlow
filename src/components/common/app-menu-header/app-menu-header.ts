import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-menu-header.css';

@customElement('app-menu-header')
export class AppMenuHeader extends LitElement {
  @property({ type: String }) label: string = '';

  static styles = styles;

  render() {
    return html`
      <div class="menu-header" role="presentation">
        ${this.label || html`<slot></slot>`}
      </div>
    `;
  }
}

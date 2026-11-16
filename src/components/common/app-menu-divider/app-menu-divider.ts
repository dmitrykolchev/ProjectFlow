import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-menu-divider.css';

@customElement('app-menu-divider')
export class AppMenuDivider extends LitElement {
  @property({ type: Boolean, reflect: true }) inset: boolean = false;

  static styles = styles;

  render() {
    return html`<div class="menu-divider ${this.inset ? 'is-inset' : ''}" role="separator"></div>`;
  }
}

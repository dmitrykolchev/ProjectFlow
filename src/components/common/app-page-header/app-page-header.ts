import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-page-header.css';

@customElement('app-page-header')
export class AppPageHeader extends LitElement {
  @property({ type: String }) title: string = '';
  @property({ type: String }) subtitle: string = '';

  static styles = styles;

  render() {
    return html`
      <div class="page-header">
        <div class="header-left">
          <slot name="icon"></slot>
          <div class="header-titles">
            ${this.title ? html`<h1 class="title">${this.title}</h1>` : ''}
            ${this.subtitle ? html`<p class="subtitle">${this.subtitle}</p>` : ''}
            <slot></slot>
          </div>
        </div>
        <div class="header-actions">
          <slot name="actions"></slot>
        </div>
      </div>
    `;
  }
}

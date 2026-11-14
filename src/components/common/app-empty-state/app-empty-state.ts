import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { iconFolder } from '../icons';
import styles from './app-empty-state.css';

@customElement('app-empty-state')
export class AppEmptyState extends LitElement {
  @property({ type: String }) title: string = '';
  @property({ type: String }) message: string = '';
  @property({ type: Boolean, reflect: true }) compact: boolean = false;

  static styles = styles;

  render() {
    return html`
      <div class="empty-state ${this.compact ? 'is-compact' : ''}">
        <span class="icon-wrap">
          <slot name="icon">${iconFolder(this.compact ? 32 : 48)}</slot>
        </span>
        ${this.title ? html`<div class="title">${this.title}</div>` : ''}
        ${this.message ? html`<div class="message">${this.message}</div>` : ''}
        <span class="action"><slot name="action"></slot></span>
      </div>
    `;
  }
}

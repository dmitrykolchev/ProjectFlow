import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-avatar.css';

@customElement('app-avatar')
export class AppAvatar extends LitElement {
  @property({ type: String }) initials: string = '';
  @property({ type: String }) src: string = '';
  @property({ type: String }) size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @property({ type: String }) color: string = '';
  @property({ type: String }) title: string = '';

  static styles = styles;

  render() {
    const bg = this.color || 'var(--accent-soft, rgba(99, 102, 241, 0.15))';
    return html`
      <div
        class="avatar size-${this.size}"
        style="background: ${bg};"
        title="${this.title || this.initials}"
      >
        ${this.src
          ? html`<img src="${this.src}" alt="${this.title || this.initials}" />`
          : html`<span class="initials">${this.initials}</span>`}
      </div>
    `;
  }
}

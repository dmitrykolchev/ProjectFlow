import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-modal.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

@customElement('app-modal')
export class AppModal extends LitElement {
  @property({ type: Boolean }) open: boolean = false;
  @property({ type: String }) title: string = '';
  @property({ type: String }) size: ModalSize = 'md';

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.open && e.key === 'Escape') {
      this.close();
    }
  };

  render() {
    return html`
      <div class="modal-backdrop ${this.open ? 'is-open' : ''}" @click="${this.handleBackdropClick}">
        <div class="modal-card size-${this.size}" @click="${(e: MouseEvent) => e.stopPropagation()}">
          <div class="modal-header">
            <h3 class="modal-title">${this.title || html`<slot name="title"></slot>`}</h3>
            <button type="button" class="close-btn" @click="${this.close}" aria-label="Close">
              ✕
            </button>
          </div>
          <div class="modal-body">
            <slot></slot>
          </div>
          <div class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `;
  }

  private handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.close();
    }
  }

  private close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }
}

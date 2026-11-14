import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../../common/app-modal/app-modal';
import '../../common/app-button/app-button';

@customElement('app-confirm-dialog')
export class AppConfirmDialog extends LitElement {
  @property({ type: Boolean }) open: boolean = false;
  @property({ type: String }) title: string = '';
  @property({ type: String }) message: string = '';
  @property({ type: String }) confirmLabel: string = '';
  @property({ type: String }) cancelLabel: string = '';
  @property({ type: String }) size: 'sm' | 'md' | 'lg' | 'xl' = 'sm';
  @property({ type: Boolean }) danger: boolean = true;

  static styles = css`
    :host {
      display: contents;
    }

    /* Exact match of original .confirm-text */
    .confirm-text {
      margin: 0;
      color: var(--text-secondary, #94a3b8);
      line-height: 1.5;
      font-size: 0.9rem;
    }
  `;

  render() {
    return html`
      <app-modal
        ?open="${this.open}"
        size="${this.size}"
        title="${this.title}"
        @close="${() => this.emitCancel()}"
      >
        <p class="confirm-text">${this.message}</p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => this.emitCancel()}">
            ${this.cancelLabel}
          </app-button>
          <app-button
            variant="${this.danger ? 'danger' : 'primary'}"
            @click="${() => this.emitConfirm()}"
          >
            ${this.confirmLabel}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private emitConfirm() {
    this.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true }));
  }

  private emitCancel() {
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
  }
}

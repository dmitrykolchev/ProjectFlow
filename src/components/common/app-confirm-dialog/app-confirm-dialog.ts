import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../../common/app-modal/app-modal';
import '../../common/app-button/app-button';
import { iconAlertTriangle, iconCheck, iconInfo } from '../icons';
import styles from './app-confirm-dialog.css';

export type ConfirmVariant = 'info' | 'success' | 'warning' | 'danger';

@customElement('app-confirm-dialog')
export class AppConfirmDialog extends LitElement {
  @property({ type: Boolean }) open: boolean = false;
  @property({ type: String }) title: string = '';
  @property({ type: String }) variant: ConfirmVariant = 'danger';
  /** Explicit header icon override: 'alert' | 'info' | 'check' | 'trash' */
  @property({ type: String }) icon: string = '';
  /** Выполняемое действие */
  @property({ type: String }) action: string = '';
  /** Ожидаемый результат */
  @property({ type: String }) result: string = '';
  /** Legacy single-paragraph message (rendered when action/result are empty) */
  @property({ type: String }) message: string = '';
  @property({ type: String }) actionLabel: string = '';
  @property({ type: String }) resultLabel: string = '';
  @property({ type: String }) confirmLabel: string = '';
  @property({ type: String }) cancelLabel: string = '';
  @property({ type: String }) size: 'sm' | 'md' | 'lg' | 'xl' = 'sm';

  static styles = styles;

  render() {
    const hasSections = Boolean(this.action || this.result);
    const variantColors: Record<ConfirmVariant, string> = {
      info: 'var(--accent-primary, #6366f1)',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
    };
    const confirmColor = variantColors[this.variant] || variantColors.danger;
    return html`
      <app-modal
        ?open="${this.open}"
        size="${this.size}"
        title="${this.title}"
        .headerIcon="${this.renderIcon()}"
        .hideClose="${true}"
        @close="${() => this.emitCancel()}"
      >
        ${hasSections
          ? html`
              ${this.action
                ? html`
                    <div>
                      ${this.actionLabel ? html`<p class="section-label">${this.actionLabel}</p>` : ''}
                      <p class="action-text">${this.action}</p>
                    </div>
                  `
                : ''}
              ${this.result
                ? html`
                    <div style="--confirm-color: ${confirmColor};">
                      ${this.resultLabel ? html`<p class="section-label">${this.resultLabel}</p>` : ''}
                      <div class="result-box">${this.result}</div>
                    </div>
                  `
                : ''}
            `
          : html`<p class="confirm-text">${this.message}</p>`}
        <div slot="footer">
          <app-button variant="ghost" @click="${() => this.emitCancel()}">
            ${this.cancelLabel}
          </app-button>
          <app-button
            variant="${this.variant === 'danger' ? 'danger' : 'primary'}"
            @click="${() => this.emitConfirm()}"
          >
            ${this.confirmLabel}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderIcon() {
    const key = this.icon || (this.variant === 'info' ? 'info' : this.variant === 'success' ? 'check' : 'alert');
    if (key === 'trash') {
      return html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      </svg>`;
    }
    if (key === 'info') {
      return iconInfo(18);
    }
    if (key === 'check') {
      return iconCheck(18);
    }
    return iconAlertTriangle(18);
  }

  private emitConfirm() {
    this.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true }));
  }

  private emitCancel() {
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
  }
}

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../../common/app-modal/app-modal';
import '../../common/app-button/app-button';
import { iconAlertTriangle, iconCheck, iconInfo } from '../icons';

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
  @property({ type: String }) actionLabel: string = 'Выполняемое действие:';
  @property({ type: String }) resultLabel: string = 'Ожидаемый результат:';
  @property({ type: String }) confirmLabel: string = '';
  @property({ type: String }) cancelLabel: string = '';
  @property({ type: String }) size: 'sm' | 'md' | 'lg' | 'xl' = 'sm';

  static styles = css`
    :host {
      display: contents;
    }

    .section-label {
      margin: 0 0 0.4rem;
      text-transform: uppercase;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--text-secondary, #94a3b8);
    }

    .action-text {
      margin: 0;
      color: var(--text-primary, #f8fafc);
      line-height: 1.5;
      font-size: 0.9rem;
    }

    .result-box {
      border-left: 3px solid var(--confirm-color, var(--accent-primary, #6366f1));
      background: var(--bg-subtle, #1a2438);
      border-radius: var(--radius-sm, 6px);
      padding: 0.75rem 1rem;
      color: var(--text-secondary, #94a3b8);
      line-height: 1.5;
      font-size: 0.9rem;
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
                      <p class="section-label">${this.actionLabel}</p>
                      <p class="action-text">${this.action}</p>
                    </div>
                  `
                : ''}
              ${this.result
                ? html`
                    <div style="--confirm-color: ${confirmColor};">
                      <p class="section-label">${this.resultLabel}</p>
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

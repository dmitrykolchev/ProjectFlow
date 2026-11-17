import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getTranslation } from '../../../i18n';
import { store } from '../../../state/store';
import { SupportedLang } from '../../../types';
import { PortalHandle, portalManager } from '../app-modal-portal/app-modal-portal';
import { iconX } from '../icons';
import '../app-button/app-button';
import styles from './app-modal.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

@customElement('app-modal')
export class AppModal extends LitElement {
  @property({ type: Boolean }) open: boolean = false;
  @property({ type: String }) title: string = '';
  @property({ type: String }) size: ModalSize = 'md';
  @property({ type: Boolean }) hideClose: boolean = false;
  /** Optional header icon rendered before the title */
  @property({ type: Object, attribute: false }) headerIcon: TemplateResult | null = null;

  @state() private isVisualOpen: boolean = false;
  @state() private currentLang: SupportedLang = store.customization.language;

  private portalHandle: PortalHandle | null = null;
  private anchorComment: Comment | null = null;
  private closeTimer: number | null = null;
  private isMovingPortal: boolean = false;
  private unsubscribe: (() => void) | null = null;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.isMovingPortal) return;

    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    if (this.portalHandle) {
      this.portalHandle.close();
      this.portalHandle = null;
    }
    if (this.anchorComment) {
      this.anchorComment.remove();
      this.anchorComment = null;
    }
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('open')) {
      if (this.open) {
        this.mountInPortal();
      } else {
        this.scheduleRestoreFromPortal();
      }
    }
  }

  private mountInPortal() {
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }

    if (!this.portalHandle) {
      if (!this.anchorComment && this.parentNode) {
        this.anchorComment = document.createComment('app-modal-anchor');
        this.parentNode.insertBefore(this.anchorComment, this);
      }
      this.isMovingPortal = true;
      try {
        this.portalHandle = portalManager.mountElement({
          kind: 'modal',
          element: this,
          closeOnBackdrop: false,
          onClose: () => this.close(),
        });
      } finally {
        this.isMovingPortal = false;
      }
    }

    this.portalHandle.setActive(true);
    requestAnimationFrame(() => {
      if (this.open) {
        this.isVisualOpen = true;
      }
    });
  }

  private scheduleRestoreFromPortal() {
    this.isVisualOpen = false;
    this.portalHandle?.setActive(false);

    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
    }
    this.closeTimer = window.setTimeout(() => {
      this.closeTimer = null;
      if (!this.open) {
        this.restoreFromPortal();
      }
    }, 180);
  }

  private restoreFromPortal() {
    if (!this.portalHandle && !this.anchorComment) return;
    this.isMovingPortal = true;
    try {
      if (this.portalHandle) {
        this.portalHandle.close();
        this.portalHandle = null;
      }
      if (this.anchorComment?.parentNode) {
        this.anchorComment.parentNode.insertBefore(this, this.anchorComment);
        this.anchorComment.remove();
      }
      this.anchorComment = null;
    } finally {
      this.isMovingPortal = false;
    }
  }

  render() {
    return html`
      <div class="modal-backdrop ${this.isVisualOpen ? 'is-open' : ''}" @click="${this.handleBackdropClick}">
        <div class="modal-card size-${this.size}" @click="${(e: MouseEvent) => e.stopPropagation()}">
          <div class="modal-header">
            <h3 class="modal-title">
              ${this.headerIcon ? html`<span class="title-icon">${this.headerIcon}</span>` : ''}
              ${this.title || html`<slot name="title"></slot>`}
            </h3>
            ${this.hideClose
              ? ''
              : html`
                  <app-button
                    class="close-btn"
                    size="sm"
                    variant="icon"
                    type="button"
                    aria-label="${getTranslation(this.currentLang).common.close}"
                    @click="${this.close}"
                  >
                    <span slot="start">${iconX(16)}</span>
                  </app-button>
                `}
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

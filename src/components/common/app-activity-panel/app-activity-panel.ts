import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { ActivityLogItem } from '../../../types';
import { getTranslation } from '../../../i18n';
import { PortalHandle, portalManager } from '../app-modal-portal/app-modal-portal';
import '../app-button/app-button';
import styles from './app-activity-panel.css';

@customElement('app-activity-panel')
export class AppActivityPanel extends LitElement {
  @state() private logs: ActivityLogItem[] = [];
  @state() private isOpen: boolean = false;
  @state() private currentLang = store.customization.language;

  private unsubscribe?: () => void;
  private portalHandle: PortalHandle | null = null;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.updateState();
    this.unsubscribe = store.subscribe(() => {
      this.updateState();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
    this.closePortal();
  }

  private updateState() {
    this.logs = [...store.activityLog];
    this.isOpen = store.customization.showActivityPanel;
    this.currentLang = store.customization.language;
  }

  protected updated() {
    if (this.isOpen) {
      const template = this.renderDrawer();
      if (!this.portalHandle) {
        this.portalHandle = portalManager.mountTemplate({
          kind: 'modal',
          styles,
          template,
          host: this,
          closeOnBackdrop: false,
          onClose: () => {
            if (this.isOpen) store.toggleActivityPanel();
          },
        });
      } else {
        this.portalHandle.update(template);
      }
    } else {
      this.closePortal();
    }
  }

  private closePortal() {
    if (this.portalHandle) {
      this.portalHandle.close();
      this.portalHandle = null;
    }
  }

  render() {
    return html``;
  }

  private renderDrawer() {
    const t = getTranslation(this.currentLang);

    return html`
      <div class="drawer-backdrop" @click="${() => store.toggleActivityPanel()}">
        <div class="drawer-panel" @click="${(e: MouseEvent) => e.stopPropagation()}">
          <div class="drawer-header">
            <div class="drawer-title">
              <span>${t.activity.title}</span>
            </div>
            <div class="header-actions">
              ${this.logs.length > 0
                ? html`
                    <app-button
                      class="chip-action"
                      size="sm"
                      variant="icon"
                      @click="${() => store.clearActivityLog()}"
                    >
                      <span>${t.activity.clearAll}</span>
                    </app-button>
                  `
                : ''}
              <app-button
                class="chip-action"
                size="sm"
                variant="icon"
                @click="${() => store.toggleActivityPanel()}"
              >
                <span>✕</span>
              </app-button>
            </div>
          </div>
          <div class="drawer-body">
            ${this.logs.length === 0
              ? html`
                  <div class="empty-state">
                    <div>${t.activity.empty}</div>
                  </div>
                `
              : this.logs.map((log) => {
                  const date = new Date(log.timestamp);
                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return html`
                    <div class="log-item">
                      <div class="log-meta">
                        <span>${log.userName}</span>
                        <span class="log-time">${timeStr}</span>
                      </div>
                      <div class="log-content">
                        <span class="log-target">${log.targetTitle}</span>
                      </div>
                      <div class="log-details">${log.details}</div>
                    </div>
                  `;
                })}
          </div>
        </div>
      </div>
    `;
  }
}

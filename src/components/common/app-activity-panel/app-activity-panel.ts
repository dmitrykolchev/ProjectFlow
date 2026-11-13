import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { ActivityLogItem } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-activity-panel.css';

@customElement('app-activity-panel')
export class AppActivityPanel extends LitElement {
  @state() private logs: ActivityLogItem[] = [];
  @state() private isOpen: boolean = false;
  @state() private currentLang = store.customization.language;

  private unsubscribe?: () => void;

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
  }

  private updateState() {
    this.logs = [...store.activityLog];
    this.isOpen = store.customization.showActivityPanel;
    this.currentLang = store.customization.language;
  }

  render() {
    const t = getTranslation(this.currentLang);

    return html`
      <div class="drawer-backdrop ${this.isOpen ? 'is-open' : ''}" @click="${() => store.toggleActivityPanel()}">
        <div class="drawer-panel" @click="${(e: MouseEvent) => e.stopPropagation()}">
          <div class="drawer-header">
            <div class="drawer-title">
              <span>${t.activity.title}</span>
            </div>
            <div class="header-actions">
              ${this.logs.length > 0
                ? html`
                    <button class="icon-btn" @click="${() => store.clearActivityLog()}">
                      ${t.activity.clearAll}
                    </button>
                  `
                : ''}
              <button class="icon-btn" @click="${() => store.toggleActivityPanel()}">
                ✕
              </button>
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

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { NotificationItem } from '../../../types';
import styles from './app-toast.css';

@customElement('app-toast')
export class AppToast extends LitElement {
  @state() private notifications: NotificationItem[] = [];

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.notifications = [...store.notifications];
    this.unsubscribe = store.subscribe(() => {
      this.notifications = [...store.notifications];
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  render() {
    return html`
      ${this.notifications.map(
        (notif) => html`
          <div class="toast-item type-${notif.type}" role="alert">
            <span class="toast-icon">
              ${notif.type === 'success'
                ? '✓'
                : notif.type === 'warning'
                ? '⚠'
                : notif.type === 'error'
                ? '✕'
                : 'ℹ'}
            </span>
            <div class="toast-content">
              <span class="toast-title">${notif.title}</span>
              <span class="toast-message">${notif.message}</span>
            </div>
            <button
              class="toast-close"
              @click="${() => store.dismissNotification(notif.id)}"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        `
      )}
    `;
  }
}

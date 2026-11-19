import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { NotificationItem } from '../../../types';
import { getTranslation } from '../../../i18n';
import { iconArrowUpRight } from '../icons';
import styles from './app-toast.css';

@customElement('app-toast')
export class AppToast extends LitElement {
  @state() private notifications: NotificationItem[] = [];
  @state() private currentLang = store.customization.language;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => {
      this.syncState();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private syncState() {
    this.notifications = [...store.notifications];
    this.currentLang = store.customization.language;
  }

  render() {
    const t = getTranslation(this.currentLang);

    return html`
      ${this.notifications.map((notif) => {
        const canOpen = Boolean(
          notif.targetType &&
            notif.targetId &&
            store.canOpenActivityTarget(notif.targetType, notif.targetId)
        );
        const actionText =
          notif.actionLabel ||
          (notif.targetType === 'reminder'
            ? t.reminders.openReminderAction
            : t.activity.openTarget);

        return html`
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
              ${canOpen
                ? html`
                    <button
                      type="button"
                      class="toast-action-link"
                      @click="${() => {
                        store.openActivityTarget(notif.targetType, notif.targetId);
                        store.dismissNotification(notif.id);
                      }}"
                    >
                      <span>${actionText}</span>
                      ${iconArrowUpRight(12)}
                    </button>
                  `
                : ''}
            </div>
            <button
              class="toast-close"
              @click="${() => store.dismissNotification(notif.id)}"
              aria-label="${t.common.close}"
            >
              &times;
            </button>
          </div>
        `;
      })}
    `;
  }
}

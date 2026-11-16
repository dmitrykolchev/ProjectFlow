import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-toast';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Feedback/ToastNotifications',
  component: 'app-toast',
  description: 'Automated floating notification stack with auto-dismiss and status colors.',
  category: 'Feedback',
  propsDoc: {
    notifications: 'Notification queue rendered as stacked toasts (type, title, message)',
  },
  stories: [
    {
      name: 'Trigger Notifications',
      description: 'Buttons to emit different toast notification variants',
      render: () => html`
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <app-button
            variant="primary"
            @click="${() => store.addNotification('success', 'Успех', 'Операция успешно завершена!')}"
          >
            Уведомление Success
          </app-button>
          <app-button
            variant="secondary"
            @click="${() => store.addNotification('info', 'Инфо', 'Новые данные синхронизированы')}"
          >
            Уведомление Info
          </app-button>
          <app-button
            variant="outline"
            @click="${() => store.addNotification('warning', 'Внимание', 'Срок задачи истекает завтра')}"
          >
            Уведомление Warning
          </app-button>
          <app-button
            variant="danger"
            @click="${() => store.addNotification('error', 'Ошибка', 'Не удалось соединиться с сервером')}"
          >
            Уведомление Error
          </app-button>
        </div>
      `,
    },
  ],
};

export default meta;

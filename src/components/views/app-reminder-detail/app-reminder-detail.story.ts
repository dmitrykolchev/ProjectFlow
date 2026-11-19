import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-reminder-detail';

const meta: ComponentStoryMeta = {
  title: 'Views/Reminder Detail',
  component: 'app-reminder-detail',
  category: 'Views',
  description:
    'Отдельная страница напоминания: связанные объекты системы, расписание RFC 5545 и следующие срабатывания, участники, прикреплённые документы и гибкие правила уведомлений.',
  stories: [
    {
      name: 'Карточка напоминания',
      description: 'Детальное представление напоминания со связями и расписанием.',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-reminder-detail></app-reminder-detail>
        </div>
      `,
    },
  ],
};

export default meta;

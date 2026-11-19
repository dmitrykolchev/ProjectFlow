import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-timeentry-detail';

const meta: ComponentStoryMeta = {
  title: 'Views/Time Entry Detail',
  component: 'app-timeentry-detail',
  category: 'Views',
  description:
    'Отдельная страница записи о времени: отработанные часы, статус утверждения, биллинг, прикреплённые файлы в библиотеке проекта и включение в калькуляции.',
  stories: [
    {
      name: 'Карточка записи о времени',
      description: 'Детальное представление отчёта о времени по задаче.',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-timeentry-detail></app-timeentry-detail>
        </div>
      `,
    },
  ],
};

export default meta;

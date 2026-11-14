import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-employee-detail';

const meta: ComponentStoryMeta = {
  title: 'Views/Employee Detail',
  component: 'app-employee-detail',
  category: 'Views',
  description:
    'Отдельная страница сотрудника: профиль, ставка, загрузка в проектах по ролям, назначенные задачи, списанное время и расходы.',
  stories: [
    {
      name: 'Карточка сотрудника',
      description: 'Детальное представление сотрудника с проектами, задачами и учётом трудозатрат.',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-employee-detail></app-employee-detail>
        </div>
      `,
    },
  ],
};

export default meta;

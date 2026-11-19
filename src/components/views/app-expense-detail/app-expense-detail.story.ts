import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-expense-detail';

const meta: ComponentStoryMeta = {
  title: 'Views/Expense Detail',
  component: 'app-expense-detail',
  category: 'Views',
  description:
    'Отдельная страница расхода: сумма и рублёвый эквивалент, статус согласования, чеки и документы в библиотеке проекта, перевыставление в калькуляциях и напоминания.',
  stories: [
    {
      name: 'Карточка расхода',
      description: 'Детальное представление статьи проектных затрат.',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-expense-detail></app-expense-detail>
        </div>
      `,
    },
  ],
};

export default meta;

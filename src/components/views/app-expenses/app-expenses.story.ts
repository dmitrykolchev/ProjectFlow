import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-expenses';

const meta: ComponentStoryMeta = {
  title: 'Views/Expenses',
  component: 'app-expenses',
  category: 'Views',
  description:
    'Учет затрат: реестр расходов по проектам и задачам, статусы согласования, фильтрация и сравнение с бюджетом проектов.',
  stories: [
    {
      name: 'Полноценное представление учёта затрат',
      description: 'KPI-карточки, реестр расходов, быстрое согласование и сводка по бюджетам проектов.',
      render: () => html`
        <div style="height: 680px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-expenses></app-expenses>
        </div>
      `,
    },
  ],
};

export default meta;

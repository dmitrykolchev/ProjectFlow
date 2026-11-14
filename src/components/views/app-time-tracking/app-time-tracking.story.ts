import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-time-tracking';

const meta: ComponentStoryMeta = {
  title: 'Views/Time Tracking',
  component: 'app-time-tracking',
  category: 'Views',
  description:
    'Учет времени: быстрые отчёты по задачам, журнал трудозатрат, группировка план/факт по задачам и утверждение часов.',
  stories: [
    {
      name: 'Полноценное представление учёта времени',
      description: 'Журнал, KPI-сводка, быстрая форма списания часов и группировка по задачам.',
      render: () => html`
        <div style="height: 680px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-time-tracking></app-time-tracking>
        </div>
      `,
    },
  ],
};

export default meta;

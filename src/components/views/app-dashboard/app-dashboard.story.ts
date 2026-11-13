import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-dashboard';

export const meta: ComponentStoryMeta = {
  title: 'Views/Dashboard',
  component: 'app-dashboard',
  description: 'Executive project management dashboard combining KPI metric cards, velocity/status/priority charts, project progress, and upcoming deadlines.',
  category: 'Views',
  stories: [
    {
      name: 'Interactive Dashboard',
      description: 'Live connected project dashboard view',
      render: () => html`
        <div style="height: 640px; width: 100%; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-dashboard></app-dashboard>
        </div>
      `,
    },
  ],
};

export default meta;

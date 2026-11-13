import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-analytics';

export const meta: ComponentStoryMeta = {
  title: 'Views/Analytics',
  component: 'app-analytics',
  description: 'Executive project health dashboards, KPI metrics, progress bars, and team workload table.',
  category: 'Views',
  stories: [
    {
      name: 'Interactive Analytics',
      description: 'Live performance metrics calculated from active project tasks and assigned members',
      render: () => html`
        <div style="height: 600px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-analytics></app-analytics>
        </div>
      `,
    },
  ],
};

export default meta;

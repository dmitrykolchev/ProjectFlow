import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-calendar';

export const meta: ComponentStoryMeta = {
  title: 'Views/Calendar',
  component: 'app-calendar',
  description: 'Interactive project schedule calendar supporting Month, Week, and Day views with task event badges.',
  category: 'Views',
  stories: [
    {
      name: 'Interactive Calendar',
      description: 'Connected calendar view with month/week/day toggles and quick creation',
      render: () => html`
        <div style="height: 600px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-calendar></app-calendar>
        </div>
      `,
    },
  ],
};

export default meta;

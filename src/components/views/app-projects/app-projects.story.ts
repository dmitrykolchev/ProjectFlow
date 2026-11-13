import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-projects';

export const meta: ComponentStoryMeta = {
  title: 'Views/Projects',
  component: 'app-projects',
  description: 'Projects portfolio list with cards/table toggle, budgets, role summary, and navigation to single project view.',
  category: 'Views',
  stories: [
    {
      name: 'Projects List View',
      description: 'Interactive project cards and table list with filters and CRUD modal',
      render: () => html`
        <div style="height: 680px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-projects></app-projects>
        </div>
      `,
    },
  ],
};

export default meta;

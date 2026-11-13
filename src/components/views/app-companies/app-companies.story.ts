import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-companies';

export const meta: ComponentStoryMeta = {
  title: 'Views/Companies',
  component: 'app-companies',
  description: 'Directory of group legal entities, tax requisites, leadership, and linked projects/contracts.',
  category: 'Views',
  stories: [
    {
      name: 'Companies Directory',
      description: 'Interactive companies cards with filtering, creation, editing, and deletion',
      render: () => html`
        <div style="height: 640px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-companies></app-companies>
        </div>
      `,
    },
  ],
};

export default meta;

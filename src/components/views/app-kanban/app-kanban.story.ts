import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-kanban';

export const meta: ComponentStoryMeta = {
  title: 'Views/KanbanBoard',
  component: 'app-kanban',
  description: 'Full-featured agile Kanban board with 5 workflow columns and drag-and-drop support.',
  category: 'Views',
  stories: [
    {
      name: 'Interactive Board',
      description: 'Live interactive kanban board view',
      render: () => html`
        <div style="height: 600px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-kanban></app-kanban>
        </div>
      `,
    },
  ],
};

export default meta;

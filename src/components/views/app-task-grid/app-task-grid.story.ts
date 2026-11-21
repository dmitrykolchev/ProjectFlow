import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-task-grid';

export const meta: ComponentStoryMeta = {
  title: 'Views/Task Grid',
  component: 'app-task-grid',
  description:
    'The task table view: canonical skeleton (page header, Standard/Compact density segmented switch with the filter toggle, filter bar with project/status/priority/assignee filters bound to the store task filters) and app-data-grid in store mode inside the framed card; the grid keeps its own toolbar (bulk actions, grouping, column menu, export) and hides its internal density switch because the view owns the mode row.',
  category: 'Views',
  stories: [
    {
      name: 'Task Table',
      description:
        'Store-backed task grid with the density segmented switch and the filter bar; the grid toolbar provides bulk actions, grouping, column menu and CSV export',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-task-grid></app-task-grid>
        </div>
      `,
    },
  ],
};

export default meta;

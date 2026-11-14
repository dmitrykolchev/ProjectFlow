import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-task-detail';

export const meta: ComponentStoryMeta = {
  title: 'Views/TaskDetail',
  component: 'app-task-detail',
  description:
    'Dedicated Task Detail view unifying full task history: logged time entries, linked expenses, project chat discussions, audit changes, and subtasks.',
  category: 'Views',
  stories: [
    {
      name: 'Task Detail Workspace (CORE-101)',
      description: 'Displays CORE-101 with seeded time entries, Redis cluster expense, and team discussions.',
      render: () => {
        store.detailTaskId = 'CORE-101';
        return html`
          <div style="width: 100%; height: 780px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
            <app-task-detail></app-task-detail>
          </div>
        `;
      },
    },
  ],
};

export default meta;

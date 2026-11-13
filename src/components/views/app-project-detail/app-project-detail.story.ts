import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-project-detail';

export const meta: ComponentStoryMeta = {
  title: 'Views/Project Detail',
  component: 'app-project-detail',
  description: 'Dedicated single-project page with project overview, team management grouped by project roles, task summary, and linked contracts.',
  category: 'Views',
  stories: [
    {
      name: 'Single Project Workspace',
      description: 'Spacious project detail page with role-based team staffing',
      render: () => html`
        <div style="height: 680px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-project-detail></app-project-detail>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-projects';

export const meta: ComponentStoryMeta = {
  title: 'Views/Projects',
  component: 'app-projects',
  description: 'Projects portfolio with budgets, company/client links, and interactive team management grouped by project roles.',
  category: 'Views',
  stories: [
    {
      name: 'Projects & Roles Workspace',
      description: 'Master-detail project list and team role assignment workspace',
      render: () => html`
        <div style="height: 680px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-projects></app-projects>
        </div>
      `,
    },
  ],
};

export default meta;

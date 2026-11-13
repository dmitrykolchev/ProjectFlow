import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-contracts';

export const meta: ComponentStoryMeta = {
  title: 'Views/Contracts',
  component: 'app-contracts',
  description: 'Contracts registry linking internal companies, counterparties, projects, owners, and budgets.',
  category: 'Views',
  stories: [
    {
      name: 'Contracts Registry',
      description: 'Interactive contracts table with status/type filters, expiry indicators, and CRUD modal',
      render: () => html`
        <div style="height: 640px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-contracts></app-contracts>
        </div>
      `,
    },
  ],
};

export default meta;

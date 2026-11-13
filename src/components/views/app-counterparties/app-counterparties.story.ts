import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-counterparties';

export const meta: ComponentStoryMeta = {
  title: 'Views/Counterparties',
  component: 'app-counterparties',
  description: 'CRM directory for clients, vendors, partners, and contractors with ratings and contract summaries.',
  category: 'Views',
  stories: [
    {
      name: 'Counterparties Directory',
      description: 'Interactive cards and table view with type/status filters and CRUD modal',
      render: () => html`
        <div style="height: 640px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-counterparties></app-counterparties>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-contacts';

export const meta: ComponentStoryMeta = {
  title: 'Views/Contacts',
  component: 'app-contacts',
  description:
    'Unified contact persons directory across all counterparties with cards and table views, role/type filtering, quick copy, and full CRUD.',
  category: 'Views',
  stories: [
    {
      name: 'Contacts Directory',
      description: 'Cards and table display modes with counterparty, type, and role filters',
      render: () => html`
        <div style="height: 660px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-contacts></app-contacts>
        </div>
      `,
    },
  ],
};

export default meta;

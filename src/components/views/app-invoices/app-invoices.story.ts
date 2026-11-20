import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-invoices';

export const meta: ComponentStoryMeta = {
  title: 'Views/Invoices',
  component: 'app-invoices',
  description:
    'Standalone invoices registry across all contracts with cards and table views, payment progress tracking, due-control tags, itemized editor, preview sheet, and payment registration.',
  category: 'Views',
  stories: [
    {
      name: 'Invoices Registry',
      description: 'Cards and table display modes with status, contract, counterparty, and company filters',
      render: () => html`
        <div style="height: 660px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-invoices></app-invoices>
        </div>
      `,
    },
  ],
};

export default meta;

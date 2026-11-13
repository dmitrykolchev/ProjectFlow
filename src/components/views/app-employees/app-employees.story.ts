import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-employees';

export const meta: ComponentStoryMeta = {
  title: 'Views/Employees',
  component: 'app-employees',
  description: 'Employee directory with card/table switch, department & company filters, rates, and workload summary.',
  category: 'Views',
  stories: [
    {
      name: 'Employees Directory',
      description: 'Interactive employee cards and table view with CRUD modal',
      render: () => html`
        <div style="height: 640px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-employees></app-employees>
        </div>
      `,
    },
  ],
};

export default meta;

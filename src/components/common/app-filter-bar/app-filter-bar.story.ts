import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import '../app-segmented-switch/app-segmented-switch';
import './app-filter-bar';

export const meta: ComponentStoryMeta = {
  title: 'Common/Filter Bar',
  component: 'app-filter-bar',
  description:
    'Toolbar with search input, N filter selects, optional reset button and trailing actions slot.',
  category: 'Common',
  stories: [
    {
      name: 'Default',
      description: 'Search + two selects + segmented switch in actions slot',
      render: () => html`
        <app-filter-bar
          placeholder="Search by key or name..."
          .filters="${[
            { key: 'status', options: [{ value: 'all', label: 'All statuses' }, { value: 'active', label: 'Active' }] },
            { key: 'company', options: [{ value: 'all', label: 'All companies' }] },
          ]}"
          .values="${{ status: 'all', company: 'all' }}"
        >
          <app-segmented-switch
            size="sm"
            .value="${'cards'}"
            .options="${[{ value: 'cards', label: 'Cards' }, { value: 'table', label: 'Table' }]}"
          ></app-segmented-switch>
        </app-filter-bar>
      `,
    },
    {
      name: 'Bare & Reset',
      description: 'No card chrome, reset button visible when a filter is active',
      render: () => html`
        <app-filter-bar
          variant="bare"
          show-reset
          placeholder="Search..."
          .filters="${[{ key: 'status', options: [{ value: 'all', label: 'All' }, { value: 'draft', label: 'Draft' }] }]}"
          .values="${{ status: 'draft' }}"
        ></app-filter-bar>
      `,
    },
  ],
};

export default meta;

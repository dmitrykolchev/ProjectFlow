import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import '../app-segmented-switch/app-segmented-switch';
import './app-filter-bar';

export const meta: ComponentStoryMeta = {
  title: 'Common/Filter Bar',
  component: 'app-filter-bar',
  description:
    'Toolbar with search input, N filter selects, optional reset button and trailing actions slot. The prefix slot renders extra controls before the filter selects, and the default slot appends additional controls after them.',
  category: 'Common',
  slotsDoc: {
    prefix: 'Extra controls rendered before the filter selects',
    '(default)': 'Additional controls appended after the filter selects',
  },
  childrenDoc: {
    'app-segmented-switch': 'View-mode switch placed in the default slot after the filter selects',
    'app-button': 'Toolbar action placed in the prefix or default slot',
  },
  propsDoc: {
    searchValue: 'Current text of the search box',
    searchEnabled: 'Shows the search input',
    filters: 'Filter definitions (id, type, options)',
    values: 'Current filter values keyed by filter id',
    placeholder: 'Search box placeholder',
    variant: 'Surface style: card / plain',
    showReset: 'Shows the reset button when filters are active',
  },
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

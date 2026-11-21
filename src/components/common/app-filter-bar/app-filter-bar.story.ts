import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { mapProjectOptions, mapUserOptions } from '../entity-selector-options';
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
    filters: 'Filter definitions (key, options, type select | entity)',
    values: 'Current filter values keyed by filter id',
    placeholder: 'Search box placeholder',
    variant: 'Surface style: card / plain',
    showReset: 'Shows the reset button when filters are active',
  },
  eventsDoc: {
    reset: { detail: '—', description: 'Fires when Reset is pressed' },
    'search-change': {
      detail: '{ value: string }',
      description: 'Fires when the search text changes',
    },
    'filter-change': {
      detail: '{ key: string, value: string }',
      description: 'Fires when a filter control changes',
    },
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
    {
      name: 'Entity Filters',
      description:
        'Filters declared with type entity render app-entity-selector controls: searchable lists with project codes, colors and employee avatars in the same bar slots',
      render: () => html`
        <app-filter-bar
          placeholder="Search entries..."
          .filters="${[
            {
              key: 'project',
              type: 'entity',
              options: [
                { value: 'all', label: 'All projects' },
                ...mapProjectOptions(store.projects, getTranslation(store.customization.language)),
              ],
            },
            {
              key: 'user',
              type: 'entity',
              options: [
                { value: 'all', label: 'All employees' },
                ...mapUserOptions(store.users, getTranslation(store.customization.language)),
              ],
            },
          ]}"
          .values="${{ project: store.projects[0]?.id || 'all', user: 'all' }}"
        ></app-filter-bar>
      `,
    },
  ],
};

export default meta;

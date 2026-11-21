import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-search-input';
import { iconSearch } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/SearchInput',
  component: 'app-search-input',
  description:
    'Search input with a leading graphic slot, canonical sm/md/lg control scale, and focus width expansion — the header search behavior as a standalone component. The wrapper rests at 240px (280px on focus) and emits input/change events with the current value.',
  category: 'Common',
  slotsDoc: {
    icon: 'Leading graphic rendered inside the field at the left edge (SVG icon, material icon)',
  },
  childrenDoc: {
    'app-material-icon': 'Icon rendered in the icon slot',
  },
  propsDoc: {
    value: 'Current search text',
    placeholder: 'Placeholder shown while the field is empty',
    size: 'Control height: sm / md / lg',
    disabled: 'Disables the input',
  },
  eventsDoc: {
    input: {
      detail: '{ value: string }',
      description: 'Fires on every keystroke with the current value',
    },
    change: {
      detail: '{ value: string }',
      description: 'Fires when the input value is committed',
    },
  },
  stories: [
    {
      name: 'Search Input Sizes',
      description: 'sm / md / lg search fields with the leading icon slot',
      render: () => html`
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <app-search-input size="sm" placeholder="Поиск (sm)">
            <span slot="icon">${iconSearch(14)}</span>
          </app-search-input>
          <app-search-input size="md" placeholder="Поиск (md)">
            <span slot="icon">${iconSearch(14)}</span>
          </app-search-input>
          <app-search-input size="lg" placeholder="Поиск (lg)">
            <span slot="icon">${iconSearch(14)}</span>
          </app-search-input>
        </div>
      `,
    },
  ],
};

export default meta;

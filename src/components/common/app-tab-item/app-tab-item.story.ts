import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-tab-item';
import '../app-tabs/app-tabs';
import { iconLayers, iconFileText } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/TabItem',
  component: 'app-tab-item',
  description:
    'A single tab inside an app-tabs strip. Canonical start / default / end slots carry leading graphics, label text, and trailing graphics; the row geometry is inherited from the parent app-tabs. Clicking emits the canonical tab-select event.',
  category: 'Common',
  propsDoc: {
    value: 'Identifier of the tab, matched against the active property of app-tabs',
    active: 'Selected visual state, reflected',
    disabled: 'Disables interaction',
  },
  slotsDoc: {
    start: 'Content rendered before the label (text, SVG icon, material icon) — centered vertically',
    '(default)': 'Tab text — centered vertically',
    end: 'Content rendered after the label (text, SVG icon, material icon) — centered vertically',
  },
  eventsDoc: {
    'tab-select': {
      detail: '{ value: string }',
      description: 'Fires when the tab is clicked (handled by app-tabs in a strip)',
    },
  },
  stories: [
    {
      name: 'Tab States',
      description: 'Active, default and disabled tabs inside a canonical strip',
      render: () => html`
        <app-tabs size="md" active="overview">
          <app-tab-item value="overview">
            <span slot="start">${iconLayers(16)}</span>
            <span>Обзор</span>
          </app-tab-item>
          <app-tab-item value="docs">
            <span slot="start">${iconFileText(16)}</span>
            <span>Документы</span>
          </app-tab-item>
          <app-tab-item value="settings" disabled>
            <span>Настройки</span>
          </app-tab-item>
        </app-tabs>
      `,
    },
  ],
};

export default meta;

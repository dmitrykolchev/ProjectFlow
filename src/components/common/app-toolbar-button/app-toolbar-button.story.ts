import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-toolbar-button';
import '../app-toolbar/app-toolbar';
import '../app-toolbar-separator/app-toolbar-separator';
import '../app-menu-item/app-menu-item';
import { iconEdit, iconTrash, iconFilter } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/ToolbarButton',
  component: 'app-toolbar-button',
  description:
    'Toolbar control with two types: normal (push button; behaves as a dropdown when its light DOM contains app-menu-item children) and toggle (stateful press button). Canonical start / default / end slots carry leading graphics, label text, and trailing graphics. The row scale is inherited from the parent app-toolbar.',
  category: 'Common',
  propsDoc: {
    type: 'Button behavior: normal (push / dropdown) or toggle (stateful)',
    pressed: 'Pressed (toggled) visual state, reflected — for toggle buttons',
    disabled: 'Disables interaction',
    value: 'Value emitted in the change event detail',
    ariaLabel: 'Accessible name and tooltip of the button',
  },
  slotsDoc: {
    start: 'Content rendered before the label (text, SVG icon, material icon) — centered vertically',
    '(default)': 'Button text — centered vertically',
    end: 'Content rendered after the label (text, SVG icon, material icon) — centered vertically',
  },
  childrenDoc: {
    'app-menu-item': 'Dropdown menu entry; when present the button opens a portal menu on click',
    'app-menu-header': 'Declarative menu header inside the dropdown',
    'app-menu-divider': 'Declarative menu divider inside the dropdown',
  },
  eventsDoc: {
    change: {
      detail: '{ pressed: boolean, value: string }',
      description: 'Fires when a toggle button is pressed',
    },
    select: {
      detail: '{ item: MenuItem, id: string, value: string, checked?: boolean, element: AppMenuItem }',
      description: 'Fires when an entry of the dropdown menu is selected',
    },
  },
  stories: [
    {
      name: 'Push & Toggle',
      description: 'Normal push buttons, separators and toggle buttons in one toolbar row',
      render: () => html`
        <app-toolbar size="md">
          <app-toolbar-button aria-label="Edit">
            <span slot="start">${iconEdit(16)}</span>
            <span>Изменить</span>
          </app-toolbar-button>
          <app-toolbar-separator></app-toolbar-separator>
          <app-toolbar-button type="toggle" value="mine" aria-label="Only mine">
            <span slot="start">${iconFilter(16)}</span>
            <span>Только мои</span>
          </app-toolbar-button>
          <app-toolbar-button type="toggle" pressed value="archived" aria-label="Archived">
            <span>Архивные</span>
          </app-toolbar-button>
          <app-toolbar-separator></app-toolbar-separator>
          <app-toolbar-button aria-label="Delete">
            <span slot="start">${iconTrash(16)}</span>
          </app-toolbar-button>
        </app-toolbar>
      `,
    },
    {
      name: 'Dropdown Button',
      description: 'A normal button with app-menu-item children opens a portal menu and emits select',
      render: () => html`
        <app-toolbar size="md">
          <app-toolbar-button aria-label="Actions">
            <span>Действия</span>
            <app-menu-item value="duplicate" label="Дублировать"></app-menu-item>
            <app-menu-item value="archive" label="В архив"></app-menu-item>
            <app-menu-item value="delete" label="Удалить" danger></app-menu-item>
          </app-toolbar-button>
        </app-toolbar>
      `,
    },
    {
      name: 'Disabled',
      description: 'Disabled push and toggle buttons keep the row geometry',
      render: () => html`
        <app-toolbar size="md">
          <app-toolbar-button disabled aria-label="Edit">
            <span slot="start">${iconEdit(16)}</span>
            <span>Изменить</span>
          </app-toolbar-button>
          <app-toolbar-button type="toggle" disabled aria-label="Only mine">
            <span>Только мои</span>
          </app-toolbar-button>
        </app-toolbar>
      `,
    },
  ],
};

export default meta;

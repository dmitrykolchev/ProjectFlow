import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-dropdown-button';
import { iconDownload, iconEdit, iconTrash } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/DropdownButton',
  component: 'app-dropdown-button',
  description:
    'Action button paired with a contextual dropdown menu popover and outside-click dismissal. Canonical start / default / end slots carry leading graphics, label text, and trailing graphics; icon-start is a legacy alias of start. The default slot accepts declarative app-menu-item, app-menu-header, and app-menu-divider children.',
  category: 'Common',
  slotsDoc: {
    start: 'Content rendered before the label (text, SVG icon, material icon) — centered vertically',
    end: 'Content rendered after the label, before the menu chevron — centered vertically',
    'icon-start': 'Legacy alias of start',
    '(default)': 'Optional declarative <app-menu-item>, <app-menu-header>, and <app-menu-divider> children',
  },
  childrenDoc: {
    'app-menu-header': 'Section caption of the dropdown menu (declarative children replace the items prop)',
    'app-menu-item': 'Menu row with label, icon, shortcut, checkable state, danger style',
    'app-menu-divider': 'Horizontal separator between menu rows',
    'app-material-icon': 'Icon rendered in the start / end slot before or after the button label',
  },
  propsDoc: {
    label: 'Button caption',
    variant: 'Visual style of the button surface',
    size: 'Control height: sm / md / lg',
    placement: 'Menu placement relative to the button (bottom-start, bottom-end, ...)',
    disabled: 'Disables interaction',
    items: 'Menu item definitions rendered in the dropdown',
  },
  stories: [
    {
      name: 'Dropdown Variants',
      description: 'Primary array-driven dropdown, outline declarative dropdown, and bottom-end alignment',
      render: () => html`
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; min-height: 200px; align-items: flex-start;">
          <app-dropdown-button
            label="Экспорт данных"
            variant="primary"
            .items="${[
              { id: 'csv', label: 'Скачать CSV', icon: iconDownload(14) },
              { id: 'json', label: 'Скачать JSON', icon: iconDownload(14) },
              { id: 'div', divider: true },
              { id: 'print', label: 'Печать отчёта' },
            ]}"
          ></app-dropdown-button>

          <app-dropdown-button
            label="Действия"
            variant="outline"
            placement="bottom-end"
          >
            <app-menu-header label="Операции"></app-menu-header>
            <app-menu-item value="edit" label="Массовое редактирование">
              <span slot="icon">${iconEdit(14)}</span>
            </app-menu-item>
            <app-menu-item value="archive">Переместить в архив</app-menu-item>
            <app-menu-divider></app-menu-divider>
            <app-menu-item value="delete" label="Удалить выбранное" danger>
              <span slot="icon">${iconTrash(14)}</span>
            </app-menu-item>
          </app-dropdown-button>
        </div>
      `,
    },
  ],
};

export default meta;

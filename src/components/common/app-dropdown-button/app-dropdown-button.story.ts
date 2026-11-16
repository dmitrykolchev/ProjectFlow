import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-dropdown-button';
import { iconDownload, iconEdit, iconTrash } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/DropdownButton',
  component: 'app-dropdown-button',
  description: 'Action button paired with a contextual dropdown menu popover and outside-click dismissal.',
  category: 'Common',
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
      description: 'Primary, secondary, and outline dropdown triggers',
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
            .items="${[
              { id: 'edit', label: 'Массовое редактирование', icon: iconEdit(14) },
              { id: 'archive', label: 'Переместить в архив' },
              { id: 'div', divider: true },
              { id: 'delete', label: 'Удалить выбранное', icon: iconTrash(14), danger: true },
            ]}"
          ></app-dropdown-button>
        </div>
      `,
    },
  ],
};

export default meta;

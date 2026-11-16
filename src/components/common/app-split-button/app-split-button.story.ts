import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-split-button';
import { iconPlus, iconDownload, iconKanban, iconTable } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/SplitButton',
  component: 'app-split-button',
  description: 'Dual-action button combining a primary action trigger with a secondary options menu.',
  category: 'Common',
  slotsDoc: {
    start: 'Content rendered before the main label (text, SVG icon, material icon) — centered vertically',
    end: 'Content rendered after the main label (text, SVG icon, material icon) — centered vertically',
    'icon-start': 'Legacy alias of start',
    '(default)': 'Optional declarative <app-menu-item>, <app-menu-header>, and <app-menu-divider> children',
  },
  childrenDoc: {
    'app-menu-header': 'Section caption of the dropdown menu (declarative children replace the items prop)',
    'app-menu-item': 'Menu row with label, icon, shortcut, checkable state, danger style',
    'app-menu-divider': 'Horizontal separator between menu rows',
    'app-material-icon': 'Icon rendered in the start / end slot before or after the main label',
  },
  propsDoc: {
    label: 'Main button caption',
    variant: 'Visual style of the main button',
    size: 'Control height: sm / md / lg',
    disabled: 'Disables both halves of the button',
    items: 'Menu items opened by the arrow half',
  },
  stories: [
    {
      name: 'Split Button Variants',
      description: 'Primary, secondary declarative, and outline split buttons',
      render: () => html`
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; min-height: 190px; align-items: flex-start;">
          <app-split-button
            label="Создать задачу"
            variant="primary"
            .items="${[
              { id: 'kanban', label: 'Открыть Канбан', icon: iconKanban() },
              { id: 'grid', label: 'Открыть таблицу', icon: iconTable() },
              { id: 'div', divider: true },
              { id: 'csv', label: 'Экспорт CSV', icon: iconDownload(14) },
            ]}"
          >
            <span slot="icon-start">${iconPlus(15)}</span>
          </app-split-button>

          <app-split-button label="Сохранить" variant="secondary">
            <app-menu-header label="Варианты сохранения"></app-menu-header>
            <app-menu-item value="save-draft" label="Сохранить как черновик"></app-menu-item>
            <app-menu-item value="save-template" label="Сохранить как шаблон"></app-menu-item>
          </app-split-button>

          <app-split-button
            label="Экспорт"
            variant="outline"
            size="sm"
            .items="${[
              { id: 'csv', label: 'CSV таблица' },
              { id: 'json', label: 'JSON архив' },
            ]}"
          ></app-split-button>
        </div>
      `,
    },
  ],
};

export default meta;

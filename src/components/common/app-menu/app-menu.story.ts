import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-menu';
import { iconEdit, iconDownload, iconTrash, iconPlus } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/Menu',
  component: 'app-menu',
  description: 'Standalone accessible menu surface supporting both programmatic items arrays and declarative <app-menu-item>, <app-menu-header>, and <app-menu-divider> composition.',
  category: 'Common',
  slotsDoc: {
    '(default)': 'Declarative <app-menu-item>, <app-menu-header>, and <app-menu-divider> children',
  },
  childrenDoc: {
    'app-menu-header': 'Section caption rendered at the top of the menu',
    'app-menu-item': 'Menu row with label, icon, shortcut, checkable state, danger style',
    'app-menu-divider': 'Horizontal separator between menu rows',
  },
  propsDoc: {
    items: 'Menu item definitions (label, icon, action, separators)',
  },
  stories: [
    {
      name: 'Declarative Composition (<app-menu-*>)',
      description: 'Menu configured declaratively using <app-menu-header>, <app-menu-item>, and <app-menu-divider>',
      render: () => html`
        <div style="width: 240px;">
          <app-menu>
            <app-menu-header label="Операции с задачей"></app-menu-header>
            <app-menu-item value="new" label="Создать подзадачу" shortcut="⌘N">
              <span slot="icon">${iconPlus(14)}</span>
            </app-menu-item>
            <app-menu-item value="edit" shortcut="E">
              <span slot="icon">${iconEdit(14)}</span>
              Редактировать
            </app-menu-item>
            <app-menu-item value="export" label="Экспорт в CSV" shortcut="⌘S">
              <span slot="icon">${iconDownload(14)}</span>
            </app-menu-item>
            <app-menu-divider></app-menu-divider>
            <app-menu-item value="pin" checkable checked>Закрепить вверху</app-menu-item>
            <app-menu-item value="watch" checkable>Отслеживать изменения</app-menu-item>
            <app-menu-divider></app-menu-divider>
            <app-menu-item value="delete" label="Удалить задачу" danger shortcut="⌫">
              <span slot="icon">${iconTrash(14)}</span>
            </app-menu-item>
          </app-menu>
        </div>
      `,
    },
    {
      name: 'Context & Action Menu (items array)',
      description: 'Structured menu with icons, keyboard shortcuts, and danger item via .items property',
      render: () => html`
        <div style="width: 240px;">
          <app-menu
            .items="${[
              { id: 'h1', header: 'Операции с задачей' },
              { id: 'new', label: 'Создать подзадачу', icon: iconPlus(14), shortcut: '⌘N' },
              { id: 'edit', label: 'Редактировать', icon: iconEdit(14), shortcut: 'E' },
              { id: 'export', label: 'Экспорт в CSV', icon: iconDownload(14), shortcut: '⌘S' },
              { id: 'd1', divider: true },
              { id: 'pin', label: 'Закрепить вверху', checked: true },
              { id: 'watch', label: 'Отслеживать изменения', checked: false },
              { id: 'd2', divider: true },
              { id: 'delete', label: 'Удалить задачу', icon: iconTrash(14), danger: true, shortcut: '⌫' },
            ]}"
          ></app-menu>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-menu-item';
import { iconEdit, iconDownload, iconTrash, iconPlus } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/MenuItem',
  component: 'app-menu-item',
  description: 'Declarative interactive menu entry used inside <app-menu> with support for icons, shortcuts, checkmarks, danger, and disabled states.',
  category: 'Common',
  slotsDoc: {
    start: 'Content rendered before the label (text, SVG icon, material icon) — centered vertically',
    '(default)': 'Item label markup (used when the label property is omitted)',
    end: 'Content rendered on the right (text, SVG icon, material icon) — centered vertically',
    icon: 'Legacy alias of start',
    shortcut: 'Legacy alias of end',
  },
  childrenDoc: {
    'app-material-icon': 'Icon rendered in the start / end slot before or after the item label',
  },
  propsDoc: {
    value: 'Action identifier emitted in the select event detail (falls back to id)',
    label: 'Item text caption',
    shortcut: 'Keyboard shortcut hint displayed on the right',
    disabled: 'Prevents clicking and keyboard activation',
    danger: 'Highlights destructive action styling',
    checked: 'Renders active checkmark state',
    checkable: 'Reserves checkmark gutter and toggles checked state on click',
    icon: 'Programmatic leading icon (TemplateResult or string)',
  },
  stories: [
    {
      name: 'Item Variants & States',
      description: 'Standard, slotted icon, checkable toggle, disabled, and danger menu items',
      render: () => html`
        <div style="width: 240px; background: var(--bg-surface-elevated, #162032); border: 1px solid var(--border-strong, #334155); border-radius: var(--radius-md, 8px); padding: 0.35rem; display: flex; flex-direction: column; gap: 2px;">
          <app-menu-item value="new" label="Создать подзадачу" shortcut="⌘N">
            <span slot="icon">${iconPlus(14)}</span>
          </app-menu-item>
          <app-menu-item value="edit" shortcut="E" .icon="${iconEdit(14)}">Редактировать</app-menu-item>
          <app-menu-item value="export" label="Экспорт в CSV" shortcut="⌘S" disabled>
            <span slot="icon">${iconDownload(14)}</span>
          </app-menu-item>
          <app-menu-item value="pin" checkable checked>Закрепить вверху</app-menu-item>
          <app-menu-item value="watch" checkable>Отслеживать изменения</app-menu-item>
          <app-menu-item value="delete" label="Удалить задачу" danger shortcut="⌫">
            <span slot="icon">${iconTrash(14)}</span>
          </app-menu-item>
        </div>
      `,
    },
  ],
};

export default meta;

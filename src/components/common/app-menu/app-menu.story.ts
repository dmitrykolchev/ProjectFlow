import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-menu';
import { iconEdit, iconDownload, iconTrash, iconPlus } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/Menu',
  component: 'app-menu',
  description: 'Standalone accessible menu surface supporting icons, shortcuts, checkmarks, section headers, dividers, and destructive actions.',
  category: 'Common',
  stories: [
    {
      name: 'Context & Action Menu',
      description: 'Structured menu with icons, keyboard shortcuts, and danger item',
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

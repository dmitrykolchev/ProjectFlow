import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-split-button';
import { iconPlus, iconDownload, iconKanban, iconTable } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/SplitButton',
  component: 'app-split-button',
  description: 'Dual-action button combining a primary action trigger with a secondary options menu.',
  category: 'Common',
  stories: [
    {
      name: 'Split Button Variants',
      description: 'Primary, secondary, and outline split buttons',
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

          <app-split-button
            label="Сохранить"
            variant="secondary"
            .items="${[
              { id: 'save-draft', label: 'Сохранить как черновик' },
              { id: 'save-template', label: 'Сохранить как шаблон' },
            ]}"
          ></app-split-button>

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

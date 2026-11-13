import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './data-grid-column';
import '../app-data-grid/app-data-grid';

const sampleRows = [
  { id: 'PF-101', title: 'Архитектура микрофронтендов', status: 'in_progress', priority: 'high', estimatedHours: 24 },
  { id: 'PF-102', title: 'Дизайн-система на Lit', status: 'review', priority: 'urgent', estimatedHours: 16 },
  { id: 'PF-103', title: 'Настройка Rollup бандлера', status: 'done', priority: 'medium', estimatedHours: 8 },
  { id: 'PF-104', title: 'Юнит-тесты хранилища', status: 'todo', priority: 'high', estimatedHours: 12 },
];

export const meta: ComponentStoryMeta = {
  title: 'Views/DataGridColumn',
  component: 'data-grid-column',
  description: 'Declarative column definition element for <app-data-grid> configuring width, sorting, grouping, resizing, and rendering.',
  category: 'Views',
  stories: [
    {
      name: 'Declarative Column Composition',
      description: 'Custom dataset rendered through slotted <data-grid-column> tags',
      render: () => html`
        <div style="height: 360px; width: 100%; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-data-grid .rows="${sampleRows}" .selectable="${false}">
            <data-grid-column field="id" header="Код" width="100" sortable cell-type="key"></data-grid-column>
            <data-grid-column field="title" header="Название" width="260" sortable></data-grid-column>
            <data-grid-column field="status" header="Статус" width="140" sortable groupable cell-type="status"></data-grid-column>
            <data-grid-column field="priority" header="Приоритет" width="130" sortable groupable cell-type="priority"></data-grid-column>
            <data-grid-column field="estimatedHours" header="Оценка (ч)" width="120" sortable align="right"></data-grid-column>
          </app-data-grid>
        </div>
      `,
    },
  ],
};

export default meta;

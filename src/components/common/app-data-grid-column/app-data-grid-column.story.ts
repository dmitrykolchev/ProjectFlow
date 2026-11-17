import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-data-grid-column';
import '../../views/app-data-grid/app-data-grid';
import '../app-status-chip/app-status-chip';

const sampleRows = [
  { id: 'PF-101', title: 'Архитектура микрофронтендов', status: 'in_progress', priority: 'high', estimatedHours: 24, owner: 'Иван' },
  { id: 'PF-102', title: 'Дизайн-система на Lit', status: 'review', priority: 'urgent', estimatedHours: 16, owner: 'Мария' },
  { id: 'PF-103', title: 'Настройка Rollup бандлера', status: 'done', priority: 'medium', estimatedHours: 8, owner: 'Алексей' },
  { id: 'PF-104', title: 'Юнит-тесты хранилища', status: 'todo', priority: 'high', estimatedHours: 12, owner: 'Елена' },
];

export const meta: ComponentStoryMeta = {
  title: 'Common/DataGridColumn',
  component: 'app-data-grid-column',
  description: 'Universal declarative column configuration element (<app-data-grid-column>) for <app-data-grid>, supporting caption, hidden, resizable, sortable, groupable, sortValue, and custom JS or HTML <template> cell rendering.',
  category: 'Common',
  propsDoc: {
    field: 'Property name or dot-path in each row object',
    caption: 'Column header text (falls back to header or field)',
    hidden: 'Hides the column initially while keeping it toggleable in the column menu',
    resizable: 'Enables drag-to-resize handle on the column header (use resizable="false" to lock width)',
    sortable: 'Allows sorting by clicking the header; grouped columns sort automatically first',
    groupable: 'Allows grouping by this column via toolbar selector or drag-to-group bar',
    reorderable: 'Allows drag reordering of the column header',
    hideable: 'Controls whether the column appears in the Columns visibility popover',
    exportable: 'Controls whether the column is included when exporting CSV',
    align: 'Horizontal cell & header alignment: left | center | right',
    cellType: 'Built-in formatter preset (text | key | title | status | priority | assignee | dates | progress | tags | badge)',
    template: 'JS callback (row, value) => TemplateResult | string | number; alternatively pass an HTML <template> child using {{field}} / {{value}} placeholders',
    sortValue: 'Custom comparator value extractor (row, value) => string | number',
    groupFormatter: 'Custom group header label formatter (value) => string',
  },
  slotsDoc: {
    '(default)': 'Optional HTML <template> element with {{field}} / {{value}} placeholders for declarative cell markup',
  },
  stories: [
    {
      name: 'Declarative Columns with Template & Hidden',
      description: 'Custom JS .template callback, declarative HTML <template> child, locked resizable="false" column, and initially hidden column',
      render: () => html`
        <div style="height: 360px; width: 100%; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-data-grid .rows="${sampleRows}" .selectable="${false}" group-by="status" sort-by="estimatedHours:desc">
            <app-data-grid-column field="id" caption="Код" width="100" sortable resizable="false" cell-type="key"></app-data-grid-column>
            <app-data-grid-column field="title" caption="Название" width="250" sortable></app-data-grid-column>
            <app-data-grid-column field="status" caption="Статус" width="140" sortable groupable cell-type="status"></app-data-grid-column>
            <app-data-grid-column
              field="priority"
              caption="Приоритет (Template)"
              width="160"
              sortable
              groupable
              .template="${(_row: Record<string, unknown>, val: unknown) => html`
                <app-status-chip domain="priority" status="${String(val || 'medium')}" size="sm" appearance="soft"></app-status-chip>
              `}"
            ></app-data-grid-column>
            <app-data-grid-column field="owner" caption="Владелец" width="130" sortable hidden></app-data-grid-column>
            <app-data-grid-column field="estimatedHours" caption="Оценка" width="120" sortable align="right">
              <template><span style="font-family: var(--font-mono); font-weight: 700;">{{estimatedHours}} ч</span></template>
            </app-data-grid-column>
          </app-data-grid>
        </div>
      `,
    },
  ],
};

export default meta;

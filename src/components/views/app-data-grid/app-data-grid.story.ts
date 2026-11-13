import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-data-grid';
import '../data-grid-column/data-grid-column';

export const meta: ComponentStoryMeta = {
  title: 'Views/DataGrid',
  component: 'app-data-grid',
  description: 'Declarative enterprise data grid composed with <data-grid-column>, supporting multi-column sorting, multi-level hierarchical grouping (dropdown & drag-to-group), column drag reorder, and column resize.',
  category: 'Views',
  stories: [
    {
      name: 'Interactive Declarative Data Grid',
      description: 'Drag column headers to reorder or into the group bar; Shift+Click or toggle Multi-sort for multi-column sorting',
      render: () => html`
        <div style="height: 540px; width: 100%; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-data-grid>
            <data-grid-column field="id" header="Код" width="105" min-width="80" sortable cell-type="key"></data-grid-column>
            <data-grid-column field="title" header="Задача" width="280" min-width="160" sortable cell-type="title"></data-grid-column>
            <data-grid-column field="status" header="Статус" width="140" sortable groupable cell-type="status"></data-grid-column>
            <data-grid-column field="priority" header="Приоритет" width="130" sortable groupable cell-type="priority"></data-grid-column>
            <data-grid-column field="assigneeId" header="Исполнитель" width="150" sortable groupable cell-type="assignee"></data-grid-column>
            <data-grid-column field="dates" header="Сроки" width="145" sortable cell-type="dates"></data-grid-column>
            <data-grid-column field="progress" header="Прогресс" width="140" sortable cell-type="progress"></data-grid-column>
            <data-grid-column field="tags" header="Теги" width="170" cell-type="tags"></data-grid-column>
          </app-data-grid>
        </div>
      `,
    },
    {
      name: 'Multi-Level Grouping & Multi-Column Sorting',
      description: 'Preconfigured with group-by="status,priority" and sort-by="priority:desc,dates:asc"',
      render: () => html`
        <div style="height: 540px; width: 100%; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-data-grid group-by="status,priority" sort-by="priority:desc,dates:asc">
            <data-grid-column field="id" header="Код" width="105" min-width="80" sortable cell-type="key"></data-grid-column>
            <data-grid-column field="title" header="Задача" width="280" min-width="160" sortable cell-type="title"></data-grid-column>
            <data-grid-column field="status" header="Статус" width="140" sortable groupable cell-type="status"></data-grid-column>
            <data-grid-column field="priority" header="Приоритет" width="130" sortable groupable cell-type="priority"></data-grid-column>
            <data-grid-column field="assigneeId" header="Исполнитель" width="150" sortable groupable cell-type="assignee"></data-grid-column>
            <data-grid-column field="dates" header="Сроки" width="145" sortable cell-type="dates"></data-grid-column>
            <data-grid-column field="progress" header="Прогресс" width="140" sortable cell-type="progress"></data-grid-column>
          </app-data-grid>
        </div>
      `,
    },
  ],
};

export default meta;

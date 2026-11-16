import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { Task } from '../../../types';
import './app-data-grid';
import '../data-grid-column/data-grid-column';

function buildVirtualStoryRows(count: number): Record<string, unknown>[] {
  const statuses = ['backlog', 'todo', 'in_progress', 'review', 'done'] as const;
  const priorities = ['low', 'medium', 'high', 'urgent'] as const;
  const assignees = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
  const projects = ['CORE', 'MOB', 'SEC', 'DATA'];
  const tagsPool = [
    ['Performance', 'Virtualization'],
    ['DataGrid', 'UI/UX'],
    ['Backend', 'API'],
    ['Security', 'Audit'],
  ];

  return Array.from({ length: count }, (_, i): Record<string, unknown> => {
    const status = statuses[(i * 3) % statuses.length];
    const priority = priorities[(i * 5) % priorities.length];
    const proj = projects[i % projects.length];
    const day = String(1 + (i % 28)).padStart(2, '0');
    const month = String(1 + ((i >> 2) % 12)).padStart(2, '0');
    const year = 2026 + (i % 2);
    const completed = status === 'done' ? 2 : status === 'in_progress' ? 1 : 0;

    return {
      id: `${proj}-${1000 + i}`,
      projectId: `proj-${(i % 4) + 1}`,
      title: `Виртуальная задача #${i + 1}: оптимизация модуля ${proj}`,
      status,
      priority,
      assigneeId: assignees[i % assignees.length],
      startDate: `${year}-${month}-01`,
      dueDate: `${year}-${month}-${day}`,
      tags: tagsPool[i % tagsPool.length],
      subtasks: [
        { id: `s1-${i}`, title: 'Step 1', completed: completed >= 1 },
        { id: `s2-${i}`, title: 'Step 2', completed: completed >= 2 },
      ],
    } satisfies Partial<Task> & Record<string, unknown>;
  });
}

const VIRTUAL_DEMO_ROWS = buildVirtualStoryRows(1500);

export const meta: ComponentStoryMeta = {
  title: 'Views/DataGrid',
  component: 'app-data-grid',
  description: 'Declarative enterprise data grid composed with <data-grid-column>, supporting virtual row scrolling, multi-column sorting, multi-level hierarchical grouping (dropdown & drag-to-group), column drag reorder, and column resize.',
  category: 'Views',
  childrenDoc: {
    'data-grid-column': 'Column definition child (field, header, width, sortable, groupable, cell-type) composing the grid',
  },
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
    {
      name: 'Virtual Scroll (1,500 Rows + Grouping)',
      description: 'High-volume virtualized scrolling combined with multi-level grouping and multi-column sorting',
      render: () => html`
        <div style="height: 540px; width: 100%; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-data-grid
            .rows="${VIRTUAL_DEMO_ROWS}"
            virtual
            group-by="status,priority"
            sort-by="dates:asc,id:asc"
          >
            <data-grid-column field="id" header="Код" width="110" min-width="85" sortable cell-type="key"></data-grid-column>
            <data-grid-column field="title" header="Задача" width="300" min-width="160" sortable cell-type="title"></data-grid-column>
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
  ],
};

export default meta;

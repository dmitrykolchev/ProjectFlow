import { html, TemplateResult } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { iconEdit, iconTrash } from '../icons';
import './app-data-table';
import '../app-table-scroll-column/app-table-scroll-column';

type DemoEntry = {
  date: string;
  taskKey: string;
  taskTitle: string;
  project: string;
  color: string;
  user: string;
  initials: string;
  category: string;
  hours: number;
  billable: boolean;
};

const demoEntries: DemoEntry[] = Array.from({ length: 26 }, (_, i) => {
  const day = (i % 28) + 1;
  return {
    date: `2026-11-${String(day).padStart(2, '0')}`,
    taskKey: `TASK-${(i % 6) + 1}`,
    taskTitle: ['Portal redesign', 'API hardening', 'Invoice export', 'Onboarding flow', 'Load tests', 'Docs update'][i % 6],
    project: ['ProjectFlow Core', 'Billing Suite', 'Client Portal'][i % 3],
    color: ['#6366f1', '#22c55e', '#f59e0b'][i % 3],
    user: ['Anna K.', 'Boris S.', 'Dana M.'][i % 3],
    initials: ['AK', 'BS', 'DM'][i % 3],
    category: ['development', 'meeting', 'support'][i % 3],
    hours: 1 + (i % 7),
    billable: i % 4 !== 0,
  };
});

const categoryOptions = [
  { value: 'development', label: 'Development' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'support', label: 'Support' },
];

function renderTaskCell(row: Record<string, unknown>): TemplateResult {
  const e = row as unknown as DemoEntry;
  return html`
    <div class="cell-task-main">
      <span class="task-key-chip">${e.taskKey}</span>
      <span>${e.taskTitle}</span>
    </div>
    <div class="cell-project-sub">
      <span class="proj-dot" style="background: ${e.color};"></span><span>${e.project}</span>
    </div>
  `;
}

function renderUserCell(row: Record<string, unknown>): TemplateResult {
  const e = row as unknown as DemoEntry;
  return html`
    <div class="cell-user">
      <span class="avatar-sm">${e.initials}</span>
      <span>${e.user}</span>
    </div>
  `;
}

function renderActionsCell(row: Record<string, unknown>): TemplateResult {
  const e = row as unknown as DemoEntry;
  return html`
    <div class="row-actions">
      <button
        type="button"
        class="icon-action-btn"
        title="Edit"
        @click="${() => console.log('edit', e.date, e.taskKey)}"
      >
        ${iconEdit(15)}
      </button>
      <button
        type="button"
        class="icon-action-btn is-danger"
        title="Delete"
        @click="${() => console.log('delete', e.date, e.taskKey)}"
      >
        ${iconTrash(15)}
      </button>
    </div>
  `;
}

export const meta: ComponentStoryMeta = {
  title: 'Common/DataTable',
  component: 'app-data-table',
  description:
    'Data table with a fixed header and footer. Columns are declared as child app-table-scroll-column elements (field-driven formatting, mono/code cells, custom cellRender for rich cells and row actions). Sorting and pagination are internal: sortable headers sort the rows and emit sort-change, rows are sliced by page-size and the footer shows app-pagination whenever there is more than one page. The table stretches to display all rendered rows; max-height caps the host so the body gets its own scrollbar.',
  category: 'Common',
  propsDoc: {
    rows: 'Array of row objects rendered by the table',
    'page-size': 'Rows per page for the internal pagination (default 10)',
    page: 'Initial page number (clamped to the available pages)',
    'sort-by': 'Field currently sorted; its header shows the active arrow',
    'sort-dir': 'Current sort direction: asc / desc',
    'max-height': 'Host height cap in px; 0 (default) stretches the table to show all rendered rows, a positive value gives the body its own scrollbar',
    'empty-title': 'Title passed to the compact empty state when rows is empty',
    locale: 'Locale used for number formatting and the pagination summary',
    'hide-footer': 'Rows are still sliced internally, but no footer is rendered; the consumer owns the pagination bar outside the table',
    'sort-change event': 'Emitted with detail { field, dir } when a header sort button is clicked',
    'page-change event': 'Emitted with detail { page, pageSize, totalItems } when pagination changes',
  },
  stories: [
    {
      name: 'Time Journal Table',
      description:
        'Replica of the time-tracking journal table: mono date, task key + title with project line, employee avatar, category select, hours number, billable boolean and row action buttons; pagination in the fixed footer',
      render: () => html`
        <div style="max-width: 960px;">
          <app-data-table .rows="${demoEntries}" page-size="10" sort-by="date" sort-dir="asc">
            <app-table-scroll-column field="date" label="Date" mono sortable></app-table-scroll-column>
            <app-table-scroll-column
              field="taskKey"
              label="Task / Project"
              sortable
              .cellRender="${renderTaskCell}"
            ></app-table-scroll-column>
            <app-table-scroll-column
              field="user"
              label="Employee"
              sortable
              .cellRender="${renderUserCell}"
            ></app-table-scroll-column>
            <app-table-scroll-column
              field="category"
              label="Category"
              type="select"
              .options="${categoryOptions}"
            ></app-table-scroll-column>
            <app-table-scroll-column
              field="hours"
              label="Hours"
              type="number"
              align="right"
              mono
              sortable
            ></app-table-scroll-column>
            <app-table-scroll-column
              field="billable"
              label="Billable"
              type="boolean"
              align="center"
              yes-label="Yes"
              no-label="No"
            ></app-table-scroll-column>
            <app-table-scroll-column
              field=""
              label="Actions"
              align="right"
              .cellRender="${renderActionsCell}"
            ></app-table-scroll-column>
          </app-data-table>
        </div>
      `,
    },
    {
      name: 'Max Height Scroll',
      description:
        'max-height="340" caps the host: the header stays fixed at the top, the footer with pagination stays at the bottom, and the body scrolls with its own scrollbar',
      render: () => html`
        <div style="max-width: 700px;">
          <app-data-table .rows="${demoEntries}" page-size="25" max-height="340">
            <app-table-scroll-column field="date" label="Date" mono sortable></app-table-scroll-column>
            <app-table-scroll-column field="taskKey" label="Task" code sortable></app-table-scroll-column>
            <app-table-scroll-column
              field="hours"
              label="Hours"
              type="number"
              align="right"
              mono
              sortable
            ></app-table-scroll-column>
          </app-data-table>
        </div>
      `,
    },
    {
      name: 'Single Page (No Footer)',
      description:
        'When the rows fit in one page the footer is omitted; the table stretches to show every row',
      render: () => html`
        <div style="max-width: 700px;">
          <app-data-table .rows="${demoEntries.slice(0, 6)}" page-size="10">
            <app-table-scroll-column field="date" label="Date" mono></app-table-scroll-column>
            <app-table-scroll-column field="taskKey" label="Task" code></app-table-scroll-column>
            <app-table-scroll-column
              field="hours"
              label="Hours"
              type="number"
              align="right"
              mono
            ></app-table-scroll-column>
          </app-data-table>
        </div>
      `,
    },
    {
      name: 'Empty State',
      description: 'Compact app-empty-state rendered when the rows array is empty',
      render: () => html`
        <div style="max-width: 700px;">
          <app-data-table .rows="${[]}" empty-title="No time entries found">
            <app-table-scroll-column field="date" label="Date" sortable></app-table-scroll-column>
            <app-table-scroll-column field="taskKey" label="Task" sortable></app-table-scroll-column>
          </app-data-table>
        </div>
      `,
    },
  ],
};

export default meta;

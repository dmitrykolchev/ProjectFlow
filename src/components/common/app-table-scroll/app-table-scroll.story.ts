import { html, TemplateResult } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { iconEdit, iconCopy, iconTrash } from '../icons';
import '../app-switch/app-switch';
import './app-table-scroll';
import '../app-table-column/app-table-column';

type DemoRecord = {
  code: string;
  name: string;
  notes: string;
  kind: string;
  billable: boolean;
  rate: number;
  isActive: boolean;
};

const demoRecords: DemoRecord[] = [
  {
    code: 'DEV',
    name: 'Development',
    notes: 'Feature and component implementation work',
    kind: 'engineering',
    billable: true,
    rate: 1200,
    isActive: true,
  },
  {
    code: 'PM',
    name: 'Project Management',
    notes: 'Planning, tracking and reporting',
    kind: 'management',
    billable: true,
    rate: 950,
    isActive: true,
  },
  {
    code: 'QA',
    name: 'Quality Assurance',
    notes: 'Testing and acceptance of deliverables',
    kind: 'engineering',
    billable: true,
    rate: 850,
    isActive: true,
  },
  {
    code: 'OPS',
    name: 'Operations Support',
    notes: 'Production monitoring and maintenance',
    kind: 'operations',
    billable: false,
    rate: 700,
    isActive: true,
  },
  {
    code: 'ARCH',
    name: 'Legacy Architecture Review',
    notes: 'Retired audit activity, kept for history',
    kind: 'management',
    billable: false,
    rate: 600,
    isActive: false,
  },
];

const categoryOptions = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'management', label: 'Management' },
  { value: 'operations', label: 'Operations' },
];

function renderNameCell(row: Record<string, unknown>): TemplateResult {
  const rec = row as unknown as DemoRecord;
  return html`
    <div class="cell-name-main">${rec.name}</div>
    ${rec.notes ? html`<div class="cell-name-desc">${rec.notes}</div>` : ''}
  `;
}

function renderActiveCell(row: Record<string, unknown>): TemplateResult {
  const rec = row as unknown as DemoRecord;
  return html`
    <app-switch
      .checked="${rec.isActive}"
      @change="${(e: Event) => {
        rec.isActive = !rec.isActive;
        const host = (e.composedPath() as EventTarget[]).find(
          (n) => (n as HTMLElement).tagName === 'APP-TABLE-SCROLL',
        ) as HTMLElement & { requestUpdate: () => void };
        if (host) host.requestUpdate();
      }}"
    ></app-switch>
  `;
}

function renderActionsCell(row: Record<string, unknown>): TemplateResult {
  const rec = row as unknown as DemoRecord;
  return html`
    <div class="row-actions">
      <button
        type="button"
        class="icon-action-btn"
        title="Edit"
        @click="${() => console.log('edit', rec.code)}"
      >
        ${iconEdit(15)}
      </button>
      <button
        type="button"
        class="icon-action-btn"
        title="Duplicate"
        @click="${() => console.log('duplicate', rec.code)}"
      >
        ${iconCopy(14)}
      </button>
      <button
        type="button"
        class="icon-action-btn is-danger"
        title="Delete"
        @click="${() => console.log('delete', rec.code)}"
      >
        ${iconTrash(15)}
      </button>
    </div>
  `;
}

export const meta: ComponentStoryMeta = {
  title: 'Common/TableScroll',
  component: 'app-table-scroll',
  description:
    'Scrollable table shell with sticky sortable headers, zebra striping, inactive-row dimming and a compact empty state; columns are declared as child app-table-column elements.',
  category: 'Common',
  propsDoc: {
    rows: 'Array of row objects rendered by the table',
    'sort-by': 'Field name currently used for sorting (arrow shown on its header)',
    'sort-dir': 'Current sort direction: asc / desc',
    'active-key': 'Row property holding the active flag; falsy rows render as is-inactive',
    'empty-title': 'Title passed to the compact empty state when rows is empty',
    sortBy: 'Field name currently used for sorting (attribute form sort-by; arrow shown on its header)',
    sortDir: 'Current sort direction asc / desc (attribute form sort-dir)',
    activeKey: 'Row property holding the active flag, default isActive (attribute form active-key); falsy rows render as is-inactive',
    emptyTitle: 'Title passed to the compact empty state when rows is empty (attribute form empty-title)',
    locale: 'Locale used for number formatting (t.common.locale)',
    striped: 'Enables alternating row background coloring (zebra striping)',
    'sort-change event': 'Emitted with detail { field, dir } when a header sort button is clicked',
  },
  eventsDoc: {
    'sort-change': {
      detail: '{ field: string, dir: SortDirection }',
      description: 'Fires when a sortable header is clicked',
    },
  },
  stories: [
    {
      name: 'Directory Records Table',
      description:
        'Full replica of the directories record table: code, name with description, select, number, boolean columns plus active switch and row action buttons',
      render: () => html`
        <div style="max-width: 900px;">
          <app-table-scroll .rows="${demoRecords}" sort-by="code" sort-dir="asc">
            <app-table-column field="code" label="Code" code sortable></app-table-column>
            <app-table-column
              field="name"
              label="Name"
              sortable
              .cellRender="${renderNameCell}"
            ></app-table-column>
            <app-table-column
              field="kind"
              label="Category"
              type="select"
              .options="${categoryOptions}"
            ></app-table-column>
            <app-table-column
              field="billable"
              label="Billable"
              type="boolean"
              align="center"
              yes-label="Yes"
              no-label="No"
            ></app-table-column>
            <app-table-column
              field="rate"
              label="Rate, ₽/h"
              type="number"
              align="right"
              mono
            ></app-table-column>
            <app-table-column
              field="isActive"
              label="Active"
              align="center"
              .cellRender="${renderActiveCell}"
            ></app-table-column>
            <app-table-column
              field=""
              label="Actions"
              align="right"
              .cellRender="${renderActionsCell}"
            ></app-table-column>
          </app-table-scroll>
        </div>
      `,
    },
    {
      name: 'Sorting & Inactive Rows',
      description:
        'Clicking header sort buttons emits sort-change; the caller re-sorts rows. Rows with a falsy active flag render dimmed',
      render: () => {
        let rows = [...demoRecords];
        let sortBy = 'rate';
        let sortDir: 'asc' | 'desc' = 'asc';
        return html`
          <div style="max-width: 700px;">
            <app-table-scroll
              .rows="${rows}"
              sort-by="${sortBy}"
              sort-dir="${sortDir}"
              @sort-change="${(e: CustomEvent<{ field: string; dir: 'asc' | 'desc' }>) => {
                sortBy = e.detail.field;
                sortDir = e.detail.dir;
                rows.sort((a, b) => {
                  const av = a[sortBy as keyof DemoRecord];
                  const bv = b[sortBy as keyof DemoRecord];
                  const cmp =
                    typeof av === 'number' && typeof bv === 'number'
                      ? av - bv
                      : String(av).localeCompare(String(bv));
                  return sortDir === 'asc' ? cmp : -cmp;
                });
                const target = e.currentTarget as HTMLElement & {
                  rows: Record<string, unknown>[];
                  sortBy: string;
                  sortDir: 'asc' | 'desc';
                };
                if (target) {
                  target.rows = [...rows];
                  target.sortBy = sortBy;
                  target.sortDir = sortDir;
                }
              }}"
            >
              <app-table-column field="code" label="Code" code sortable></app-table-column>
              <app-table-column field="name" label="Name" sortable></app-table-column>
              <app-table-column
                field="rate"
                label="Rate, ₽/h"
                type="number"
                align="right"
                mono
                sortable
              ></app-table-column>
            </app-table-scroll>
          </div>
        `;
      },
    },
    {
      name: 'Striped Rows',
      description:
        'The striped attribute enables alternating row background coloring; inactive rows stay dimmed over the zebra pattern',
      render: () => html`
        <div style="max-width: 700px;">
          <app-table-scroll .rows="${demoRecords}" striped sort-by="code" sort-dir="asc">
            <app-table-column field="code" label="Code" code sortable></app-table-column>
            <app-table-column field="name" label="Name" sortable></app-table-column>
            <app-table-column
              field="rate"
              label="Rate, ₽/h"
              type="number"
              align="right"
              mono
              sortable
            ></app-table-column>
          </app-table-scroll>
        </div>
      `,
    },
    {
      name: 'Empty State',
      description: 'Compact app-empty-state rendered when the rows array is empty',
      render: () => html`
        <div style="max-width: 700px;">
          <table-scroll .rows="${[]}" empty-title="No records found">
            <app-table-column field="code" label="Code" sortable></app-table-column>
            <app-table-column field="name" label="Name" sortable></app-table-column>
          </app-table-scroll>
        </div>
      `,
    },
  ],
};

export default meta;

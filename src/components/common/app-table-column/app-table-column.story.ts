import { html, TemplateResult } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { iconEdit, iconTrash } from '../icons';
import '../app-button/app-button';
import './app-table-column';
import '../app-table-scroll/app-table-scroll';

type DemoRecord = {
  code: string;
  name: string;
  category: string;
  rate: number;
  isActive: boolean;
};

const records: DemoRecord[] = [
  { code: 'ENG-100', name: 'Platform core', category: 'engineering', rate: 4200, isActive: true },
  { code: 'MGT-210', name: 'Release planning', category: 'management', rate: 2600, isActive: true },
  { code: 'OPS-330', name: 'Production monitoring', category: 'operations', rate: 1800, isActive: false },
  { code: 'ENG-140', name: 'Search index tuning', category: 'engineering', rate: 3100, isActive: true },
];

const actionsCell = (row: Record<string, unknown>): TemplateResult => {
  const r = row as unknown as DemoRecord;
  return html`
    <div style="display: flex; gap: 0.35rem;">
      <app-button size="sm" variant="icon" title="Edit" @click="${() => undefined}">
        <span slot="start">${iconEdit(14)}</span>
      </app-button>
      <app-button size="sm" variant="icon" action="delete" title="Delete" @click="${() => undefined}">
        <span slot="start">${iconTrash(14)}</span>
      </app-button>
    </div>
  `;
};

export const meta: ComponentStoryMeta = {
  title: 'Common/TableColumn',
  component: 'app-table-column',
  description:
    'Declarative column config child of app-table-scroll: field / label / type (text, number, boolean, select), alignment, mono and code cells, sortable headers, yes/no labels for booleans, option mapping for selects, plus cellRender and valueFn hooks. The element renders nothing itself — the table reads its properties.',
  category: 'Common',
  propsDoc: {
    field: 'Row property the column reads (empty label column when combined with cellRender)',
    label: 'Header caption shown in the sticky header row',
    type: 'Cell formatting preset: text | number | boolean | select',
    options: 'Value → label pairs used by type="select" cells',
    align: 'Horizontal alignment of header and cells: left | center | right',
    mono: 'Renders the value in the mono font family with tabular numerals',
    code: 'Renders the value as a code chip',
    sortable: 'Header shows the sort button; clicking emits sort-change on the table',
    'yes-label': 'Text for boolean true (falls back to the localized yes)',
    'no-label': 'Text for boolean false (falls back to the localized no)',
    cellRender: 'Custom cell renderer (row, value) => TemplateResult | string | number',
    valueFn: 'Custom value extractor (row) => unknown, replacing the plain row[field] read',
  },
  eventsDoc: {
    'column-change': {
      detail: '—',
      description: 'Fires when any column property changes; the parent table re-reads the columns',
    },
  },
  stories: [
    {
      name: 'Column Types',
      description:
        'text / number / boolean / select columns with alignment, mono and code cells, a sortable header and an action column via cellRender',
      render: () => html`
        <div style="border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-table-scroll .rows="${records}" sort-by="rate" sort-dir="desc" empty-title="No records">
            <app-table-column field="code" label="Code" type="text" mono></app-table-column>
            <app-table-column field="name" label="Name" type="text"></app-table-column>
            <app-table-column field="category" label="Category" type="select" align="center"
              .options="${[{ value: 'engineering', label: 'Engineering' }, { value: 'management', label: 'Management' }, { value: 'operations', label: 'Operations' }]}"></app-table-column>
            <app-table-column field="rate" label="Rate" type="number" align="right" sortable mono></app-table-column>
            <app-table-column field="isActive" label="Active" type="boolean" align="center" yes-label="Yes" no-label="No"></app-table-column>
            <app-table-column field="" label="" .cellRender="${actionsCell}"></app-table-column>
          </app-table-scroll>
        </div>
      `,
    },
  ],
};

export default meta;

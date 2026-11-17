import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { ContextChipData } from '../context-chip-data';
import './app-context-chip';

const KB_CHIP: ContextChipData = {
  key: 'knowledge:kb-101',
  kind: 'knowledge',
  id: 'kb-101',
  title: 'Архитектура кэширования Core 3.0: L1/L2, TTL и инвалидация через Redis Pub/Sub',
  reason: 'keyword',
};

const REQ_CHIP: ContextChipData = {
  key: 'requirement:req-101',
  kind: 'requirement',
  id: 'req-101',
  title: 'FR-01: Двухуровневое распределённое кэширование и инвалидация',
  reason: 'direct',
};

const DOC_CHIP: ContextChipData = {
  key: 'document:doc-4',
  kind: 'document',
  id: 'doc-4',
  title: 'Спецификация Gateway v2.1',
  reason: 'project',
};

export const meta: ComponentStoryMeta = {
  title: 'Common/ContextChip',
  component: 'app-context-chip',
  description:
    'One context source chip: kind icon badge (requirement / knowledge base / document), entity title and the match reason line. Select mode toggles selection (chip-toggle), the arrow button opens the source entity (chip-open).',
  category: 'Common',
  propsDoc: {
    data: 'ContextChipData record (key, kind, id, title, reason, selected)',
    mode: 'select = toggleable picker chip; display = read-only chip with open action',
  },
  stories: [
    {
      name: 'Selected Chip (select mode)',
      description: 'Toggleable chip in selected state — accent border and title color',
      render: () =>
        html`<app-context-chip .data="${{ ...KB_CHIP, selected: true }}" mode="select"></app-context-chip>`,
    },
    {
      name: 'Unselected Chip (select mode)',
      description: 'Toggleable chip in unselected state',
      render: () => html`<app-context-chip .data="${KB_CHIP}" mode="select"></app-context-chip>`,
    },
    {
      name: 'All Kinds (display mode)',
      description: 'Read-only chips for requirement, knowledge base article and document with their reason lines',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 0.45rem;">
          <app-context-chip .data="${REQ_CHIP}" mode="display"></app-context-chip>
          <app-context-chip .data="${KB_CHIP}" mode="display"></app-context-chip>
          <app-context-chip .data="${DOC_CHIP}" mode="display"></app-context-chip>
        </div>
      `,
    },
  ],
};

export default meta;

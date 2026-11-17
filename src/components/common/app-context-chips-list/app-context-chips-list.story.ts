import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { ContextChipData } from '../context-chip-data';
import './app-context-chips-list';

const ITEMS: ContextChipData[] = [
  {
    key: 'requirement:req-101',
    kind: 'requirement',
    id: 'req-101',
    title: 'FR-01: Двухуровневое распределённое кэширование и инвалидация через Pub/Sub',
    reason: 'direct',
    selected: true,
  },
  {
    key: 'knowledge:kb-101',
    kind: 'knowledge',
    id: 'kb-101',
    title: 'Архитектура кэширования Core 3.0: L1/L2, TTL и инвалидация через Redis Pub/Sub',
    reason: 'keyword',
    selected: true,
  },
  {
    key: 'document:doc-4',
    kind: 'document',
    id: 'doc-4',
    title: 'Спецификация Gateway v2.1',
    reason: 'project',
    selected: false,
  },
  {
    key: 'knowledge:kb-105',
    kind: 'knowledge',
    id: 'kb-105',
    title: 'Стандарт наблюдаемости: hit/miss ratio и метрики p99',
    reason: 'manual',
    selected: false,
  },
];

export const meta: ComponentStoryMeta = {
  title: 'Common/ContextChipsList',
  component: 'app-context-chips-list',
  description:
    'A two-column grid of context source chips with an inner scrollbar. items carries ContextChipData records; mode selects the chip variant. chip-toggle and chip-open events from individual chips bubble through to the parent.',
  category: 'Common',
  propsDoc: {
    items: 'ContextChipData[] — key, kind, id, title, reason, selected',
    mode: 'select = toggleable picker chips; display = read-only chips with open action',
  },
  stories: [
    {
      name: 'Picker List (select mode)',
      description: 'Toggleable chips with selected / unselected states and open actions',
      render: () => html`<app-context-chips-list .items="${ITEMS}" mode="select"></app-context-chips-list>`,
    },
    {
      name: 'History List (display mode)',
      description: 'Read-only chips as saved in an analysis summary',
      render: () => html`<app-context-chips-list .items="${ITEMS}" mode="display"></app-context-chips-list>`,
    },
    {
      name: 'Empty List',
      description: 'No items renders nothing',
      render: () => html`<app-context-chips-list .items="${[]}" mode="select"></app-context-chips-list>`,
    },
  ],
};

export default meta;

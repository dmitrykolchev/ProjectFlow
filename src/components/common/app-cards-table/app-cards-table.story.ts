import { html, TemplateResult } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import '../app-button/app-button';
import '../app-badge/app-badge';
import '../card-footer/card-footer';
import { AppCardsTable } from './app-cards-table';
import './app-cards-table';

type DemoCard = {
  id: string;
  key: string;
  name: string;
  color: string;
  status: string;
  client: string;
  budget: string;
  team: number;
};

const demoCards: DemoCard[] = Array.from({ length: 14 }, (_, i) => ({
  id: `card-${i}`,
  key: `PRJ-${(i % 6) + 1}`,
  name: ['Portal redesign', 'Billing Suite', 'Client Onboarding', 'Load Tests', 'Docs Update', 'API Hardening'][i % 6],
  color: ['#6366f1', '#22c55e', '#f59e0b'][i % 3],
  status: ['Active', 'Paused', 'Done'][i % 3],
  client: ['Acme Corp', 'Northwind', 'Globex'][i % 3],
  budget: `${(2 + i % 5).toFixed(1)}M ₽`,
  team: 2 + (i % 7),
}));

function renderCard(row: Record<string, unknown>): TemplateResult {
  const c = row as unknown as DemoCard;
  return html`
    <div style="display: flex; align-items: center; gap: 0.55rem;">
      <span style="width: 10px; height: 10px; border-radius: 50%; background: ${c.color};"></span>
      <strong>${c.key}</strong>
      <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.name}</span>
    </div>
    <app-badge variant="default" appearance="soft" size="sm">${c.status}</app-badge>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem 0.8rem; font-size: 0.78rem;">
      <span style="color: var(--text-muted);">Client</span><span>${c.client}</span>
      <span style="color: var(--text-muted);">Budget</span><span>${c.budget}</span>
    </div>
    <card-footer>
      <span slot="start" style="font-size: 0.78rem; color: var(--text-secondary);">Team: <strong>${c.team}</strong></span>
      <app-button slot="end" size="sm" variant="primary" @click="${() => console.log('open', c.key)}">
        <span>Open</span>
      </app-button>
    </card-footer>
  `;
}

export const meta: ComponentStoryMeta = {
  title: 'Common/CardsTable',
  component: 'app-cards-table',
  description:
    'A grid of entity cards built from a per-view template. The card content is produced by the cardRender function property (row) => TemplateResult, the same pattern as the cellRender of app-data-table; the card shell (surface background, border, radius, padding, hover lift, selection highlight) and the grid geometry belong to the component and are retuned locally through the geometry tokens. Pagination is internal: items are sliced by page-size and app-pagination (layout-mode="cards") sits in the footer below the grid whenever the grid is not empty. With clickable the shell activates on click and emits card-click; with selectable the selection lives in selectedKeys keyed by key-field, the chosen cards get the is-selected shell class, and toggling emits selection-change.',
  category: 'Common',
  propsDoc: {
    rows: 'Array of card items rendered by the grid',
    cardRender: 'Template function (row) => TemplateResult producing the card content',
    'page-size': 'Cards per page for the internal pagination (default 9)',
    page: 'Initial page number (clamped to the available pages)',
    clickable: 'The shell activates on click and emits card-click { item } (outside controls)',
    selectable: 'Selection keyed by key-field; chosen cards get the is-selected shell class',
    'key-field': 'Field holding the selection key (default id)',
    selectedKeys: 'Array of currently selected keys; toggleSelect(key) flips one key',
    locale: 'Formatting locale passed to the footer pagination',
    'empty-title': 'Title of the compact app-empty-state shown for empty rows',
  },
  stories: [
    {
      name: 'Card Grid',
      description:
        'cardRender produces the card content inside the component shell; the grid geometry and the card padding/gap/hover are retuned through the geometry tokens, and the internal pagination footer sits below the grid',
      render: () => html`
        <div style="max-width: 1100px;">
          <app-cards-table
            .rows="${demoCards}"
            .cardRender="${renderCard}"
            page-size="6"
            style="--cards-min-width: 240px; --cards-gap: 1rem;"
          ></app-cards-table>
        </div>
      `,
    },
    {
      name: 'Clickable Cards',
      description:
        'clickable makes the whole shell activate on click and emits card-click { item }; clicks on buttons, checkboxes and links inside the card content do not activate the card',
      render: () => html`
        <div style="max-width: 1100px;">
          <app-cards-table
            .rows="${demoCards}"
            .cardRender="${renderCard}"
            page-size="6"
            clickable
            style="--cards-min-width: 240px; --cards-gap: 1rem;"
            @card-click="${(e: CustomEvent<Record<string, unknown>>) =>
              console.log('card-click', (e.detail.item as DemoCard).key)}"
          ></app-cards-table>
        </div>
      `,
    },
    {
      name: 'Selectable Cards',
      description:
        'selectable keys the selection by row id; the chosen cards get the is-selected shell class, the checkbox in the card content toggles via toggleSelect(key), and toggling emits selection-change { selectedIds, selectedItems }',
      render: () => html`
        <div style="max-width: 1100px;">
          <app-cards-table
            .rows="${demoCards}"
            .cardRender="${(row: Record<string, unknown>) => {
              const c = row as unknown as DemoCard;
              const table = document.querySelector('app-cards-table') as AppCardsTable | null;
              const selected = table ? (table.selectedKeys as string[]).includes(c.id) : false;
              return html`
                <div style="display: flex; align-items: center; gap: 0.55rem;">
                  <input
                    type="checkbox"
                    .checked="${selected}"
                    @change="${() => table && table.toggleSelect(c.id)}"
                  />
                  <strong>${c.key}</strong>
                  <span>${c.name}</span>
                </div>
                <app-badge variant="default" appearance="soft" size="sm">${c.status}</app-badge>
              `;
            }}"
            page-size="6"
            selectable
            style="--cards-min-width: 240px; --cards-gap: 1rem;"
            @selection-change="${(e: CustomEvent<{ selectedIds: string[] }>) =>
              console.log('selection-change', e.detail.selectedIds)}"
          ></app-cards-table>
        </div>
      `,
    },
  ],
};

export default meta;

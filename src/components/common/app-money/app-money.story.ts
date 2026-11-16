import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-money';

export const meta: ComponentStoryMeta = {
  title: 'Common/Money',
  component: 'app-money',
  description:
    'Tabular-numeral currency formatting (RUB/USD/EUR) with full and short (K/M) formats.',
  category: 'Common',
  propsDoc: {
    amount: 'Numeric amount',
    currency: 'Currency code: RUB / USD / EUR (symbol and locale formatting follow UI language)',
    format: 'full = grouped digits; short = K/M compact notation',
  },
  stories: [
    {
      name: 'Full Format',
      description: 'Grouped thousands with currency symbol',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <app-money amount="${1250000}" currency="RUB"></app-money>
          <app-money amount="${48000}" currency="USD"></app-money>
          <app-money amount="${1500}" currency="EUR"></app-money>
        </div>
      `,
    },
    {
      name: 'Short Format',
      description: 'Compact K/M notation for KPI cards',
      render: () => html`
        <div style="display: flex; gap: 1rem;">
          <app-money format="short" amount="${3400000}" currency="RUB"></app-money>
          <app-money format="short" amount="${12500}" currency="RUB"></app-money>
          <app-money format="short" amount="${0}" currency="RUB"></app-money>
        </div>
      `,
    },
  ],
};

export default meta;

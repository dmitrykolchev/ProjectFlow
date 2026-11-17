import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { BankRequisite } from '../../../types';
import './app-bank-summary';

const SAMPLE_ACCOUNTS: BankRequisite[] = [
  {
    id: 'story-bs-1',
    bankName: 'АО «Т-Банк»',
    currency: 'RUB',
    accountNumber: '40702810400001847291',
    bik: '044525974',
    corrAccount: '30101810145250000974',
    isDefault: true,
  },
  {
    id: 'story-bs-2',
    bankName: 'АО «Райффайзенбанк»',
    currency: 'EUR',
    accountNumber: '40702978500000091423',
    swift: 'RZBMRUMM',
  },
  {
    id: 'story-bs-3',
    bankName: 'Bank of China (Elos)',
    currency: 'CNY',
    accountNumber: '40702156300000481092',
    swift: 'BKCHRUMM',
  },
];

export const meta: ComponentStoryMeta = {
  title: 'Common/BankSummary',
  component: 'app-bank-summary',
  description:
    'Compact bank requisites summary for entity cards: primary bank name, additional-account count, and currency chips. Read-only display used in company and counterparty card lists.',
  category: 'Common',
  propsDoc: {
    accounts: 'Array of BankRequisite records; the default (or first) account is shown as primary',
  },
  stories: [
    {
      name: 'Multi-Currency Summary',
      description: 'Primary bank with two additional accounts and three currency chips',
      render: () => html`<app-bank-summary .accounts="${SAMPLE_ACCOUNTS}"></app-bank-summary>`,
    },
    {
      name: 'Single Account',
      description: 'One account shows its bank name without an additional count',
      render: () =>
        html`<app-bank-summary .accounts="${[SAMPLE_ACCOUNTS[0]]}"></app-bank-summary>`,
    },
    {
      name: 'Empty',
      description: 'Display when an entity has no bank requisites configured',
      render: () => html`<app-bank-summary .accounts="${[]}"></app-bank-summary>`,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { BankRequisite } from '../../../types';
import { store } from '../../../state/store';
import './app-bank-requisites';

const SAMPLE_ACCOUNTS: BankRequisite[] = [
  {
    id: 'story-ba-1',
    bankName: 'АО «Т-Банк»',
    currency: 'RUB',
    accountNumber: '40702810400001847291',
    bik: '044525974',
    corrAccount: '30101810145250000974',
    comment: 'Основной расчётный счёт для договоров в РФ',
    isDefault: true,
  },
  {
    id: 'story-ba-2',
    bankName: 'АО «Райффайзенбанк»',
    currency: 'EUR',
    accountNumber: '40702978500000091423',
    swift: 'RZBMRUMM',
    iban: 'RU45044525700407029785',
    bankAddress: 'г. Москва, пл. Троицкая, д. 17',
    comment: 'Европейские расчёты',
  },
  {
    id: 'story-ba-3',
    bankName: 'Bank of China (Elos)',
    currency: 'CNY',
    accountNumber: '40702156300000481092',
    swift: 'BKCHRUMM',
    comment: 'Оплата поставщикам из КНР',
  },
];

export const meta: ComponentStoryMeta = {
  title: 'Common/BankRequisites',
  component: 'app-bank-requisites',
  description:
    'Multi-bank, multi-currency bank requisites viewer and inline manager. Supports currency filtering, one-click clipboard copy, primary account selection, and inline add/edit/delete.',
  category: 'Common',
  propsDoc: {
    accounts: 'Array of BankRequisite records',
    editable: 'Enables Add / Edit / Delete / Set Primary actions',
    compact: 'Uses single-column compact layout suitable inside modal forms',
    'hide-header': 'Hides internal header when embedded inside app-section-card',
    'confirm-delete': 'Shows app-confirm-dialog before deleting an account',
    heading: 'Caption of the internal header; falls back to the localized bank-accounts title when empty',
  },
  stories: [
    {
      name: 'Interactive Multi-Currency Manager',
      description: 'Editable list with currency filters, inline add/edit form, and clipboard copy',
      render: () => {
        let state = [...(store.companies[0]?.bankAccounts || SAMPLE_ACCOUNTS)];
        return html`
          <app-bank-requisites
            editable
            confirm-delete
            .accounts="${state}"
            @accounts-change="${(e: CustomEvent<{ accounts: BankRequisite[] }>) => {
              state = e.detail.accounts;
              const target = e.currentTarget as HTMLElement & { accounts: BankRequisite[] };
              if (target) target.accounts = state;
            }}"
          ></app-bank-requisites>
        `;
      },
    },
    {
      name: 'Compact Form Mode',
      description: 'Embedded single-column layout used inside company and counterparty forms',
      render: () => {
        let state = [...SAMPLE_ACCOUNTS.slice(0, 2)];
        return html`
          <div style="max-width: 680px;">
            <app-bank-requisites
              editable
              compact
              .accounts="${state}"
              @accounts-change="${(e: CustomEvent<{ accounts: BankRequisite[] }>) => {
                state = e.detail.accounts;
                const target = e.currentTarget as HTMLElement & { accounts: BankRequisite[] };
                if (target) target.accounts = state;
              }}"
            ></app-bank-requisites>
          </div>
        `;
      },
    },
    {
      name: 'Empty State',
      description: 'Display when an organization has no bank requisites configured yet',
      render: () => html`<app-bank-requisites editable .accounts="${[]}"></app-bank-requisites>`,
    },
  ],
};

export default meta;

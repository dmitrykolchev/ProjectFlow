import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-payment-form';
import '../app-button/app-button';

const payableInvoices = () =>
  store.invoices.filter(
    (i) => i.status !== 'draft' && i.status !== 'cancelled' && store.getInvoiceRemainingAmount(i) > 0
  );

export const meta: ComponentStoryMeta = {
  title: 'Overlays/PaymentForm',
  component: 'app-payment-form',
  description:
    'Canonical payment registration form supporting incoming and outgoing payments, linked companies, company & counterparty bank requisites, and optional invoice reconciliation.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    invoice: 'Optional target invoice the payment is recorded against',
    payment: 'Existing InvoicePayment to edit (attribute: false, property binding only); null opens the create form',
    payableInvoices: 'Invoices the target selector may switch between',
    defaultDirection: 'Initial direction for standalone payments (incoming | outgoing)',
    defaultCompanyId: 'Initial company ID for standalone payments',
    defaultCounterpartyId: 'Initial counterparty ID for standalone payments',
  },
  stories: [
    {
      name: 'Record Invoice Payment',
      description: 'Target invoice with company/counterparty requisites, balance card and quick chips',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) {
                const payable = payableInvoices();
                form.invoice = payable[0] || null;
                form.payableInvoices = payable;
                form.open = true;
              }
            }}"
          >
            Зафиксировать платёж по счёту
          </app-button>

          <app-payment-form></app-payment-form>
        </div>
      `,
    },
    {
      name: 'Outgoing Payment with Requisites',
      description: 'Standalone outgoing payment choosing company and its specific currency bank account',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) {
                form.invoice = null;
                form.payableInvoices = payableInvoices();
                form.defaultDirection = 'outgoing';
                form.defaultCompanyId = store.companies[1]?.id || store.companies[0]?.id || '';
                form.defaultCounterpartyId = store.counterparties[2]?.id || '';
                form.open = true;
              }
            }}"
          >
            Исходящий платёж (с реквизитами)
          </app-button>

          <app-payment-form></app-payment-form>
        </div>
      `,
    },
  ],
};

export default meta;

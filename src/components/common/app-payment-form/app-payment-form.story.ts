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
    'Canonical payment registration form. The component owns the amount, date, method, document and notes fields, shows the invoice balance card with quick term chips and a live preview of the balance after payment, writes the payment to the store itself on save and emits a saved event; any close dispatches a close event so the opening view resets its flag. A target invoice selector appears when more than one payable invoice is passed.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    invoice: 'Target invoice the payment is recorded against',
    payableInvoices: 'Invoices the target selector may switch between (selector shows when more than one)',
  },
  stories: [
    {
      name: 'Record Payment',
      description: 'Single target invoice with balance card, quick term chips and live preview',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) {
                form.invoice = payableInvoices()[0] || null;
                form.payableInvoices = [];
                form.open = true;
              }
            }}"
          >
            Зафиксировать платёж
          </app-button>

          <app-payment-form></app-payment-form>
        </div>
      `,
    },
    {
      name: 'Payment with Target Selector',
      description: 'Several payable invoices passed, the selector re-initialises fields on a switch',
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
            Зафиксировать платёж с выбором счёта
          </app-button>

          <app-payment-form></app-payment-form>
        </div>
      `,
    },
  ],
};

export default meta;

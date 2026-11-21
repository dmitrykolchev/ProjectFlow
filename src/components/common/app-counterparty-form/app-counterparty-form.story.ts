import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-counterparty-form';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/CounterpartyForm',
  component: 'app-counterparty-form',
  description:
    'Canonical counterparty create and edit form. The component owns the twelve fields, writes the counterparty to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. The short name is required, rating stays clamped to one through five.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    counterparty: 'Counterparty being edited (null = create mode)',
  },
  eventsDoc: {
    close: { detail: '—', description: 'Fires when the form is dismissed without saving' },
    saved: {
      detail: '{ counterparty: Counterparty }',
      description: 'Fires after a successful save with the stored counterparty',
    },
  },
  stories: [
    {
      name: 'Create Counterparty',
      description: 'Twelve fields with city and rating prefilled',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Новый контрагент
          </app-button>

          <app-counterparty-form></app-counterparty-form>
        </div>
      `,
    },
    {
      name: 'Edit Counterparty',
      description: 'All fields prefilled from the store record',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Редактировать контрагента
          </app-button>

          <app-counterparty-form .counterparty="${store.counterparties[0] || null}"></app-counterparty-form>
        </div>
      `,
    },
  ],
};

export default meta;

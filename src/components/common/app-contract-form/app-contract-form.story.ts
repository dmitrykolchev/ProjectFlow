import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-contract-form';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/ContractForm',
  component: 'app-contract-form',
  description:
    'Canonical contract create and edit form. The component owns all fourteen fields, writes the contract to the store itself on save and emits a saved event with the written record; any close, including cancel, save and backdrop, dispatches a close event so the opening view resets its flag. Every opening renders the same field set; presets fill company, counterparty, project, status and the modal title.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    contract: 'Contract being edited (null = create mode)',
    presetCounterpartyId: 'Counterparty prefilled for a quick opening',
    presetProjectId: 'Project prefilled for a context-bound opening',
    presetStatus: 'Status a newly created contract starts with (draft by default)',
    contextTitle: 'Modal title override for context-bound openings',
  },
  stories: [
    {
      name: 'Create Contract',
      description: 'Fourteen fields with number, amount, dates and entity presets',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Новый договор
          </app-button>

          <app-contract-form></app-contract-form>
        </div>
      `,
    },
    {
      name: 'Quick Contract of a Counterparty',
      description:
        'Same fourteen fields, counterparty prefilled from the card, status starts active, title names the counterparty',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Создать договор
          </app-button>

          <app-contract-form
            .presetCounterpartyId="${store.counterparties[0]?.id || ''}"
            .presetProjectId="${store.projects[0]?.id || ''}"
            .presetStatus="${'active'}"
            contextTitle="Новый договор · Банк «Северный Капитал»"
          ></app-contract-form>
        </div>
      `,
    },
    {
      name: 'Edit Contract',
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
            Редактировать договор
          </app-button>

          <app-contract-form .contract="${store.contracts[0] || null}"></app-contract-form>
        </div>
      `,
    },
  ],
};

export default meta;

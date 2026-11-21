import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-calculation-form';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/CalculationForm',
  component: 'app-calculation-form',
  description:
    'Canonical calculation create and edit form. The component owns the contract picker, number, frequency, period start and end, quick period presets, include prior unaccounted, the collected items editor with billable rows, status and report notes, writes the calculation to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills the active contract, its billing frequency, the default period for that frequency, the next calc number, draft status and the notes template.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    calculation: 'Calculation being edited (null = create mode)',
    presetContractId: 'Contract prefilled for a context-bound opening (first active by default)',
    showContractSelect: 'Show the contract picker (list view openings)',
    contextTitle: 'Modal title override for context-bound openings',
  },
  eventsDoc: {
    close: { detail: '—', description: 'Fires when the form is dismissed without saving' },
    saved: {
      detail: '{ calculation: Calculation }',
      description: 'Fires after a successful save with the stored calculation',
    },
  },
  stories: [
    {
      name: 'Create Calculation',
      description:
        'Contract picker, number, frequency, period, quick presets, collected items and notes prefills',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Новая калькуляция
          </app-button>

          <app-calculation-form .showContractSelect="${true}"></app-calculation-form>
        </div>
      `,
    },
    {
      name: 'Calculation of a Contract',
      description:
        'Same field set with the contract prefilled from the card and the picker hidden, quick period presets active',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Калькуляция контракта
          </app-button>

          <app-calculation-form
            .presetContractId="${store.contracts[0]?.id || null}"
            .showContractSelect="${false}"
          ></app-calculation-form>
        </div>
      `,
    },
    {
      name: 'Edit Calculation',
      description: 'All fields prefilled from the store record, contract picker disabled',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Редактировать калькуляцию
          </app-button>

          <app-calculation-form
            .calculation="${store.calculations[0] || null}"
            .showContractSelect="${true}"
          ></app-calculation-form>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-company-form';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/CompanyForm',
  component: 'app-company-form',
  description:
    'Canonical company create and edit form. The component owns the twelve fields, writes the company to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. The short name is required, an empty legal name falls back to it.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    company: 'Company being edited (null = create mode)',
  },
  eventsDoc: {
    close: { detail: '—', description: 'Fires when the form is dismissed without saving' },
    saved: {
      detail: '{ company: Company }',
      description: 'Fires after a successful save with the stored company',
    },
  },
  stories: [
    {
      name: 'Create Company',
      description: 'Twelve fields with city and director prefilled',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Новая компания
          </app-button>

          <app-company-form></app-company-form>
        </div>
      `,
    },
    {
      name: 'Edit Company',
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
            Редактировать компанию
          </app-button>

          <app-company-form .company="${store.companies[0] || null}"></app-company-form>
        </div>
      `,
    },
  ],
};

export default meta;

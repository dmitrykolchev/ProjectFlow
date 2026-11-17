import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import './app-expense-form';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/ExpenseForm',
  component: 'app-expense-form',
  description:
    'Canonical expense create and edit form. The component owns the twelve fields of title project linked task category submitted by amount currency date status vendor billable and notes, writes the expense to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills the target project today infrastructure category 15000 amount RUB currency pending status and billable on.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    expense: 'Expense being edited (null = create mode)',
    presetProjectId: 'Project prefilled for a context-bound opening (first project by default)',
    presetTaskId: 'Linked task prefilled for a context-bound opening',
    presetUserId: 'Submitter prefilled for a context-bound opening (first user by default)',
    contextTitle: 'Modal title override for context-bound openings',
  },
  stories: [
    {
      name: 'Create Expense',
      description:
        'Twelve fields with project today infrastructure category 15000 amount RUB currency pending status and billable prefills',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Новый расход
          </app-button>

          <app-expense-form></app-expense-form>
        </div>
      `,
    },
    {
      name: 'Expense of a Project',
      description:
        'Same field set with the project prefilled from the card and the quick expense title bound to the key',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Расход проекта
          </app-button>

          <app-expense-form
            .presetProjectId="${store.projects[0]?.id || null}"
            .contextTitle="${store.projects[0]
              ? getTranslation(store.customization.language).viewTexts.projectDetail
                  .quickExpenseTitle(store.projects[0].key)
              : ''}"
          ></app-expense-form>
        </div>
      `,
    },
    {
      name: 'Edit Expense',
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
            Редактировать расход
          </app-button>

          <app-expense-form .expense="${store.expenses[0] || null}"></app-expense-form>
        </div>
      `,
    },
  ],
};

export default meta;

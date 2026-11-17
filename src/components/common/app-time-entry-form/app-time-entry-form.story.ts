import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import './app-time-entry-form';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/TimeEntryForm',
  component: 'app-time-entry-form',
  description:
    'Canonical time entry create and edit form. The component owns the nine fields of project task employee date done hours spent category status billable and work description, writes the entry to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills the target project its first task today two hours development category logged status and billable on.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    entry: 'Entry being edited (null = create mode)',
    presetProjectId: 'Project prefilled for a context-bound opening (first project by default)',
    presetTaskId: 'Task prefilled for a context-bound opening (first task of the project by default)',
    presetUserId: 'Employee prefilled for a context-bound opening (first user by default)',
    contextTitle: 'Modal title override for context-bound openings',
  },
  stories: [
    {
      name: 'Create Time Entry',
      description:
        'Nine fields with project first task today two hours development category logged status and billable prefills',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Новая запись времени
          </app-button>

          <app-time-entry-form></app-time-entry-form>
        </div>
      `,
    },
    {
      name: 'Time Entry of an Employee',
      description:
        'Same field set with the employee prefilled from the card, quick log title bound to the name',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Быстрый лог сотрудника
          </app-button>

          <app-time-entry-form
            .presetUserId="${store.users[0]?.id || null}"
            .contextTitle="${store.users[0]
              ? getTranslation(store.customization.language).viewTexts.projectDetail.quickTimeTitle(
                  store.users[0].name
                )
              : ''}"
          ></app-time-entry-form>
        </div>
      `,
    },
    {
      name: 'Edit Time Entry',
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
            Редактировать запись времени
          </app-button>

          <app-time-entry-form .entry="${store.timeEntries[0] || null}"></app-time-entry-form>
        </div>
      `,
    },
  ],
};

export default meta;

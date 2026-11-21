import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-employee-form';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/EmployeeForm',
  component: 'app-employee-form',
  description:
    'Canonical employee create and edit form. The component owns the ten fields, writes the employee to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. The full name is required, editing keeps the avatar of the existing record.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    employee: 'Employee being edited (null = create mode)',
  },
  eventsDoc: {
    close: { detail: '—', description: 'Fires when the form is dismissed without saving' },
    saved: {
      detail: '{ employee: User }',
      description: 'Fires after a successful save with the stored employee',
    },
  },
  stories: [
    {
      name: 'Create Employee',
      description: 'Ten fields with company, location, today hire date and 3500 rate prefilled',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Новый сотрудник
          </app-button>

          <app-employee-form></app-employee-form>
        </div>
      `,
    },
    {
      name: 'Edit Employee',
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
            Редактировать сотрудника
          </app-button>

          <app-employee-form .employee="${store.users[0] || null}"></app-employee-form>
        </div>
      `,
    },
  ],
};

export default meta;

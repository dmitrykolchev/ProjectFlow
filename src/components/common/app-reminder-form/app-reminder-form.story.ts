import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-reminder-form';
import '../app-button/app-button';

const meta: ComponentStoryMeta = {
  component: 'app-reminder-form',
  title: 'Common/Reminder Form',
  description:
    'Modal form for creating and editing polymorphic reminders linked to any system entity. The recurrence rule is picked from Master Classifiers templates, or configured individually through the app-recurrence-editor dialog reused from the recurrence templates directory (a disabled RRULE display with a «Настроить правило» button); a summary card shows the plain-language rule description next to the code, same canon as the editor live summary; notifications use a flexible multi-rule builder.',
  category: 'Common',
  propsDoc: {
    open: 'Opens or closes the reminder form modal dialog',
    reminder: 'Existing Reminder entity to edit (null creates a new reminder)',
    'preset-entity-type': 'Preselected target entity type (company, contract, task, contact, etc.)',
    'preset-entity-id': 'Preselected target entity identifier',
  },
  stories: [
    {
      name: 'Default (New Reminder Modal)',
      description: 'Create a new reminder pre-linked to a contract with directory recurrence templates',
      render: () => html`
        <div style="padding: 1rem;">
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const host = (e.currentTarget as HTMLElement).parentElement;
              const form = host?.querySelector('app-reminder-form') as HTMLElement & { open: boolean };
              if (form) form.open = true;
            }}"
          >
            Open Reminder Form
          </app-button>
          <app-reminder-form
            preset-entity-type="contract"
            preset-entity-id="${store.contracts[0]?.id || 'cont-1'}"
          ></app-reminder-form>
        </div>
      `,
    },
    {
      name: 'Edit Existing Reminder',
      description: 'Edit a pre-configured recurring reminder with multiple notification rules and channels',
      render: () => html`
        <div style="padding: 1rem;">
          <app-button
            variant="outline"
            @click="${(e: Event) => {
              const host = (e.currentTarget as HTMLElement).parentElement;
              const form = host?.querySelector('app-reminder-form') as HTMLElement & {
                open: boolean;
                reminder: unknown;
              };
              if (form) {
                form.reminder = store.reminders[0] || null;
                form.open = true;
              }
            }}"
          >
            Edit Existing Reminder
          </app-button>
          <app-reminder-form></app-reminder-form>
        </div>
      `,
    },
  ],
};

export default meta;

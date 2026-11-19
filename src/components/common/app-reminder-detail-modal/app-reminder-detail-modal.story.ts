import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-reminder-detail-modal';
import '../app-button/app-button';

const meta: ComponentStoryMeta = {
  component: 'app-reminder-detail-modal',
  title: 'Common/Reminder Detail Modal',
  description:
    'Modal inspection view for a reminder showing linked system objects, attached library documents, RFC 5545 schedule details, notification rules, quick actions, and parameter editing.',
  category: 'Common',
  propsDoc: {
    open: 'Opens or closes the detail modal when used in standalone mode',
    reminder: 'Optional Reminder object for isolated preview (defaults to store.detailReminderId)',
  },
  stories: [
    {
      name: 'Friday the 13th DR Audit Reminder',
      description: 'Inspects a recurring RFC 5545 reminder with attached documents and linked project',
      render: () => html`
        <div style="padding: 1rem;">
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const host = (e.currentTarget as HTMLElement).parentElement;
              const modal = host?.querySelector('app-reminder-detail-modal') as HTMLElement & {
                open: boolean;
                reminder: unknown;
              };
              const target =
                store.reminders.find((r) => r.id === 'rem-13') || store.reminders[0] || null;
              if (modal && target) {
                modal.reminder = target;
                modal.open = true;
              }
            }}"
          >
            Open Reminder Details
          </app-button>
          <app-reminder-detail-modal></app-reminder-detail-modal>
        </div>
      `,
    },
    {
      name: 'Invoice Payment Control Reminder',
      description: 'Inspects a reminder linked to an invoice with contextual contract, company, and counterparty links',
      render: () => html`
        <div style="padding: 1rem;">
          <app-button
            variant="outline"
            @click="${(e: Event) => {
              const host = (e.currentTarget as HTMLElement).parentElement;
              const modal = host?.querySelector('app-reminder-detail-modal') as HTMLElement & {
                open: boolean;
                reminder: unknown;
              };
              const target =
                store.reminders.find((r) => r.entityType === 'invoice') || store.reminders[0] || null;
              if (modal && target) {
                modal.reminder = target;
                modal.open = true;
              }
            }}"
          >
            Open Billing Reminder
          </app-button>
          <app-reminder-detail-modal></app-reminder-detail-modal>
        </div>
      `,
    },
  ],
};

export default meta;

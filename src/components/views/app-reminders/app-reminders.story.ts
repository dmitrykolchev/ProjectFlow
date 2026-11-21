import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-reminders';

const meta: ComponentStoryMeta = {
  component: 'app-reminders',
  title: 'Views/Reminders',
  description:
    'Workspace Reminders Center with polymorphic linking to any entity, directory-driven recurrence templates shown in the card meta row together with their plain-language description (editor summary canon), snooze presets, and per-reminder notification rules.',
  category: 'Views',
  stories: [
    {
      name: 'Default Reminders Center',
      description: 'Full reminders workspace view with KPI strip, scope filters, and notification channel badges',
      render: () => html`
        <div style="height: 680px; border: 1px solid var(--border-subtle, #1e293b); border-radius: 12px; overflow: hidden;">
          <app-reminders></app-reminders>
        </div>
      `,
    },
  ],
};

export default meta;

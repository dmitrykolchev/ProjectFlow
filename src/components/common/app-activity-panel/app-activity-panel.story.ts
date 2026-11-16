import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-activity-panel';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Feedback/ActivityLog',
  component: 'app-activity-panel',
  description: 'Slide-out drawer containing real-time chronological audit trail of all project events.',
  category: 'Feedback',
  propsDoc: {
    logs: 'Activity log entries rendered in the panel',
    isOpen: 'Panel open state',
    currentLang: 'UI language',
  },
  stories: [
    {
      name: 'Toggle Panel',
      description: 'Trigger activity panel drawer',
      render: () => html`
        <div>
          <app-button variant="primary" @click="${() => store.toggleActivityPanel()}">
            Открыть журнал активности
          </app-button>
          <app-activity-panel></app-activity-panel>
        </div>
      `,
    },
  ],
};

export default meta;

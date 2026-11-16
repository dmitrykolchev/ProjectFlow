import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import '../app-button/app-button';
import { iconAnalytics, iconWallet } from '../icons';
import './app-empty-state';

export const meta: ComponentStoryMeta = {
  title: 'Feedback/Empty State',
  component: 'app-empty-state',
  description:
    'Dashed-border placeholder for empty lists and tables with icon, title, message, and optional action.',
  category: 'Feedback',
  slotsDoc: {
    icon: 'Illustration icon above the title',
    action: 'Optional action button below the message',
  },
  childrenDoc: {
    'app-button': 'Action button placed in the action slot',
    'app-material-icon': 'Illustration icon placed in the icon slot',
  },
  propsDoc: {
    title: 'Headline of the empty state',
    message: 'Secondary explanation text',
    compact: 'Reduced padding and typography for use inside cards',
  },
  stories: [
    {
      name: 'Default',
      description: 'Icon, title, and message with a call-to-action button',
      render: () => html`
        <app-empty-state
          title="No companies yet"
          message="Create the first company to start managing contracts and projects."
        >
          <app-button slot="action" variant="primary">+ Create Company</app-button>
        </app-empty-state>
      `,
    },
    {
      name: 'Custom Icon',
      description: 'Domain-specific icon via the icon slot',
      render: () => html`
        <app-empty-state title="No expenses recorded" message="Approved expenses will appear here.">
          <span slot="icon">${iconWallet(48)}</span>
        </app-empty-state>
      `,
    },
    {
      name: 'Compact',
      description: 'Reduced padding for inline placement inside panels',
      render: () => html`
        <app-empty-state
          compact
          title="Nothing due today"
          message="Tasks with deadlines will be listed here."
        ></app-empty-state>
      `,
    },
  ],
};

export default meta;

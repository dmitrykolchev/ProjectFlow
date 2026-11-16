import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import '../app-button/app-button';
import { iconBuilding, iconUsers } from '../icons';
import './app-page-header';

export const meta: ComponentStoryMeta = {
  title: 'Layout/Page Header',
  component: 'app-page-header',
  description:
    'Standard page header with title, subtitle, optional leading icon, and an actions zone on the right. The icon slot renders the leading graphic, the default slot adds extra content under the title, and the actions slot hosts action buttons on the right.',
  category: 'Layout',
  slotsDoc: {
    icon: 'Leading page icon (28px recommended)',
    '(default)': 'Extra content under the title and subtitle',
    actions: 'Action buttons on the right of the header',
  },
  childrenDoc: {
    'app-button': 'Action button placed in the actions slot',
    'app-material-icon': 'Leading icon placed in the icon slot',
  },
  propsDoc: {
    title: 'Page caption',
    subtitle: 'Secondary description line under the caption',
  },
  stories: [
    {
      name: 'Default with Actions',
      description: 'Title, subtitle, icon slot, and primary action button',
      render: () => html`
        <app-page-header
          title="Companies"
          subtitle="Directory of organizations and legal entities"
        >
          <span slot="icon">${iconBuilding(28)}</span>
          <app-button slot="actions" variant="primary">+ Create</app-button>
        </app-page-header>
      `,
    },
    {
      name: 'Multiple Actions',
      description: 'Segmented actions and secondary buttons in the right zone',
      render: () => html`
        <app-page-header title="Employees" subtitle="Team roster and workload">
          <span slot="icon">${iconUsers(28)}</span>
          <div slot="actions" style="display: flex; gap: 0.5rem;">
            <app-button variant="outline">Export</app-button>
            <app-button variant="primary">+ Add Employee</app-button>
          </div>
        </app-page-header>
      `,
    },
    {
      name: 'Title Only',
      description: 'Minimal header without subtitle and actions',
      render: () => html`
        <app-page-header title="Contracts"></app-page-header>
      `,
    },
  ],
};

export default meta;

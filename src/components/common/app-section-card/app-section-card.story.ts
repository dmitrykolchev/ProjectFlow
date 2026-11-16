import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import '../app-badge/app-badge';
import '../app-button/app-button';
import './app-section-card';

export const meta: ComponentStoryMeta = {
  title: 'Common/Section Card',
  component: 'app-section-card',
  description:
    'Card container with header (title, subtitle, actions slot) and body; optional collapsible mode.',
  category: 'Common',
  slotsDoc: {
    icon: 'Leading icon in the section header',
    'header-left': 'Content at the left of the section header',
    actions: 'Controls at the right of the section header',
    '(default)': 'Section body content',
  },
  propsDoc: {
    title: 'Section caption',
    subtitle: 'Secondary line under the caption',
    variant: 'Surface style: default / plain / elevated',
    collapsible: 'Enables collapse toggle in the header',
    collapsed: 'Current collapsed state (only for collapsible sections)',
  },
  stories: [
    {
      name: 'Default',
      description: 'Title with badge counter and action button',
      render: () => html`
        <app-section-card title="Team Members" subtitle="8 roles assigned">
          <app-badge slot="header-left" size="sm" variant="info">12</app-badge>
          <app-button slot="actions" size="sm" variant="ghost">Manage</app-button>
          <div style="padding: 0.5rem; color: var(--text-secondary); font-size: 0.85rem;">
            Section body content goes here — lists, tables, charts.
          </div>
        </app-section-card>
      `,
    },
    {
      name: 'Collapsible',
      description: 'Header toggles body visibility',
      render: () => html`
        <app-section-card collapsible title="Billing Summary">
          <div style="padding: 0.5rem; color: var(--text-secondary); font-size: 0.85rem;">
            Click the header to collapse/expand this section.
          </div>
        </app-section-card>
      `,
    },
    {
      name: 'Minimal',
      description: 'Title only, no actions',
      render: () => html`
        <app-section-card title="Notes">
          <p style="margin: 0.5rem 0; color: var(--text-secondary); font-size: 0.85rem;">Plain body content.</p>
        </app-section-card>
      `,
    },
  ],
};

export default meta;

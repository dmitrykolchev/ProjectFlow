import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import '../app-badge/app-badge';
import '../app-button/app-button';
import './app-section-card';

export const meta: ComponentStoryMeta = {
  title: 'Common/Section Card',
  component: 'app-section-card',
  description:
    'Card container with header (title, subtitle, actions slot) and body; optional collapsible mode. The icon slot renders a leading header graphic, header-left holds content at the left of the header, actions holds controls at the right, and the default slot is the section body.',
  category: 'Common',
  slotsDoc: {
    icon: 'Leading icon in the section header',
    'header-left': 'Content at the left of the section header',
    actions: 'Controls at the right of the section header',
    '(default)': 'Section body content',
  },
  childrenDoc: {
    'app-button': 'Header control placed in the actions slot',
    'app-badge': 'Count badge placed in the header-left slot',
    'app-material-icon': 'Leading icon placed in the icon slot',
  },
  propsDoc: {
    title: 'Section caption',
    subtitle: 'Secondary line under the caption',
    ariaLabel: 'Accessible name for the section region (aria-label); falls back to title when empty',
    variant: 'Surface style: default / plain / elevated',
    collapsible: 'Enables collapse toggle in the header',
    collapsed: 'Current collapsed state (only for collapsible sections)',
    maxHeight: "CSS length ('26rem', '320px') capping the body height; the inner scrollbar activates on overflow",
  },
  eventsDoc: {
    toggle: {
      detail: '{ collapsed: boolean }',
      description: 'Fires when the card is collapsed or expanded',
    },
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
      name: 'Capped Height',
      description:
        'max-height caps the body and activates the inner scrollbar — for long histories (task change log, analysis history). Combined with collapsible the whole card collapses from the header; controls in the header slots (actions, header-left) stay clickable and do not toggle the section.',
      render: () => html`
        <app-section-card collapsible max-height="12rem" title="Change History" subtitle="36 entries">
          <app-badge slot="header-left" size="sm" variant="info">36</app-badge>
          <div slot="actions" style="display: flex; gap: 0.4rem;">
            <app-button size="sm" variant="secondary">Refresh</app-button>
            <app-button size="sm" variant="primary">Export</app-button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            ${Array.from({ length: 36 }, (_, i) => html`
              <div style="font-size: 0.8rem; color: var(--text-secondary); padding: 0.25rem 0.5rem; background: var(--bg-subtle, #1a2438); border-radius: 6px;">
                #${36 - i} · status moved to ${i % 3 === 0 ? 'in_progress' : i % 3 === 1 ? 'review' : 'done'} · 2026-11-${String((i % 28) + 1).padStart(2, '0')}
              </div>
            `)}
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

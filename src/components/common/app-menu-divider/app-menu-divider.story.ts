import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-menu-divider';

export const meta: ComponentStoryMeta = {
  title: 'Common/MenuDivider',
  component: 'app-menu-divider',
  description: 'Declarative horizontal separator element for dividing sections of items inside <app-menu>.',
  category: 'Common',
  propsDoc: {
    inset: 'Applies left indentation aligned with icon-prefixed menu item labels',
  },
  stories: [
    {
      name: 'Standard & Inset Dividers',
      description: 'Default full-width divider and inset divider',
      render: () => html`
        <div style="width: 240px; background: var(--bg-surface-elevated, #162032); border: 1px solid var(--border-strong, #334155); border-radius: var(--radius-md, 8px); padding: 0.5rem 0.35rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <app-menu-divider></app-menu-divider>
          <app-menu-divider inset></app-menu-divider>
        </div>
      `,
    },
  ],
};

export default meta;

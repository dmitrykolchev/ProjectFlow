import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-header';

export const meta: ComponentStoryMeta = {
  title: 'Layout/Header',
  component: 'app-header',
  description: 'Top header bar with breadcrumbs, live search, quick notification badge, and primary action CTA.',
  category: 'Layout',
  stories: [
    {
      name: 'Default Header',
      description: 'Standard header layout in application container',
      render: () => html`
        <div style="border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-header></app-header>
        </div>
      `,
    },
  ],
};

export default meta;

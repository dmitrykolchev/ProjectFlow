import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-settings';

export const meta: ComponentStoryMeta = {
  title: 'Views/Settings',
  component: 'app-settings',
  description: 'Full workspace personalization hub: Dark/Light theme toggle, 5 accent color themes, density modes, and language switcher.',
  category: 'Views',
  stories: [
    {
      name: 'Interactive Settings',
      description: 'Connected settings view with immediate state persistence',
      render: () => html`
        <div style="height: 600px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-settings></app-settings>
        </div>
      `,
    },
  ],
};

export default meta;

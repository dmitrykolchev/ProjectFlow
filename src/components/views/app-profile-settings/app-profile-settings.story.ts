import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-profile-settings';

export const meta: ComponentStoryMeta = {
  title: 'Views/ProfileSettings',
  component: 'app-profile-settings',
  description: 'User profile settings page: user card, regional settings (language, timezone) and business defaults (default project, default view).',
  category: 'Views',
  stories: [
    {
      name: 'Interactive Profile Settings',
      description: 'Connected profile view with immediate state persistence',
      render: () => html`
        <div style="height: 600px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-profile-settings></app-profile-settings>
        </div>
      `,
    },
  ],
};

export default meta;

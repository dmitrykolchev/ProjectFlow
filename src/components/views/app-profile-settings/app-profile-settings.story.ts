import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-profile-settings';

export const meta: ComponentStoryMeta = {
  title: 'Views/ProfileSettings',
  component: 'app-profile-settings',
  description: 'User profile settings page in the interface-settings layout: user card, language option cards, timezone select with live clock, default project and default activity view.',
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

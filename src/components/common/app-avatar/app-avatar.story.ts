import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-avatar';

export const meta: ComponentStoryMeta = {
  title: 'Common/Avatar',
  component: 'app-avatar',
  description:
    'Circular initials/image avatar in five sizes, used for employees, assignees, and user profile.',
  category: 'Common',
  stories: [
    {
      name: 'Sizes',
      description: 'xs / sm / md / lg / xl with accent-soft background',
      render: () => html`
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <app-avatar size="xs" initials="AM"></app-avatar>
          <app-avatar size="sm" initials="AM"></app-avatar>
          <app-avatar size="md" initials="AM"></app-avatar>
          <app-avatar size="lg" initials="AM"></app-avatar>
          <app-avatar size="xl" initials="AM"></app-avatar>
        </div>
      `,
    },
    {
      name: 'Custom Colors',
      description: 'Per-project color backgrounds',
      render: () => html`
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <app-avatar size="md" initials="OK" color="#10b981" title="Oleg K." style="color: #fff;"></app-avatar>
          <app-avatar size="md" initials="ES" color="#f59e0b" title="Elena S."></app-avatar>
          <app-avatar size="md" initials="DV" color="#6366f1" title="Dmitry V."></app-avatar>
        </div>
      `,
    },
  ],
};

export default meta;

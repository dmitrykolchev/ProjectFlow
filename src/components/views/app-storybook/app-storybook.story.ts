import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-storybook';

export const meta: ComponentStoryMeta = {
  title: 'Views/Storybook',
  component: 'app-storybook',
  description: 'In-app design system explorer showcasing all Lit web components, interactive stories, and API specs.',
  category: 'Views',
  stories: [
    {
      name: 'Interactive Storybook View',
      description: 'Integrated component library preview',
      render: () => html`
        <div style="height: 600px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-storybook></app-storybook>
        </div>
      `,
    },
  ],
};

export default meta;

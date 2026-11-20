import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-blog';

export const meta: ComponentStoryMeta = {
  title: 'Views/Blog',
  component: 'app-blog',
  description:
    'Employee corporate blog supporting Markdown authoring with live split preview, formatting toolbar, feed & table views, in-page reader, likes, bookmarks, and team comments.',
  category: 'Views',
  stories: [
    {
      name: 'Employee Blog',
      description: 'Browse feed, article reader, and Markdown studio editor',
      render: () => html`
        <div style="height: 680px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-blog></app-blog>
        </div>
      `,
    },
  ],
};

export default meta;

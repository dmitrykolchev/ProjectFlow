import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-header';

export const meta: ComponentStoryMeta = {
  title: 'Layout/Header',
  component: 'app-header',
  description: 'Top header bar with breadcrumbs, live search, quick notification badge, and primary action CTA.',
  category: 'Layout',
  propsDoc: {
    size: 'Control scale of every header control: sm / md / lg (md default keeps the historical geometry)',
    activeView: 'Currently active view id (drives the breadcrumb)',
    selectedProjectId: 'Project filter selection in the breadcrumb',
    detailProjectId: 'Project id shown on detail pages',
    detailContractId: 'Contract id shown on detail pages',
    detailTaskId: 'Task code shown on detail pages',
    theme: 'Current theme (dark / light / cyberpunk / matrix / barbie / high-contrast)',
    currentLang: 'UI language',
    activityCount: 'Badge count in the activity button',
    searchQuery: 'Global search text',
  },
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

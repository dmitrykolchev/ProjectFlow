import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-badge';

export const meta: ComponentStoryMeta = {
  title: 'Common/Badge',
  component: 'app-badge',
  description: 'Semantic status, priority, and count badges supporting soft, solid, and outline styles.',
  category: 'Common',
  propsDoc: {
    variant: 'Semantic color of the badge (neutral, info, success, warning, danger)',
    appearance: 'Rendering style: soft fill / outline',
    size: 'Visual density: sm / md / lg',
    dot: 'Renders a status dot without text',
    removable: 'Shows a remove (×) affordance',
  },
  stories: [
    {
      name: 'Soft Variants',
      description: 'Subtle tinted badges for statuses and labels',
      render: () => html`
        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap; align-items: center;">
          <app-badge variant="neutral">Backlog</app-badge>
          <app-badge variant="primary" dot>In Review</app-badge>
          <app-badge variant="success" dot>Completed</app-badge>
          <app-badge variant="warning" dot>Pending</app-badge>
          <app-badge variant="danger" dot>Urgent</app-badge>
          <app-badge variant="info">Sprint 14</app-badge>
        </div>
      `,
    },
    {
      name: 'Solid & Outline Appearances',
      description: 'High-contrast solid and crisp outline badges',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
          <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
            <app-badge appearance="solid" variant="primary">Primary</app-badge>
            <app-badge appearance="solid" variant="success">Active</app-badge>
            <app-badge appearance="solid" variant="warning">Beta</app-badge>
            <app-badge appearance="solid" variant="danger">Critical</app-badge>
            <app-badge appearance="solid" variant="info">v2.4</app-badge>
          </div>
          <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
            <app-badge appearance="outline" variant="neutral" removable>TypeScript</app-badge>
            <app-badge appearance="outline" variant="primary" removable>Lit Elements</app-badge>
            <app-badge appearance="outline" variant="success" size="sm">Ready</app-badge>
            <app-badge appearance="outline" variant="danger" size="sm">Blocked</app-badge>
          </div>
        </div>
      `,
    },
  ],
};

export default meta;

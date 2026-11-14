import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-progress-bar';

export const meta: ComponentStoryMeta = {
  title: 'Common/Progress Bar',
  component: 'app-progress-bar',
  description:
    'Single-value or segmented progress bar with optional percentage label; sm/md heights.',
  category: 'Common',
  stories: [
    {
      name: 'Single Value',
      description: 'Accent fill with percent label',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <app-progress-bar value="${64}" show-label></app-progress-bar>
          <app-progress-bar value="${100}" color="#10b981" show-label></app-progress-bar>
          <app-progress-bar size="sm" value="${35}"></app-progress-bar>
        </div>
      `,
    },
    {
      name: 'Segments',
      description: 'Multi-segment bar (invoiced / paid) used in contract detail',
      render: () => html`
        <app-progress-bar
          show-label
          .segments="${[
            { value: 40, color: '#0284c7', label: 'Invoiced' },
            { value: 25, color: '#10b981', label: 'Paid' },
          ]}"
        ></app-progress-bar>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-pagination';

export const meta: ComponentStoryMeta = {
  title: 'Common/Pagination',
  component: 'app-pagination',
  description:
    'Pagination bar with smart page buttons, range summary, and mode-aware page-size presets for dense tables vs. multi-column card grids.',
  category: 'Common',
  stories: [
    {
      name: 'Table Mode',
      description: 'Default surface pager tailored to table row counts (5 / 10 / 20 / 50 / 100).',
      render: () => html`
        <app-pagination
          layout-mode="table"
          total-items="84"
          page="2"
          page-size="10"
        ></app-pagination>
      `,
    },
    {
      name: 'Card Grid Mode',
      description: 'Grid-aligned tile presets (4 / 6 / 8 / 9 / 12 / 18 / 24) to keep card rows balanced.',
      render: () => html`
        <app-pagination
          layout-mode="cards"
          total-items="48"
          page="3"
          page-size="6"
        ></app-pagination>
      `,
    },
    {
      name: 'Many Pages (Ellipsis)',
      description: 'Middle page state displaying leading and trailing ellipsis.',
      render: () => html`
        <app-pagination
          layout-mode="table"
          total-items="320"
          page="8"
          page-size="10"
        ></app-pagination>
      `,
    },
    {
      name: 'Bare & Compact',
      description: 'Borderless compact variant for embedding inside card or data-grid footers.',
      render: () => html`
        <app-pagination
          variant="bare"
          compact
          layout-mode="table"
          total-items="45"
          page="1"
          page-size="10"
        ></app-pagination>
      `,
    },
  ],
};

export default meta;

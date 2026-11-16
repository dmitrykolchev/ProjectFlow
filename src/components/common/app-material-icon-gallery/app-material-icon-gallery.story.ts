import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { materialIcons } from '../../../domain/material-icons/icons.data';
import './app-material-icon-gallery';

export const meta: ComponentStoryMeta = {
  title: 'Common/Material Icon Gallery',
  component: 'app-material-icon-gallery',
  description:
    'Material Symbols palette with search by name, category and tags; toolbar controls family, size and Google axes; grid with roving tabindex fires icon-select and params-change events.',
  category: 'Common',
  stories: [
    {
      name: 'Full Palette',
      description: 'All Material Symbols glyphs with the toolbar filters',
      render: () => html`
        <app-material-icon-gallery .icons="${materialIcons}"></app-material-icon-gallery>
      `,
    },
    {
      name: 'Search & Category',
      description: 'Preset query and category filter',
      render: () => html`
        <app-material-icon-gallery
          .icons="${materialIcons}"
          query="check"
          category="action symbols"></app-material-icon-gallery>
      `,
    },
    {
      name: 'Families & Axes',
      description: 'Family style, size scale and fill/weight/grade axes applied to the grid',
      render: () => html`
        <app-material-icon-gallery
          .icons="${materialIcons}"
          family="rounded"
          size="sm"
          fill="1"
          weight="700"
          query="favorite"></app-material-icon-gallery>
      `,
    },
  ],
};

export default meta;

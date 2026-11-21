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
  propsDoc: {
    icons: 'MaterialIconDef records rendered by the gallery (property binding, array)',
    fill: 'Initial FILL axis value for the toolbar (0|1); changes fire params-change',
    weight: 'Initial wght axis value for the toolbar (100..700); changes fire params-change',
    grade: 'Initial GRAD axis value for the toolbar (-50..200); changes fire params-change',
    disabled: 'Blocks search, toolbar and grid interaction — the gallery renders read-only',
  },
  stories: [
    {
      name: 'Full Palette',
      description: 'All Material Symbols glyphs with the toolbar filters',
      render: () => html`
        <app-material-icon-gallery style="height: 70vh;" .icons="${materialIcons}"></app-material-icon-gallery>
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

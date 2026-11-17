import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-color-swatches';

const PROJECT_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#ef4444'];
const STATUS_PALETTE = ['#0284c7', '#10b981', '#f59e0b', '#6366f1'];

export const meta: ComponentStoryMeta = {
  title: 'Inputs/ColorSwatches',
  component: 'app-color-swatches',
  description:
    'Canonical color swatch picker. A row of round color buttons rendered from a palette array; the component owns the active highlight and a change event carrying { value } so the opening form writes the picked hex into its own field. Used by the project create/edit form for the project color; any view needing a fixed palette choice can pass its own colors array.',
  category: 'Inputs',
  propsDoc: {
    colors: 'Palette of hex color strings rendered as round swatch buttons',
    value: 'Currently selected hex (highlighted swatch)',
  },
  stories: [
    {
      name: 'Project Palette',
      description:
        'The seven project colors with indigo active, clicking a swatch moves the highlight and fires change',
      render: () => html`
        <app-color-swatches
          .colors="${PROJECT_PALETTE}"
          .value="${'#6366f1'}"
          @change="${(e: CustomEvent) => console.log('color change', e.detail)}"
        ></app-color-swatches>
      `,
    },
    {
      name: 'Status Palette',
      description:
        'A custom four-color palette (the project status colors) with green active, showing that any view can pass its own array',
      render: () => html`
        <app-color-swatches
          .colors="${STATUS_PALETTE}"
          .value="${'#10b981'}"
        ></app-color-swatches>
      `,
    },
    {
      name: 'No Selection',
      description:
        'Empty value renders the palette without an active swatch until the user picks one',
      render: () => html`
        <app-color-swatches .colors="${PROJECT_PALETTE}" .value="${''}"></app-color-swatches>
      `,
    },
  ],
};

export default meta;

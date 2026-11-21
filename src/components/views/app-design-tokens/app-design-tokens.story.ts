import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-design-tokens';

export const meta: ComponentStoryMeta = {
  title: 'Views/Design Tokens',
  component: 'app-design-tokens',
  description:
    'Live CSS custom property reference: token swatches grouped by category (backgrounds, text, borders, accent, status colors, scrollbars, shadows) with a theme switch across Light, Dark, Cyberpunk, Matrix, Barbie and High Contrast — values read live from the active theme.',
  category: 'Views',
  stories: [
    {
      name: 'Token Reference',
      description:
        'Full token catalogue with swatches and computed values; the header switch changes the data-theme on the document and every live value updates',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-design-tokens></app-design-tokens>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-material-icons';

export const meta: ComponentStoryMeta = {
  title: 'Views/Material Icons',
  component: 'app-material-icons',
  description:
    'Material Symbols palette page: every ligature glyph of the self-hosted variable fonts (3945 icons) with search by name, category and tags; the gallery toolbar drives the snippet panel, Enter/Space on a cell copies its name into the snippet, and the copy button writes the snippet to the clipboard.',
  category: 'Views',
  stories: [
    {
      name: 'Palette Page',
      description:
        'Full palette view with the gallery grid, search, family/size/axis toolbar and the selected-glyph snippet panel',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-material-icons></app-material-icons>
        </div>
      `,
    },
  ],
};

export default meta;

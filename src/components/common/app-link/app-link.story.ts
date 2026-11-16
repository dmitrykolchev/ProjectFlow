import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-link';
import '../app-material-icon/app-material-icon';

export const meta: ComponentStoryMeta = {
  title: 'Elements/Link',
  component: 'app-link',
  description:
    'Text link with the canonical start / default / end slot API. Renders an anchor when href is set, a button-style link otherwise.',
  category: 'Elements',
  slotsDoc: {
    start: 'Content rendered before the label (text, SVG icon, material icon) — centered vertically',
    '(default)': 'Link label text — centered vertically',
    end: 'Content rendered after the label (text, SVG icon, material icon) — centered vertically',
  },
  propsDoc: {
    href: 'Link target; with href the element renders as an anchor',
    target: 'Anchor target (_blank adds rel="noopener noreferrer")',
    variant: 'Visual style: primary, secondary, danger',
    size: 'Font scale sm / md / lg from the canonical control tokens',
    disabled: 'Blocks activation and dims the link',
  },
  stories: [
    {
      name: 'Slot API',
      description: 'Canonical start / default / end slots with graphic elements, all centered on the vertical axis',
      render: () => html`
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <app-link href="#/dashboard" size="md">
            <app-material-icon slot="start">home</app-material-icon>
            <span>Start slot</span>
          </app-link>
          <app-link href="#/dashboard" size="md">
            <span>End slot</span>
            <app-material-icon slot="end">open_in_new</app-material-icon>
          </app-link>
          <app-link href="#/dashboard" size="md">
            <app-material-icon slot="start">filter_alt</app-material-icon>
            <span>Both slots</span>
            <app-material-icon slot="end">chevron_right</app-material-icon>
          </app-link>
          <app-link href="#/dashboard" size="md">
            <svg slot="start" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
            <span>SVG in start</span>
          </app-link>
        </div>
      `,
    },
    {
      name: 'Variants',
      description: 'Primary, Secondary, and Danger link styles',
      render: () => html`
        <div style="display: flex; gap: 1rem; align-items: center;">
          <app-link href="#/dashboard" variant="primary">Primary link</app-link>
          <app-link href="#/dashboard" variant="secondary">Secondary link</app-link>
          <app-link href="#/dashboard" variant="danger">Danger link</app-link>
        </div>
      `,
    },
    {
      name: 'Sizes',
      description: 'Canonical control font scale sm / md / lg',
      render: () => html`
        <div style="display: flex; gap: 1rem; align-items: center;">
          <app-link href="#/dashboard" size="sm">Small link</app-link>
          <app-link href="#/dashboard" size="md">Medium link (default)</app-link>
          <app-link href="#/dashboard" size="lg">Large link</app-link>
        </div>
      `,
    },
  ],
};

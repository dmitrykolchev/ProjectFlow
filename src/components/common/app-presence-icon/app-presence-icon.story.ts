import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-presence-icon';

export const meta: ComponentStoryMeta = {
  title: 'Common/PresenceIcon',
  component: 'app-presence-icon',
  description:
    'Presence status icon: a colored dot with the state glyph, the same geometry as the persona badge. Owns its styles, so it renders inside other components shadow trees (menu item icons) and can be slotted anywhere.',
  category: 'Common',
  propsDoc: {
    presence: 'Presence status (none/online/available/away/busy/dnd/blocked/offline); none renders nothing',
    size: 'Dot diameter in px (persona badge sizes are 8/12/16/20/24/32/40)',
    glyph: 'Glyph size in px; auto follows the persona rule (round(size x 0.6), suppressed below 16px), 0 forces a colour-only dot',
    color: 'Dot fill override; defaults to the presence token color',
    ariaLabel: 'Accessible name override; defaults to the presence label',
    showOverflowTooltip: 'Native tooltip with the presence label (default true)',
  },
  stories: [
    {
      name: 'Presence Variants',
      description:
        'Every status at 20px with the auto glyph; hover a dot to read the label in the tooltip',
      render: () => html`
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
          <app-presence-icon presence="online" size="20"></app-presence-icon>
          <app-presence-icon presence="available" size="20"></app-presence-icon>
          <app-presence-icon presence="away" size="20"></app-presence-icon>
          <app-presence-icon presence="busy" size="20"></app-presence-icon>
          <app-presence-icon presence="dnd" size="20"></app-presence-icon>
          <app-presence-icon presence="blocked" size="20"></app-presence-icon>
          <app-presence-icon presence="offline" size="20"></app-presence-icon>
        </div>
      `,
    },
    {
      name: 'Menu Scale',
      description:
        '12px dots with an explicit 8px glyph — the icons used inside app-menu items',
      render: () => html`
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
          <app-presence-icon presence="available" size="12" glyph="8"></app-presence-icon>
          <app-presence-icon presence="online" size="12" glyph="8"></app-presence-icon>
          <app-presence-icon presence="away" size="12" glyph="8"></app-presence-icon>
          <app-presence-icon presence="busy" size="12" glyph="8"></app-presence-icon>
        </div>
      `,
    },
    {
      name: 'Color-only Dots',
      description:
        'Below 16px the auto rule suppresses the glyph; glyph="0" forces a colour-only dot at any size',
      render: () => html`
        <div style="display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;">
          <app-presence-icon presence="available" size="8"></app-presence-icon>
          <app-presence-icon presence="away" size="12"></app-presence-icon>
          <app-presence-icon presence="busy" size="20" glyph="0"></app-presence-icon>
        </div>
      `,
    },
  ],
};

export default meta;

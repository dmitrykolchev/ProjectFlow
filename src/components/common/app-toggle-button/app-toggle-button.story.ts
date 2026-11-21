import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-toggle-button';
import { iconFilter } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/ToggleButton',
  component: 'app-toggle-button',
  description:
    'Stateful pressable button supporting soft and solid active variants, icons, and accessibility aria-pressed. Canonical start / default / end slots carry leading graphics, label text, and trailing graphics; icon-start / icon-end are legacy aliases of start / end.',
  category: 'Common',
  slotsDoc: {
    start: 'Content rendered before the label (text, SVG icon, material icon) — centered vertically',
    '(default)': 'Button text — centered vertically',
    end: 'Content rendered after the label (text, SVG icon, material icon) — centered vertically',
    'icon-start': 'Legacy alias of start',
    'icon-end': 'Legacy alias of end',
  },
  childrenDoc: {
    'app-material-icon': 'Icon rendered in the start / end slot before or after the label',
  },
  propsDoc: {
    pressed: 'Pressed (toggled) visual state',
    variant: 'Visual style of the toggle surface',
    size: 'Control height: sm / md / lg',
    disabled: 'Disables interaction',
    iconOnly: 'Renders only the icon, no text',
    value: 'Group value emitted on toggle (for radio-style groups)',
  },
  eventsDoc: {
    change: {
      detail: '{ pressed: boolean, value: string }',
      description: 'Fires when the button is toggled',
    },
  },
  stories: [
    {
      name: 'Toggle States & Variants',
      description: 'Soft and solid toggle buttons in pressed and default states',
      render: () => html`
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <app-toggle-button ?pressed="${true}">
            <span slot="icon-start">${iconFilter(14)}</span>
            <span>Только мои</span>
          </app-toggle-button>

          <app-toggle-button>
            <span>Архивные</span>
          </app-toggle-button>

          <app-toggle-button variant="solid" ?pressed="${true}">
            <span>Авто-сохранение</span>
          </app-toggle-button>

          <app-toggle-button variant="solid" size="sm">
            <span>Компактный вид</span>
          </app-toggle-button>

          <app-toggle-button icon-only ?pressed="${true}" title="Избранное">
            <span slot="icon-start">${iconFilter(15)}</span>
          </app-toggle-button>

          <app-toggle-button disabled>Отключено</app-toggle-button>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-button-group';
import '../app-button/app-button';
import '../app-toggle-button/app-toggle-button';

export const meta: ComponentStoryMeta = {
  title: 'Common/ButtonGroup',
  component: 'app-button-group',
  description:
    'Groups related buttons or toggle buttons horizontally or vertically with seamless joined borders. The default slot accepts app-button and app-toggle-button children.',
  category: 'Common',
  slotsDoc: {
    '(default)': 'app-button and app-toggle-button children rendered side by side (vertical) or joined (horizontal)',
  },
  childrenDoc: {
    'app-button': 'Grouped action button child',
    'app-toggle-button': 'Grouped toggle button child',
  },
  propsDoc: {
    orientation: 'Layout direction of the group: horizontal / vertical',
    attached: 'Shares borders between children (no gaps)',
  },
  stories: [
    {
      name: 'Attached & Spaced Groups',
      description: 'Joined action toolbar and vertical button stack',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1.5rem; align-items: flex-start;">
          <app-button-group attached>
            <app-button variant="outline" size="sm">День</app-button>
            <app-button variant="outline" size="sm">Неделя</app-button>
            <app-button variant="primary" size="sm">Месяц</app-button>
            <app-button variant="outline" size="sm">Год</app-button>
          </app-button-group>

          <app-button-group attached>
            <app-toggle-button ?pressed="${true}" size="sm">Жирный</app-toggle-button>
            <app-toggle-button size="sm">Курсив</app-toggle-button>
            <app-toggle-button size="sm">Код</app-toggle-button>
          </app-button-group>

          <app-button-group orientation="vertical" attached>
            <app-button variant="secondary" size="sm">Увеличить масштаб</app-button>
            <app-button variant="secondary" size="sm">Сбросить</app-button>
            <app-button variant="secondary" size="sm">Уменьшить масштаб</app-button>
          </app-button-group>
        </div>
      `,
    },
  ],
};

export default meta;

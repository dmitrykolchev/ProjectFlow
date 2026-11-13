import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-segmented-switch';

export const meta: ComponentStoryMeta = {
  title: 'Common/SegmentedSwitch',
  component: 'app-segmented-switch',
  description: 'Compact segmented control for switching between mutually exclusive views, timeframes, or filter modes.',
  category: 'Common',
  stories: [
    {
      name: 'Timeframe & View Switchers',
      description: 'Medium and small segmented controls',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1.25rem; align-items: flex-start;">
          <app-segmented-switch
            value="30d"
            .options="${[
              { value: '7d', label: '7 дней' },
              { value: '30d', label: '30 дней' },
              { value: 'quarter', label: 'Квартал' },
            ]}"
          ></app-segmented-switch>

          <app-segmented-switch
            size="sm"
            value="board"
            .options="${[
              { value: 'board', label: 'Доска' },
              { value: 'list', label: 'Список' },
              { value: 'timeline', label: 'Шкала' },
              { value: 'archived', label: 'Архив', disabled: true },
            ]}"
          ></app-segmented-switch>

          <div style="width: 340px;">
            <app-segmented-switch
              full-width
              value="dark"
              .options="${[
                { value: 'dark', label: 'Тёмная' },
                { value: 'light', label: 'Светлая' },
              ]}"
            ></app-segmented-switch>
          </div>
        </div>
      `,
    },
  ],
};

export default meta;

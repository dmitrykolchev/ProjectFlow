import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-segmented-switch';
import '../app-option/app-option';
import '../app-material-icon/app-material-icon';

export const meta: ComponentStoryMeta = {
  title: 'Common/SegmentedSwitch',
  component: 'app-segmented-switch',
  description: 'Compact segmented control for switching between mutually exclusive views, timeframes, or filter modes.',
  category: 'Common',
  slotsDoc: {
    '(default)': 'Declarative <app-option> children filling the segments (value, label, disabled, start / end graphics)',
  },
  propsDoc: {
    options: 'Segment definitions (value + label)',
    dataSource: 'Data source for segments: array, promise, or function returning an array (sync or async)',
    value: 'Currently selected segment value',
    size: 'Control height: sm / md / lg',
    fullWidth: 'Segments stretch to fill the container',
    disabled: 'Disables all segments',
  },
  stories: [
    {
      name: 'Declarative Options',
      description: 'Segmented control filled with declarative app-option children, including graphic elements in the start / end slots',
      render: () => html`
        <div style="max-width: 360px;">
          <app-segmented-switch full-width value="board">
            <app-option value="board" label="Board">
              <app-material-icon slot="start">view_kanban</app-material-icon>
            </app-option>
            <app-option value="list" label="List"></app-option>
            <app-option value="archive" label="Archive" disabled>
              <app-material-icon slot="end">archive</app-material-icon>
            </app-option>
          </app-segmented-switch>
        </div>
      `,
    },
    {
      name: 'Size Scale',
      description: 'Canonical control size scale sm|md|lg (30/38/44px heights, md default)',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
          <app-segmented-switch size="sm" value="a" .options="${[{ value: 'a', label: 'Первый' }, { value: 'b', label: 'Второй' }]}"></app-segmented-switch>
          <app-segmented-switch size="md" value="a" .options="${[{ value: 'a', label: 'Первый' }, { value: 'b', label: 'Второй' }]}"></app-segmented-switch>
          <app-segmented-switch size="lg" value="a" .options="${[{ value: 'a', label: 'Первый' }, { value: 'b', label: 'Второй' }]}"></app-segmented-switch>
        </div>
      `,
    },
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

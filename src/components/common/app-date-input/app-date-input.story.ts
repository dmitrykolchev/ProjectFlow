import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-date-input';

export const meta: ComponentStoryMeta = {
  title: 'Common/DatePicker',
  component: 'app-date-input',
  description: 'Fully custom-styled theme-aware Date Picker with interactive calendar popover, min/max bounds, and localization.',
  category: 'Common',
  propsDoc: {
    label: 'Caption above the field',
    value: 'Selected date in YYYY-MM-DD format',
    placeholder: 'Placeholder text shown when empty',
    min: 'Earliest selectable date (YYYY-MM-DD)',
    max: 'Latest selectable date (YYYY-MM-DD)',
    required: 'Marks the field as required',
    disabled: 'Disables editing and the calendar popover',
    error: 'Error message; renders the field in danger state',
    size: "Control size scale sm|md|lg (30/38/44px heights, md default)",
  },
  stories: [
    {
      name: 'Size Scale',
      description: 'Canonical control size scale sm|md|lg on the trigger',
      render: () => html`
        <div style="max-width: 280px; display: flex; flex-direction: column; gap: 0.75rem;">
          <app-date-input size="sm" label="Small" value="2026-11-16"></app-date-input>
          <app-date-input size="md" label="Medium (default)" value="2026-11-16"></app-date-input>
          <app-date-input size="lg" label="Large" value="2026-11-16"></app-date-input>
        </div>
      `,
    },
    {
      name: 'Interactive Date Pickers',
      description: 'Default date picker, constrained range, and error state',
      render: () => html`
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; width: 100%; max-width: 720px; min-height: 360px; align-items: start;">
          <app-date-input
            label="Дата начала"
            value="2026-11-11"
          ></app-date-input>

          <app-date-input
            label="Срок с ограничением (min/max)"
            value="2026-11-15"
            min="2026-11-05"
            max="2026-11-25"
          ></app-date-input>

          <app-date-input
            label="Обязательная дата"
            placeholder="Выберите дату..."
            required
            error="Необходимо указать срок"
          ></app-date-input>
        </div>
      `,
    },
  ],
};

export default meta;

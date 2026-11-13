import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-date-input';

export const meta: ComponentStoryMeta = {
  title: 'Common/DatePicker',
  component: 'app-date-input',
  description: 'Fully custom-styled theme-aware Date Picker with interactive calendar popover, min/max bounds, and localization.',
  category: 'Common',
  stories: [
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

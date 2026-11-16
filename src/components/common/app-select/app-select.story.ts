import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-select';
import '../app-option/app-option';
import '../app-material-icon/app-material-icon';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/SelectDropdown',
  component: 'app-select',
  description: 'Custom dropdown select with indicator dots, keyboard navigation, and smooth popover.',
  category: 'Inputs',
  slotsDoc: {
    '(default)': 'Declarative <app-option> children filling the dropdown list',
  },
  propsDoc: {
    label: 'Caption above the field',
    value: 'Currently selected option value',
    options: 'Option definitions (value + label)',
    dataSource: 'Data source for options: array, promise, or function returning an array (sync or async)',
    disabled: 'Disables the dropdown',
    placeholder: 'Text shown when nothing is selected',
    size: "Control size scale sm|md|lg (30/38/44px heights, md default)",
  },
  stories: [
    {
      name: 'Declarative Options',
      description: 'Dropdown filled with declarative app-option children, including graphic elements in the start / end slots',
      render: () => html`
        <div style="max-width: 280px;">
          <app-select label="Status" placeholder="Select...">
            <app-option value="backlog" label="Бэклог" color="#64748b"></app-option>
            <app-option value="todo" label="К выполнению" color="#0284c7"></app-option>
            <app-option value="in_progress" label="В работе" color="#f59e0b">
              <app-material-icon slot="end">schedule</app-material-icon>
            </app-option>
            <app-option value="review">
              <app-material-icon slot="start">rate_review</app-material-icon>
              Ревью
            </app-option>
          </app-select>
        </div>
      `,
    },
    {
      name: 'Data Source',
      description: 'Options loaded from a data source prop (array, promise, or function)',
      render: () => html`
        <div style="max-width: 280px;">
          <app-select
            label="Async data source"
            placeholder="Select..."
            .dataSource="${async () => [
              { value: 'a', label: 'Первый вариант' },
              { value: 'b', label: 'Второй вариант', color: '#22c55e' },
            ]}"
          ></app-select>
        </div>
      `,
    },
    {
      name: 'Size Scale',
      description: 'Canonical control size scale sm|md|lg on the trigger',
      render: () => {
        const options = [
          { value: 'a', label: 'Первый вариант' },
          { value: 'b', label: 'Второй вариант' },
        ];
        return html`
          <div style="max-width: 280px; display: flex; flex-direction: column; gap: 0.75rem;">
            <app-select size="sm" label="Small" .options="${options}" value="a"></app-select>
            <app-select size="md" label="Medium (default)" .options="${options}" value="a"></app-select>
            <app-select size="lg" label="Large" .options="${options}" value="a"></app-select>
          </div>
        `;
      },
    },
    {
      name: 'Status Selector',
      description: 'Dropdown populated with project statuses and color indicators',
      render: () => {
        const options = [
          { value: 'backlog', label: 'Бэклог', color: '#64748b' },
          { value: 'todo', label: 'К выполнению', color: '#0284c7' },
          { value: 'in_progress', label: 'В работе', color: '#f59e0b' },
          { value: 'review', label: 'Ревью', color: '#8b5cf6' },
          { value: 'done', label: 'Готово', color: '#10b981' },
        ];
        return html`
          <div style="max-width: 280px;">
            <app-select label="Статус" value="in_progress" .options="${options}"></app-select>
          </div>
        `;
      },
    },
    {
      name: 'Priority Selector',
      description: 'Dropdown for priorities',
      render: () => {
        const priorities = [
          { value: 'low', label: 'Низкий', color: '#94a3b8' },
          { value: 'medium', label: 'Средний', color: '#38bdf8' },
          { value: 'high', label: 'Высокий', color: '#fbbf24' },
          { value: 'urgent', label: 'Срочный', color: '#f87171' },
        ];
        return html`
          <div style="max-width: 280px;">
            <app-select label="Приоритет" value="urgent" .options="${priorities}"></app-select>
          </div>
        `;
      },
    },
  ],
};

export default meta;

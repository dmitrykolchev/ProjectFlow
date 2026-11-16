import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-select';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/SelectDropdown',
  component: 'app-select',
  description: 'Custom dropdown select with indicator dots, keyboard navigation, and smooth popover.',
  category: 'Inputs',
  propsDoc: {
    label: 'Caption above the field',
    value: 'Currently selected option value',
    options: 'Option definitions (value + label)',
    disabled: 'Disables the dropdown',
    placeholder: 'Text shown when nothing is selected',
    size: "Control size scale sm|md|lg (30/38/44px heights, md default)",
  },
  stories: [
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

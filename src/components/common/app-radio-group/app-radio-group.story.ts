import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-radio-group';

export const meta: ComponentStoryMeta = {
  title: 'Common/RadioGroup',
  component: 'app-radio-group',
  description: 'Accessible radio selection group with standard, horizontal, and rich card layouts.',
  category: 'Common',
  propsDoc: {
    label: 'Caption above the option list',
    name: 'Native radio group name (shared within a page)',
    value: 'Currently selected option value',
    options: 'Option definitions (value + label)',
    orientation: 'Layout direction: vertical / horizontal',
    variant: 'Visual style of the option rows',
    disabled: 'Disables all options',
  },
  stories: [
    {
      name: 'Standard & Card Layouts',
      description: 'Vertical, horizontal, and selectable card variants',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1.75rem; width: 100%; max-width: 520px;">
          <app-radio-group
            label="Приоритет уведомлений"
            orientation="horizontal"
            value="mentions"
            .options="${[
              { value: 'all', label: 'Все события' },
              { value: 'mentions', label: 'Только упоминания' },
              { value: 'none', label: 'Отключить' },
            ]}"
          ></app-radio-group>

          <app-radio-group
            label="Режим планирования спринта"
            variant="card"
            value="agile"
            .options="${[
              { value: 'agile', label: 'Гибкий Kanban', description: 'Непрерывный поток задач без жёстких рамок' },
              { value: 'scrum', label: '2-недельные спринты', description: 'Планирование и фиксация объёма работ' },
            ]}"
          ></app-radio-group>
        </div>
      `,
    },
  ],
};

export default meta;

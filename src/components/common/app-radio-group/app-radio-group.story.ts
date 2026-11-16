import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-radio-group';
import '../app-option/app-option';
import '../app-material-icon/app-material-icon';

export const meta: ComponentStoryMeta = {
  title: 'Common/RadioGroup',
  component: 'app-radio-group',
  description: 'Accessible radio selection group with standard, horizontal, and rich card layouts.',
  category: 'Common',
  slotsDoc: {
    '(default)': 'Declarative <app-option> children filling the option list (value, label, description, disabled, start / end graphics)',
  },
  childrenDoc: {
    'app-option': 'Declarative radio row (value, label, description, disabled, start / end slot graphics) appended to the options prop list',
  },
  propsDoc: {
    label: 'Caption above the option list',
    name: 'Native radio group name (shared within a page)',
    value: 'Currently selected option value',
    options: 'Option definitions (value + label)',
    dataSource: 'Data source for options: array, promise, or function returning an array (sync or async)',
    orientation: 'Layout direction: vertical / horizontal',
    variant: 'Visual style of the option rows',
    disabled: 'Disables all options',
  },
  stories: [
    {
      name: 'Declarative Options',
      description: 'Radio group filled with declarative app-option children, including graphic elements in the start / end slots',
      render: () => html`
        <div style="max-width: 320px;">
          <app-radio-group label="Declarative delivery mode" value="courier">
            <app-option value="courier" label="Courier" description="Door to door">
              <app-material-icon slot="start">directions_delivery</app-material-icon>
            </app-option>
            <app-option value="pickup" label="Pickup" description="From the branch"></app-option>
            <app-option value="drone" label="Drone" disabled>
              <app-material-icon slot="end">local_shipping</app-material-icon>
            </app-option>
          </app-radio-group>
        </div>
      `,
    },
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

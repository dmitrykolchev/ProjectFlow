import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-checkbox';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/Checkbox',
  component: 'app-checkbox',
  description:
    'Checkbox element with checked, unchecked, indeterminate, and disabled states. The default slot overrides the label property with custom label markup.',
  category: 'Inputs',
  slotsDoc: {
    '(default)': 'Label text next to the box (overrides the label property)',
  },
  propsDoc: {
    checked: 'Checked state of the box',
    indeterminate: 'Mixed (partial selection) state — square dash instead of tick',
    disabled: 'Disables interaction',
    label: 'Text next to the box',
  },
  eventsDoc: {
    change: { detail: '{ checked: boolean }', description: 'Fires when the box is toggled' },
  },
  stories: [
    {
      name: 'States',
      description: 'Different states of app-checkbox',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <app-checkbox label="Обычный невыбранный чекбокс"></app-checkbox>
          <app-checkbox label="Выбранная задача" checked></app-checkbox>
          <app-checkbox label="Частичный выбор (Indeterminate)" indeterminate></app-checkbox>
          <app-checkbox label="Заблокированный чекбокс" disabled></app-checkbox>
        </div>
      `,
    },
  ],
};

export default meta;

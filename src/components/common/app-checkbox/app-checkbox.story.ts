import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-checkbox';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/Checkbox',
  component: 'app-checkbox',
  description: 'Checkbox element with checked, unchecked, indeterminate, and disabled states.',
  category: 'Inputs',
  propsDoc: {
    checked: 'Checked state of the box',
    indeterminate: 'Mixed (partial selection) state — square dash instead of tick',
    disabled: 'Disables interaction',
    label: 'Text next to the box',
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

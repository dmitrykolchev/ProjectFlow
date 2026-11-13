import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-number-input';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/NumberInput',
  component: 'app-number-input',
  description: 'Numeric input with increment/decrement steppers, boundaries, and optional unit indicator.',
  category: 'Inputs',
  stories: [
    {
      name: 'Default',
      description: 'Hours estimation with stepper controls',
      render: () => html`
        <div style="max-width: 240px;">
          <app-number-input
            label="Оценка времени"
            value="16"
            min="1"
            max="120"
            unit="ч"
          ></app-number-input>
        </div>
      `,
    },
    {
      name: 'Step by 5',
      description: 'Number input with custom step of 5',
      render: () => html`
        <div style="max-width: 240px;">
          <app-number-input
            label="Шаг 5"
            value="25"
            min="0"
            max="100"
            step="5"
          ></app-number-input>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-number-input';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/NumberInput',
  component: 'app-number-input',
  description: 'Numeric input with increment/decrement steppers, boundaries, and optional unit indicator.',
  category: 'Inputs',
  propsDoc: {
    label: 'Caption above the field',
    value: 'Current numeric value',
    min: 'Minimum allowed value',
    max: 'Maximum allowed value',
    step: 'Increment for the stepper buttons',
    unit: 'Unit suffix rendered inside the field',
    size: 'Control height: sm / md / lg',
    disabled: 'Disables editing and steppers',
  },
  stories: [
    {
      name: 'Size Scale',
      description: 'Canonical control size scale sm|md|lg (30/38/44px heights, md default)',
      render: () => html`
        <div style="max-width: 240px; display: flex; flex-direction: column; gap: 0.75rem;">
          <app-number-input size="sm" label="Small" value="10" unit="ч"></app-number-input>
          <app-number-input size="md" label="Medium (default)" value="10" unit="ч"></app-number-input>
          <app-number-input size="lg" label="Large" value="10" unit="ч"></app-number-input>
        </div>
      `,
    },
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

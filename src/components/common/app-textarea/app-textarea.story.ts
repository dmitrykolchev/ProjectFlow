import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-textarea';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/Textarea',
  component: 'app-textarea',
  description: 'Multiline text input with character counting, custom row limits, and auto-styling.',
  category: 'Inputs',
  propsDoc: {
    label: 'Caption above the field',
    placeholder: 'Placeholder text shown when empty',
    value: 'Current textarea value',
    rows: 'Visible row count (initial height)',
    required: 'Marks the field as required',
    disabled: 'Disables editing',
    error: 'Error message; renders the field in danger state',
    maxlength: 'Maximum character count (0 = unlimited); shows a counter when set',
  },
  stories: [
    {
      name: 'Default',
      description: 'Standard 3-row textarea with placeholder',
      render: () => html`
        <div style="max-width: 440px;">
          <app-textarea label="Описание задачи" placeholder="Опишите требования и детали..."></app-textarea>
        </div>
      `,
    },
    {
      name: 'With Maxlength',
      description: 'Textarea with live character counter limit',
      render: () => html`
        <div style="max-width: 440px;">
          <app-textarea
            label="Краткая заметка"
            value="Начальное описание"
            maxlength="150"
            rows="2"
          ></app-textarea>
        </div>
      `,
    },
  ],
};

export default meta;

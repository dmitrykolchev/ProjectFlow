import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-input';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/TextInput',
  component: 'app-input',
  description: 'Single-line text input field supporting labels, helpers, errors, and clear buttons.',
  category: 'Inputs',
  propsDoc: {
    label: 'Caption above the field',
    placeholder: 'Placeholder text shown when empty',
    value: 'Current input value',
    type: 'Native input type (text, email, password, number, ...)',
    required: 'Marks the field as required (asterisk in label)',
    disabled: 'Disables editing',
    error: 'Error message; renders the field in danger state',
    helper: 'Helper text below the field',
    clearable: 'Shows a clear (×) button when the field has a value',
  },
  stories: [
    {
      name: 'Default',
      description: 'Standard text input with label and placeholder',
      render: () => html`
        <div style="max-width: 320px;">
          <app-input label="Название задачи" placeholder="Введите название..."></app-input>
        </div>
      `,
    },
    {
      name: 'Clearable',
      description: 'Input with clear button',
      render: () => html`
        <div style="max-width: 320px;">
          <app-input label="Поиск с очисткой" value="Предварительный текст" clearable></app-input>
        </div>
      `,
    },
    {
      name: 'With Error & Helper',
      description: 'Validation states for forms',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 320px;">
          <app-input label="Email" value="invalid-email" error="Неверный формат адреса электронной почты"></app-input>
          <app-input label="Идентификатор" value="TASK-101" helper="Уникальный префикс генерируется системой"></app-input>
        </div>
      `,
    },
  ],
};

export default meta;

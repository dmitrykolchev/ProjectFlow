import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-input';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/TextInput',
  component: 'app-input',
  description: 'Single-line text input field supporting labels, helpers, errors, and clear buttons.',
  category: 'Inputs',
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

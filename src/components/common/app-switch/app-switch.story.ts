import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-switch';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/Switch',
  component: 'app-switch',
  description: 'Toggle switch for boolean settings and feature flags.',
  category: 'Inputs',
  propsDoc: {
    checked: 'On/off state of the switch',
    disabled: 'Disables interaction',
    label: 'Text next to the switch',
  },
  stories: [
    {
      name: 'Default',
      description: 'Active and inactive switches',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <app-switch label="Уведомления на email" checked></app-switch>
          <app-switch label="Автоматическое сохранение"></app-switch>
          <app-switch label="Заблокированная настройка" disabled></app-switch>
        </div>
      `,
    },
  ],
};

export default meta;

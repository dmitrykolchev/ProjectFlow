import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-switch';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/Switch',
  component: 'app-switch',
  description:
    'Toggle switch for boolean settings and feature flags. The default slot overrides the label property with custom label markup. The additive frame hooks draw the control box around the switch (frame normal = the app-input geometry, frame transparent = the same box with background and border transparent), and the field-label hooks add the external label row attached to the frame (normal visible, ghost invisible holding its grid place); the caption inside the control behaves as before in every variant.',
  category: 'Inputs',
  slotsDoc: {
    '(default)': 'Label text next to the switch (overrides the label property)',
  },
  propsDoc: {
    checked: 'On/off state of the switch',
    disabled: 'Disables interaction',
    label: 'Caption inside the control, next to the track',
    frame: 'Frame variant: none (default, bare switch), normal (the app-input control box), transparent (the same box with background and border transparent)',
    'field-label': 'Text of the external label row attached to the frame',
    'field-label-style': 'External label row style: none (default, no row), normal (visible), ghost (invisible, keeps its place in the form grid)',
    '--switch-frame-height': 'Frame height token (default var(--control-height-md, 38px))',
    '--switch-frame-bg': 'Frame background token (default var(--bg-surface, #111827); transparent for frame=transparent)',
    '--switch-frame-border': 'Frame border token (default 1px solid var(--border-subtle, #334155); transparent for frame=transparent)',
    '--switch-frame-radius': 'Frame radius token (default var(--radius-md, 8px))',
    '--switch-frame-padding': 'Frame horizontal padding token (default 0 0.75rem)',
    '--switch-label-gap': 'Gap between the external label row and the control (default 0.35rem, the app-input form-group gap)',
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
    {
      name: 'Frames',
      description:
        'frame normal draws the app-input control box around the switch, frame transparent keeps the identical box with background and border transparent so the switch occupies a form row without visible chrome',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 420px;">
          <app-switch label="Без фрейма (дефолт)" checked></app-switch>
          <app-switch frame="normal" label="Обычный фрейм" checked></app-switch>
          <app-switch frame="transparent" label="Прозрачный фрейм"></app-switch>
        </div>
      `,
    },
    {
      name: 'External Label Rows',
      description:
        'field-label-style normal shows the external label row above the framed control, ghost renders it invisible so it keeps its place in the form grid; the caption inside the control is unchanged',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 420px;">
          <app-switch frame="normal" field-label-style="normal" field-label="Базовая валюта" label="caption внутри" checked></app-switch>
          <app-switch frame="normal" field-label-style="ghost" field-label="Призрачный лейбл" label="caption внутри"></app-switch>
        </div>
      `,
    },
  ],
};

export default meta;

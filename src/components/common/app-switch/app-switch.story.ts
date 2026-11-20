import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-switch';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/Switch',
  component: 'app-switch',
  description:
    'Toggle switch for boolean settings and feature flags. The default slot overrides the label property with custom label markup. Three additive hook groups extend it: size takes the canonical control scale sm|md|lg, frame draws a control box around the switch (the app-input geometry) so the switch can be placed in a modal exactly like a regular input, and field-label / field-label-style attach an external label row to that frame. All hooks default to the historical bare switch (size md, frame none, field-label-style none), so every existing consumer stays pixel-identical, and the caption inside the control behaves as before in every variant. The geometry lives in tokens — --switch-track-width (40px), --switch-track-height (22px), --switch-thumb-size (18px), --switch-thumb-offset (2px), --switch-thumb-travel (18px), --switch-caption-font-size (0.8125rem), --switch-gap (0.65rem) — and the frame box through --switch-frame-height (var(--control-height-md, 38px)), --switch-frame-bg (var(--bg-surface, #111827)), --switch-frame-border (1px solid var(--border-subtle, #334155)), --switch-frame-radius (var(--radius-md, 8px)) and --switch-frame-padding (0 0.75rem); the gap between the external label row and the control is --switch-label-gap (0.35rem, the app-input form-group gap). For frame=transparent the background and border are forced transparent regardless of the tokens.',
  category: 'Inputs',
  slotsDoc: {
    '(default)': 'Label text next to the switch (overrides the label property)',
  },
  propsDoc: {
    checked: 'On/off state of the switch (boolean, default false)',
    disabled: 'Disables interaction (boolean, default false)',
    label: 'Caption inside the control, next to the track (string; the default slot overrides it with custom markup)',
    size:
      'Control size scale (string, default md). Values: sm = 30px frame height, track 34x18px, thumb 14px, caption 0.75rem, gap 0.5rem, frame padding 0 0.6rem; md = the historical geometry — 38px frame height, track 40x22px, thumb 18px, caption 0.8125rem, gap 0.65rem, frame padding 0 0.75rem (default); lg = 44px frame height, track 46x26px, thumb 22px, caption 0.875rem, gap 0.8rem, frame padding 0 1rem. The frame heights follow the root control-height tokens (--control-height-sm/md/lg)',
    frame:
      'Frame variant (string, reflected as an attribute). Values: none = no frame, the bare switch (default); normal = the app-input control box around the switch — height var(--control-height-md, 38px), background var(--bg-surface), border 1px var(--border-subtle), radius var(--radius-md), padding 0 0.75rem, full row width; transparent = the identical box with background and border transparent, so the switch occupies a form row like an input without visible chrome',
    fieldLabel:
      'Text of the external label row attached to the frame (string). With field-label-style normal an empty text renders no row; with ghost an empty invisible row is rendered so the grid place is kept',
    fieldLabelStyle:
      'External label row style (string, reflected as the field-label-style attribute). Values: none = no external label row (default); normal = visible row above the control with the app-input label typography (font-size 0.8125rem, font-weight 500, color var(--text-secondary)); ghost = the same row rendered invisible (visibility hidden) so it keeps its place in the form grid',
  },
  stories: [
    {
      name: 'Default',
      description: 'Active and inactive switches (size md, frame none, field-label-style none — the historical look)',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <app-switch label="Уведомления на email" checked></app-switch>
          <app-switch label="Автоматическое сохранение"></app-switch>
          <app-switch label="Заблокированная настройка" disabled></app-switch>
        </div>
      `,
    },
    {
      name: 'Sizes',
      description:
        'size sm (30px frame, track 34x18px), md (default, the historical geometry — 38px frame, track 40x22px) and lg (44px frame, track 46x26px); the framed box follows the root control-height scale and the app-input paddings',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 420px;">
          <app-switch size="sm" label="size=sm" checked></app-switch>
          <app-switch size="md" label="size=md (дефолт)" checked></app-switch>
          <app-switch size="lg" label="size=lg" checked></app-switch>
          <app-switch size="sm" frame="normal" label="size=sm, frame=normal"></app-switch>
          <app-switch size="md" frame="normal" label="size=md, frame=normal" checked></app-switch>
          <app-switch size="lg" frame="normal" label="size=lg, frame=normal"></app-switch>
        </div>
      `,
    },
    {
      name: 'Frames',
      description:
        'frame none (default, no box), frame normal (the app-input control box: 38px height, bg-surface, 1px border-subtle, radius-md, 0.75rem horizontal padding) and frame transparent (the identical box with background and border transparent). Tokens --switch-frame-height/-bg/-border/-radius/-padding retune the box locally',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 420px;">
          <app-switch label="frame=none (дефолт)" checked></app-switch>
          <app-switch frame="normal" label="frame=normal" checked></app-switch>
          <app-switch frame="transparent" label="frame=transparent"></app-switch>
        </div>
      `,
    },
    {
      name: 'External Label Rows',
      description:
        'field-label-style none (default, no row), normal (visible app-input label row above the framed control) and ghost (invisible row that keeps its place in the form grid); field-label carries the row text. The caption inside the control is unchanged; --switch-label-gap sets the gap between the row and the control',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 420px;">
          <app-switch frame="normal" label="field-label-style=none (дефолт)" checked></app-switch>
          <app-switch frame="normal" field-label-style="normal" field-label="Базовая валюта" label="caption внутри" checked></app-switch>
          <app-switch frame="normal" field-label-style="ghost" field-label="Призрачный лейбл" label="caption внутри"></app-switch>
        </div>
      `,
    },
  ],
};

export default meta;

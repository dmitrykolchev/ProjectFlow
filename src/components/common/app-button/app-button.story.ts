import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-button';
import '../app-material-icon/app-material-icon';

export const meta: ComponentStoryMeta = {
  title: 'Elements/Button',
  component: 'app-button',
  description:
    'Interactive button with multiple semantic variants, sizes, and states. Canonical start / default / end slots carry leading graphics, label text, and trailing graphics; icon-start / icon-end are legacy aliases of start / end.',
  category: 'Elements',
  slotsDoc: {
    start: 'Content rendered before the label (text, SVG icon, material icon) — centered vertically',
    '(default)': 'Button label text — centered vertically',
    end: 'Content rendered after the label (text, SVG icon, material icon) — centered vertically',
    'icon-start': 'Legacy alias of start',
    'icon-end': 'Legacy alias of end',
  },
  childrenDoc: {
    'app-material-icon': 'Icon rendered in the start / end slot before or after the label',
  },
  propsDoc: {
    variant: 'Visual style: primary, secondary, outline, ghost, danger, icon (compact card action)',
    size: 'Control height: sm / md / lg',
    action: 'Business action driving the highlight color: default (neutral), view / edit / submit (accent), accept (success), delete / reject (danger), cancel (muted)',
    disabled: 'Disables interaction and dims the button',
    loading: 'Shows a spinner and blocks clicks',
    iconOnly: 'Renders only the start slot, no text; a button with only an icon becomes square automatically',
    type: 'Native HTML button type (button / submit)',
  },
  stories: [
    {
      name: 'Slot API',
      description: 'Canonical start / default / end slots with graphic elements, all centered on the vertical axis',
      render: () => html`
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <app-button variant="secondary" size="md">
            <app-material-icon slot="start">flag</app-material-icon>
            <span>Start slot</span>
          </app-button>
          <app-button variant="secondary" size="md">
            <span>End slot</span>
            <app-material-icon slot="end">chevron_right</app-material-icon>
          </app-button>
          <app-button variant="secondary" size="md">
            <app-material-icon slot="start">flag</app-material-icon>
            <span>Both slots</span>
            <app-material-icon slot="end">chevron_right</app-material-icon>
          </app-button>
          <app-button variant="secondary" size="md">
            <svg slot="start" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
            <span>SVG in start</span>
            <app-material-icon slot="end">star</app-material-icon>
          </app-button>
        </div>
      `,
    },
    {
      name: 'Variants',
      description: 'Primary, Secondary, Outline, Ghost, and Danger styles',
      render: () => html`
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <app-button variant="primary">Primary</app-button>
          <app-button variant="secondary">Secondary</app-button>
          <app-button variant="outline">Outline</app-button>
          <app-button variant="ghost">Ghost</app-button>
          <app-button variant="danger">Danger</app-button>
        </div>
      `,
    },
    {
      name: 'Sizes',
      description: 'Small (30px), Medium (38px), Large (44px)',
      render: () => html`
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <app-button size="sm" variant="primary">Small (sm)</app-button>
          <app-button size="md" variant="primary">Medium (md)</app-button>
          <app-button size="lg" variant="primary">Large (lg)</app-button>
        </div>
      `,
    },
    {
      name: 'States',
      description: 'Disabled and Loading states',
      render: () => html`
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <app-button variant="primary" disabled>Disabled</app-button>
          <app-button variant="secondary" loading>Saving...</app-button>
          <app-button variant="outline" loading>Loading</app-button>
        </div>
      `,
    },
    {
      name: 'Actions',
      description:
        'Canonical business actions: icon row actions highlight accent for view / edit / submit, success for accept, danger for delete / reject, muted for cancel; text buttons carry the same color on glyph and border',
      render: () => html`
        <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
          <app-button variant="icon" size="sm" action="default">
            <app-material-icon slot="start">more_horiz</app-material-icon>
          </app-button>
          <app-button variant="icon" size="sm" action="view">
            <app-material-icon slot="start">visibility</app-material-icon>
          </app-button>
          <app-button variant="icon" size="sm" action="edit">
            <app-material-icon slot="start">edit</app-material-icon>
          </app-button>
          <app-button variant="icon" size="sm" action="submit">
            <app-material-icon slot="start">send</app-material-icon>
          </app-button>
          <app-button variant="icon" size="sm" action="accept">
            <app-material-icon slot="start">check</app-material-icon>
          </app-button>
          <app-button variant="icon" size="sm" action="reject">
            <app-material-icon slot="start">close</app-material-icon>
          </app-button>
          <app-button variant="icon" size="sm" action="delete">
            <app-material-icon slot="start">delete</app-material-icon>
          </app-button>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-top: 0.9rem;">
          <app-button variant="outline" size="md" action="submit">Submit</app-button>
          <app-button variant="outline" size="md" action="accept">Accept</app-button>
          <app-button variant="outline" size="md" action="reject">Reject</app-button>
          <app-button variant="outline" size="md" action="cancel">Cancel</app-button>
        </div>
      `,
    },
  ],
};

export default meta;

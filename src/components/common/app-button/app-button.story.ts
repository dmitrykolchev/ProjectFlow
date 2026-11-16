import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-button';

export const meta: ComponentStoryMeta = {
  title: 'Elements/Button',
  component: 'app-button',
  description: 'Interactive button with multiple semantic variants, sizes, and states.',
  category: 'Elements',
  propsDoc: {
    variant: 'Visual style: primary, secondary, outline, ghost, danger',
    size: 'Control height: sm / md / lg',
    disabled: 'Disables interaction and dims the button',
    loading: 'Shows a spinner and blocks clicks',
    iconOnly: 'Renders only the start-icon slot, no text',
    type: 'Native HTML button type (button / submit)',
  },
  stories: [
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
  ],
};

export default meta;

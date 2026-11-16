import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-meta-item';
import '../app-meta-grid/app-meta-grid';

export const meta: ComponentStoryMeta = {
  title: 'Common/MetaItem',
  component: 'app-meta-item',
  description:
    'Declarative meta field carrier for app-meta-grid. Renders nothing; the parent collects its props from the slot.',
  category: 'Common',
  slotsDoc: {
    start: 'Graphic element rendered before the field value in the parent box (SVG, material icon)',
    '(default)': 'Fallback value text used when the value property is omitted',
    end: 'Graphic element rendered after the field value in the parent box (SVG, material icon)',
  },
  propsDoc: {
    label: 'Field caption shown above the value',
    value: 'Field value (falls back to the element text)',
    mono: 'Monospaced tabular value style',
    danger: 'Danger-colored value style',
  },
  stories: [
    {
      name: 'Declarative Meta Grid',
      description: 'app-meta-grid filled with declarative app-meta-item children',
      render: () => html`
        <app-meta-grid columns="3">
          <app-meta-item label="INN" value="7705131842" mono></app-meta-item>
          <app-meta-item label="KPP" value="770501001" mono></app-meta-item>
          <app-meta-item label="Due Date">2026-12-15</app-meta-item>
        </app-meta-grid>
      `,
    },
  ],
};

export default meta;

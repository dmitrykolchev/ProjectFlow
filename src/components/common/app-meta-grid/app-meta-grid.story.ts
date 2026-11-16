import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-meta-grid';
import '../app-meta-item/app-meta-item';
import '../app-material-icon/app-material-icon';

export const meta: ComponentStoryMeta = {
  title: 'Common/Meta Grid',
  component: 'app-meta-grid',
  description:
    'Label/value boxes in strip (1×N) or grid (2-column) layout, with mono and danger value variants. The default slot accepts declarative app-meta-item children that append to the items prop.',
  category: 'Common',
  slotsDoc: {
    '(default)': 'Declarative <app-meta-item> children filling the boxes (label, value, mono, danger, start / end graphics)',
  },
  childrenDoc: {
    'app-meta-item': 'Declarative meta box (label, value, mono, danger, start / end slot graphics) appended to the items prop list',
  },
  propsDoc: {
    items: 'Meta field definitions (label + value)',
    columns: 'Number of columns in the grid',
    layout: 'Rendering style: strip / grid / inline',
  },
  stories: [
    {
      name: 'Declarative Items',
      description: 'Meta grid filled with declarative app-meta-item children, including graphic elements in the start / end slots',
      render: () => html`
        <app-meta-grid columns="3">
          <app-meta-item label="INN" value="7705131842" mono></app-meta-item>
          <app-meta-item label="KPP" value="770501001" mono></app-meta-item>
          <app-meta-item label="Due Date" danger>2026-12-15</app-meta-item>
          <app-meta-item label="Status">
            <app-material-icon slot="start">schedule</app-material-icon>
            In progress
          </app-meta-item>
        </app-meta-grid>
      `,
    },
    {
      name: 'Strip Layout',
      description: 'Compact meta boxes used in detail page heroes',
      render: () => html`
        <app-meta-grid
          columns="4"
          .items="${[
            { label: 'INN', value: '7705131842', mono: true },
            { label: 'KPP', value: '770501001', mono: true },
            { label: 'City', value: 'Moscow' },
            { label: 'Due Date', value: '2026-12-15', mono: true, danger: true },
          ]}"
        ></app-meta-grid>
      `,
    },
    {
      name: 'Grid Layout',
      description: 'Two-column meta grid used in entity cards',
      render: () => html`
        <app-meta-grid
          layout="grid"
          .items="${[
            { label: 'Industry', value: 'IT & Software' },
            { label: 'Director', value: 'Alexey Morozov' },
            { label: 'Phone', value: '+7 495 123-45-67', mono: true },
            { label: 'Email', value: 'contact@company.ru', mono: true },
          ]}"
        ></app-meta-grid>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-meta-grid';

export const meta: ComponentStoryMeta = {
  title: 'Common/Meta Grid',
  component: 'app-meta-grid',
  description:
    'Label/value boxes in strip (1×N) or grid (2-column) layout, with mono and danger value variants.',
  category: 'Common',
  propsDoc: {
    items: 'Meta field definitions (label + value)',
    columns: 'Number of columns in the grid',
    layout: 'Rendering style: strip / grid / inline',
  },
  stories: [
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

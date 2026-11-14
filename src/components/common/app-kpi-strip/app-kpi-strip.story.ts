import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import '../../dashboard/app-metric-card/app-metric-card';
import './app-kpi-strip';

export const meta: ComponentStoryMeta = {
  title: 'Common/KPI Strip',
  component: 'app-kpi-strip',
  description:
    'Responsive grid layout wrapper for KPI cards (app-metric-card), collapsing to 2 columns on tablets and 1 on mobile.',
  category: 'Common',
  stories: [
    {
      name: 'Four Compact KPI Cards',
      description: 'Standard strip used in list views',
      render: () => html`
        <app-kpi-strip columns="4">
          <app-metric-card size="compact" label="Total Companies" value="12"></app-metric-card>
          <app-metric-card size="compact" label="Active" value="9" trend="up" delta="+2"></app-metric-card>
          <app-metric-card size="compact" label="Employees" value="48"></app-metric-card>
          <app-metric-card size="compact" label="Contracts" value="27" trend="down" delta="-1"></app-metric-card>
        </app-kpi-strip>
      `,
    },
    {
      name: 'Three Full Cards',
      description: 'Full-size metric cards with sparklines',
      render: () => html`
        <app-kpi-strip columns="3">
          <app-metric-card label="Hours Logged" value="128 h" .sparkline="${[30, 44, 60, 75, 90, 128]}"></app-metric-card>
          <app-metric-card label="Completion Rate" value="64%" trend="up" delta="+8%"></app-metric-card>
          <app-metric-card label="Urgent Items" value="3" trend="down" delta="Focus"></app-metric-card>
        </app-kpi-strip>
      `,
    },
  ],
};

export default meta;

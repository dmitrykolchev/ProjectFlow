import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-metric-card';
import { iconAnalytics, iconClock } from '../../common/icons';

export const meta: ComponentStoryMeta = {
  title: 'Dashboard/MetricCard',
  component: 'app-metric-card',
  description: 'Executive KPI summary card featuring tabular numerals, trend delta, and optional inline SVG sparkline.',
  category: 'Dashboard',
  slotsDoc: {
    icon: 'Leading icon before the metric label',
  },
  propsDoc: {
    label: 'Metric caption',
    value: 'Main value text',
    delta: 'Change indicator text (e.g. +12%)',
    trend: 'Delta color semantics: neutral / up / down',
    subtitle: 'Secondary line under the value',
    accentColor: 'Accent color of the card edge',
    valueColor: 'Explicit color of the value text',
    sparkline: 'Sparkline data points (small numbers)',
    clickable: 'Card emits a click event',
    size: 'full = with sparkline; compact = label + value only',
  },
  stories: [
    {
      name: 'KPI Grid Row',
      description: 'Metric cards with sparklines and positive/negative trend indicators',
      render: () => html`
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; width: 100%;">
          <app-metric-card
            label="Активные задачи"
            value="42"
            delta="+14%"
            trend="up"
            subtitle="к прошлой неделе"
            .sparkline="${[24, 29, 27, 33, 38, 36, 42]}"
          >
            <span slot="icon">${iconAnalytics()}</span>
          </app-metric-card>

          <app-metric-card
            label="Отработано часов"
            value="186 ч"
            delta="92% плана"
            trend="neutral"
            subtitle="спринт #14"
            accentColor="#10b981"
            .sparkline="${[120, 134, 145, 160, 172, 180, 186]}"
          >
            <span slot="icon">${iconClock(16)}</span>
          </app-metric-card>

          <app-metric-card
            label="Срочные задачи"
            value="3"
            delta="-2"
            trend="down"
            subtitle="требуют внимания"
            accentColor="#ef4444"
          ></app-metric-card>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-chart-card';

export const meta: ComponentStoryMeta = {
  title: 'Dashboard/ChartCard',
  component: 'app-chart-card',
  description: 'Pure CSS & SVG visualization widget supporting horizontal bar charts, segmented donut charts, and area line trends.',
  category: 'Dashboard',
  slotsDoc: {
    actions: 'Controls at the right of the chart header',
  },
  propsDoc: {
    title: 'Chart caption',
    subtitle: 'Secondary line under the caption',
    type: 'Chart type: bar / line / donut',
    data: 'Data points (label + value)',
    centerLabel: 'Caption in the middle of a donut chart',
  },
  stories: [
    {
      name: 'Bar, Donut & Trend Line',
      description: 'All three visualization modes rendered side by side',
      render: () => html`
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; width: 100%;">
          <app-chart-card
            title="Этапы выполнения"
            subtitle="Текущий срез задач"
            type="bar"
            .data="${[
              { label: 'В работе', value: 8, color: '#f59e0b' },
              { label: 'Ревью', value: 4, color: '#8b5cf6' },
              { label: 'Готово', value: 12, color: '#10b981' },
            ]}"
          ></app-chart-card>

          <app-chart-card
            title="Приоритеты"
            subtitle="Распределение нагрузки"
            type="donut"
            centerLabel="Задач"
            .data="${[
              { label: 'Срочный', value: 3, color: '#ef4444' },
              { label: 'Высокий', value: 6, color: '#f59e0b' },
              { label: 'Средний', value: 9, color: '#0284c7' },
              { label: 'Низкий', value: 4, color: '#64748b' },
            ]}"
          ></app-chart-card>

          <app-chart-card
            title="Закрытие задач (Velocity)"
            subtitle="Динамика по дням"
            type="line"
            .data="${[
              { label: 'Пн', value: 3 },
              { label: 'Вт', value: 5 },
              { label: 'Ср', value: 4 },
              { label: 'Чт', value: 7 },
              { label: 'Пт', value: 9 },
              { label: 'Сб', value: 6 },
              { label: 'Вс', value: 8 },
            ]}"
          ></app-chart-card>
        </div>
      `,
    },
  ],
};

export default meta;

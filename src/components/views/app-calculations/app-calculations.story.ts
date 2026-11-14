import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-calculations';

const meta: ComponentStoryMeta = {
  title: 'Views/Calculations',
  component: 'app-calculations',
  category: 'Views',
  description:
    'Калькуляции: сводный реестр периодических отчётов работ и расходов по договорам, включая non-billable позиции по нулевой цене, согласование с клиентом и передачу в биллинг.',
  stories: [
    {
      name: 'Реестр калькуляций',
      description: 'KPI-карточки, фильтрация по статусам/договорам/периодичности и конструктор отчёта.',
      render: () => html`
        <div style="height: 680px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-calculations></app-calculations>
        </div>
      `,
    },
  ],
};

export default meta;

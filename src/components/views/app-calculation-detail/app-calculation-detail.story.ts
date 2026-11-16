import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-calculation-detail';

const meta: ComponentStoryMeta = {
  title: 'Views/Calculation Detail',
  component: 'app-calculation-detail',
  category: 'Views',
  description:
    'Отдельная страница калькуляции: детализация оплачиваемых и неоплачиваемых (0 ₽) работ и расходов, стороны, статус согласования и переход к выставлению счёта.',
  stories: [
    {
      name: 'Карточка калькуляции',
      description: 'Детальное представление расчётного листа за отчётный период.',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-calculation-detail></app-calculation-detail>
        </div>
      `,
    },
  ],
};

export default meta;

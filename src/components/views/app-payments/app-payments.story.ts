import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-payments';

const meta: ComponentStoryMeta = {
  title: 'Views/Payments',
  component: 'app-payments',
  category: 'Views',
  description:
    'Платежи: контроль сроков оплаты счетов, учёт частичных и полных платежей, просроченная задолженность и журнал платёжных документов.',
  stories: [
    {
      name: 'Контроль оплаты счетов и журнал платежей',
      description: 'KPI задолженности, теги сроков оплаты, прогресс погашения счетов и быстрая регистрация оплат.',
      render: () => html`
        <div style="height: 680px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-payments></app-payments>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-invoice-detail';

const meta: ComponentStoryMeta = {
  title: 'Views/Invoice Detail',
  component: 'app-invoice-detail',
  category: 'Views',
  description:
    'Отдельная страница счёта: суммы с НДС, оплата и остаток, стороны, договор- и калькуляция-основание, позиции счёта, платежи по счёту и запись оплаты.',
  stories: [
    {
      name: 'Карточка счёта',
      description: 'Детальное представление выставленного счёта на оплату.',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-invoice-detail></app-invoice-detail>
        </div>
      `,
    },
  ],
};

export default meta;

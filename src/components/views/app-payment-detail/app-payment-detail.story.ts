import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-payment-detail';

const meta: ComponentStoryMeta = {
  title: 'Views/Payment Detail',
  component: 'app-payment-detail',
  category: 'Views',
  description:
    'Отдельная страница платежа: направление (входящий / исходящий), маршрут движения средств, банковские реквизиты компании и контрагента, закрытие счёта и связанные напоминания.',
  stories: [
    {
      name: 'Карточка платежа',
      description: 'Детальное представление входящего или исходящего платежа.',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-payment-detail></app-payment-detail>
        </div>
      `,
    },
  ],
};

export default meta;

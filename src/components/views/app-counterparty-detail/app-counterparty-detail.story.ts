import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-counterparty-detail';

const meta: ComponentStoryMeta = {
  title: 'Views/Counterparty Detail',
  component: 'app-counterparty-detail',
  category: 'Views',
  description:
    'Отдельная страница контрагента: реквизиты, контакты, финансовые показатели, договоры, связанные проекты, калькуляции и счета.',
  stories: [
    {
      name: 'Карточка контрагента',
      description: 'Детальное представление контрагента со связанными договорами, проектами и историей биллинга.',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-counterparty-detail></app-counterparty-detail>
        </div>
      `,
    },
  ],
};

export default meta;

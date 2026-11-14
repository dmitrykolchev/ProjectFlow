import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-contract-detail';

const meta: ComponentStoryMeta = {
  title: 'Views/Contract Detail',
  component: 'app-contract-detail',
  category: 'Views',
  description:
    'Отдельная страница договора: финансовое исполнение, реквизиты сторон, процедура выставления счетов с автоподбором часов и расходов проекта.',
  stories: [
    {
      name: 'Карточка договора и выставление счетов',
      description: 'Детальное представление договора с прогрессом оплат, таблицей счетов и процедурой биллинга.',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-contract-detail></app-contract-detail>
        </div>
      `,
    },
  ],
};

export default meta;

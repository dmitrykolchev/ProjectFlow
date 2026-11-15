import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-company-detail';

const meta: ComponentStoryMeta = {
  title: 'Views/Company Detail',
  component: 'app-company-detail',
  category: 'Views',
  description:
    'Карточка компании: реквизиты, руководитель, штат, проекты, договоры, счета, привязанные файлы и база знаний.',
  stories: [
    {
      name: 'Профиль компании',
      description: 'Детальное представление юридического лица со связанными проектами, сотрудниками, договорами и документами.',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-company-detail></app-company-detail>
        </div>
      `,
    },
  ],
};

export default meta;

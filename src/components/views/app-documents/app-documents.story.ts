import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-documents';

const meta: ComponentStoryMeta = {
  title: 'Views/Documents Library',
  component: 'app-documents',
  category: 'Views',
  description:
    'Корпоративная библиотека документов: загрузка файлов с диска, предпросмотр изображений и кода/Markdown, версионирование и фильтрация по компаниям и проектам.',
  stories: [
    {
      name: 'Библиотека документов',
      description: 'Полнофункциональный реестр файлов в режиме карточек и таблицы с пагинацией и загрузкой.',
      render: () => html`
        <div style="height: 700px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
          <app-documents></app-documents>
        </div>
      `,
    },
  ],
};

export default meta;

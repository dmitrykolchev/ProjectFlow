import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-project-chat';

const meta: ComponentStoryMeta = {
  title: 'Views/AppProjectChat',
  component: 'app-project-chat',
  category: 'Views',
  description:
    'Внутренний чат сотрудников с разделением по каналам внутри проектов (создание, архивирование, удаление каналов участниками проекта), привязкой к задачам, ответами, закреплением сообщений и реакциями.',
  stories: [
    {
      name: 'Чат по проектам',
      description: 'Дерево проектов и каналов с созданием, архивированием/восстановлением и удалением каналов участниками проекта.',
      render: () => html`
        <div style="height: 680px; border: 1px solid var(--border-subtle); border-radius: 10px; overflow: hidden;">
          <app-project-chat></app-project-chat>
        </div>
      `,
    },
  ],
};

export default meta;

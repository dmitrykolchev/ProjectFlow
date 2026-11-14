import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-project-chat';

const meta: ComponentStoryMeta = {
  title: 'Views/AppProjectChat',
  component: 'app-project-chat',
  category: 'Views',
  description:
    'Внутренний чат сотрудников по проектам с каналами проектов, привязкой к задачам, ответами, закреплением сообщений и реакциями.',
  stories: [
    {
      name: 'Чат по проектам',
      description: 'Интерактивная переписка внутри команд проектов с переключением каналов и ролью отправителя.',
      render: () => html`
        <div style="height: 680px; border: 1px solid var(--border-subtle); border-radius: 10px; overflow: hidden;">
          <app-project-chat></app-project-chat>
        </div>
      `,
    },
  ],
};

export default meta;

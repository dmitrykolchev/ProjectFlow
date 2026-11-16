import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-requirements';

const meta: ComponentStoryMeta = {
  title: 'Views/Requirements',
  component: 'app-requirements',
  category: 'Views',
  description:
    'Реестр функциональных (FR) и нефункциональных (NFR) требований по проектам с фильтрацией, пагинацией, генерацией из спецификации и AI-декомпозицией в задачи.',
  stories: [
    {
      name: 'Requirements Registry',
      description: 'Полная страница работы со списком требований, KPI-метриками и переключением Карточки/Таблица.',
      render: () => html`
        <div style="height: 680px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-requirements></app-requirements>
        </div>
      `,
    },
  ],
};

export default meta;

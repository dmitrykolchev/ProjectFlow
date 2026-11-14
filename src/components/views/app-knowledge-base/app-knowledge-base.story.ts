import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-knowledge-base';

const meta: ComponentStoryMeta = {
  title: 'Views/KnowledgeBase',
  component: 'app-knowledge-base',
  category: 'Views',
  description:
    'База знаний по проектам и компаниям: архитектурные решения, регламенты, разборы инцидентов, онбординг и накопление опыта с привязкой к задачам и истории правок.',
  stories: [
    {
      name: 'База знаний (Все материалы)',
      description: 'Каталог документации с фильтрами по проектам и компаниям, Markdown-просмотром и историей изменений.',
      render: () => {
        store.setKnowledgeFilters({ scope: 'all', projectId: 'all', companyId: 'all' });
        return html`<div style="height: 760px;"><app-knowledge-base></app-knowledge-base></div>`;
      },
    },
    {
      name: 'Фильтр по проекту CORE',
      description: 'Документация и уроки, привязанные к выбранному проекту.',
      render: () => {
        store.setKnowledgeFilters({ scope: 'project', projectId: 'proj-1', companyId: 'all' });
        return html`<div style="height: 760px;"><app-knowledge-base></app-knowledge-base></div>`;
      },
    },
  ],
};

export default meta;

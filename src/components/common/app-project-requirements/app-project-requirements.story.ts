import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-project-requirements';

const meta: ComponentStoryMeta = {
  title: 'Common/ProjectRequirements',
  component: 'app-project-requirements',
  category: 'Common',
  description:
    'Управление функциональными (FR) и нефункциональными (NFR) требованиями проекта, генерация из спецификации, трассировка к базе знаний и декомпозиция в задачи с помощью AI.',
  propsDoc: {
    projectId: 'Project whose requirements are listed (empty = all projects)',
    currentLang: 'UI language',
  },
  stories: [
    {
      name: 'Default (CORE Project)',
      description: 'Список FR/NFR требований проекта с привязками к статьям базы знаний и задачам.',
      render: () => {
        const pid = store.projects[0]?.id || 'proj-1';
        return html`<app-project-requirements .projectId="${pid}"></app-project-requirements>`;
      },
    },
    {
      name: 'Empty Project State',
      description: 'Пустое состояние до генерации требований из спецификации.',
      render: () => html`<app-project-requirements projectId="non-existent"></app-project-requirements>`,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-decompose-form';
import '../app-button/app-button';

const sampleDrafts = [
  {
    title: 'Спроектировать архитектуру модуля',
    description: 'Схема данных, контракты API и выбор библиотек',
    priority: 'high' as const,
    estimatedHours: 8,
    tags: ['architecture'],
    subtasks: ['Схема данных', 'Контракт API'],
    requirementIds: [store.requirements[0]?.id || ''],
    knowledgeArticleIds: [],
  },
  {
    title: 'Реализовать базовый API',
    description: 'Эндпоинты CRUD с валидацией и тестами',
    priority: 'medium' as const,
    estimatedHours: 16,
    tags: ['backend'],
    subtasks: ['Эндпоинты', 'Тесты'],
    requirementIds: [store.requirements[0]?.id || ''],
    knowledgeArticleIds: [],
  },
  {
    title: 'Настроить CI для модуля',
    description: 'Пайплайн сборки, линтер и покрытие тестов',
    priority: 'low' as const,
    estimatedHours: 4,
    tags: ['devops'],
    subtasks: [],
    requirementIds: [store.requirements[0]?.id || ''],
    knowledgeArticleIds: [],
  },
];

export const meta: ComponentStoryMeta = {
  title: 'Overlays/DecomposeForm',
  component: 'app-decompose-form',
  description:
    'Canonical AI decompose form. The component owns the assignee picker and the draft task cards with selection checkbox, title, estimated hours, priority, description, subtask chips, requirement code badges and knowledge article chips; it runs the AI decomposition through its public decompose call for the current requirementIds, opens the modal on success and dispatches decompose-failed with the formatted AI error on failure. Saving creates one task per selected draft, links tasks to the requirements of each draft and moves draft and approved requirements to in_progress; a saved event carries the created task ids.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the draft editor modal (rendered through the portal)',
    requirementIds: 'Requirement ids to decompose, also the fallback links for drafts without requirement ids',
    decompose: 'Public async method running the AI decomposition and opening the editor',
    openWithDrafts: 'Public method opening the editor with a prepared draft list (drafts, model, projectId)',
  },
  eventsDoc: {
    close: { detail: '—', description: 'Fires when the form is dismissed without saving' },
    'decompose-failed': {
      detail: '{ message: string }',
      description: 'Fires when decomposition cannot start',
    },
    saved: {
      detail: '{ taskIds: string[] }',
      description: 'Fires after subtasks are created; carries their ids',
    },
  },
  stories: [
    {
      name: 'Decompose Selected Requirement',
      description:
        'Runs the AI decomposition for the first store requirement and opens the editor with the returned drafts, requires an AI endpoint in settings',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (!form) return;
              form.requirementIds = [store.requirements[0]?.id || ''];
              form.decompose();
            }}"
          >
            Декомпозировать требование
          </app-button>

          <app-decompose-form></app-decompose-form>
        </div>
      `,
    },
    {
      name: 'Draft Task Cards',
      description:
        'Editor opened with three prepared drafts showing the selection checkbox, title, hours, priority, description, subtask chips and requirement code badges',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (!form) return;
              form.requirementIds = [store.requirements[0]?.id || ''];
              form.openWithDrafts(sampleDrafts, 'demo-model', store.projects[0]?.id || '');
            }}"
          >
            Открыть черновики задач
          </app-button>

          <app-decompose-form></app-decompose-form>
        </div>
      `,
    },
    {
      name: 'Decompose of a Project',
      description:
        'Editor opened with two drafts bound to the first project, create-selected button counts the checked cards',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (!form) return;
              form.requirementIds = [store.requirements[0]?.id || ''];
              form.openWithDrafts(sampleDrafts.slice(0, 2), 'project-model', store.projects[0]?.id || '');
            }}"
          >
            Декомпозиция проекта
          </app-button>

          <app-decompose-form></app-decompose-form>
        </div>
      `,
    },
  ],
};

export default meta;

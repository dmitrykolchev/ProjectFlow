import { html } from 'lit';
import { initialTasks } from '../../../state/mock-data';
import { ComponentStoryMeta } from '../../../types/storybook';
import { AnalysisSummary } from '../../../types';
import './app-task-ai-panel';

const sampleTask = initialTasks[0];

const sampleAnalysis: AnalysisSummary = {
  id: 'story-analysis-1',
  kind: 'task',
  authorId: 'user-1',
  overview:
    'Задача критична для снижения задержек чтения на уровне L2 кэша. По архитектуре проекта CORE и документации из базы знаний требуется соблюдение TTL-политик и защиты от cache stampede.',
  effortAssessment:
    'Оценка 16 ч выглядит реалистичной с учётом текущего прогресса, однако потребуется доп. время на нагрузочное тестирование инвалидации.',
  risks: [
    'Риск гонки при одновременном обновлении ключей между нодами L1 и L2',
    'Отсутствие fallback при кратковременной недоступности Redis-кластера',
  ],
  recommendations: [
    'Использовать probabilistic early expiration или singleflight-обёртку для горячих ключей',
    'Синхронизировать метрики hit/miss ratio с дашбордом мониторинга согласно стандарту CORE',
  ],
  suggestedSubtasks: [
    'Добавить singleflight-защиту от cache stampede',
    'Настроить интеграционный тест отказоустойчивости L2',
  ],
  contextSources: [
    { kind: 'knowledge' as const, id: 'kb-1', title: 'Архитектурный стандарт кэширования L1/L2' },
    { kind: 'document' as const, id: 'doc-1', title: 'Техническое задание Core Platform v2' },
  ],
  model: 'local-openai-compatible',
  createdAt: '2026-03-18T14:30:00.000Z',
};

export const meta: ComponentStoryMeta = {
  title: 'Common/Task AI Panel',
  component: 'app-task-ai-panel',
  category: 'Common',
  description:
    'Панель AI-ассистента для задач: автоматический подбор контекста из Базы знаний и Библиотеки документов, генерация структурированного описания и контекстный анализ рисков, трудоёмкости и подзадач через OpenAI-совместимый API.',
  propsDoc: {
    task: 'Task being analyzed',
    analyses: 'Saved analysis summaries, newest first; the panel renders each as app-analysis-summary',
    clarifications: 'Clarification Q&A items',
    compact: 'Reduced layout for embedding inside modals',
    timeSummary: 'Time-tracking summary rendered next to the analysis',
    expenseSummary: 'Expense summary rendered next to the analysis',
    discussionsSummary: 'Discussion summary rendered next to the analysis',
  },
  eventsDoc: {
    'analyses-update': {
      detail: '{ analyses: AnalysisSummary[] }',
      description: 'Fires after the analysis list changes',
    },
    'clarification-update': {
      detail: '{ messages: TaskAiClarificationMessage[] }',
      description: 'Fires when clarification messages change',
    },
    'apply-description': {
      detail: "{ description: string, mode: 'replace' | 'append' }",
      description: 'Fires when an AI draft is applied to the task description',
    },
    'add-subtask': {
      detail: '{ title: string }',
      description: 'Fires when a suggested subtask is accepted',
    },
  },
  stories: [
    {
      name: 'Full Task Analysis Panel',
      description: 'Полноразмерная панель анализа задачи с прикреплённым контекстом и готовым результатом анализа.',
      render: () => html`
        <app-task-ai-panel
          .task="${sampleTask}"
          .analyses="${[sampleAnalysis]}"
        ></app-task-ai-panel>
      `,
    },
    {
      name: 'Compact Modal Variant',
      description: 'Компактный режим для встраивания внутрь модального окна создания/редактирования задачи.',
      render: () => html`
        <app-task-ai-panel
          compact
          .task="${sampleTask}"
        ></app-task-ai-panel>
      `,
    },
  ],
};

export default meta;

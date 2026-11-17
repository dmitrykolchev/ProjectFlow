import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { AnalysisSummary } from '../../../types';
import './app-analysis-summary';

const TASK_SUMMARY: AnalysisSummary = {
  id: 'story-as-1',
  kind: 'task',
  authorId: 'user-1',
  model: 'swift-1.5-iq2_xs',
  createdAt: '2026-11-17T14:32:00Z',
  overview:
    'The task aligns with the authorization module specification; the estimate covers the core flow, but the token refresh edge cases are not scoped. Linked knowledge articles describe the security baseline.',
  effortAssessment: 'Estimate 16h vs logged 4h; the remaining scope is realistic if subtasks are split as suggested.',
  risks: ['Token refresh race under concurrent requests', 'Missing audit logging for admin overrides'],
  recommendations: ['Extract token refresh into a dedicated service', 'Add integration tests for the 401 retry path'],
  suggestedSubtasks: ['Implement token refresh service', 'Add 401 retry integration tests'],
  contextSources: [
    { kind: 'requirement', id: 'FR-02', title: 'FR-02: Session lifecycle', reason: 'topic match' },
    { kind: 'knowledge', id: 'kb-3', title: 'Security baseline', reason: 'keyword' },
  ],
};

const REQUIREMENT_SUMMARY: AnalysisSummary = {
  id: 'story-as-2',
  kind: 'requirement',
  authorId: 'user-2',
  model: 'swift-1.5-iq2_xs',
  createdAt: '2026-11-16T09:10:00Z',
  overview:
    'FR-05 defines the export pipeline but leaves file format, retention and failure reporting unspecified; acceptance criteria are not testable as written.',
  risks: ['Format ambiguity between CSV and XLSX', 'No SLA for large exports'],
  recommendations: ['Fix a single canonical export format', 'Define timeout and retry policy'],
  clarification:
    'Export produces UTF-8 CSV with CRLF; files are retained 90 days; failures emit a project notification within 5 minutes.',
  decomposition: [
    { title: 'Implement CSV writer', estimatedHours: 6 },
    { title: 'Retention & cleanup job', estimatedHours: 4 },
    { title: 'Failure notification hook', estimatedHours: 3 },
  ],
  contextSources: [{ kind: 'document', id: 'doc-1', title: 'Export spec v2' }],
};

export const meta: ComponentStoryMeta = {
  title: 'Common/AnalysisSummary',
  component: 'app-analysis-summary',
  description:
    'One saved AI analysis summary for a task or requirement: author, model and date header, overview, effort, risks, recommendations; task summaries add suggested subtasks, requirement summaries add the clarification and decomposition into tasks. Action buttons fire events.',
  category: 'Common',
  propsDoc: {
    summary: 'AnalysisSummary record (kind task|requirement)',
    expanded: 'Collapsed history entries render only a short overview line',
    addedTitles: 'Subtask titles already present on the owning task',
  },
  stories: [
    {
      name: 'Task Summary',
      description: 'Author, model, date, effort, risks, recommendations and suggested subtasks with add buttons',
      render: () =>
        html`<app-analysis-summary .summary="${TASK_SUMMARY}" .addedTitles="${['Implement token refresh service']}"></app-analysis-summary>`,
    },
    {
      name: 'Requirement Summary',
      description: 'Clarification block with apply actions and decomposition rows with create-task buttons',
      render: () => html`<app-analysis-summary .summary="${REQUIREMENT_SUMMARY}"></app-analysis-summary>`,
    },
    {
      name: 'Collapsed History Entry',
      description: 'Older summary shows only the first line of the overview',
      render: () =>
        html`<app-analysis-summary .summary="${TASK_SUMMARY}" .expanded="${false}"></app-analysis-summary>`,
    },
  ],
};

export default meta;

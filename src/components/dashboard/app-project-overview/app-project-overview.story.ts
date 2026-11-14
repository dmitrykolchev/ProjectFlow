import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-project-overview';

export const meta: ComponentStoryMeta = {
  title: 'Dashboard/ProjectOverview',
  component: 'app-project-overview',
  description:
    'Interactive D3.js Project Overview dashboard visualizing project progress, logged hours breakdown, and budget utilization.',
  category: 'Dashboard',
  stories: [
    {
      name: 'Single Project Overview (Core Platform)',
      description: 'Displays D3 stage progress ring, stacked hours chart, and bullet budget gauge for a single project.',
      render: () => html`
        <div style="width: 100%; max-width: 1280px;">
          <app-project-overview
            projectId="proj-1"
          ></app-project-overview>
        </div>
      `,
    },
    {
      name: 'Portfolio Overview (All Projects)',
      description: 'Compares delivery progress across all projects alongside aggregated time entries and budget utilization.',
      render: () => html`
        <div style="width: 100%; max-width: 1280px;">
          <app-project-overview
            projectId="all"
          ></app-project-overview>
        </div>
      `,
    },
    {
      name: 'High Budget Utilization State',
      description: 'Simulated project approaching and exceeding approved budget cap with warning & overrun telemetry.',
      render: () => {
        const sampleProject = [
          {
            id: 'demo-overrun',
            name: 'Cloud Migration Phase II',
            key: 'CLD',
            description: 'Cluster migration & security audit',
            color: '#f59e0b',
            dueDate: '2026-12-15',
            progress: 72,
            budget: 450000,
          },
        ];
        const sampleTasks = [
          { ...store.tasks[0], id: 'CLD-1', projectId: 'demo-overrun', status: 'done' as const, estimatedHours: 24, loggedHours: 24 },
          { ...store.tasks[0], id: 'CLD-2', projectId: 'demo-overrun', status: 'done' as const, estimatedHours: 16, loggedHours: 16 },
          { ...store.tasks[0], id: 'CLD-3', projectId: 'demo-overrun', status: 'in_progress' as const, estimatedHours: 32, loggedHours: 18 },
          { ...store.tasks[0], id: 'CLD-4', projectId: 'demo-overrun', status: 'review' as const, estimatedHours: 16, loggedHours: 12 },
        ];
        const sampleTime = [
          { id: 't1', taskId: 'CLD-1', projectId: 'demo-overrun', userId: 'user-1', date: '2026-11-10', hours: 8, billable: true, category: 'devops' as const, status: 'approved' as const, description: 'Cluster setup', createdAt: '2026-11-10T10:00:00Z' },
          { id: 't2', taskId: 'CLD-2', projectId: 'demo-overrun', userId: 'user-3', date: '2026-11-11', hours: 10, billable: true, category: 'development' as const, status: 'approved' as const, description: 'Data sync', createdAt: '2026-11-11T10:00:00Z' },
          { id: 't3', taskId: 'CLD-3', projectId: 'demo-overrun', userId: 'user-6', date: '2026-11-12', hours: 12, billable: true, category: 'devops' as const, status: 'submitted' as const, description: 'Ingress hardening', createdAt: '2026-11-12T10:00:00Z' },
          { id: 't4', taskId: 'CLD-4', projectId: 'demo-overrun', userId: 'user-1', date: '2026-11-13', hours: 6, billable: false, category: 'meeting' as const, status: 'logged' as const, description: 'Review', createdAt: '2026-11-13T10:00:00Z' },
        ];
        const sampleExpenses = [
          { id: 'e1', projectId: 'demo-overrun', userId: 'user-6', date: '2026-11-11', title: 'GPU Nodes', category: 'infrastructure' as const, amount: 185000, currency: 'RUB' as const, billable: true, status: 'approved' as const, notes: '', createdAt: '2026-11-11T10:00:00Z' },
          { id: 'e2', projectId: 'demo-overrun', userId: 'user-1', date: '2026-11-12', title: 'Security Audit', category: 'contractors' as const, amount: 140000, currency: 'RUB' as const, billable: true, status: 'approved' as const, notes: '', createdAt: '2026-11-12T10:00:00Z' },
        ];

        return html`
          <div style="width: 100%; max-width: 1280px;">
            <app-project-overview
              projectId="demo-overrun"
              .hideProjectSelector="${true}"
              .projects="${sampleProject}"
              .tasks="${sampleTasks}"
              .timeEntries="${sampleTime}"
              .expenses="${sampleExpenses}"
              .users="${store.users}"
            ></app-project-overview>
          </div>
        `;
      },
    },
    {
      name: 'Empty Project State',
      description: 'Clean empty placeholders with direct action buttons when no tasks, hours, or budget exist yet.',
      render: () => {
        const emptyProject = [
          {
            id: 'demo-empty',
            name: 'New Initiative',
            key: 'NEW',
            description: 'Initial planning phase',
            color: '#06b6d4',
            dueDate: '2027-02-01',
            progress: 0,
            budget: 0,
          },
        ];

        return html`
          <div style="width: 100%; max-width: 1280px;">
            <app-project-overview
              projectId="demo-empty"
              .hideProjectSelector="${true}"
              .projects="${emptyProject}"
              .tasks="${[]}"
              .timeEntries="${[]}"
              .expenses="${[]}"
            ></app-project-overview>
          </div>
        `;
      },
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-status-chip';

export const meta: ComponentStoryMeta = {
  title: 'Common/Status Chip',
  component: 'app-status-chip',
  description:
    'Domain-driven status chip: resolves label and badge variant from central STATUS_TOKENS registry.',
  category: 'Common',
  propsDoc: {
    domain: 'Status vocabulary: task, contract, invoice, project, ...',
    status: 'Status code within the domain (rendered with its label and color)',
    size: 'Visual density: sm / md',
    appearance: 'Rendering style: soft fill / outline',
    dot: 'Shows a leading status dot',
  },
  stories: [
    {
      name: 'Contract Statuses',
      description: 'Labels and variants resolved from status-tokens per language',
      render: () => html`
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <app-status-chip domain="contract" status="draft"></app-status-chip>
          <app-status-chip domain="contract" status="on_approval"></app-status-chip>
          <app-status-chip domain="contract" status="active"></app-status-chip>
          <app-status-chip domain="contract" status="completed"></app-status-chip>
          <app-status-chip domain="contract" status="terminated"></app-status-chip>
        </div>
      `,
    },
    {
      name: 'Task & Priority',
      description: 'i18n-backed domains (task, priority)',
      render: () => html`
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <app-status-chip domain="task" status="backlog"></app-status-chip>
          <app-status-chip domain="task" status="in_progress"></app-status-chip>
          <app-status-chip domain="task" status="done"></app-status-chip>
          <app-status-chip domain="priority" status="high"></app-status-chip>
          <app-status-chip domain="priority" status="urgent"></app-status-chip>
        </div>
      `,
    },
    {
      name: 'With Dot & Sizes',
      description: 'Dot indicator and md size',
      render: () => html`
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
          <app-status-chip domain="invoice" status="paid" dot></app-status-chip>
          <app-status-chip domain="invoice" status="overdue" dot size="md"></app-status-chip>
          <app-status-chip domain="counterparty" status="blocked" dot></app-status-chip>
        </div>
      `,
    },
  ],
};

export default meta;

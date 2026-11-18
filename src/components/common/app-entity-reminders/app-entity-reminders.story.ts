import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-entity-reminders';

const meta: ComponentStoryMeta = {
  component: 'app-entity-reminders',
  title: 'Common/Entity Reminders',
  description:
    'Embeddable contextual reminders widget for any system entity detail view (company, counterparty, contract, employee, project, task, requirement, calculation, etc.).',
  category: 'Common',
  propsDoc: {
    'entity-type': 'Linked entity kind (company, contract, task, contact, etc.)',
    'entity-id': 'Target entity record identifier',
  },
  stories: [
    {
      name: 'Contract Reminders',
      description: 'Reminders widget embedded on contract cont-1',
      render: () => html`
        <app-entity-reminders entity-type="contract" entity-id="cont-1"></app-entity-reminders>
      `,
    },
    {
      name: 'Task Reminders',
      description: 'Reminders widget embedded on task CORE-101',
      render: () => html`
        <app-entity-reminders entity-type="task" entity-id="CORE-101"></app-entity-reminders>
      `,
    },
    {
      name: 'Empty State',
      description: 'Panel state when an entity has no configured reminders yet',
      render: () => html`
        <app-entity-reminders entity-type="project" entity-id="non-existent"></app-entity-reminders>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-project-progress';

export const meta: ComponentStoryMeta = {
  title: 'Dashboard/ProjectProgress',
  component: 'app-project-progress',
  description:
    'Portfolio progress tracker displaying completion bars, task ratios, and click-to-open project filtering. The actions slot renders controls at the right of the section header.',
  category: 'Dashboard',
  slotsDoc: {
    actions: 'Controls at the right of the section header',
  },
  childrenDoc: {
    'app-button': 'Header control placed in the actions slot at the right of the section header',
  },
  propsDoc: {
    title: 'Section caption',
    projects: 'Project records to render progress for',
    tasks: 'Task records used to compute progress',
    lang: 'UI language for labels and date formatting',
  },
  stories: [
    {
      name: 'Active Projects Progress',
      description: 'Connected to active projects and tasks in store',
      render: () => html`
        <div style="width: 100%; max-width: 600px;">
          <app-project-progress
            title="Прогресс проектов"
            .projects="${store.projects}"
            .tasks="${store.tasks}"
          ></app-project-progress>
        </div>
      `,
    },
  ],
};

export default meta;

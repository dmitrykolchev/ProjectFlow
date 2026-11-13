import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-task-modal';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/TaskModal',
  component: 'app-task-modal',
  description: 'Comprehensive task creation and editing modal dialog with subtasks, dates, and assignees.',
  category: 'Overlays',
  stories: [
    {
      name: 'Create Task Trigger',
      description: 'Trigger full task creation modal flow',
      render: () => html`
        <div>
          <app-button variant="primary" @click="${() => store.openCreateTaskModal()}">
            + Создать новую задачу
          </app-button>
          <app-task-modal></app-task-modal>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-requirement-form';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/RequirementForm',
  component: 'app-requirement-form',
  description:
    'Canonical requirement create and edit form. The component owns the eleven fields of project code type category priority status source spec document linked knowledge articles title description and acceptance criteria, writes the requirement to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills the target project, its spec document, the next FR code, functional type Core category high priority and approved status.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    requirement: 'Requirement being edited (null = create mode)',
    presetProjectId: 'Project prefilled for a context-bound opening (first project by default)',
  },
  stories: [
    {
      name: 'Create Requirement',
      description:
        'Eleven fields with project spec document next FR code functional type Core category high priority and approved status prefills',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Новая requirement
          </app-button>

          <app-requirement-form></app-requirement-form>
        </div>
      `,
    },
    {
      name: 'Edit Requirement',
      description: 'All fields prefilled from the store record, acceptance criteria shown as lines',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Редактировать requirement
          </app-button>

          <app-requirement-form .requirement="${store.requirements[0] || null}"></app-requirement-form>
        </div>
      `,
    },
  ],
};

export default meta;

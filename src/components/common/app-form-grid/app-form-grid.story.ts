import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import '../app-input/app-input';
import '../app-select/app-select';
import './app-form-grid';

export const meta: ComponentStoryMeta = {
  title: 'Common/Form Grid',
  component: 'app-form-grid',
  description:
    'Two-column grid for modal form fields; collapses to one column below 640px. Slotted children keep their own classes (col-span-2 stays in view CSS).',
  category: 'Common',
  stories: [
    {
      name: 'Default',
      description: 'Two columns of fields',
      render: () => html`
        <div style="max-width: 640px;">
          <app-form-grid>
            <app-input label="Name" placeholder="Project name"></app-input>
            <app-input label="Key" placeholder="CORE"></app-input>
            <app-select
              label="Status"
              .options="${[{ value: 'active', label: 'Active' }, { value: 'planning', label: 'Planning' }]}"
            ></app-select>
            <app-input label="Due date" placeholder="YYYY-MM-DD"></app-input>
          </app-form-grid>
        </div>
      `,
    },
  ],
};

export default meta;

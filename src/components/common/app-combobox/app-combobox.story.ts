import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-combobox';

export const meta: ComponentStoryMeta = {
  title: 'Inputs/Combobox',
  component: 'app-combobox',
  description: 'Searchable multi-tag combobox input with autocomplete and tag removal.',
  category: 'Inputs',
  propsDoc: {
    label: 'Caption above the field',
    items: 'Suggestion item definitions (value + label)',
    selected: 'Currently selected values',
    placeholder: 'Text shown in the input when empty',
    allowCustom: 'Typing a new value offers "+ Add" to create it',
    size: "Control size scale sm|md|lg (30/38/44px min-heights, md default)",
  },
  stories: [
    {
      name: 'Size Scale',
      description: 'Canonical control size scale sm|md|lg on the box',
      render: () => {
        const availableTags = ['Dev', 'Frontend', 'Backend'];
        const selected = ['Frontend'];
        return html`
          <div style="max-width: 440px; display: flex; flex-direction: column; gap: 0.75rem;">
            <app-combobox size="sm" label="Small" .items="${availableTags}" .selected="${selected}"></app-combobox>
            <app-combobox size="md" label="Medium (default)" .items="${availableTags}" .selected="${selected}"></app-combobox>
            <app-combobox size="lg" label="Large" .items="${availableTags}" .selected="${selected}"></app-combobox>
          </div>
        `;
      },
    },
    {
      name: 'Tags Selector',
      description: 'Pre-filled tags with suggestions dropdown',
      render: () => {
        const availableTags = ['Dev', 'Frontend', 'Backend', 'Design', 'Architecture', 'Security', 'Performance', 'QA'];
        const selected = ['Frontend', 'Lit'];
        return html`
          <div style="max-width: 440px;">
            <app-combobox
              label="Теги задачи"
              .items="${availableTags}"
              .selected="${selected}"
              placeholder="Добавьте тег..."
            ></app-combobox>
          </div>
        `;
      },
    },
  ],
};

export default meta;

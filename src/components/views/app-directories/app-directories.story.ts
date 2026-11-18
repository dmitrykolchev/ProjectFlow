import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-directories';

const meta: ComponentStoryMeta = {
  title: 'Views/Directories',
  component: 'app-directories',
  category: 'Views',
  description:
    'Unified master-detail workbench for administering all grouped reference directories and complex classifiers (Activity Types, Expense Types, Departments, Positions, Currencies, Countries, Units of Measure with live converter, Billing Frequencies, and custom classifiers).',
  stories: [
    {
      name: 'All Grouped Classifiers',
      description: 'Master-detail catalog across 5 domain groups with dynamic schema-driven record grid',
      render: () => {
        store.setActiveDirectory('activity_types');
        return html`
          <div style="height: 760px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
            <app-directories></app-directories>
          </div>
        `;
      },
    },
    {
      name: 'Units of Measure (Complex Classifier & Converter)',
      description: 'Displays extended OKEI attributes, physical dimensions, conversion factors, and live conversion calculator',
      render: () => {
        store.setActiveDirectory('units_of_measure');
        return html`
          <div style="height: 760px; border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden;">
            <app-directories></app-directories>
          </div>
        `;
      },
    },
  ],
};

export default meta;

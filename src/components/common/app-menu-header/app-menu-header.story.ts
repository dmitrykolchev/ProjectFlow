import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-menu-header';

export const meta: ComponentStoryMeta = {
  title: 'Common/MenuHeader',
  component: 'app-menu-header',
  description: 'Declarative section heading element for grouping related <app-menu-item> entries inside <app-menu>.',
  category: 'Common',
  slotsDoc: {
    '(default)': 'Header text markup (used when the label property is omitted)',
  },
  propsDoc: {
    label: 'Section heading text',
  },
  stories: [
    {
      name: 'Section Headers',
      description: 'Using label attribute or slotted text content',
      render: () => html`
        <div style="width: 240px; background: var(--bg-surface-elevated, #162032); border: 1px solid var(--border-strong, #334155); border-radius: var(--radius-md, 8px); padding: 0.35rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <app-menu-header label="Операции с задачей"></app-menu-header>
          <app-menu-header>Представление и фильтры</app-menu-header>
        </div>
      `,
    },
  ],
};

export default meta;

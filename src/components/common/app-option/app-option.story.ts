import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-option';
import '../app-select/app-select';

export const meta: ComponentStoryMeta = {
  title: 'Common/Option',
  component: 'app-option',
  description:
    'Declarative option carrier for option-list components. Renders nothing; the parent component collects its props from the slot.',
  category: 'Common',
  slotsDoc: {
    start: 'Graphic element rendered before the option label in the parent row (SVG, material icon)',
    '(default)': 'Fallback label text used when the label property is omitted',
    end: 'Graphic element rendered after the option label in the parent row (SVG, material icon)',
  },
  propsDoc: {
    value: 'Option value emitted by the parent (falls back to the label)',
    label: 'Option caption (falls back to the element text)',
    color: 'Color indicator used by app-select rows',
    icon: 'Programmatic leading icon (TemplateResult or string)',
    code: 'Entity code shown in entity-selector rows',
    subtitle: 'Secondary line in entity-selector rows',
    meta: 'Meta line in entity-selector rows',
    badge: 'Badge text in entity-selector rows',
    badgeColor: 'Badge color in entity-selector rows',
    avatar: 'Avatar source (initials or image url) in entity-selector rows',
    description: 'Description line used by app-radio-group cards',
    keywords: 'Search keywords for the entity-selector filter',
    disabled: 'Option is not selectable',
  },
  stories: [
    {
      name: 'Declarative Select',
      description: 'app-select filled with declarative app-option children',
      render: () => html`
        <div style="max-width: 280px;">
          <app-select label="Status" placeholder="Select...">
            <app-option value="backlog" label="Бэклог" color="#64748b"></app-option>
            <app-option value="todo" label="К выполнению" color="#0284c7"></app-option>
            <app-option value="in_progress" label="В работе" color="#f59e0b"></app-option>
            <app-option value="review" label="Ревью" color="#8b5cf6"></app-option>
          </app-select>
        </div>
      `,
    },
  ],
};

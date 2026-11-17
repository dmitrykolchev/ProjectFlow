import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './card-footer';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Common/CardFooter',
  component: 'card-footer',
  description:
    'Card footer row with a border-top chrome. Actions in the start slot align to the left edge of the card, actions in the end slot align to the right edge.',
  category: 'Common',
  slotsDoc: {
    start: 'Actions aligned to the left edge of the card (app-button, labels, stat pills)',
    end: 'Actions aligned to the right edge of the card (app-button icon actions)',
  },
  childrenDoc: {
    'app-button': 'Action button child placed in the start / end slot (size sm matches the historical card icon-btn)',
  },
  stories: [
    {
      name: 'Card Footer Layout',
      description: 'Left-aligned label and primary action, right-aligned icon actions inside a sample card',
      render: () => html`
        <div style="max-width: 420px; padding: 1rem; background: var(--bg-surface, #111827); border: 1px solid var(--border-subtle, #1e293b); border-radius: var(--radius-lg, 12px);">
          <div style="font-size: 0.875rem; color: var(--text-primary, #f8fafc); padding-bottom: 0.5rem;">
            Contract ДГ-2026/001
          </div>
          <card-footer>
            <app-button slot="start" size="sm" variant="primary">Open contract</app-button>
            <app-button slot="end" size="sm" variant="outline">
              <span slot="start">${html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11l9-9V11z"/><path d="M15 8l6 6"/></svg>`}</span>
            </app-button>
            <app-button slot="end" size="sm" variant="outline">
              <span slot="start">${html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>`}</span>
            </app-button>
          </card-footer>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-project-form';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/ProjectForm',
  component: 'app-project-form',
  description:
    'Canonical project create and edit form. The component owns the ten fields of name key status due date company counterparty budget progress color swatches and description, writes the project to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Presets fill company counterparty status key budget title and the save button caption.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    project: 'Project being edited (null = create mode)',
    presetCompanyId: 'Company prefilled for a context-bound opening',
    presetCounterpartyId: 'Counterparty prefilled for a quick opening',
    presetStatus: 'Status a newly created project starts with (planning by default)',
    presetKey: 'Key prefilled for a quick opening',
    presetBudget: 'Budget prefilled for a quick opening',
    contextTitle: 'Modal title override for context-bound openings',
    saveLabel: 'Primary button caption override (Создать for quick openings)',
    saveDisabled: 'Disables the primary save button while the modal stays open (attribute binding)',
    beforeSave: "Async hook run before saving (attribute: false): receives { name, key } and returns Promise<boolean>; false cancels the save and keeps the form open",
    extraContent: "TemplateResult rendered in an extra section of the body — create mode only (attribute: false)",
    footerExtra: 'TemplateResult rendered in the modal footer before the primary button (attribute: false)',
  },
  eventsDoc: {
    close: { detail: '—', description: 'Fires when the form is dismissed without saving' },
    saved: {
      detail: '{ project: Project }',
      description: 'Fires after a successful save with the stored project',
    },
  },
  stories: [
    {
      name: 'Create Project',
      description: 'Ten fields with company counterparty year-end due date and 5M budget prefills',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Новый проект
          </app-button>

          <app-project-form></app-project-form>
        </div>
      `,
    },
    {
      name: 'Quick Project of a Company',
      description:
        'Same field set with company prefilled from the card, active status, PRJ key and 2M budget prefills, Создать caption',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Новый проект компании
          </app-button>

          <app-project-form
            .presetCompanyId="${store.companies[0]?.id || ''}"
            .presetCounterpartyId="${null}"
            .presetStatus="${'active'}"
            .presetKey="${`PRJ${store.projects.length + 1}`}"
            .presetBudget="${2000000}"
            saveLabel="Создать"
          ></app-project-form>
        </div>
      `,
    },
    {
      name: 'Edit Project',
      description: 'All fields prefilled from the store record',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Редактировать проект
          </app-button>

          <app-project-form .project="${store.projects[0] || null}"></app-project-form>
        </div>
      `,
    },
  ],
};

export default meta;

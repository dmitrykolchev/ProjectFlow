import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import './app-document-form';
import '../app-button/app-button';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/DocumentForm',
  component: 'app-document-form',
  description:
    'Canonical document create and edit form. The component owns the file dropzone for uploads, the title, file name, category, status, scope with its conditional entity selector, uploading employee, AI summary bar, tags, description, text content and version note, writes the document to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills draft status, spec category, the target company, the current employee and the initial version note.',
  category: 'Overlays',
  propsDoc: {
    open: 'Opens the form modal (rendered through the portal)',
    document: 'Document being edited (null = create mode, dropzone shown)',
    presetCompanyId: 'Company prefilled for a context-bound opening (first company by default)',
    presetProjectId: 'Project prefilled for a context-bound opening, switches the scope to project',
    presetContractId: 'Contract prefilled for a context-bound opening',
    presetCategory: 'Category prefilled for a quick upload (spec by default)',
    presetStatus: 'Status prefilled for a quick upload (draft by default)',
    presetTags: 'Tags prefilled for a quick upload (empty by default)',
    contextTitle: 'Modal title override for context-bound openings',
  },
  stories: [
    {
      name: 'Create Document',
      description:
        'File dropzone plus the full field set with draft status spec category first company current employee and initial version note prefills',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Загрузить файл
          </app-button>

          <app-document-form></app-document-form>
        </div>
      `,
    },
    {
      name: 'Document of a Company',
      description:
        'Same field set with the company prefilled from the card, legal category approved status and the company name as tags, quick upload title bound to the company',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Загрузить документ компании
          </app-button>

          <app-document-form
            .presetCompanyId="${store.companies[0]?.id || null}"
            .presetCategory="${'legal'}"
            .presetStatus="${'approved'}"
            .presetTags="${store.companies[0] ? store.companies[0].name.toLowerCase() : ''}"
            .contextTitle="${store.companies[0]
              ? getTranslation(store.customization.language).companyDetail.uploadDocument
              : ''}"
          ></app-document-form>
        </div>
      `,
    },
    {
      name: 'Edit Document',
      description: 'All fields prefilled from the store record, dropzone hidden',
      render: () => html`
        <div>
          <app-button
            variant="secondary"
            @click="${(e: Event) => {
              const form = (e.target as HTMLElement).nextElementSibling as any;
              if (form) form.open = true;
            }}"
          >
            Редактировать метаданные
          </app-button>

          <app-document-form .document="${store.documents[0] || null}"></app-document-form>
        </div>
      `,
    },
  ],
};

export default meta;

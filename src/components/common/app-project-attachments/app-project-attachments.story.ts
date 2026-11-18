import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-project-attachments';

export const meta: ComponentStoryMeta = {
  title: 'Common/ProjectAttachments',
  component: 'app-project-attachments',
  description:
    'File attachment control for time entries and expenses. Allows uploading new files (saved directly to the project document library) or picking existing documents from the project library, with inline preview and download.',
  category: 'Common',
  propsDoc: {
    'project-id': 'Project ID used to scope existing library documents',
    documentIds: 'Array of already-saved DocumentItem IDs attached to the record',
    pendingFiles: 'Array of newly selected browser files awaiting save',
    label: 'Optional section heading override',
    compact: 'Compact display mode without secondary helper hint',
    readonly: 'Disables uploading, linking, and detaching files',
  },
  stories: [
    {
      name: 'With Linked Project Files',
      description: 'Editable attachment picker bound to proj-1 with existing linked documents',
      render: () => {
        let docIds = ['doc-2', 'doc-13'];
        return html`
          <div style="max-width: 680px;">
            <app-project-attachments
              project-id="proj-1"
              .documentIds="${docIds}"
              @attachments-change="${(e: CustomEvent<{ documentIds: string[]; pendingFiles: unknown[] }>) => {
                docIds = e.detail.documentIds;
                const target = e.currentTarget as HTMLElement & {
                  documentIds: string[];
                  pendingFiles: unknown[];
                };
                if (target) {
                  target.documentIds = docIds;
                  target.pendingFiles = e.detail.pendingFiles;
                }
              }}"
            ></app-project-attachments>
          </div>
        `;
      },
    },
    {
      name: 'Empty State (New Entry)',
      description: 'Empty attachment dropzone with project library selector',
      render: () => html`
        <div style="max-width: 680px;">
          <app-project-attachments
            project-id="${store.projects[0]?.id || 'proj-1'}"
            .documentIds="${[]}"
          ></app-project-attachments>
        </div>
      `,
    },
    {
      name: 'Read-Only Preview Mode',
      description: 'Displays attached files with preview & download actions only',
      render: () => html`
        <div style="max-width: 680px;">
          <app-project-attachments
            readonly
            project-id="proj-1"
            .documentIds="${['doc-14', 'doc-15']}"
          ></app-project-attachments>
        </div>
      `,
    },
  ],
};

export default meta;

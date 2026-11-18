import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import '../app-button/app-button';
import './app-directory-record-modal';

export const meta: ComponentStoryMeta = {
  title: 'Common/DirectoryRecordModal',
  component: 'app-directory-record-modal',
  category: 'Common',
  description:
    'Schema-driven modal form for creating and editing both simple (code, name, sortOrder) and complex extended classifier records (Units of Measure, Currencies, Activity Types, etc.).',
  propsDoc: {
    open: 'Controls modal visibility',
    directory: 'DirectoryDefinition schema governing core and extended fields',
    record: 'DirectoryRecord being edited, or null for create mode',
  },
  stories: [
    {
      name: 'Extended Classifier (Units of Measure)',
      description: 'Opens schema-driven editor with OKEI code, physical dimension, base unit, conversion factor, and precision',
      render: () => {
        const uomDir =
          store.directories.find((d) => d.id === 'units_of_measure') || store.directories[0];
        const sampleRec = uomDir?.records[0] || null;
        return html`
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <app-button
              variant="primary"
              @click="${(e: Event) => {
                const host = (e.currentTarget as HTMLElement).parentElement;
                const modal = host?.querySelector('app-directory-record-modal') as HTMLElement & {
                  open: boolean;
                  directory: typeof uomDir;
                  record: typeof sampleRec;
                };
                if (modal) {
                  modal.directory = uomDir;
                  modal.record = sampleRec;
                  modal.open = true;
                }
              }}"
            >
              Open UOM Record Editor
            </app-button>

            <app-button
              variant="secondary"
              @click="${(e: Event) => {
                const simpleDir =
                  store.directories.find((d) => d.id === 'departments') || store.directories[0];
                const host = (e.currentTarget as HTMLElement).parentElement;
                const modal = host?.querySelector('app-directory-record-modal') as HTMLElement & {
                  open: boolean;
                  directory: typeof simpleDir;
                  record: null;
                };
                if (modal) {
                  modal.directory = simpleDir;
                  modal.record = null;
                  modal.open = true;
                }
              }}"
            >
              Open Simple Directory Create
            </app-button>

            <app-directory-record-modal></app-directory-record-modal>
          </div>
        `;
      },
    },
  ],
};

export default meta;

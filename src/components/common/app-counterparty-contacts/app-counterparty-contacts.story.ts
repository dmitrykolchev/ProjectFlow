import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { CounterpartyContact } from '../../../types';
import { store } from '../../../state/store';
import './app-counterparty-contacts';

const SAMPLE_CONTACTS: CounterpartyContact[] = [
  {
    id: 'story-cnt-1',
    fullName: 'Алексей Крылов',
    position: 'Директор департамента ИТ-платформ',
    department: 'Блок цифровых технологий',
    phone: '+7 (495) 950-10-00',
    additionalPhone: 'доб. 1420',
    email: 'a.krylov@severbank.ru',
    messenger: 'Telegram: @akrylov_sb',
    birthDate: '1983-04-18',
    comment: 'Куратор платформы CORE 3.0, подписывает акты приёмки этапов',
    isPrimary: true,
  },
  {
    id: 'story-cnt-2',
    fullName: 'Ольга Семёнова',
    position: 'Руководитель направления ИБ',
    department: 'Департамент информационной безопасности',
    phone: '+7 (495) 950-10-45',
    email: 'o.semenova@severbank.ru',
    messenger: 'Telegram: @olga_infosec',
    birthDate: '1988-11-03',
    comment: 'Согласование требований ФСТЭК и контура безопасности',
  },
  {
    id: 'story-cnt-3',
    fullName: 'Игорь Мельников',
    position: 'Заместитель главного бухгалтера',
    department: 'Финансовое управление',
    phone: '+7 (495) 950-11-20',
    additionalPhone: 'доб. 2018',
    email: 'edo@severbank.ru',
    comment: 'Закрывающие документы, ЭДО Диадок и сверка оплат',
  },
];

export const meta: ComponentStoryMeta = {
  title: 'Common/CounterpartyContacts',
  component: 'app-counterparty-contacts',
  description:
    'Multi-person counterparty contacts viewer and inline CRUD manager. Supports personal details (full name, job title, department, birth date), multiple communication channels (phones, email, messenger), primary contact selection, and clipboard copy; deleting a contact always goes through app-confirm-dialog (no opt-out).',
  category: 'Common',
  propsDoc: {
    contacts: 'Array of CounterpartyContact records',
    editable: 'Enables Add / Edit / Delete / Set Primary actions',
    compact: 'Uses single-column compact layout suitable inside modal forms',
    'hide-header': 'Hides internal header when embedded inside app-section-card',
    hideHeader: 'Hides internal header when embedded inside app-section-card (attribute form hide-header)',
    heading: 'Caption of the internal header; falls back to the localized contact-persons title when empty',
  },
  stories: [
    {
      name: 'Interactive Contacts Manager',
      description: 'Editable list with inline add/edit form, primary badge, and clipboard copy',
      render: () => {
        let state = [...(store.counterparties[0]?.contacts || SAMPLE_CONTACTS)];
        return html`
          <app-counterparty-contacts
            editable
            .contacts="${state}"
            @contacts-change="${(e: CustomEvent<{ contacts: CounterpartyContact[] }>) => {
              state = e.detail.contacts;
              const target = e.currentTarget as HTMLElement & { contacts: CounterpartyContact[] };
              if (target) target.contacts = state;
            }}"
          ></app-counterparty-contacts>
        `;
      },
    },
    {
      name: 'Compact Form Mode',
      description: 'Embedded single-column layout used inside counterparty edit/create modal',
      render: () => {
        let state = [...SAMPLE_CONTACTS.slice(0, 2)];
        return html`
          <div style="max-width: 680px;">
            <app-counterparty-contacts
              editable
              compact
              .contacts="${state}"
              @contacts-change="${(e: CustomEvent<{ contacts: CounterpartyContact[] }>) => {
                state = e.detail.contacts;
                const target = e.currentTarget as HTMLElement & { contacts: CounterpartyContact[] };
                if (target) target.contacts = state;
              }}"
            ></app-counterparty-contacts>
          </div>
        `;
      },
    },
    {
      name: 'Empty State',
      description: 'Display when a counterparty has no contact persons configured yet',
      render: () =>
        html`<app-counterparty-contacts editable .contacts="${[]}"></app-counterparty-contacts>`,
    },
  ],
};

export default meta;

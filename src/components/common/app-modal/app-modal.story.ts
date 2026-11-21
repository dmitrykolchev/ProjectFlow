import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-modal';
import '../app-button/app-button';
import { iconAlertTriangle, iconTrash } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/Modal',
  component: 'app-modal',
  description:
    'Customizable modal dialog with backdrop blur, customizable sizes, header, and footer actions. The title slot replaces the header caption, the default slot is the modal body, and the footer slot hosts footer buttons.',
  category: 'Overlays',
  slotsDoc: {
    title: 'Custom header content replacing the title text',
    '(default)': 'Modal body content',
    footer: 'Footer area (buttons)',
  },
  childrenDoc: {
    'app-form-grid': 'Form field grid rendered in the modal body',
    'app-button': 'Footer action button placed in the footer slot',
    'app-input': 'Text field child of the modal body',
    'app-select': 'Dropdown select child of the modal body',
    'app-textarea': 'Multiline text field child of the modal body',
  },
  propsDoc: {
    open: 'Opens the modal (rendered through the portal)',
    title: 'Header caption',
    size: 'Modal width preset: sm / md / lg',
    hideClose: 'Hides the header close (×) button',
    headerIcon: 'Icon descriptor rendered before the title',
  },
  eventsDoc: {
    close: {
      detail: '—',
      description: 'Fires when the modal is dismissed (backdrop, Esc, close button)',
    },
  },
  stories: [
    {
      name: 'Interactive Demo',
      description: 'Modal trigger and content layout preview',
      render: () => html`
        <div>
          <app-button
            variant="primary"
            @click="${(e: Event) => {
              const modal = (e.target as HTMLElement).nextElementSibling as any;
              if (modal) modal.open = true;
            }}"
          >
            Открыть модальное окно
          </app-button>

          <app-modal title="Подтверждение действия" size="sm">
            <p style="color: var(--text-secondary, #94a3b8); margin: 0; line-height: 1.5;">
              Это демонстрационное модальное окно с затемнением фона, поддержкой закрытия по клавише Esc и слотами для действий.
            </p>
            <div slot="footer">
              <app-button
                variant="ghost"
                @click="${(e: Event) => {
                  const modal = (e.target as HTMLElement).closest('app-modal') as any;
                  if (modal) modal.open = false;
                }}"
              >
                Отмена
              </app-button>
              <app-button
                variant="primary"
                @click="${(e: Event) => {
                  const modal = (e.target as HTMLElement).closest('app-modal') as any;
                  if (modal) modal.open = false;
                }}"
              >
                Понятно
              </app-button>
            </div>
          </app-modal>
        </div>
      `,
    },
    {
      name: 'Header Icon',
      description: 'Modal header with icon before the title (headerIcon property)',
      render: () => html`
        <div>
          <app-button
            variant="danger"
            @click="${(e: Event) => {
              const modal = (e.target as HTMLElement).nextElementSibling as any;
              if (modal) modal.open = true;
            }}"
          >
            Удалить запись
          </app-button>

          <app-modal size="sm" title="Удаление задачи" .headerIcon="${iconTrash(18)}">
            <p style="color: var(--text-secondary, #94a3b8); margin: 0; line-height: 1.5;">
              Иконка заголовка задаётся свойством headerIcon и отображается перед текстом title.
            </p>
            <div slot="footer">
              <app-button variant="ghost" @click="${(e: Event) => { const m = (e.target as HTMLElement).closest('app-modal') as any; if (m) m.open = false; }}">Отмена</app-button>
              <app-button variant="danger" @click="${(e: Event) => { const m = (e.target as HTMLElement).closest('app-modal') as any; if (m) m.open = false; }}">Удалить</app-button>
            </div>
          </app-modal>
        </div>
      `,
    },
  ],
};

export default meta;

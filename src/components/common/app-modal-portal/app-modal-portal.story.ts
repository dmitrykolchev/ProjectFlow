import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-modal-portal';
import '../app-button/app-button';
import '../app-modal/app-modal';
import '../app-select/app-select';

export const meta: ComponentStoryMeta = {
  title: 'Overlays/ModalPortal',
  component: 'app-modal-portal',
  description: 'Fixed full-viewport portal overlay hosting modals, drawers, and popups while blocking background scroll and pointer events below in z-order.',
  category: 'Overlays',
  stories: [
    {
      name: 'Portal Scroll & Pointer Isolation',
      description: 'Open either a modal or dropdown inside the portal; underlying scroll containers and controls remain locked until dismissed.',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: flex-end;">
            <div style="width: 240px;">
              <app-select
                label="Портальный Select"
                value="opt1"
                .options="${[
                  { value: 'opt1', label: 'Блокирует скролл фона', color: '#6366f1' },
                  { value: 'opt2', label: 'Перехватывает pointer events', color: '#10b981' },
                  { value: 'opt3', label: 'Поверх всех слоёв', color: '#06b6d4' },
                ]}"
              ></app-select>
            </div>
            <app-button
              variant="primary"
              @click="${(e: Event) => {
                const modal = (e.currentTarget as HTMLElement).parentElement?.nextElementSibling as any;
                if (modal) modal.open = true;
              }}"
            >
              Открыть диалог в портале
            </app-button>
          </div>
          <app-modal title="Модальный портал" size="sm">
            <p style="margin: 0; color: var(--text-secondary);">
              Этот диалог перенесён в отдельный фиксированный портал <code>&lt;app-modal-portal&gt;</code> на весь экран: фон не прокручивается и не получает события указателя.
            </p>
            <div slot="footer">
              <app-button
                variant="primary"
                @click="${(e: Event) => {
                  const modal = (e.currentTarget as HTMLElement).closest('app-modal') as any;
                  if (modal) modal.open = false;
                }}"
              >
                Закрыть
              </app-button>
            </div>
          </app-modal>
        </div>
      `,
    },
  ],
};

export default meta;

import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-detail-shell';
import '../app-persona/app-persona';
import '../app-badge/app-badge';
import '../app-button/app-button';
import '../app-link/app-link';
import '../app-section-card/app-section-card';
import '../app-status-chip/app-status-chip';
import { iconChevronLeft, iconEdit, iconFileText, iconTrash } from '../icons';
import { EntitySelectorOption } from '../app-entity-selector/app-entity-selector';

const SAMPLE_EXPENSES: EntitySelectorOption[] = [
  {
    value: 'exp-1',
    code: '2026-11-14',
    label: 'Лицензия Figma Enterprise',
    subtitle: '[PF-1] Платформа ProjectFlow · Vendor: Figma Inc.',
    meta: '38 000 ₽',
    badge: 'Одобрено',
    badgeColor: '#10b981',
    keywords: ['figma', 'license', 'design'],
  },
  {
    value: 'exp-2',
    code: '2026-11-08',
    label: 'Аренда сервера Hetzner',
    subtitle: '[PF-2] Миграция ERP · Vendor: Hetzner Cloud',
    meta: '12 400 ₽',
    badge: 'Ожидает',
    badgeColor: '#f59e0b',
    keywords: ['hosting', 'infra'],
  },
  {
    value: 'exp-3',
    code: '2026-10-27',
    label: 'Консультация по безопасности',
    subtitle: '[PF-3] Аудит доступа · Vendor: SecureLine',
    meta: '96 000 ₽',
    badge: 'Оплачено',
    badgeColor: '#0284c7',
    keywords: ['security', 'audit'],
  },
];

/**
 * Slotted content lives in the host's shadow tree, so a real view styles it with the
 * shared detail shell CSS layer (app-detail-shell.css) imported as the first entry of
 * `static styles`. A storybook page cannot import that layer into its own shadow root,
 * so the demo carries the same rules inline — this block mirrors the shell layer.
 */
const slottedStyles = html`
  <style>
    .demo-title {
      margin: 0;
      font-size: 1.38rem;
      font-weight: 700;
      color: var(--text-primary, #f8fafc);
    }

    .demo-sub {
      font-size: 0.85rem;
      color: var(--text-secondary, #94a3b8);
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .user-inline {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }

    .kpi-cell {
      padding: 0.9rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .kpi-label {
      font-size: 0.74rem;
      color: var(--text-muted, #64748b);
      font-weight: 500;
    }

    .kpi-val {
      font-size: 1.28rem;
      font-weight: 700;
      color: var(--text-primary, #f8fafc);
      font-family: var(--font-mono, monospace);
      font-variant-numeric: tabular-nums;
    }

    .kpi-val.accent {
      color: var(--accent-primary, #6366f1);
    }

    .kpi-val.success {
      color: var(--color-success, #10b981);
    }

    .kpi-hint {
      font-size: 0.75rem;
      color: var(--text-secondary, #94a3b8);
    }

    .meta-box {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    .meta-label {
      font-size: 0.72rem;
      color: var(--text-muted, #64748b);
      font-weight: 500;
    }

    .meta-val {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary, #f8fafc);
      word-break: break-word;
    }

    .link-btn {
      --link-padding: 0;
      --link-font-weight: 600;
      --link-line-height: 1.5;
      --link-gap: 0.35rem;
    }

    .meta-link {
      --control-font-md: 0.95rem;
      --link-width: 100%;
    }

    .mono {
      font-family: var(--font-mono, monospace);
      font-variant-numeric: tabular-nums;
    }

    .notes-text {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.6;
      color: var(--text-primary, #f8fafc);
      white-space: pre-wrap;
    }
  </style>
`;

export const meta: ComponentStoryMeta = {
  title: 'Layout/DetailShell',
  component: 'app-detail-shell',
  description:
    'Shared skeleton of the entity detail views: top navigation bar (back button, entity switcher, action slots), overview card (emblem, title block, KPI strip, context grid) and page shell layout. The view supplies every piece of content through named slots; labels come from the view i18n section, and the shell emits `detail-back` and `entity-switch` so the view decides which entity to open.',
  category: 'Layout',
  propsDoc: {
    backLabel: 'Label of the back button (view i18n)',
    switcherPlaceholder: 'Entity switcher placeholder (view i18n)',
    switcherOptions: 'Options rendered by the entity switcher',
    switcherValue: 'Id of the entity currently displayed',
    entity: 'Emblem kind rendered in the hero identity',
  },
  slotsDoc: {
    '(default)': 'Section cards and panels rendered below the overview card',
    'nav-actions': 'Action buttons on the right of the top navigation bar',
    'hero-meta': 'Content of the hero meta row (emblem pill, date, category, project link)',
    title: 'Content of the title row (heading, status chip, badges)',
    'hero-sub': 'Secondary hero line (vendor and user, description, tags)',
    'hero-side': 'Control placed to the right of the hero identity (status select)',
    kpi: 'KPI cells rendered inside the bordered KPI strip',
    context: 'Meta boxes rendered inside the context grid',
  },
  childrenDoc: {
    'app-button': 'Action button in nav-actions (variant outline / primary / ghost, icon-start slot)',
    'app-link': 'Linked meta value with the link-btn / meta-link token overrides',
    'app-status-chip': 'Domain status chip inside the title row',
    'app-badge': 'Secondary badge inside the title row',
    'app-persona': 'User persona (avatar + presence badge) in the hero sub line',
    'app-section-card': 'Panel below the overview card',
    'app-entity-emblem': 'Emblem pill inside the hero meta row',
  },
  eventsDoc: {
    'detail-back': { detail: '—', description: 'Fires when the back button is pressed' },
    'entity-switch': {
      detail: '{ value: string }',
      description: 'Fires when the entity switcher picks a target',
    },
  },
  stories: [
    {
      name: 'Expense Detail Skeleton',
      description:
        'Full shell: navigation bar with back button, switcher and actions; hero with emblem, meta row, title, sub line and a status control; four KPI cells; context grid with linked meta fields; section card below.',
      render: () => html`
        ${slottedStyles}
        <app-detail-shell
          entity="expense"
          backLabel="К списку расходов"
          switcherPlaceholder="Выбрать расход"
          .switcherOptions="${SAMPLE_EXPENSES}"
          switcherValue="exp-1"
        >
          <app-button slot="nav-actions" size="sm" variant="outline">
            <span slot="icon-start">${iconFileText(14)}</span>
            <span>Открыть задачу</span>
          </app-button>
          <app-button slot="nav-actions" size="sm" variant="secondary">
            <span slot="icon-start">${iconEdit(14)}</span>
            <span>Редактировать</span>
          </app-button>
          <app-button slot="nav-actions" action="delete" size="sm" variant="icon" title="Удалить">
            <span slot="start">${iconTrash(15)}</span>
          </app-button>

          <app-entity-emblem
            slot="hero-meta"
            entity="expense"
            variant="pill"
            size="sm"
          ></app-entity-emblem>
          <span slot="hero-meta" class="mono">2026-11-14</span>
          <span slot="hero-meta" aria-hidden="true">·</span>
          <span slot="hero-meta">ПО и лицензии</span>
          <app-link
            slot="hero-meta"
            class="link-btn"
            size="md"
            variant="primary"
          >
            <span class="mono">PF-1</span>
          </app-link>

          <h1 slot="title" class="demo-title">Лицензия Figma Enterprise</h1>
          <app-status-chip
            slot="title"
            domain="expense"
            status="approved"
            appearance="soft"
            size="md"
          ></app-status-chip>
          <app-badge slot="title" variant="info" appearance="soft" size="sm">
            Подлежит ребиллингу
          </app-badge>

          <div slot="hero-sub" class="demo-sub">
            <span>Figma Inc.</span>
            <span aria-hidden="true">·</span>
            <span class="user-inline">
              <app-persona
                size="24"
                .initials="${'АС'}"
                .presence="${'available'}"
                .ariaLabel="${'Алексей Смирнов'}"
                .interactive="${false}"
              ></app-persona>
              <span>Алексей Смирнов</span>
            </span>
          </div>

          <div slot="kpi" class="kpi-cell">
            <span class="kpi-label">Сумма</span>
            <span class="kpi-val accent">38 000 ₽</span>
            <span class="kpi-hint">RUB · 2026-11-14</span>
          </div>
          <div slot="kpi" class="kpi-cell">
            <span class="kpi-label">Эквивалент в ₽</span>
            <span class="kpi-val success">38 000 ₽</span>
            <span class="kpi-hint">ПО и лицензии</span>
          </div>
          <div slot="kpi" class="kpi-cell">
            <span class="kpi-label">Ребиллинг</span>
            <span class="kpi-val">Да</span>
            <span class="kpi-hint">Включается в смету проекта</span>
          </div>
          <div slot="kpi" class="kpi-cell">
            <span class="kpi-label">Файлы</span>
            <span class="kpi-val">2</span>
            <span class="kpi-hint">Прикреплено документов</span>
          </div>

          <div slot="context" class="meta-box">
            <span class="meta-label">Проект</span>
            <app-link class="link-btn meta-link" size="md" variant="primary">
              <span slot="start" class="mono">[PF-1]</span>
              <span>Платформа ProjectFlow</span>
            </app-link>
          </div>
          <div slot="context" class="meta-box">
            <span class="meta-label">Задача</span>
            <app-link class="link-btn meta-link" size="md" variant="primary">
              <span slot="start" class="mono">task-12</span>
              <span>Внедрение дизайн-системы</span>
            </app-link>
          </div>
          <div slot="context" class="meta-box">
            <span class="meta-label">Подал</span>
            <app-link class="link-btn meta-link" size="md" variant="primary">
              <span>Алексей Смирнов</span>
            </app-link>
            <span class="kpi-hint">Tech Lead</span>
          </div>
          <div slot="context" class="meta-box">
            <span class="meta-label">Создано</span>
            <span class="meta-val mono">14 нояб. 2026, 10:42</span>
          </div>

          <app-section-card title="Обоснование">
            <span slot="icon">${iconFileText(18)}</span>
            <p class="notes-text">
              Продление корпоративной лицензии: 12 мест, скидка 18% при оплате
              за год.
            </p>
          </app-section-card>
        </app-detail-shell>
      `,
    },
    {
      name: 'Minimal Shell',
      description:
        'Shell without the optional hero sub line and hero side control: a single KPI cell and two meta boxes show that empty slots add no layout.',
      render: () => html`
        ${slottedStyles}
        <app-detail-shell
          entity="reminder"
          backLabel="К списку напоминаний"
          switcherPlaceholder="Выбрать напоминание"
          .switcherOptions="${[
            { value: 'rem-1', code: '2026-11-20', label: 'Готовность отчёта' },
            { value: 'rem-2', code: '2026-11-25', label: 'Созвон с заказчиком' },
          ]}"
          switcherValue="rem-1"
        >
          <app-button slot="nav-actions" size="sm" variant="primary">
            <span slot="icon-start">${iconChevronLeft(14)}</span>
            <span>Отметить выполненным</span>
          </app-button>

          <app-entity-emblem
            slot="hero-meta"
            entity="reminder"
            variant="pill"
            size="sm"
          ></app-entity-emblem>
          <span slot="hero-meta" class="mono">2026-11-20 09:00</span>

          <h1 slot="title" class="demo-title">Готовность отчёта</h1>
          <app-status-chip
            slot="title"
            domain="reminder"
            status="pending"
            appearance="soft"
            size="md"
          ></app-status-chip>

          <div slot="kpi" class="kpi-cell">
            <span class="kpi-label">К исполнению</span>
            <span class="kpi-val accent">20 нояб. 2026</span>
            <span class="kpi-hint">через 6 дн.</span>
          </div>

          <div slot="context" class="meta-box">
            <span class="meta-label">Проект</span>
            <span class="meta-val">[PF-2] Миграция ERP</span>
          </div>
          <div slot="context" class="meta-box">
            <span class="meta-label">Повтор</span>
            <span class="meta-val mono">FREQ=WEEKLY;BYDAY=MO</span>
          </div>

          <app-section-card title="Описание">
            <p class="notes-text">Проверить готовность квартального отчёта.</p>
          </app-section-card>
        </app-detail-shell>
      `,
    },
  ],
};

export default meta;

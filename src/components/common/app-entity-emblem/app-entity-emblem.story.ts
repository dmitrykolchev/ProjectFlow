import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-entity-emblem';
import { EntityEmblemKind } from './app-entity-emblem';

const ALL_ENTITIES: EntityEmblemKind[] = [
  'project',
  'task',
  'requirement',
  'company',
  'counterparty',
  'contract',
  'calculation',
  'employee',
];

const meta: ComponentStoryMeta = {
  title: 'Elements/EntityEmblem',
  component: 'app-entity-emblem',
  category: 'Elements',
  description:
    'Графический идентификатор сущности (иконка + семантический цветовой акцент) для заголовков карточек, списков и хлебных крошек.',
  propsDoc: {
    entity: 'Тип сущности: project | task | requirement | company | counterparty | contract | calculation | employee',
    size: 'Размер эмблемы: xs | sm | md | lg',
    variant: 'Режим отображения: emblem (квадрат с иконкой) | pill (пилюля с подписью)',
    color: 'Опциональный CSS-цвет акцента (например, цвет проекта)',
  },
  stories: [
    {
      name: 'Все 8 сущностей (Emblem & Pill)',
      description: 'Уникальные иконки и цветовые коды для всех страниц отдельных сущностей.',
      render: () => html`
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
          ${ALL_ENTITIES.map(
            (entity) => html`
              <div style="display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 1rem; border-radius: 10px; border: 1px solid var(--border-subtle); background: var(--bg-surface);">
                <app-entity-emblem entity="${entity}" size="lg"></app-entity-emblem>
                <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                  <app-entity-emblem entity="${entity}" variant="pill" size="sm"></app-entity-emblem>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">entity="${entity}"</span>
                </div>
              </div>
            `
          )}
        </div>
      `,
    },
    {
      name: 'Размеры (xs / sm / md / lg)',
      description: 'Использование в хлебных крошках (xs), бейджах (sm), модалках (md) и hero-заголовках (lg).',
      render: () => html`
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <app-entity-emblem entity="contract" size="xs"></app-entity-emblem>
          <app-entity-emblem entity="contract" size="sm"></app-entity-emblem>
          <app-entity-emblem entity="contract" size="md"></app-entity-emblem>
          <app-entity-emblem entity="contract" size="lg"></app-entity-emblem>
          <app-entity-emblem entity="project" size="lg" color="#f43f5e"></app-entity-emblem>
        </div>
      `,
    },
  ],
};

export default meta;

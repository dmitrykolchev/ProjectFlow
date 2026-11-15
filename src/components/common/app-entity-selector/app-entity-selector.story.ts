import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-entity-selector';
import { EntitySelectorOption } from './app-entity-selector';

const SAMPLE_EMPLOYEES: EntitySelectorOption[] = [
  {
    value: 'u-1',
    label: 'Алексей Смирнов',
    avatar: 'АС',
    subtitle: 'Tech Lead · Architecture',
    meta: '4 200 ₽/ч',
    badge: 'В штате',
    badgeColor: '#10b981',
    keywords: ['smirnov@projectflow.ru', 'backend', 'go', 'k8s'],
  },
  {
    value: 'u-2',
    label: 'Мария Иванова',
    avatar: 'МИ',
    subtitle: 'Principal Product Designer · Design',
    meta: '3 800 ₽/ч',
    badge: 'Удалённо',
    badgeColor: '#0284c7',
    keywords: ['ivanova@projectflow.ru', 'figma', 'ux', 'design-system'],
  },
  {
    value: 'u-3',
    label: 'Дмитрий Кузнецов',
    avatar: 'ДК',
    subtitle: 'Senior Frontend Engineer · Web Core',
    meta: '3 500 ₽/ч',
    badge: 'В штате',
    badgeColor: '#10b981',
    keywords: ['kuznetsov@projectflow.ru', 'lit', 'typescript', 'd3'],
  },
  {
    value: 'u-4',
    label: 'Елена Соколова',
    avatar: 'ЕС',
    subtitle: 'Lead QA Engineer · Quality',
    meta: '3 100 ₽/ч',
    badge: 'Отпуск',
    badgeColor: '#f59e0b',
    keywords: ['sokolova@projectflow.ru', 'playwright', 'qa'],
  },
];

const SAMPLE_COUNTERPARTIES: EntitySelectorOption[] = [
  {
    value: 'cp-1',
    code: 'ИНН 7702070139',
    label: 'ПАО «Северсталь Цифра»',
    subtitle: 'Заказчик · г. Москва · Контакт: Олег Орлов',
    meta: '★ 4.9',
    badge: 'Активный',
    badgeColor: '#10b981',
    keywords: ['severstal', 'металлургия', 'enterprise'],
  },
  {
    value: 'cp-2',
    code: 'ИНН 7810345210',
    label: 'ООО «БалтЛогистик Групп»',
    subtitle: 'Заказчик · г. Санкт-Петербург · Контакт: Ирина Белова',
    meta: '★ 4.6',
    badge: 'Активный',
    badgeColor: '#10b981',
    keywords: ['logistics', 'erp', 'спб'],
  },
  {
    value: 'cp-3',
    code: 'ИНН 6671098442',
    label: 'АО «УралИнтех Облако»',
    subtitle: 'Поставщик · г. Екатеринбург · Контакт: Денис Фомин',
    meta: '★ 4.2',
    badge: 'На проверке',
    badgeColor: '#f59e0b',
    keywords: ['cloud', 'infrastructure', 'gpu'],
  },
];

function buildLargeTaskDataset(count: number): EntitySelectorOption[] {
  const projects = [
    { key: 'CORE', color: '#6366f1', name: 'Core Platform' },
    { key: 'FIN', color: '#10b981', name: 'Billing & Ledger' },
    { key: 'MOB', color: '#f59e0b', name: 'Mobile App' },
    { key: 'DATA', color: '#06b6d4', name: 'DWH Analytics' },
  ];
  const titles = [
    'Оптимизация SQL-индексов биллинга',
    'Внедрение SSO и RBAC политики',
    'Миграция шлюза платежей на v2 API',
    'Аудит производительности WebSocket-шины',
    'Рефакторинг отчётов калькуляции по этапам',
    'Интеграция ЭДО и подписи актов',
  ];
  const owners = ['Смирнов А.', 'Иванова М.', 'Кузнецов Д.', 'Соколова Е.'];

  const list: EntitySelectorOption[] = [];
  for (let i = 1; i <= count; i++) {
    const p = projects[i % projects.length];
    const t = titles[i % titles.length];
    const o = owners[i % owners.length];
    const hours = 4 + (i % 32);
    list.push({
      value: `${p.key}-${100 + i}`,
      code: `${p.key}-${100 + i}`,
      label: `${t} (#${i})`,
      subtitle: `${p.name} · Исп.: ${o}`,
      meta: `${hours} ч`,
      color: p.color,
      keywords: [p.key, p.name, o, `task-${i}`],
    });
  }
  return list;
}

const LARGE_TASK_LIST = buildLargeTaskDataset(1500);

export const meta: ComponentStoryMeta = {
  title: 'Inputs/EntitySelector',
  component: 'app-entity-selector',
  description:
    'Searchable portal selector for large collections (tasks, employees, counterparties, contracts) with multi-token filtering, match highlighting, secondary metadata, and windowed rendering.',
  category: 'Inputs',
  stories: [
    {
      name: 'Large Task Dataset (1,500 items)',
      description:
        'Instant multi-token search across codes, titles, project names, and assignees with incremental load-more windowing.',
      render: () => html`
        <div style="max-width: 460px;">
          <app-entity-selector
            label="Связанная задача (1 500 записей)"
            value="FIN-105"
            clearable
            .options="${LARGE_TASK_LIST}"
            hint="Попробуйте ввести «FIN биллинг» или номер «1420»"
          ></app-entity-selector>
        </div>
      `,
    },
    {
      name: 'Employees with Avatar & Hourly Rate',
      description: 'Displays employee initials avatar, role/department subtitle, and tabular hourly rate.',
      render: () => html`
        <div style="max-width: 440px;">
          <app-entity-selector
            label="Ответственный сотрудник"
            value="u-1"
            clearable
            .options="${SAMPLE_EMPLOYEES}"
          ></app-entity-selector>
        </div>
      `,
    },
    {
      name: 'Counterparties with Tax ID (INN) & Rating',
      description: 'Searches hidden keywords (INN, city, contact person) alongside company name.',
      render: () => html`
        <div style="max-width: 460px;">
          <app-entity-selector
            label="Контрагент по договору"
            placeholder="Начните вводить название или ИНН..."
            value="cp-1"
            .options="${SAMPLE_COUNTERPARTIES}"
          ></app-entity-selector>
        </div>
      `,
    },
    {
      name: 'Compact Size, Error & Disabled States',
      description: 'Compact toolbar sizing (sm), validation error display, and disabled control.',
      render: () => html`
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
          <app-entity-selector
            label="Компактный (sm)"
            size="sm"
            value="u-2"
            .options="${SAMPLE_EMPLOYEES}"
          ></app-entity-selector>
          <app-entity-selector
            label="Обязательное поле"
            required
            error="Выберите контрагента из справочника"
            .options="${SAMPLE_COUNTERPARTIES}"
          ></app-entity-selector>
          <app-entity-selector
            label="Отключено"
            disabled
            value="u-3"
            .options="${SAMPLE_EMPLOYEES}"
          ></app-entity-selector>
        </div>
      `,
    },
  ],
};

export default meta;

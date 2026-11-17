# ProjectFlow: API-спецификации переиспользуемых компонентов

Приложение к `ComponentReuseRecommendations.md`. Режим: планирование, код не меняется.
Все компоненты — Lit 3 custom elements, Shadow DOM, стили из `.css`-файла (через `vite-plugin-lit-css`), токены из `src/index.css`.

## Общие конвенции (обязательны для всех новых компонентов)

1. **Именование**: тег `app-<kebab>`, класс `App<Pascal>`, файл `src/components/<group>/<tag>/<tag>.ts|.css|.story.ts`.
2. **Свойства**: `@property` с attribute в kebab-case (`full-width` ↔ `fullWidth`); массивы/объекты — `attribute: false` или JSON-attr; логические — `Boolean` + reflect, где нужен CSS-хук.
3. **События**: только `CustomEvent` c `bubbles: true, composed: true`; detail всегда объект: `{ value }`, `{ id }`, `{ rows }`. Имена: `change`, `select`, `pick`, `close`, `confirm`, `cancel`, `remove`, `row-click`.
4. **Слоты**: `default` для контента; именованные `actions`, `icon`, `title`; слот-контент наследует токены темы (light DOM).
5. **Токены**: только `var(--...)` с фолбэком; высота контролов — `--control-height-xs/sm/md/lg`; радиусы `--radius-md/lg`; тени `--shadow-sm/md`; cyberpunk-хуки `--surface-glow`, `--accent-glow` — применять на карточках.
6. **i18n**: компонент получает язык из store (`store.customization.language`) или prop `lang`; строки — только через `getTranslation`. Хардкод строк в template запрещён (исключение: чисто числовые форматы).
7. **Плотность**: компоненты, содержащие таблицы/строки, читают `store.customization.density` и используют `--density-row-height`.
8. **Portal**: любые дропдауны/поповеры — через `portalManager.mountTemplate` (как `app-select`).
9. **Story**: каждый компонент имеет `.story.ts` с минимум: default, все варианты props, disabled/empty/error; регистрация в `app-storybook`.

---

# ПРИОРИТЕТ A — скелет представления

## A1. `app-page-header`

Заменяет: `.view-header/.header-titles/.view-title/.view-subtitle` в 9 view (companies, contracts, counterparties, employees, projects, calculations, payments, expenses, time-tracking) и `.dashboard-header/.header-copy` в dashboard, `.kb-header/.page-header` в knowledge-base/settings.

```ts
@customElement('app-page-header')
export class AppPageHeader extends LitElement {
  @property({ type: String }) title: string = '';
  @property({ type: String }) subtitle: string = '';
}
```

- **Slots**: `icon` (SVG слева, опционально), `actions` (правая зона: кнопки, segmented-switch).
- **CSS**: flex, `gap: var(--density-padding-base)`; title — 1.25rem/700, subtitle — muted 0.8125rem; actions `margin-left:auto`.
- **Пример миграции** (app-companies):
  ```html
  <app-page-header title="${t.companies.title}" subtitle="${t.companies.subtitle}">
    <app-button slot="actions" variant="primary" @click=...>${t.common.create}</app-button>
  </app-page-header>
  ```

## A2. `app-kpi-strip` + расширение `app-metric-card`

Заменяет: `.kpi-grid/.kpi-card/.kpi-label/.kpi-value/.kpi-sub` в 10 view; `.kpi-strip/.kpi-cell` в 5 detail-view (compact-режим).

**Решение:** новый `app-kpi-strip` — только layout-обёртка; карточка — существующий `app-metric-card`, дополненный:

```ts
// добавляется в AppMetricCard
@property({ type: String }) size: 'full' | 'compact' = 'full';
// compact: label 0.75rem, value 1.125rem, без sparkline, delta inline
```

```ts
@customElement('app-kpi-strip')
export class AppKpiStrip extends LitElement {
  @property({ type: Number }) columns: 3 | 4 | 6 = 4;   // attribute="columns"
}
// slot: default — app-metric-card'ы; grid-template-columns: repeat(columns, 1fr);
// responsive: <1024px → 2 колонки, <768px → 1
```

- **Event-карта**: `clickable` + `@click` уже есть у metric-card; strip не трогает события детей.
- **Миграция**: KPI в list-view сегодня — div-разметка с локальными классами; заменяются на `<app-kpi-strip columns="4"><app-metric-card .../></app-kpi-strip>`.

## A3. `app-filter-bar`

Заменяет: `.toolbar/.toolbar-filters/.filter-search/.filter-select` в 11 view (list-view + kanban + knowledge-base).

```ts
export interface FilterDef {
  key: string;                 // 'status' | 'priority' | 'assignee' | 'project' | 'period'...
  label: string;               // i18n-строка
  options: SelectOption[];     // из app-select
  value?: string;
}

@customElement('app-filter-bar')
export class AppFilterBar extends LitElement {
  @property({ type: String }) searchValue: string = '';
  @property({ type: Boolean }) 'search-enabled' searchEnabled: boolean = true;
  @property({ type: Array }) filters: FilterDef[] = [];
  @property({ type: Array }) values: Record<string, string> = {}; // текущие значения
  @property({ type: String }) placeholder: string = '';           // i18n search placeholder
}
```

- **Events**:
  - `search-change` → `detail: { value }`
  - `filter-change` → `detail: { key, value }`
  - `reset` → `detail: {}` (кнопка «Сброс» показывается при любом активном фильтре)
- **Внутри**: `app-input` (clearable, slot icon = `iconSearch(14)`), N × `app-select`, ghost-кнопка сброса.
- **Интеграция со store**: view вызывает `store.setSearchQuery / setFilterStatus / setFilterPriority / setFilterAssignee / resetFilters` из событий; сам компонент про store не знает (чистые props/events).
- **CSS**: `.bar { display:flex; flex-wrap:wrap; gap:.5rem; padding: var(--density-padding-base); background: var(--bg-surface); border:1px solid var(--border-subtle); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }` — один раз вместо 11 копий.

## A4. `app-empty-state`

Заменяет: `.empty-state` в 16 view (x11 идентичных правил).

```ts
@customElement('app-empty-state')
export class AppEmptyState extends LitElement {
  @property({ type: String }) title: string = '';
  @property({ type: String }) message: string = '';
  @property({ type: Boolean, attribute: 'compact' }) compact: boolean = false; // в строке таблицы
}
```

- **Slots**: `icon` (SVG, по умолчанию `iconFolder(48)` muted), `action` (кнопка «Создать»).
- **CSS**: центрирование, `padding: 3rem 1rem`, icon opacity .35, title 1rem/600, message muted 0.8125rem.

## A5. `app-section-card`

Заменяет: `.section-card/.section-header/.section-title/.section-sub/.section-actions` в 7 view; `.panel-card/.panel-header` в dashboard; `.quick-log-card`, `.budget-card`, `.task-group-card` — как варианты.

```ts
@customElement('app-section-card')
export class AppSectionCard extends LitElement {
  @property({ type: String }) title: string = '';
  @property({ type: String }) subtitle: string = '';
  @property({ type: Boolean, attribute: 'collapsible' }) collapsible: boolean = false;
  @property({ type: Boolean, reflect: true }) collapsed: boolean = false;
  @property({ type: Number }) padding: number = 0; // 0 = var(--density-padding-base)
}
```

- **Slots**: `header-left` (иконка/бейдж счётчика), `actions` (право), `default` (body).
- **Events**: `toggle` → `detail: { collapsed }` (только при collapsible).
- **CSS**: surface + border-subtle + radius-lg + shadow-sm; header flex, title 0.9375rem/600, subtitle muted; cyberpunk: `box-shadow: var(--surface-glow)`.

## A6. `app-data-grid` — развитие в единый грид-движок

Уже есть: slot-колонки `data-grid-column` (field/header/width/min-width/sortable/groupable/resizable/reorderable/visible/align/cell-type + `renderer`, `groupFormatter`), виртуализация, мульти-сортировка, группировка чипами, ресайз, пагинация, bulk-select, `row-click`. Мигрируем на него 11 инлайновых `.data-table`.

**Новые cell-type'ы** (реализуются в switch `renderCell`, опираясь на A7/A8/A9):

| cell-type | значение поля | Рендер |
|---|---|---|
| `money` | `{ amount, currency }` или number | `<app-money>`; right-align, tabular-nums |
| `link` | string | `.link-btn` (один CSS вместо 14 копий) |
| `status-pill` | доменный статус + `domain` | `<app-status-chip domain=... status=...>` |
| `progress-inline` | number 0–100 | `<app-progress-bar compact>` + % |
| `actions` | — | слот-рендер: `icon-btn` (edit/delete) → event `row-action` `{ id, action }` |
| `date-range` | `{ start, end }` | `MM-DD → MM-DD`, подсветка overdue danger |
| `avatar` | userId | `<app-avatar initials>` + имя |

**Новые props:**

```ts
@property({ type: Boolean }) grouping = true;   // false — режим «простой таблицы» (финанс)
@property({ type: Number }) 'rows-per-page' rowsPerPage = 15;
@property({ type: Array }) 'row-actions': RowActionDef[] = []; // {id,label,icon,danger}
// существующий event row-click; новый: row-action → detail: { row, action }
```

**Миграция:** contracts/calculations/payments/expenses/time-tracking получают колонки через slots (как grid уже делает для задач); удаляются их локальные `.data-table/.th/.td/.amount-cell/.actions-row` CSS. `app-data-grid` остаётся единственным носителем сортировки/группировки/пагинации.

### A6 — статус: ОТЛОЖЕНО (решение 2026-11-14)

Миграция `.data-table` → `app-data-grid` не выполняется. Причины:
1. Для малых списков (несколько записей) plain-таблица уместнее грида — грид создан для больших/сортируемых/группируемых наборов.
2. Форматирование клеток в гриде ограничено switch'ем `renderCell` + `renderer`; свободная HTML-разметка таблицы (composite-клетки: link+sub, project-pill+task-chip, rating-stars, billable-sub) гибче.

Зафиксированный план (инвентаризация 2026-11-14, готов к исполнению при снятии паузы):

**Инвентарь — 20 таблиц в 11 view** (13 интерактивных + 7 статичных в модалок/секций; локальный CSS ~57 правил):

| View | Таблиц | Колонки | Особенности клеток |
|---|---|---|---|
| app-counterparties | 1 | 8 | link+sub, chip, mono, 2-строчная, рейтинг-звёзды, count+млн, chip, actions |
| app-employees | 1 | 8 | avatar+link+role, текст, 2-строчная, mono, rate, badge, actions |
| app-projects | 1 | 9 | color-dot+key+name, 2-строчная, mono×3 (progress %), short-money, date, chip, actions; row-click |
| app-expenses | 1 | 8 | mono-date, title+vendor, project-pill+task-chip, badge, owner, money+billable-sub, chip, actions |
| app-time-tracking | 1 | 9 | mono-date, task-link+project-sub, avatar+name, badge, desc, hours, badge, chip, actions |
| app-calculations | 1+1 (preview-модалка) | 8+6 | link+micro-tags, link+desc, text-link, period, labor, billable, chip |
| app-payments | 2 | 8+9 | invoice-control (paid/balance, progress) + ledger (money) |
| app-contracts | 4 (tabs) | 8+8+9+8 | contracts, calculations, payments, invoices (payment-progress, total+VAT) |
| app-contract-detail | 4+2 (preview-модалки) | 7×3+6+5+6 | calc/invoice/payment/expenses секции + item-таблицы модалок |
| app-counterparty-detail | 2 | 6+6 | invoices, calculations |
| app-employee-detail | 2 | 6+5 | time-журнал, expenses |

**Шаг 0 — расширение движка (2 коммита):** cell-type'ы `money/link/status-pill/progress-inline/avatar/date-range/actions` (на A7/A8/A9 + event `row-action → { row, action }`, prop `rowActions`); режим «простой таблицы» (`grouping=false`, `pagination=false`, `virtual=false`, `selectable=false`) для модалок и малых списков; композитные клетки — через `renderer` колонки, без новых cell-type'ов. Предварительно C2 `app-rating-stars` (нужен для counterparties).

**Порядок миграции (по коммиту на view):** 1a — counterparties, employees, projects, expenses, time-tracking; 1b — payments, calculations, contracts; 1c — contract-detail, counterparty-detail, employee-detail. Таблицы модалок-превью — тоже на грид в простом режиме, тогда `.data-table` CSS исчезает из всех view.

**Pixel-identical-решения:** при миграции `sortable=false`, пагинация/bulk-select/virtualizация выключены (в оригиналах их нет); включение — отдельный осознанный шаг после миграции.

**Оценка:** +150–200 строк грида, ~1500–2000 строк view'ов заменяются slot-колонками, удаляется ~57 CSS-правил; ~15 коммитов (rating-stars 1 + грид 2 + view'ы 11 + финальный grep/story 1).

## A7. `app-meta-grid`

Заменяет: `.meta-strip/.meta-box/.meta-label/.meta-val` (4 detail-view) и `.meta-grid/.meta-item/.meta-label/.meta-value` (3 list-view) — один компонент в двух режимах.

```ts
export interface MetaItem { label: string; value: string; mono?: boolean; danger?: boolean; }

@customElement('app-meta-grid')
export class AppMetaGrid extends LitElement {
  @property({ type: Array }) items: MetaItem[] = [];
  @property({ type: Number }) columns: 2 | 3 | 4 = 3;
  @property({ type: String }) layout: 'strip' | 'grid' = 'strip'; // strip = 1×N boxes, grid = 2-колонки
}
```

- `mono` → `font-family: var(--font-mono); font-variant-numeric: tabular-nums`.
- `danger` → `color: var(--color-danger)` (срок/просрочка).

## A8. `app-status-chip` + модуль `status-tokens.ts`

Заменяет: `.status-chip/.priority-chip` (grid), `.micro-pill/.micro-tag/.prior/.zero` (contracts, calculations), `.due-tag/.overdue/.paid-ok` (payments), `.status-text` (knowledge-base), `.project-pill/.task-chip-btn` (expenses), `.billable-sub`, kanban `card-tags`.

**Модуль данных** `src/domain/status-tokens.ts`:

```ts
export type StatusDomain = 'task'|'priority'|'project'|'company'|'counterparty'|'contract'
  |'calculation'|'invoice'|'payment'|'expense'|'knowledge'|'timeEntry'|'employee';

export const STATUS_TOKENS: Record<StatusDomain, Record<string, {
  variant: BadgeVariant;          // из app-badge
  i18nKey: string;               // путь в t.status/t.contractStatus...
  color?: string;                // hex для точки
}>;
```

**Компонент** — тонкая обёртка над `app-badge`:

```ts
@customElement('app-status-chip')
export class AppStatusChip extends LitElement {
  @property({ type: String }) domain: StatusDomain = 'task';
  @property({ type: String }) status: string = '';
  @property({ type: Boolean, attribute: 'dot' }) dot: boolean = true;
  @property({ type: String }) size: 'sm' | 'md' = 'sm';
}
// label = getTranslation(store.lang)[domainPath][status] — централизованно
```

- **Выгоды**: 6+ вариаций чипов → один; маппинги статус→цвет, которые сейчас в каждом view (grid: statusColor ternary; contracts: micro-pill classes), — в одном месте; новый статус домена = одна строка в STATUS_TOKENS.

## A9. `app-progress-bar`

Заменяет: `.progress-track/.progress-fill` пары в 5 view; `.inv-pay-bar/.inv-pay-fill` (payments); `.budget-progress-wrap` (expenses); `.billing-strip` (contract-detail) — сегментный режим.

```ts
export interface ProgressSegment { value: number; color: string; label?: string; }

@customElement('app-progress-bar')
export class AppProgressBar extends LitElement {
  @property({ type: Number }) value: number = 0;            // 0–100
  @property({ type: Array }) segments: ProgressSegment[] = []; // mode: сегментный, если непусто
  @property({ type: String }) color: string = 'var(--accent-primary)';
  @property({ type: Boolean, attribute: 'show-label' }) showLabel: boolean = false;
  @property({ type: String }) size: 'sm' | 'md' = 'md';      // sm: 4px, md: 6-8px
}
```

- **CSS**: track `var(--bg-subtle)`, radius 999px; fill transition width var(--transition-normal); cyber-pulse — `animation: var(--cyber-pulse-anim)` при accent.
- `app-project-progress` и grid cell-type `progress-inline` используют его внутри.

## A10. `app-avatar`

Заменяет: `.avatar-circle` (sidebar), `.avatar/.avatar-lg/.avatar-sm` (analytics, employees, employee-detail, time-tracking), `.mini-avatar` (grid), `.person-box`, `.member-cell` аватары.

```ts
@customElement('app-avatar')
export class AppAvatar extends LitElement {
  @property({ type: String }) initials: string = '';
  @property({ type: String }) src: string = '';            // url, приоритет над initials
  @property({ type: String }) size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @property({ type: String }) color: string = '';          // фон; по умолчанию --accent-soft
  @property({ type: String }) status: string = '';         // ring: active/remote/vacation/onboarding
}
// xs=20px, sm=26, md=34, lg=56, xl=72; initials из user.avatar уже есть в mock/store
```

- **Event**: не нужен; кликабельность обеспечивает родитель.
- `app-avatar-group` (stacked overlap, +N) — опционально для project-detail team-summary.

## A11. `app-money`

Заменяет: 8+ копий `formatMoney()` (contracts L146, calculations, payments, expenses, contract-detail…) и классы `.amount-cell/.mono/.bill/.paid-val/.calc-val`.

```ts
@customElement('app-money')
export class AppMoney extends LitElement {
  @property({ type: Number }) amount: number = 0;
  @property({ type: String }) currency: 'RUB' | 'USD' | 'EUR' = 'RUB';
  @property({ type: String }) format: 'full' | 'short' | 'signed' = 'full'; // short: 1.2M ₽
  @property({ type: Boolean, attribute: 'zero-muted' }) zeroMuted: boolean = true;
}
// Intl.NumberFormat('ru-RU'); символы ₽/$/€; tabular-nums; right-align
```

- Чистая функция-хелпер `formatMoney()` в `src/domain/format.ts` — для мест вне DOM (KPI-значения), компонент использует её.

## A12. `app-icon-button` — конвенция, не новый тег

Заменяет: `.icon-btn` x14, `.icon-action-btn` (header), `.bar-link-btn`, `.add-task-quick-btn`.
**Правило**: `<app-button variant="ghost" size="sm" icon-only>` + slot icon. Добавить в `app-button.css` хук `.icon-only` с квадратной пропорцией (уже есть). Все новые компоненты используют только app-button.

---

# ПРИОРИТЕТ B — скелет detail-страниц

## B1. `app-detail-page`

Заменяет: `.page-shell` в 5 detail-view.

```ts
@customElement('app-detail-page')
export class AppDetailPage extends LitElement {
  // без props; чистый layout
}
// Slots: nav (top-nav-bar), hero, meta (meta-strip), default (main content), side (правая колонка)
// CSS: grid: "nav nav" / "hero hero" / "meta meta" / "main side", min-height 100%
```

## B2. `app-entity-switcher`

Заменяет: `.top-nav-bar/.nav-left/*-switcher` (task/employee/cp/contract/project switchers) — prev/next + список.

```ts
export interface SwitcherItem { id: string; label: string; sub?: string; }

@customElement('app-entity-switcher')
export class AppEntitySwitcher extends LitElement {
  @property({ type: Array }) items: SwitcherItem[] = [];
  @property({ type: String }) currentId: string = '';
  @property({ type: Boolean, attribute: 'show-list' }) showList: boolean = true; // dropdown-список через portal
}
// Events: prev → {id}, next → {id}, pick → {id}
// Slots: actions (право: edit/delete/create)
```

## B3. `app-entity-hero`

Заменяет: `.hero-top/.title-block/.title-row` в 4–5 detail-view + `.card-top` list-карточек.

```ts
@customElement('app-entity-hero')
export class AppEntityHero extends LitElement {
  @property({ type: String }) key: string = '';       // «P-12», «Договор №...»
  @property({ type: String }) title: string = '';
  @property({ type: String }) subtitle: string = '';  // legal name / role
  @property({ type: String }) accentColor: string = ''; // color-dot проекта
}
// Slots: avatar|emblem (app-avatar), badges (app-status-chip[]), actions, notes
```

## B4. `app-timeline`

Заменяет: `.timeline-list/.tl-node` (task-detail) — переиспользуется в employee-detail activity, project-detail, knowledge-base revisions.

```ts
export interface TimelineItem {
  kind: 'time' | 'expense' | 'discussion' | 'audit' | 'status';
  title: string; meta?: string; details?: string; date?: string; color?: string;
}

@customElement('app-timeline')
export class AppTimeline extends LitElement {
  @property({ type: Array }) items: TimelineItem[] = [];
  @property({ type: Boolean, attribute: 'show-date' }) showDate: boolean = true;
}
// event item-click → detail: { item }
// CSS: вертикальная линия + узел-иконка по kind (iconClock/iconWallet/iconMessageSquare...)
```

## B5. `app-list-row`

Заменяет: `.rows-list/.list-row/.row-main/.row-title/.row-key/.row-sub/.row-right/.color-dot` (counterparty-detail, employee-detail, knowledge-base index).

```ts
export interface ListRowDef { key: string; title: string; sub?: string; color?: string; right?: string; }

@customElement('app-list-row')   // отдельная строка; контейнер app-list (slot) — опционально
export class AppListRow extends LitElement {
  @property({ type: Object }) row: ListRowDef;
  @property({ type: Boolean, attribute: 'clickable' }) clickable: boolean = false;
}
// event click → detail: { key }
// slot right — бейдж/кнопка
```

---

# ПРИОРИТЕТ C/D — компактные спецификации

## C1. `app-tag-chip`
`@property removable (Boolean, reflect)`; slot default; event `remove` → `{ text }`. CSS = `.tag-item` grid + kanban `tag-badge` (один soft-стиль). Используется в grid(tags), kanban, task-modal, knowledge-base.

## C2. `app-rating-stars`
Props: `value: number` (0–5), `max=5`, `interactive=false`; event `rate → {value}`. Заменяет `.rating-stars` (counterparties, counterparty-detail).

## C3. `app-entity-card`
Props: `clickable`; slots: `identity` (icon/emblem + name + legal), `meta` (app-meta-grid), `stats` (stats-row), `actions`. Заменяет company-card/cp-card/employee-card/project-card (4 view). Событие `activate → {}` при клике на identity.

## C4. `app-confirm-dialog`
Props: `open`, `title`, `message`, `danger=true`; events `confirm`, `cancel`. Внутри `app-modal size="sm"` + app-button'ы. Заменяет 9+ инлайновых модалок подтверждения удаления.

## C5. `app-form-grid`
Props: `columns=2`; slot default с `col-span` attr у детей. Заменяет `.form-grid/.col-span-2` в 9+ модалок создания/редактирования.

## C6. `app-chat-message` (project-chat)
Props: `senderName`, `senderId`, `text`, `date`, `pinned`, `reactions: {emoji,count}[]`, `mine: boolean`; slots: `reply-to`, `task-ref`; events `react → {emoji}`, `reply → {}`. Заменяет message-bubble CSS; channel-item — `app-list-row` variant.

## C7. `app-pagination`
Props: `page`, `totalPages`, `rowsPerPage`, `total`; event `change → { page, rowsPerPage }`. Заменяет `.pagination-controls/.page-info/.rows-select` grid-footer — используется гридом и будущими таблицами.

---

# ПРИОРИТЕТ E — унификация размеров контролов (план, решение 2026-11-16)

Каноническая шкала размеров контролов **xs | sm | md | lg** (решено пользователем; `xs` добавлен
2026-11-17 как плотный шаг для строк таблиц и компактных тулбаров). Ничего не реализуется
до явного старта; фиксация контракта обязательна перед миграциями.

## E0. Канонические токены (задаются один раз на `:root` через store тем)

| токен | xs | sm | md | lg |
|---|---|---|---|---|
| `--control-height-{xs,s,m,l}` | 24px | 30px | 38px | 44px |
| `--control-font-{xs,s,m,l}` | 0.75rem (10.5px) | 0.8125rem (13px) | 0.875rem (14px) | 1rem (16px) |
| `--control-padding-x-{xs,s,m,l}` | 0.45rem | 0.65rem | 0.875rem | 1.15rem |
| `--control-icon-{xs,s,m,l}` (из иконочной шкалы xxs..xxl) | 14px (xxs) | 16px (sm) | 20px (md) | 24px (lg) |

Значения sm/md/lg = текущие фолбэки `app-button`/`app-toggle-button`, поэтому md-визуал всех контролов
остаётся пиксель в пиксель; `xs` — новый шаг, существующие контролы его не используют.
Иконочная шкала (коммиты `cbc30c1`, `56028f7`) уже стыкуется:
иконка sm=16px в 30px-контроле, md=20px в 38px, lg=24px в 44px; слот-правила контролов задают
`--mi-icon` = `--control-icon-*`.

Дополнительные хуки `app-button` (добавлены 2026-11-17, дефолты = прежнее поведение, все
существующие consumers пиксель в пиксель):
- `--control-padding-y-{xs,s,m,l}` — вертикальный padding size-правила, default `0`;
- `--btn-border-width` — ширина рамки базового button, default `1px`;
- `--btn-radius-{tl,tr,bl,br}` — угловые радиусы, default `--radius-md`;
- `--icon-btn-{bg,color,border}` и `--icon-btn-hover-{bg,color,border}` — base/hover вида `icon`;
- `--btn-min-width`, `--btn-font-weight`, `--icon-btn-font`, `--btn-disabled-opacity`,
  `--btn-disabled-color` (disabled glyph вида `icon`, default = базовый цвет иконки);
- `--btn-gap` — gap flex-контейнера контрола, default `0.5rem`;
- `--btn-line-height` — line-height контрола, default `normal`; slotted-children наследуют
  значение от inner-button (через slot), поэтому чипам с `font: inherit` нужен unitless
  коэффициент оригинала (например `1.5`) для паритета высот текстовых span.

Дополнительные хуки `app-link` (добавлены 2026-11-17, дефолты = прежнее поведение, story
consumers пиксель в пиксель: fw 500, lh 1.25, padding 0.15rem/0.25rem, sans, numeric normal):
- `--link-padding` — padding inner контрола, default `0.15rem 0.25rem`;
- `--link-font-weight` — вес шрифта, default `500`;
- `--link-line-height` — line-height, default `1.25` (unitless);
- `--link-font` — font-family, default `var(--font-sans, inherit)`;
- `--link-numeric` — font-variant-numeric, default `normal`.
Font-size регулируется существующим `--control-font-{size}` size-правила.

Рецепт font-parity для текстовых ghost-чипов (зафиксирован 2026-11-17, новых хуков не требует):
нативный `button` наследует UA-шрифт и считает текстовый блок по `line-height: normal`, поэтому
миграция чипа даёт точный пиксель-паритет при наборе токенов на host-элементе:
`--control-height-{size}: auto`, `--control-padding-y-{size}` и `--control-padding-x-{size}` =
исходный padding, `--control-font-{size}` = исходный font-size, `--btn-font-weight` = исходный
вес (обычно 400), `--icon-btn-font` = шрифт, который наследовал нативный button (в shadow DOM без
явного `font-family` это UA-шрифт, замерен как `Arial`), плюс `--btn-border-width`,
base/hover-токены и радиусные пины из исходного правила.
Проверено двумя контекстами: quick-term чип 92x19 (baseline 92x19) и activity-panel чип 103x19
(baseline 103x19), все computed-метрики идентичны.

## E1. Матрица компонентов и миграции

| компонент | сейчас | цель |
|---|---|---|
| `app-button`, `app-toggle-button`, `app-split-button`, `app-dropdown-button` | sm/md/lg по токенам (эталон) | референс, не мигрируется |
| `app-input`, `app-select`, `app-combobox`, `app-date-input` | size-пропа нет, фиксированный md=38px | добавить `size: 'sm'|'md'|'lg'`, default `md` — пиксельная паритетность; токены E0 |
| `app-number-input` | sm/md | дополнить lg; токены E0 |
| `app-segmented-switch` | sm/md | дополнить lg; токены E0 |
| `app-entity-selector` | sm/md/lg, свои font/padding | перевести font/padding на токены E0 |
| `app-status-chip` | sm/md | sm|md|lg по токенам (font/padding/height) |
| `app-badge` | sm/md | sm|md|lg по токенам |
| `app-pagination` | локальный override `--control-height-md: 32px` (bare-режим) | **compact-вариант**: обычные кнопки — канонический md=38; компактный режим (bare/table) — явный compact с локальным токеном, не перебивающим канон |

Не унифицируются (media scale, отдельная шкала): `app-avatar` (xs..xl), `app-entity-emblem` (xs..lg),
`app-modal` (size = ширина), `app-progress-bar` (толщина). Зафиксировать как «media scale» в API-спеках.

## E2. Порядок внедрения (каждый шаг — отдельный коммит)

1. Токены E0 на `:root` (store тем) — визуально ничего не меняет (значения = фолбэки).
2. Size-prop + токены: `app-input` → `app-select` → `app-combobox` → `app-date-input` (default md, паритет).
3. Дополнение lg: `app-number-input`, `app-segmented-switch`.
4. `app-status-chip`, `app-badge` — полная sm|md|lg.
5. `app-entity-selector` — font/padding на токены.
6. `app-pagination` — compact-вариант.
7. Слот-правила иконок: в каждом контроле `--mi-icon` = `--control-icon-*` (svg-иконки слота получают тот же размер).

Проверка каждого коммита: `npx tsc --noEmit`, `npm run build`, браузерный пиксельный контроль md
против эталона (main), smoke story'ков затронутых компонентов. Storybook stories дополняются
демо sm/md/lg для каждого мигрированного компонента.

---

# Архитектурные сопровождающие (фазы 3–4)

## StoreMixin/ReactiveController

```ts
// src/controllers/store-controller.ts
export function storeController(host: ReactiveElement): void {
  const onStore = () => host.requestUpdate();
  host.addController({
    hostConnected() { this unsub = store.subscribe(onStore); },
    hostDisconnected() { this.unsub?.(); },
  });
}
// Применение: components читают store напрямую в render (store — источник истины)
```

Убирает `connectedCallback/disconnectedCallback/unsubscribe/syncState` из ~12 компонентов.

## Фабрика CRUD (`src/state/create-entity-slice.ts`)

```ts
export function createEntitySlice<T extends { id: string }>(
  key: string, seed: T[], log: (a: ActivityLogItem) => void, notify: AppStore['notify']
): { items: T[]; add(data: Omit<T,'id'>): T; update(item: T): void; remove(id: string): void; }
```

Покрывает 14 доменов (tasks, projects, companies, employees, counterparties, contracts, calculations, invoices, payments, timeEntries, expenses, chat, knowledge) — снимает ~2000 строк store.ts.

## Итог по событийной конвенции

| Событие | detail | Носители |
|---|---|---|
| `change` | `{ value }` / `{ key, value }` | filter-bar, form controls |
| `select` | `{ id }` | switcher, menu, list-row |
| `row-click` | `{ row }` | data-grid, entity-card |
| `row-action` | `{ row, action }` | data-grid |
| `confirm/cancel` | `{}` | confirm-dialog |
| `remove` | `{ text }` | tag-chip |
| `prev/next/pick` | `{ id }` | entity-switcher |
| `react/reply` | `{ emoji }` / `{}` | chat-message |

Существующие `sidebar-select`, `sidebar-group-toggle`, `project-change`, `column-change`, `primary-click` — сохраняем как есть (API стабилен), новые — по таблице.

## Порядок внедрения (уточнённый)

1. A4 empty-state, A12 icon-button конвенция, A1 page-header — точечные миграции, риск минимальный.
2. A2 kpi-strip + metric-card compact; A5 section-card; A7 meta-grid; A9 progress-bar; A10 avatar; A11 money.
3. A3 filter-bar (нужен контракт FilterDef) → list-view.
4. A8 status-tokens + app-status-chip → все чипы.
5. A6 новые cell-type'ы грида → миграция финансовых таблиц (крупнейший кусок). **Отложено** — см. статус A6.
6. B1–B5 → detail-view; C1–C7 по мере необходимости.
7. StoreMixin, фабрика CRUD, регрессия через app-storybook + smoke-тесты.

Каждая миграция — отдельный коммит на один view, с проверкой story того view.

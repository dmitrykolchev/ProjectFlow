# ProjectFlow: общий анализ проекта и рекомендации по выделению переиспользуемых веб-компонентов

Дата: 14.11.2026. Режим: **только чтение и планирование, код не изменяется.**

**Статус на 21.11.2026:** рекомендации реализованы (выделенные компоненты живут в
`src/components`, 139 компонентов со story). Канонические конвенции — `AGENTS.md`
(§2–§6), живой API — `docs/WebComponentsReference.md` (генерируется из исходников
командой `npm run docs:components`). Документ сохранён как история анализа;
при расхождении с кодом — истина в reference и исходниках.

---

## 1. Общее впечатление

**ProjectFlow** — одностраничное enterprise-приложение управления проектами (Kanban, Gantt, Data Grid, Calendar, аналитика, финансовый контур: компании, сотрудники, контрагенты, договоры, расчёты, счета, платежи, расходы, time-tracking, чат, база знаний) на **Lit 3 (Web Components) + TypeScript + Vite + чистый CSS**. Проект собирается в solution `ProjectFlow.slnx` через `frontend.esproj`.

### Сильные стороны

1. **Единая дизайн-система токенов.** `src/index.css` — полноценный слой токенов: 3 темы (dark/light/cyberpunk), 4 фоновых пресета для каждой, 5 акцентов, режимы плотности (comfortable/compact), тени, радиусы, шрифты, скроллбары. Всё потребляется через `var(--...)` с фолбэками. Компоненты в Shadow DOM получают токены из light DOM — это работает корректно.
2. **Плагин `vite-plugin-lit-css`** — CSS-файлы компонентов инжектируются в shadow root и автоматически дополняются общими правилами (скроллбары, cyberpunk-keyframes). Хороший паттерн для чистого CSS без Tailwind.
3. **Ленивая загрузка представлений.** `app-root.ts` — `VIEW_LOADERS` с dynamic `import()` по каждому view + spinner-заглушка. Code-splitting работает (видно по chunkам в `dist/assets`).
4. **Portal-менеджер** (`app-modal-portal`) — продуманный: z-index-слои, Escape, блокировка скателла, `mountTemplate`/`mountElement`, adoptedStyleSheets. Все всплывающие компоненты (select, combobox, dropdown, split, modal, activity panel) уже используют его.
5. **Готовая библиотека UI** (`components/common`) из 22 компонентов с централизованным `index.ts` и реестром `UI_LIBRARY_ELEMENTS`, плюс **встроенный сторибук** (`app-storybook` + `.story.ts` у каждого компонента) — отличная база для каталога.
6. **Store-синглтон** (`state/store.ts`) с подпиской, localStorage-персистенцией по каждой сущности, activity log, CRUD по всем доменам, темой/языком/плотностью. Типы (`types/index.ts`) полные и строгие.
7. **i18n ru/en** — покрывает навигацию, статусы, grid, dashboard; все view читают язык из store.

### Зоны роста (главный вывод анализа)

1. **Массовое копирование CSS-фрагментов между представлениями.** Один и тот же паттерн (page-header, KPI-карточки, toolbar с фильтрами, таблицы, empty-state, icon-btn) реализован инлайн в 9–16 view. Буквально идентичные CSS-правила повторяются x9–x16 раз (см. §3).
2. **Библиотека компонентов используется лишь частично.** View'ы активно применяют `app-button`, `app-badge`, `app-modal`, формы (`app-input/select/textarea/date/number/checkbox/switch/segmented`). Но `app-radio-group`, `app-menu`, `app-dropdown-button`, `app-button-group`, `app-combobox` почти не используются в view; dashboard-карточки (`app-metric-card`, `app-chart-card`) — только в dashboard, хотя KPI-карточки есть в 10 view.
3. **Нет базового класса/миксина.** Boilerplate `connectedCallback → store.subscribe → syncState → disconnectedCallback` повторяется в 10+ компонентах.
4. **Консистентность API:** события именованы по-разному (`sidebar-select`, `project-change`, `primary-click`, `change`, `select`, `remove`); часть строк хардкодится на русском (например, в `app-combobox`: `+ Добавить "..."`), часть view'ов содержит инлайновые русские строки.
5. **Store — монолит 83 КБ** с почти идентичными CRUD-функциями по сущностям (add/update/delete + save + log). Логично разбить на доменные срезы/фабрику CRUD.

---

## 2. Инвентарь существующей компонентной базы

### `components/common` (22)
| Компонент | Тег | API (кратко) |
|---|---|---|
| AppButton | `app-button` | variant(primary/secondary/danger/ghost/outline), size(sm/md/lg), disabled, loading, icon-only; slots icon-start/default/icon-end |
| AppBadge | `app-badge` | variant(neutral/primary/success/warning/danger/info), appearance(soft/solid/outline), size, dot, removable → event `remove` |
| AppModal | `app-modal` | open, title, size(sm–xl); slots default/footer; portal-менеджмент, event `close` |
| AppModalPortal | `app-modal-portal` | `portalManager.mountTemplate/mountElement`, PortalHandle — слой popup/modal, z-index, Escape, scroll-lock |
| AppInput / AppTextarea / AppNumberInput / AppDateInput | формы | label, value, error, helper, required, clearable; события `input`/`change` |
| AppSelect | `app-select` | label, value, options{value,label,color,icon}; portal-дропдаун с auto-flip |
| AppCombobox | `app-combobox` | items, selected[], allowCustom — теги + подсказки (используется только в task-modal) |
| AppCheckbox / AppSwitch / AppRadioGroup | `app-checkbox`(indeterminate), `app-switch`, `app-radio-group`(variant card) |
| AppSegmentedSwitch | `app-segmented-switch` | options, value, size, full-width — используется в 14 view ✅ |
| AppMenu | `app-menu` | MenuItem{id,label,icon,shortcut,danger,divider,header,checked} → `select` |
| AppDropdownButton / AppSplitButton / AppButtonGroup | обёртки над app-button+app-menu с portal-позиционированием |
| AppToggleButton | `app-toggle-button` | pressed, variant soft/solid — используется в data-grid |
| AppToast | `app-toast` | читает `store.notifications` (монтируется в app-root) |
| AppActivityPanel | `app-activity-panel` | drawer через portal, читает store |
| AppTaskModal | `app-task-modal` | глобальная модалка создания/редактирования задачи (store.openCreateTaskModal/openEditTaskModal), включает quick time/expense, subtasks drag&drop |
| icons.ts | — | фабрики SVG-иконок `icon*(size)` |

### `components/layout` (4)
`app-sidebar` (collapsed, activeValue, group-mode single/multiple, standalone; project-selector; theme/lang quick-switch), `app-sidebar-group` (accordion), `app-sidebar-item` (value/label/badge/icon), `app-header` (breadcrumbs, global search, theme, activity, create).

### `components/dashboard` (4)
`app-metric-card` (label/value/delta/trend/sparkline SVG/accentColor/clickable), `app-chart-card` (bar/donut/line, SVG, legend), `app-project-progress` (список проектов с прогресс-барами), `app-project-overview` (единственный d3-компонент: timeline/Gantt-lite проекта).

**Вывод:** инфраструктура (токены, portal, forms, modal, storybook) уже отличная. Дефицит — **композитные паттерны уровня «представление»**, которые сейчас копируются.

---

## 3. Доказательная база дублирования

Подсчёты по `.css`-файлам `src/components/views/` (класс → число view, где определён):

| Паттерн (CSS-классы) | View'ов | Примеры файлов |
|---|---|---|
| `view-header`, `header-titles`, `view-title`, `view-subtitle` | 9 | companies, contracts, counterparties, employees, projects, calculations, payments, expenses, time-tracking |
| `kpi-grid`, `kpi-card`, `kpi-label`, `kpi-value`, `kpi-sub` | 10–14 | все выше + analytics, knowledge-base, task-detail |
| `toolbar`, `toolbar-filters`, `filter-search`, `filter-select` | 11 | все list-view + kanban, gantt |
| `table-card`, `data-table` (+ `amount-cell`, `link-btn`, `actions-row`, `icon-btn`) | 11 | contracts, calculations, payments, expenses, time-tracking, employees, counterparties, все detail-view |
| `empty-state` | 16 | практически все view (x11 идентичных правил) |
| `icon-btn` | 15 | x14 идентичных правил |
| `section-card`, `section-header`, `section-title`, `section-actions` | 7 | analytics, settings, все detail-view |
| `page-shell`, `top-nav-bar` (prev/next entity switcher), `hero-top`, `title-block`, `title-row`, `meta-strip`, `meta-box` | 5 | employee-detail, counterparty-detail, contract-detail, project-detail, task-detail |
| `progress-track`, `progress-fill` | 5 | data-grid, projects, project-detail, task-detail, contract-detail (+ app-project-progress) |
| `cards-grid` + entity-card (company-card/cp-card/employee-card/project-card) | 4 | companies, counterparties, employees, projects |
| `meta-grid`, `meta-item`, `meta-label`, `meta-value` | 2–3 | companies, counterparties, projects |
| `status-chip/priority-chip/tag-item` (data-grid), `micro-pill/micro-tag` (contracts/calculations), `card-tags/tag-badge` (kanban), `project-pill/task-chip-btn` (expenses), `status-text` (knowledge-base) | 6+ | все — вариации одного «чипа» |
| `avatar`, `avatar-lg`, `avatar-sm`, `mini-avatar`, `avatar-circle` (sidebar) | 5 | analytics, employees, project-detail, data-grid, time-tracking, sidebar |
| `form-grid`, `col-span-2`, `confirm-text` (модалки создания/редактирования и подтверждения удаления) | 9+ | все list-view |
| `rating-stars` | 2 | counterparties, counterparty-detail |

**Итого:** ~120–150 КБ CSS в view'ах — это повторения 15–20 базовых паттернов. Каждый новый view сегодня копирует «page-header + KPI + toolbar + таблица/карточки + empty-state + модалку формы».

---

## 4. Рекомендуемые новые веб-компоненты (по приоритету)

### Приоритет A — «скелет представления» (максимальный эффект, 9–16 view)

1. **`app-page-header`**
   - Props: `title`, `subtitle`; slot `actions` (кнопки), slot `icon`.
   - Заменяет `.view-header/.header-titles/.view-title/.view-subtitle` в 9 view.
   - CSS: один раз, с cyberpunk-хуками (`--surface-glow`).

2. **`app-kpi-strip` + `app-kpi-card`** (или расширение существующего `app-metric-card`)
   - Props strip: `columns` (3/4/6); card: `label`, `value`, `sub`, `delta`, `trend`, `accentColor`, `clickable`.
   - **Рекомендация:** не плодить новый компонент, а расширить `app-metric-card` (у него уже есть delta/trend/sparkline) и заменить им инлайновые `.kpi-card` во всех 10 view. Это убивает дублирование и унифицирует визуал KPI в dashboard и list-view.
   - Для компактных KPI-«полосок» detail-view (`kpi-strip/kpi-cell`) — добавить в `app-metric-card` режим `size="compact"`.

3. **`app-filter-bar`**
   - Props: `searchValue`, `filters: {key,label,options}[]`; события `change` (detail: `{query, filters}`).
   - Внутри: `app-input`(clearable, slot icon search) + N `app-select`.
   - Заменяет `.toolbar/.toolbar-filters/.filter-search/.filter-select` в 11 view.

4. **`app-empty-state`**
   - Props: `title`, `message`, `icon?`; slot `action`.
   - 16 view, идентичные правила x11.

5. **`app-section-card`**
   - Props: `title`, `subtitle?`; slots: `actions`, default; опционально `collapsible`.
   - Заменяет `.section-card/.section-header/.section-title` в 7 view и `.panel-card/.panel-header` в dashboard.

6. **`app-data-table`** — самый крупный компонент.
   - Уже есть `data-grid-column` (slot-дефиниции колонок: field/header/width/sortable/groupable/cell-type/renderer) и зрелый `app-data-grid` (сортировка, группировка, ресайз, пагинация, bulk).
   - **Рекомендация:** развивать `app-data-grid` как единый грид-движок: добавить режим «простой таблицы» (без группировки) и cell-type'ы для финансового контура (`money`, `link`, `status-pill`, `progress-inline`, `actions`). Все 11 инлайновых `.data-table` (contracts, calculations, payments, expenses, time-tracking…) мигрировать на него. Это снимет ~110 КБ дублей и даст единое поведение (сортировка, ресайз, пустое состояние, «столбцы» через slots).
- **Решение (2026-11-14): миграция ОТЛОЖЕНА.** Таблицы уместнее грида при малом числе записей; форматирование клеток в гриде ограничено (`renderCell` switch + `renderer`), свободная табличная разметка гибче (composite-клетки: link+sub, project-pill+task-chip, rating-stars, billable-sub). Зафиксированный план миграции (инвентарь 20 таблиц, Шаг 0 расширения движка, порядок view'ов, pixel-identical-условия) — в `ComponentApiSpecs.md`, раздел A6. Инлайновые `.data-table` остаются; критерий пересмотра: список интерактивный (сортировка/фильтрация/пагинация) или >15 записей.

### Приоритет B — паттерны детальных страниц (5 detail-view)

7. **`app-detail-page`** (контейнер-скелет)
   - Slots: `hero`, `meta`, `content`; Props: none. CSS: `page-shell` + двухколоночная сетка.
8. **`app-entity-switcher` / `app-detail-nav-bar`**
   - Props: `items: {id,label}[]`, `currentId`; события `prev/next/pick`; slot `actions`.
   - Заменяет `.top-nav-bar + nav-left + *-switcher` во всех 5 detail-view.
9. **`app-entity-hero`**
   - Props: `key`, `title`, `subtitle`, `status`(slot badge), `avatar|emblem|color-dot`; slot `actions`.
   - Заменяет `.hero-top/.title-block/.title-row` в 4–5 detail-view и `.card-top` в list-карточках.
10. **`app-meta-grid`**
    - Props: `items: {label,value,mono?}[]`; slot item. Заменяет `.meta-strip/.meta-box` (4 detail) и `.meta-grid/.meta-item` (3 list).

### Приоритет C — атомарные чипы/индикаторы (мелкие, но повсеместные)

11. **`app-avatar`**
    - Props: `initials|src`, `size(sm/md/lg)`, `color`; tooltip со слабом. Заменяет 5 реализаций (`avatar-circle` в sidebar, `mini-avatar` в grid, `avatar-lg` в employee-detail…).
12. **`app-progress-bar`**
    - Props: `value`, `color`, `label?`, `segments?` (для contract-detail: invoiced/paid — двухсегментный бар). Заменяет 5 пар track/fill; `app-project-progress` использует его внутри.
13. **`app-status-chip`** (или расширить `app-badge`)
    - Маппинг доменных статусов (TaskStatus, ContractStatus, InvoiceStatus, CalculationStatus, ExpenseStatus, KnowledgeArticleStatus…) → variant+label через i18n.
    - Единый компонент вместо status-chip/priority-chip/micro-pill/micro-pill/due-tag/status-text/`tag-item`.
    - **Ключевое:** сейчас маппинги статус→цвет записаны в каждом view отдельно; вынести их в один модуль `status-tokens.ts` (данные), а визуал — `app-badge` уже умеет.
14. **`app-tag-chip`** — removable tag (slot remove) — для grid, kanban, task-modal, knowledge-base.
15. **`app-money`** — форматирование сумм + валюта (RUB/USD/EUR), tabular-nums, знак billable; заменяет `.amount-cell/.mono/.bill/.paid-val` в 4+ view.
16. **`app-rating-stars`** — 2 view (counterparties).
17. **`app-icon-button`** — унифицировать с `app-button variant="ghost" icon-only` (не новый компонент, а конвенция: все `.icon-btn/.icon-action-btn` → app-button).

### Приоритет D — композиты среднего эффекта

18. **`app-entity-card`** — карточка из `cards-grid` (company/cp/employee/project): slot `identity`(icon+name+legal), slot `meta`, slot `stats`, slot `actions`, `clickable`. 4 view.
19. **`app-confirm-dialog`** — подтверждение удаления (`confirm-text` в 9+ view) поверх `app-modal`: props `title`, `message`, `danger`; события `confirm/cancel`.
20. **`app-form-grid`** — 2-колоночная сетка полей модалок (`form-grid/col-span-2`).
21. **`app-timeline`** — лента `.tl-node` из task-detail (kind: time/expense/discussion/audit) → переиспользуется в employee-detail (activityTab), project-detail, knowledge-base revisions.
22. **`app-list-row`** — `.rows-list/.list-row/.row-main/.row-title/.row-key/.row-sub/.color-dot` (counterparty-detail, employee-detail, knowledge-base index).
23. **`app-chat-message`** + `app-channel-item` — из project-chat (реакции, replies, pinned) — пригодится для будущего глобального чата/уведомлений.

---

## 5. Архитектурные рекомендации (не новые компоненты)

1. **`StoreMixin` / ReactiveController** (`lit/reactive-controller`): убрать boilerplate подписки из всех компонентов; контроллер `storeController(this)` + `@state() s = store.snapshot()`.
2. **Фабрика CRUD в store**: `createEntitySlice<T>('tasks', STORAGE_KEY_TASKS, logAction)` — один паттерн вместо 14 копий add/update/delete/save. Store разбить на доменные файлы (`tasks.ts`, `finance.ts`, `directory.ts`…), оставив тонкий фасад `store`.
3. **Маппинги статусов/приоритетов в один модуль** (`src/domain/status-tokens.ts`): статус → {badge-variant, i18n-key, color}. Сейчас они живут в каждом view.
4. **Конвенция событий**: единый стиль — глагол/событие в kebab-case и detail `{ value }`: `change`, `select`, `close`, `remove`, `pick`, `confirm`. Зафиксировать в документе-конвенции; существующие (`sidebar-select`, `project-change`) допустимы как «объект-события».
5. **i18n hygiene**: все строки через `getTranslation` (найти хардкод RU: app-combobox placeholder, dashboard velocity labels, sidebar «Переключить тему» и т.п.); добавить ключи `common.loading`, валюты, форматирование дат через `Intl` с локалью из store.
6. **Общие shadow-стили**: вынести в `lit-css-plugin` базовый reset (`:host{display:block}`, focus-visible ring, `.tabular-nums`) — сейчас каждый CSS повторяет transition/radius.
7. **Storybook-обязательство**: каждый новый/изменённый компонент получает `.story.ts` и регистрацию в `app-storybook` (механизм уже готов).
8. **Тесты**: lint = `tsc --noEmit`. Рекомендовать добавить базовые smoke-тесты компонентов (Web Test Runner / Playwright) — критично перед рефакторингом view'ов на общие компоненты.

---

## 6. План внедрения (порядок, без изменений в этом этапе)

**Фаза 1 (низкий риск, высокая отдача):**
`app-page-header`, `app-empty-state`, `app-section-card`, `app-filter-bar`, `app-meta-grid`, `app-avatar`, `app-progress-bar`, `app-money`, `app-status-chip` → миграция list-view (companies, counterparties, employees, projects, contracts, calculations, payments, expenses, time-tracking).

**Фаза 2:** расширение `app-metric-card` (compact KPI) и `app-data-grid` (режим простой таблицы + cell-type'ы money/link/actions) → миграция финансовых таблиц; удаление инлайновых `.data-table`. **Часть с таблицами отложена (2026-11-14, см. A6/п.6); compact KPI выполнен.**

**Фаза 3:** `app-detail-page` + `app-entity-switcher` + `app-entity-hero` + `app-timeline` → миграция 5 detail-view.

**Фаза 4:** StoreMixin, фабрика CRUD, статус-токены, i18n-hygiene, события-конвенция; обновление сторибука; регрессионная проверка всех view.

Ожидаемый эффект: сокращение CSS view'ов на ~35–45%, единый визуал KPI/фильтров/таблиц/детальных страниц, новые view собираются из готовых блоков за часы, а не дни.

---

## 7. Приложение: карта view → используемые компоненты

| View | Общие компоненты | Инлайновые паттерны (кандидаты на вынос) |
|---|---|---|
| app-dashboard | metric-card, chart-card, project-overview, project-progress, segmented-switch, split-button, badge, button | panel-card, deadline-list, activity-list |
| app-kanban | button, badge | toolbar+filter-select, task-card, progress-bar, drag&drop |
| app-data-grid | button, badge, toggle-button, portal | toolbar, sort/group chips, table, cell-chips, pagination |
| app-calendar | button | month/week grid, task-pill |
| app-analytics | — | kpi-card, section-card, bar-row, team-table, avatar |
| app-projects/companies/counterparties/employees | button, badge, modal+формы | view-header, kpi-grid, toolbar, cards-grid, meta-grid, empty-state, form-grid |
| app-contracts/calculations/payments/expenses/time-tracking | button, badge, modal+формы, segmented-switch, date/number-input | view-header, kpi-grid, toolbar, data-table, amount-cell, micro-pill, empty-state |
| 5 detail-view (project/task/employee/counterparty/contract) | button, badge, modal+формы, project-overview | page-shell, top-nav-bar+switcher, hero, kpi-strip, meta-strip, section-card, rows-list, timeline, progress |
| app-project-chat | button, badge, modal | chat-shell, channel-item, message-bubble, reactions, pinned |
| app-knowledge-base | button, badge, segmented-switch, modal | kpi-strip, index-list (rows), reader, revisions |
| app-settings | button, badge, modal | option-card, base-colors, palettes, presets |
| app-storybook | вся библиотека | галерея историй |

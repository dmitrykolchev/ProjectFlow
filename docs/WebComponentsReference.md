# ProjectFlow: справочник веб-компонентов

Дата: 20.11.2026. Режим: **референс, код не изменяется.**

Всего компонентов: 139 (со стори: 135).
Документ генерируется из исходников: мета берётся из `.story.ts` (title / category / description /
propsDoc / slotsDoc / childrenDoc), API — из файла компонента (`@property`, `dispatchEvent`, `slot`).
**После изменений кода референс актуализируется командой `npm run docs:components`**
(сканирование `src/components` → `docs/components.json` → рендер этого документа). Сгенерированный
файл коммитится вместе с изменениями кода.

---

## 1. Конвенции (обязательны для всех компонентов)

- **Стек**: Lit 3 custom elements + Shadow DOM, TypeScript, Vite (`vite-plugin-lit-css`), токены из
  `src/index.css`; стили компонента — `.css`-файл рядом с компонентом.
- **Именование**: тег `app-<kebab>`, класс `App<Pascal>`, файл `src/components/<group>/<tag>/<tag>.ts|.css|.story.ts`.
- **Свойства**: `@property` с attribute в kebab-case (`full-width` ↔ `fullWidth`); массивы/объекты —
  `attribute: false` или JSON-attr; логические — `Boolean` + `reflect`, где нужен CSS-хук.
- **События**: только `CustomEvent` c `bubbles: true, composed: true`; detail всегда объект
  (`{ value }`, `{ id }`, `{ rows }`). Имена: `change`, `select`, `pick`, `close`, `confirm`, `cancel`,
  `remove`, `row-click`.
- **Слоты**: `default` для контента; именованные `actions`, `icon`, `title`; слот-контент наследует
  токены темы (light DOM).
- **Тексты**: только i18n через `getTranslation`, строки в `src/i18n/ru.ts` / `en.ts`; ветвление по
  locale, не по проверке языка.
- **Story**: каждый компонент имеет `.story.ts`, зарегистрированный в `ALL_STORIES` app-storybook;
  мета стори (description / propsDoc / slotsDoc) — источник истины для этого справочника и для
  spec-таблицы в storybook.
- **Лицензии**: только permissive (MIT/BSD/ISC/Apache-2.0/OFL); copyleft запрещён (AGENTS.md §8).

---

## 2. Каноническая структура view

Порядок блоков в полноэкранном view (обязателен, блоки 1 и 5 обязательны, остальные опциональны):

1. **Page header** — `app-page-header` (`title`, `subtitle`, `slot="icon"` размер 28, `slot="actions"` с кнопкой создания).
2. **KPI strip** — `app-kpi-strip columns="3|4|6"` + `app-metric-card size="compact"` (цвет значения через
   `valueColor` из токенов статуса).
3. **Переключатель режимов отображения** (cards / table / grid / …) — `app-segmented-switch` (`size="sm"`)
   в `.mode-row`; располагается сразу за KPI и перед фильтром. Переключение режима записывается в историю
   навигации: адрес `#/<view>?mode=<mode>&page=<n>`, режим и номер страницы восстанавливаются при
   переходе назад/вперёд.
4. **Фильтр** — `app-filter-bar` (единая ширина поиска 280px: `--filter-search-min/max`); фильтр может
   контекстуально зависеть от режима отображения. Рядом с переключателем режимов — toggle-кнопка
   (`app-toggle-button` с иконкой воронки и надписью «Фильтр»), показывающая/скрывающая фильтр.
5. **Data representation** — `app-cards-table` (карточки + таблица), `app-data-grid`, `app-kanban`,
   `app-gantt`, `app-calendar`; пустота — только `app-empty-state` (compact внутри карточек/таблиц).

Модалки форм — `app-modal size="lg"` + `app-form-grid columns="2"`; подтверждения — только
`app-confirm-dialog` (нативный `confirm()` запрещён). Панель/секция — только `app-section-card`.
Статусы — только `app-status-chip domain=… status=…`. Контролы значений читаются через `eventValue(e)`.

---

## 3. Быстрый индекс

| Компонент | Группа | Категория | Назначение |
|---|---|---|---|
| `app-activity-panel` | common | Feedback | Slide-out drawer containing real-time chronological audit trail of all project events. |
| `app-analysis-summary` | common | Common | One saved AI analysis summary for a task or requirement: author, model and date header, o… |
| `app-avatar` | common | Common | Circular initials/image avatar in five sizes, used for employees, assignees, and user pro… |
| `app-badge` | common | Common | Semantic status, priority, and count badges supporting soft, solid, and outline styles. |
| `app-bank-requisites` | common | Common | Multi-bank, multi-currency bank requisites viewer and inline manager. |
| `app-bank-summary` | common | Common | Compact bank requisites summary for entity cards: primary bank name, additional-account c… |
| `app-button` | common | Elements | Interactive button with multiple semantic variants, sizes, and states. |
| `app-button-group` | common | Common | Groups related buttons or toggle buttons horizontally or vertically with seamless joined … |
| `app-calculation-form` | common | Overlays | Canonical calculation create and edit form. |
| `app-cards-table` | common | Common | A grid of entity cards built from a per-view template. |
| `app-checkbox` | common | Inputs | Checkbox element with checked, unchecked, indeterminate, and disabled states. |
| `app-color-swatches` | common | Inputs | Canonical color swatch picker. |
| `app-combobox` | common | Inputs | Searchable multi-tag combobox input with autocomplete and tag removal. |
| `app-company-form` | common | Overlays | Canonical company create and edit form. |
| `app-confirm-dialog` | common | Common | Confirmation modal built on app-modal: header icon + title, "выполняемое действие" and "о… |
| `app-context-chip` | common | Common | One context source chip: kind icon badge (requirement / knowledge base / document), entit… |
| `app-context-chips-list` | common | Common | A two-column grid of context source chips with an inner scrollbar. |
| `app-contract-form` | common | Overlays | Canonical contract create and edit form. |
| `app-counterparty-contacts` | common | Common | Multi-person counterparty contacts viewer and inline CRUD manager. |
| `app-counterparty-form` | common | Overlays | Canonical counterparty create and edit form. |
| `app-data-grid-column` | common | Common | Universal declarative column configuration element (<app-data-grid-column>) for <app-data… |
| `app-data-table` | common | — | Data table with a fixed header and footer. |
| `app-date-input` | common | Common | Fully custom-styled theme-aware Date Picker with interactive calendar popover, min/max bo… |
| `app-decompose-form` | common | Overlays | Схема данных, контракты API и выбор библиотек |
| `app-detail-shell` | common | Layout | Shared skeleton of the entity detail views: top navigation bar (back button, entity switc… |
| `app-directory-record-modal` | common | Common | Schema-driven modal form for creating and editing both simple (code, name, sortOrder) and… |
| `app-document-form` | common | Overlays | Canonical document create and edit form. |
| `app-document-previewer` | common | Common | Встроенный просмотрщик документов без скачивания: PDF (через Blob Object URL в iframe), м… |
| `app-draggable-list` | common | Common | A vertical list of draggable rows with an inner scrollbar. |
| `app-draggable-list-item` | common | Common | One draggable row, shaped like a form control: value is the entity id behind the row (tas… |
| `app-dropdown-button` | common | Common | Action button paired with a contextual dropdown menu popover and outside-click dismissal. |
| `app-employee-form` | common | Overlays | Canonical employee create and edit form. |
| `app-empty-state` | common | Feedback | Dashed-border placeholder for empty lists and tables with icon, title, message, and optio… |
| `app-entity-emblem` | common | Elements | Графический идентификатор сущности (иконка + семантический цветовой акцент) для заголовко… |
| `app-entity-reminders` | common | Common | Embeddable contextual reminders widget for any system entity detail view (company, counte… |
| `app-entity-selector` | common | Inputs | Searchable portal selector for large collections (tasks, employees, counterparties, contr… |
| `app-expense-form` | common | Overlays | Canonical expense create and edit form. |
| `app-file-dropzone` | common | Common | Интерактивная область загрузки файлов (drag & drop + системный выбор файла) с отображение… |
| `app-filter-bar` | common | Common | Toolbar with search input, N filter selects, optional reset button and trailing actions s… |
| `app-form-grid` | common | Common | Two-column grid for modal form fields; collapses to one column below 640px. |
| `app-input` | common | Inputs | Single-line text input field supporting labels, helpers, errors, and clear buttons. |
| `app-kpi-strip` | common | Common | Responsive grid layout wrapper for KPI cards (app-metric-card), collapsing to 2 columns o… |
| `app-link` | common | Elements | Text link with the canonical start / default / end slot API. |
| `app-markdown` | common | Common | Canonical markdown renderer: headings, paragraphs, quotes, bullet / numbered lists, check… |
| `app-material-icon` | common | Common | Material Symbols ligature icon (self-hosted variable font) with Google axes fill/weight/g… |
| `app-material-icon-gallery` | common | Common | Material Symbols palette with search by name, category and tags; toolbar controls family,… |
| `app-menu` | common | Common | Standalone accessible menu surface supporting both programmatic items arrays and declarat… |
| `app-menu-divider` | common | Common | Declarative horizontal separator element for dividing sections of items inside <app-menu>. |
| `app-menu-header` | common | Common | Declarative section heading element for grouping related <app-menu-item> entries inside <… |
| `app-menu-item` | common | Common | Declarative interactive menu entry used inside <app-menu> with support for icons, shortcu… |
| `app-meta-grid` | common | Common | Label/value boxes in strip (1×N) or grid (2-column) layout, with mono and danger value va… |
| `app-meta-item` | common | Common | Declarative meta field carrier for app-meta-grid. |
| `app-modal` | common | Overlays | Customizable modal dialog with backdrop blur, customizable sizes, header, and footer acti… |
| `app-modal-portal` | common | Overlays | Fixed full-viewport portal overlay hosting modals, drawers, and popups while blocking bac… |
| `app-money` | common | Common | Tabular-numeral currency formatting (RUB/USD/EUR) with full and short (K/M) formats. |
| `app-number-input` | common | Inputs | Numeric input with increment/decrement steppers, boundaries, and optional unit indicator. |
| `app-option` | common | Common | Declarative option carrier for option-list components. |
| `app-otp-input` | common | Common | 6-cell numeric OTP / TOTP input with mobile autofill (autocomplete="one-time-code"), mult… |
| `app-page-header` | common | Layout | Standard page header with title, subtitle, optional leading icon, and an actions zone on … |
| `app-pagination` | common | Common | Pagination bar with smart page buttons, range summary, and mode-aware page-size presets f… |
| `app-payment-form` | common | Overlays | Canonical payment registration form supporting incoming and outgoing payments, linked com… |
| `app-persona` | common | Common | Person representation: avatar (photo or initials on a colored tile), name, position/role … |
| `app-presence-icon` | common | Common | Presence status icon: a colored dot with the state glyph, the same geometry as the person… |
| `app-progress-bar` | common | Common | Single-value or segmented progress bar with optional percentage label; sm/md heights. |
| `app-project-attachments` | common | Common | File attachment control for time entries and expenses. |
| `app-project-form` | common | Overlays | Canonical project create and edit form. |
| `app-project-requirements` | common | Common | Управление функциональными (FR) и нефункциональными (NFR) требованиями проекта, генерация… |
| `app-radio-group` | common | Common | Accessible radio selection group with standard, horizontal, and rich card layouts. |
| `app-recurrence-editor` | common | Common | Visual, human-friendly recurrence rule builder covering the full RFC 5545 specification (… |
| `app-reminder-form` | common | Common | Modal form for creating and editing polymorphic reminders linked to any system entity, us… |
| `app-requirement-form` | common | Overlays | Canonical requirement create and edit form. |
| `app-section-card` | common | Common | Card container with header (title, subtitle, actions slot) and body; optional collapsible… |
| `app-segmented-switch` | common | Common | Compact segmented control for switching between mutually exclusive views, timeframes, or … |
| `app-select` | common | Inputs | Custom dropdown select with indicator dots, keyboard navigation, and smooth popover. |
| `app-split-button` | common | Common | Dual-action button combining a primary action trigger with a secondary options menu. |
| `app-status-chip` | common | Common | Domain-driven status chip: resolves label and badge variant from central STATUS_TOKENS re… |
| `app-switch` | common | Inputs | Toggle switch for boolean settings and feature flags. |
| `app-table-column` | common | — | — |
| `app-table-scroll` | common | — | — |
| `app-tags-row` | common | Elements | Canonical tags row for document cards, preview bars and readonly displays. |
| `app-task-ai-panel` | common | Common | Панель AI-ассистента для задач: автоматический подбор контекста из Базы знаний и Библиоте… |
| `app-task-modal` | common | Overlays | Comprehensive task creation and editing modal dialog with subtasks, dates, and assignees. |
| `app-textarea` | common | Inputs | Multiline text input with character counting, custom row limits, and auto-styling. |
| `app-time-entry-form` | common | Overlays | Canonical time entry create and edit form. |
| `app-toast` | common | Feedback | Automated floating notification stack with auto-dismiss and status colors. |
| `app-toggle-button` | common | Common | Stateful pressable button supporting soft and solid active variants, icons, and accessibi… |
| `card-footer` | common | Common | Card footer row with a border-top chrome. |
| `app-header` | layout | Layout | Top header bar with breadcrumbs, live search, quick notification badge, and primary actio… |
| `app-sidebar` | layout | Layout | Collapsible navigation sidebar composed declaratively with <sidebar-group> and <sidebar-i… |
| `sidebar-group` | layout | Layout | Collapsible navigation group container for <app-sidebar> supporting smooth CSS collapse a… |
| `sidebar-item` | layout | Layout | Declarative navigation item component used to compose <app-sidebar> menus with icons, bad… |
| `app-chart-card` | dashboard | Dashboard | Pure CSS & SVG visualization widget supporting horizontal bar charts, segmented donut cha… |
| `app-metric-card` | dashboard | Dashboard | Executive KPI summary card featuring tabular numerals, trend delta, and optional inline S… |
| `app-project-overview` | dashboard | Dashboard | Interactive D3.js Project Overview dashboard visualizing project progress, logged hours b… |
| `app-project-progress` | dashboard | Dashboard | Portfolio progress tracker displaying completion bars, task ratios, and click-to-open pro… |
| `app-analytics` | views | Views | Executive project health dashboards, KPI metrics, progress bars, and team workload table. |
| `app-auth` | views | Views | Hybrid Authentication Flow view: local credentials with visibility toggle & password mana… |
| `app-blog` | views | Views | Employee corporate blog supporting Markdown authoring with live split preview, formatting… |
| `app-calculation-detail` | views | Views | Отдельная страница калькуляции: детализация оплачиваемых и неоплачиваемых (0 ₽) работ и р… |
| `app-calculations` | views | Views | Калькуляции: сводный реестр периодических отчётов работ и расходов по договорам, включая … |
| `app-calendar` | views | Views | Interactive project schedule calendar supporting Month, Week, and Day views with task eve… |
| `app-companies` | views | Views | Directory of group legal entities, tax requisites, leadership, and linked projects/contra… |
| `app-company-detail` | views | Views | Карточка компании: реквизиты, руководитель, штат, проекты, договоры, счета, привязанные ф… |
| `app-contacts` | views | Views | Unified contact persons directory across all counterparties with cards and table views, r… |
| `app-contract-detail` | views | Views | Отдельная страница договора: финансовое исполнение, реквизиты сторон, процедура выставлен… |
| `app-contracts` | views | Views | Contracts registry linking internal companies, counterparties, projects, owners, and budg… |
| `app-counterparties` | views | Views | CRM directory for clients, vendors, partners, and contractors with ratings and contract s… |
| `app-counterparty-detail` | views | Views | Отдельная страница контрагента: реквизиты, контакты, финансовые показатели, договоры, свя… |
| `app-dashboard` | views | Views | Executive project management dashboard combining KPI metric cards, velocity/status/priori… |
| `app-data-grid` | views | Views | Universal declarative enterprise data grid composed with <app-data-grid-column>, supporti… |
| `app-design-tokens` | views | — | — |
| `app-directories` | views | Views | Unified master-detail workbench for administering all grouped reference directories and c… |
| `app-documents` | views | Views | Корпоративная библиотека документов: загрузка файлов с диска, предпросмотр изображений и … |
| `app-employee-detail` | views | Views | Отдельная страница сотрудника: профиль, ставка, загрузка в проектах по ролям, назначенные… |
| `app-employees` | views | Views | Employee directory with card/table switch, department & company filters, rates, and workl… |
| `app-expense-detail` | views | Views | Отдельная страница расхода: сумма и рублёвый эквивалент, статус согласования, чеки и доку… |
| `app-expenses` | views | Views | Учет затрат: реестр расходов по проектам и задачам, статусы согласования, фильтрация и ср… |
| `app-gantt` | views | Views | 2D virtualized timeline Gantt chart supporting thousands of tasks and multi-year schedule… |
| `app-invoice-detail` | views | Views | Отдельная страница счёта: суммы с НДС, оплата и остаток, стороны, договор- и калькуляция-… |
| `app-invoices` | views | Views | Standalone invoices registry across all contracts with cards and table views, payment pro… |
| `app-kanban` | views | Views | Full-featured agile Kanban board with 5 workflow columns and drag-and-drop support. |
| `app-knowledge-base` | views | Views | База знаний по проектам и компаниям: архитектурные решения, регламенты, разборы инциденто… |
| `app-material-icons` | views | — | — |
| `app-payment-detail` | views | Views | Отдельная страница платежа: направление (входящий / исходящий), маршрут движения средств,… |
| `app-payments` | views | Views | Платежи: контроль сроков оплаты счетов, учёт частичных и полных платежей, просроченная за… |
| `app-profile-settings` | views | Views | User profile settings page in the interface-settings layout: user card, language option c… |
| `app-project-chat` | views | Views | Внутренний чат сотрудников с разделением по каналам внутри проектов (создание, архивирова… |
| `app-project-detail` | views | Views | Dedicated single-project page with project overview, team management grouped by project r… |
| `app-projects` | views | Views | Projects portfolio list with cards/table toggle, budgets, role summary, and navigation to… |
| `app-reminder-detail` | views | Views | Отдельная страница напоминания: связанные объекты системы, расписание RFC 5545 и следующи… |
| `app-reminders` | views | Views | Workspace Reminders Center with polymorphic linking to any entity, directory-driven recur… |
| `app-requirement-detail` | views | Views | Страница детальной работы с отдельным требованием: редактирование критериев приёмки, трас… |
| `app-requirements` | views | Views | Реестр функциональных (FR) и нефункциональных (NFR) требований по проектам с фильтрацией,… |
| `app-settings` | views | Views | Full workspace personalization hub: Dark/Light theme toggle, 5 accent color themes, densi… |
| `app-storybook` | views | Views | In-app design system explorer showcasing all Lit web components, interactive stories, and… |
| `app-task-detail` | views | Views | Dedicated Task Detail view unifying full task history: logged time entries, linked expens… |
| `app-task-grid` | views | — | — |
| `app-time-tracking` | views | Views | Учет времени: быстрые отчёты по задачам, журнал трудозатрат, группировка план/факт по зад… |
| `app-timeentry-detail` | views | Views | Отдельная страница записи о времени: отработанные часы, статус утверждения, биллинг, прик… |

---

## 4. Группа `common` (87)

### Common (51)

#### `app-analysis-summary` — `AppAnalysisSummary`

`src/components/common/app-analysis-summary/`

One saved AI analysis summary for a task or requirement: author, model and date header, overview, effort, risks, recommendations; task summaries add suggested subtasks, requirement summaries add the clarification and decomposition into tasks. Action buttons fire events.

| Property | Type / default | Description |
|---|---|---|
| `summary` | String | AnalysisSummary record (kind task\|requirement) |
| `expanded` | Boolean, default `true` | Collapsed history entries render only a short overview line |
| `addedTitles` | string[], default `[]` | Subtask titles already present on the owning task |

#### `app-avatar` — `AppAvatar`

`src/components/common/app-avatar/`

Circular initials/image avatar in five sizes, used for employees, assignees, and user profile.

| Property | Type / default | Description |
|---|---|---|
| `initials` | String, default `''` | Initials rendered when no image is set |
| `src` | String, default `''` | Image URL (falls back to initials on error) |
| `size` | String, default `'md'` | Avatar diameter preset |
| `color` | String, default `''` | Background color of the initials tile |
| `title` | String, default `''` | Native tooltip text |

#### `app-badge` — `AppBadge`

`src/components/common/app-badge/`

Semantic status, priority, and count badges supporting soft, solid, and outline styles. Canonical start / default / end slots carry leading graphics, badge text, and trailing content; icon is a legacy alias of start.

| Property | Type / default | Description |
|---|---|---|
| `variant` | String, default `'neutral'` | Semantic color of the badge (neutral, info, success, warning, danger) |
| `appearance` | String, default `'soft'` | Rendering style: soft fill / outline |
| `size` | String, default `'md'` | Visual density: sm / md / lg |
| `dot` | Boolean, default `false` | Renders a status dot without text |
| `removable` | Boolean, default `false` | Shows a remove (×) affordance |

**Events:** `remove`

| Slot | Content |
|---|---|
| `start` | Content rendered before the badge text (text, SVG icon, material icon) — centered vertically |
| `(default)` | Badge text — centered vertically |
| `end` | Content rendered after the badge text (text, SVG icon, material icon) — centered vertically |
| `icon` | Legacy alias of start |

| Child element | Role |
|---|---|
| `app-material-icon` | Icon rendered in the start / end slot before or after the badge text |

#### `app-bank-requisites` — `AppBankRequisites`

`src/components/common/app-bank-requisites/`

Multi-bank, multi-currency bank requisites viewer and inline manager. Supports currency filtering, one-click clipboard copy, primary account selection, and inline add/edit/delete.

| Property | Type / default | Description |
|---|---|---|
| `accounts` | BankRequisite[], default `[]` | Array of BankRequisite records |
| `editable` | Boolean, default `false` | Enables Add / Edit / Delete / Set Primary actions |
| `compact` | Boolean, default `false` | Uses single-column compact layout suitable inside modal forms |
| `hide-header` | Boolean, default `false` | Hides internal header when embedded inside app-section-card |
| `confirm-delete` | Boolean, default `false` | Shows app-confirm-dialog before deleting an account |
| `heading` | String, default `''` | Caption of the internal header; falls back to the localized bank-accounts title when empty |

**Events:** `accounts-change`

#### `app-bank-summary` — `AppBankSummary`

`src/components/common/app-bank-summary/`

Compact bank requisites summary for entity cards: primary bank name, additional-account count, and currency chips. Read-only display used in company and counterparty card lists.

| Property | Type / default | Description |
|---|---|---|
| `accounts` | BankRequisite[], default `[]` | Array of BankRequisite records; the default (or first) account is shown as primary |

#### `app-button-group` — `AppButtonGroup`

`src/components/common/app-button-group/`

Groups related buttons or toggle buttons horizontally or vertically with seamless joined borders. The default slot accepts app-button and app-toggle-button children.

| Property | Type / default | Description |
|---|---|---|
| `orientation` | String, default `'horizontal'` | Layout direction of the group: horizontal / vertical |
| `attached` | Boolean, default `true` | Shares borders between children (no gaps) |

| Slot | Content |
|---|---|
| `(default)` | app-button and app-toggle-button children rendered side by side (vertical) or joined (horizontal) |

| Child element | Role |
|---|---|
| `app-button` | Grouped action button child |
| `app-toggle-button` | Grouped toggle button child |

#### `app-cards-table` — `AppCardsTable`

`src/components/common/app-cards-table/`

A grid of entity cards built from a per-view template. The card content is produced by the cardRender function property (row) => TemplateResult, the same pattern as the cellRender of app-data-table; the card shell (surface background, border, radius, padding, hover lift, selection highlight) and the grid geometry belong to the component and are retuned locally through the geometry tokens. Pagination is internal: items are sliced by page-size and app-pagination (layout-mode="cards") sits in the footer below the grid whenever the grid is not empty. With clickable the shell activates on click and emits card-click; with selectable the selection lives in selectedKeys keyed by key-field, the chosen cards get the is-selected shell class, and toggling emits selection-change. Additive hooks with pixel-identical defaults: --cards-columns pins the column count (default auto-fill), the wide-collapse attribute collapses to one column at viewport <= 1024px (default off), cardClass(row) appends extra shell classes per row (is-dimmed reads --card-dimmed-opacity, default 0.68).

| Property | Type / default | Description |
|---|---|---|
| `rows` | Record<string, unknown>[], default `[]` | Array of card items rendered by the grid |
| `cardRender` | (row: Record<string, unknown>) => TemplateResult, default `() => html``` | Template function (row) => TemplateResult producing the card content |
| `page-size` | Number, default `9` | Cards per page for the internal pagination (default 9) |
| `page` | Number, default `1` | Initial page number (clamped to the available pages) |
| `clickable` | Boolean, default `false` | The shell activates on click and emits card-click { item } (outside controls) |
| `selectable` | Boolean, default `false` | Selection keyed by key-field; chosen cards get the is-selected shell class |
| `key-field` | String, default `'id'` | Field holding the selection key (default id) |
| `selectedKeys` | Array, default `[]` | Array of currently selected keys; toggleSelect(key) flips one key |
| `locale` | String, default `'ru-RU'` | Formatting locale passed to the footer pagination |
| `empty-title` | String, default `''` | Title of the compact app-empty-state shown for empty rows |
| `cardClass` | String | Additive hook (row) => string appending extra shell classes per row (is-dimmed reads --card-dimmed-opacity, default 0.68) |
| `wide-collapse` | Boolean, default `false` | Additive attribute hook collapsing the grid to one column at viewport <= 1024px (default off) |
| `--cards-columns` | CSS var | Grid column count token (default auto-fill); a view can pin an exact number of columns |
| `contentStyles` | String | Additive hook: view-local CSS (string or CSSResult) injected into the shadow root as a <style> element for the cardRender content; default empty keeps consumers pixel-identical |

#### `app-confirm-dialog` — `AppConfirmDialog`

`src/components/common/app-confirm-dialog/`

Confirmation modal built on app-modal: header icon + title, "выполняемое действие" and "ожидаемый результат" sections, cancel/confirm buttons. Variants: info, success, warning, danger; events confirm and cancel.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the dialog |
| `title` | String, default `''` | Header caption |
| `variant` | String, default `'danger'` | Semantic color: info / success / warning / danger |
| `icon` | String, default `''` | Header icon name |
| `action` | String, default `''` | Text of the "action being performed" section |
| `result` | String, default `''` | Text of the "expected result" box |
| `message` | String, default `''` | Legacy single-body message (used when action/result are empty) |
| `actionLabel` | String, default `''` | Caption of the action section header |
| `resultLabel` | String, default `''` | Caption of the result section header |
| `confirmLabel` | String, default `''` | Caption of the confirm button |
| `cancelLabel` | String, default `''` | Caption of the cancel button |
| `size` | String, default `'sm'` | Dialog width preset |

**Events:** `confirm`, `cancel`

#### `app-context-chip` — `AppContextChip`

`src/components/common/app-context-chip/`

One context source chip: kind icon badge (requirement / knowledge base / document), entity title and the match reason line. Select mode toggles selection (chip-toggle), the arrow button opens the source entity (chip-open).

| Property | Type / default | Description |
|---|---|---|
| `data` | String | ContextChipData record (key, kind, id, title, reason, selected) |
| `mode` | String, default `'display'` | select = toggleable picker chip; display = read-only chip with open action |

#### `app-context-chips-list` — `AppContextChipsList`

`src/components/common/app-context-chips-list/`

A two-column grid of context source chips with an inner scrollbar. items carries ContextChipData records; mode selects the chip variant. chip-toggle and chip-open events from individual chips bubble through to the parent.

| Property | Type / default | Description |
|---|---|---|
| `items` | ContextChipData[], default `[]` | ContextChipData[] — key, kind, id, title, reason, selected |
| `mode` | String, default `'display'` | select = toggleable picker chips; display = read-only chips with open action |

#### `app-counterparty-contacts` — `AppCounterpartyContacts`

`src/components/common/app-counterparty-contacts/`

Multi-person counterparty contacts viewer and inline CRUD manager. Supports personal details (full name, job title, department, birth date), multiple communication channels (phones, email, messenger), primary contact selection, and clipboard copy.

| Property | Type / default | Description |
|---|---|---|
| `contacts` | CounterpartyContact[], default `[]` | Array of CounterpartyContact records |
| `editable` | Boolean, default `false` | Enables Add / Edit / Delete / Set Primary actions |
| `compact` | Boolean, default `false` | Uses single-column compact layout suitable inside modal forms |
| `hide-header` | Boolean, default `false` | Hides internal header when embedded inside app-section-card |
| `confirm-delete` | Boolean, default `false` | Shows app-confirm-dialog before deleting a contact |
| `heading` | String, default `''` | Caption of the internal header; falls back to the localized contact-persons title when empty |

**Events:** `contacts-change`

#### `app-data-grid-column` — `AppDataGridColumn`

`src/components/common/app-data-grid-column/`

Universal declarative column configuration element (<app-data-grid-column>) for <app-data-grid>, supporting caption, hidden, resizable, sortable, groupable, sortValue, and custom JS or HTML <template> cell rendering.

| Property | Type / default | Description |
|---|---|---|
| `field` | String, default `''` | Property name or dot-path in each row object |
| `caption` | String, default `''` | Column header text (falls back to header or field) |
| `hidden` | — | Hides the column initially while keeping it toggleable in the column menu |
| `resizable` | Boolean, default `true` | Enables drag-to-resize handle on the column header (use resizable="false" to lock width) |
| `sortable` | Boolean, default `false` | Allows sorting by clicking the header; grouped columns sort automatically first |
| `groupable` | Boolean, default `false` | Allows grouping by this column via toolbar selector or drag-to-group bar |
| `reorderable` | Boolean, default `true` | Allows drag reordering of the column header |
| `hideable` | Boolean, default `true` | Controls whether the column appears in the Columns visibility popover |
| `exportable` | Boolean, default `true` | Controls whether the column is included when exporting CSV |
| `align` | String, default `'left'` | Horizontal cell & header alignment: left \| center \| right |
| `cellType` | String, default `'text'` | Built-in formatter preset (text \| key \| title \| status \| priority \| assignee \| dates \| progress \| tags \| badge) |
| `template` | String | JS callback (row, value) => TemplateResult \| string \| number; alternatively pass an HTML <template> child using {{field}} / {{value}} placeholders |
| `sortValue` | String | Custom comparator value extractor (row, value) => string \| number |
| `groupFormatter` | String | Custom group header label formatter (value) => string |
| `header` | String, default `''` | Secondary header text; used as caption when caption is empty (caption → header → field) |
| `width` | Number, default `150` | Initial column width in px (default 150); the grid keeps user-resized widths in its own state |
| `min-width` | Number, default `70` | Smallest width the resize handle can drag to, in px (default 70); declared as min-width, documented as minWidth |
| `override` | Boolean, default `false` | Property name override for the reflected hidden attribute (declared as `override hidden`); lets a column bind a row field named hidden without colliding |
| `minWidth` | Number, default `70` | Smallest width the resize handle can drag to, in px (default 70); attribute form min-width |
| `visible` | Boolean, default `true` | Initial column visibility (default true; false hides it, hideable columns stay toggleable in the Columns popover) |
| `renderer` | String | Alias of template — cell render callback (row, value) => TemplateResult \| string \| number; the grid reads template ?? renderer |

**Events:** `column-change`

| Slot | Content |
|---|---|
| `(default)` | Optional HTML <template> element with {{field}} / {{value}} placeholders for declarative cell markup |

#### `app-date-input` — `AppDateInput`

`src/components/common/app-date-input/`

Fully custom-styled theme-aware Date Picker with interactive calendar popover, min/max bounds, and localization.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `''` | Caption above the field |
| `value` | String, default `''` | Selected date in YYYY-MM-DD format |
| `placeholder` | String, default `'YYYY-MM-DD'` | Placeholder text shown when empty |
| `min` | String, default `''` | Earliest selectable date (YYYY-MM-DD) |
| `max` | String, default `''` | Latest selectable date (YYYY-MM-DD) |
| `required` | Boolean, default `false` | Marks the field as required |
| `disabled` | Boolean, default `false` | Disables editing and the calendar popover |
| `error` | String, default `''` | Error message; renders the field in danger state |
| `size` | String, default `'md'` | Control size scale sm\|md\|lg (30/38/44px heights, md default) |

**Events:** `change`

#### `app-directory-record-modal` — `AppDirectoryRecordModal`

`src/components/common/app-directory-record-modal/`

Schema-driven modal form for creating and editing both simple (code, name, sortOrder) and complex extended classifier records (Units of Measure, Currencies, Activity Types, etc.).

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Controls modal visibility |
| `directory` | DirectoryDefinition | null, default `null` | DirectoryDefinition schema governing core and extended fields |
| `record` | DirectoryRecord | null, default `null` | DirectoryRecord being edited, or null for create mode |

**Events:** `close`, `saved`

#### `app-document-previewer` — `AppDocumentPreviewer`

`src/components/common/app-document-previewer/`

Встроенный просмотрщик документов без скачивания: PDF (через Blob Object URL в iframe), масштабируемые изображения/SVG, форматированный Markdown, табличный CSV, JSON/SQL/код с нумерацией строк и переносом, а также fallback для бинарных форматов.

| Property | Type / default | Description |
|---|---|---|
| `document` | DocumentItem | null, default `null` | Single document to preview (id + metadata) |
| `documents` | DocumentItem[], default `[]` | Document list with a selector when more than one is provided |
| `compact` | Boolean, default `false` | Reduced chrome for embedding inside cards |
| `showHeader` | Boolean, default `true` | Shows the document header bar |
| `showExpand` | Boolean, default `false` | Shows the expand-to-fullscreen control |
| `height` | String, default `'540px'` | Preview viewport height (CSS length) |

**Events:** `select-document`, `expand`, `download`

#### `app-draggable-list` — `AppDraggableList`

`src/components/common/app-draggable-list/`

A vertical list of draggable rows with an inner scrollbar. The child element is app-draggable-list-item, used in two modes: property mode — the items array (value, label, checked) renders one child per record; declarative mode — app-draggable-list-item children are declared in the light DOM and rendered through the default slot. The list owns the HTML5 drag state and reorders rows; every reorder is emitted as list-reorder with the new items array. item-toggle and item-remove events pass through to the parent.

| Property | Type / default | Description |
|---|---|---|
| `items` | DraggableItemData[], default `[]` | DraggableItemData[] — value (entity id), label (title), checked (completion); empty items render the declared light DOM children |
| `child element` | — | app-draggable-list-item — grip handle, order number, checkbox, title, up / down / remove actions |

**Events:** `list-reorder`

#### `app-draggable-list-item` — `AppDraggableListItem`

`src/components/common/app-draggable-list-item/`

One draggable row, shaped like a form control: value is the entity id behind the row (task / subtask id), checked is its completion state, label the visible title. Grip handle, order number and up / down / remove actions included. Every action is emitted as a composed bubbling event (item-toggle {value}, item-up {index}, item-down {index}, item-remove {value}, item-drag-*) for the parent app-draggable-list — the child element of that list.

| Property | Type / default | Description |
|---|---|---|
| `value` | String, default `''` | entity id behind the row (task / subtask id) |
| `label` | String, default `''` | visible title text |
| `checked` | Boolean, default `false` | completion state (checkbox + struck-through title) |
| `index` | Number, default `0` | position in the list (order number and up-button disabled state) |
| `total` | Number, default `0` | list length (down-button disabled state) |
| `dragging` | Boolean, default `false` | the row is being dragged (dashed accent border, faded) |
| `drop` | String, default `null` | drop indicator on this row: before \| after \| null |

#### `app-dropdown-button` — `AppDropdownButton`

`src/components/common/app-dropdown-button/`

Action button paired with a contextual dropdown menu popover and outside-click dismissal. Canonical start / default / end slots carry leading graphics, label text, and trailing graphics; icon-start is a legacy alias of start. The default slot accepts declarative app-menu-item, app-menu-header, and app-menu-divider children.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `'Actions'` | Button caption |
| `variant` | String, default `'secondary'` | Visual style of the button surface |
| `size` | String, default `'md'` | Control height: sm / md / lg |
| `placement` | String, default `'bottom-start'` | Menu placement relative to the button (bottom-start, bottom-end, ...) |
| `disabled` | Boolean, default `false` | Disables interaction |
| `items` | Array, default `[]` | Menu item definitions rendered in the dropdown |

**Events:** `select`

| Slot | Content |
|---|---|
| `start` | Content rendered before the label (text, SVG icon, material icon) — centered vertically |
| `end` | Content rendered after the label, before the menu chevron — centered vertically |
| `icon-start` | Legacy alias of start |
| `(default)` | Optional declarative <app-menu-item>, <app-menu-header>, and <app-menu-divider> children |

| Child element | Role |
|---|---|
| `app-menu-header` | Section caption of the dropdown menu (declarative children replace the items prop) |
| `app-menu-item` | Menu row with label, icon, shortcut, checkable state, danger style |
| `app-menu-divider` | Horizontal separator between menu rows |
| `app-material-icon` | Icon rendered in the start / end slot before or after the button label |

#### `app-entity-reminders` — `AppEntityReminders`

`src/components/common/app-entity-reminders/`

Embeddable contextual reminders widget for any system entity detail view (company, counterparty, contract, employee, project, task, requirement, calculation, etc.).

| Property | Type / default | Description |
|---|---|---|
| `entity-type` | String, default `'project'` | Linked entity kind (company, contract, task, contact, etc.) |
| `entity-id` | String, default `''` | Target entity record identifier |

#### `app-file-dropzone` — `AppFileDropzone`

`src/components/common/app-file-dropzone/`

Интерактивная область загрузки файлов (drag & drop + системный выбор файла) с отображением выбранного файла, его размера и кнопкой очистки.

| Property | Type / default | Description |
|---|---|---|
| `accept` | String, default `''` | Accepted file extensions (native accept attribute) |
| `title` | String, default `''` | Headline inside the drop area |
| `hint` | String, default `''` | Secondary hint text under the headline |
| `buttonLabel` | String, default `''` | Caption of the browse button |
| `clearLabel` | String, default `''` | Caption of the clear button for a selected file |
| `selectedLabel` | String, default `''` | Template caption for the selected-file line |
| `compact` | Boolean, default `false` | Reduced height for dense forms |
| `selectedFileName` | String, default `''` | Name of the file already selected outside the component — renders the selected-file line (attribute form selected-file-name) |
| `selectedFileSize` | Number, default `0` | Size in bytes shown next to the selected file name; 0 hides the size (attribute form selected-file-size) |
| `disabled` | Boolean, default `false` | Disables drop and browse |
| `selected-file-name` | String, default `''` | Name of the file already selected outside the component — renders the selected-file line (attribute form selected-file-name) |
| `selected-file-size` | Number, default `0` | Size in bytes shown next to the selected file name; 0 hides the size (attribute form selected-file-size) |
| `multiple` | Boolean, default `false` | Allows picking several files (native multiple on the input); the files event carries all of them, false carries only the first |

**Events:** `files-selected`, `file-selected`, `file-cleared`

#### `app-filter-bar` — `AppFilterBar`

`src/components/common/app-filter-bar/`

Toolbar with search input, N filter selects, optional reset button and trailing actions slot. The prefix slot renders extra controls before the filter selects, and the default slot appends additional controls after them.

| Property | Type / default | Description |
|---|---|---|
| `searchValue` | String, default `''` | Current text of the search box |
| `searchEnabled` | Boolean, default `true` | Shows the search input |
| `filters` | Array, default `[]` | Filter definitions (key, options, type select \| entity) |
| `values` | Object, default `{}` | Current filter values keyed by filter id |
| `placeholder` | String, default `''` | Search box placeholder |
| `variant` | String, default `'card'` | Surface style: card / plain |
| `showReset` | Boolean, default `false` | Shows the reset button when filters are active |

**Events:** `reset`, `search-change`, `filter-change`

| Slot | Content |
|---|---|
| `prefix` | Extra controls rendered before the filter selects |
| `(default)` | Additional controls appended after the filter selects |

| Child element | Role |
|---|---|
| `app-segmented-switch` | View-mode switch placed in the default slot after the filter selects |
| `app-button` | Toolbar action placed in the prefix or default slot |

#### `app-form-grid` — `AppFormGrid`

`src/components/common/app-form-grid/`

Two-column grid for modal form fields; collapses to one column below 640px. Slotted children keep their own classes (col-span-2 stays in view CSS).

| Property | Type / default | Description |
|---|---|---|
| `columns` | Number, default `2` | Number of form grid columns (children span full width via col-span) |

| Slot | Content |
|---|---|
| `(default)` | Form fields laid out in the grid (full width via col-span) |

| Child element | Role |
|---|---|
| `app-input` | Text field child |
| `app-textarea` | Multiline text field child |
| `app-select` | Dropdown select child |
| `app-entity-selector` | Searchable entity selector child |
| `app-combobox` | Multi-tag combobox child |
| `app-number-input` | Numeric field child |
| `app-date-input` | Date field child |
| `app-checkbox` | Checkbox child |
| `app-switch` | Toggle switch child |

#### `app-kpi-strip` — `AppKpiStrip`

`src/components/common/app-kpi-strip/`

Responsive grid layout wrapper for KPI cards (app-metric-card), collapsing to 2 columns on tablets and 1 on mobile. The default slot accepts app-metric-card children.

| Property | Type / default | Description |
|---|---|---|
| `columns` | Number, default `4` | Number of grid columns for the metric cards |
| `variant` | String, default `'grid'` | Layout style: grid / strip |

| Slot | Content |
|---|---|
| `(default)` | Metric cards (app-metric-card elements) |

| Child element | Role |
|---|---|
| `app-metric-card` | KPI card child rendered as a grid cell of the strip (label, value, trend, sparkline) |

#### `app-markdown` — `AppMarkdown`

`src/components/common/app-markdown/`

Canonical markdown renderer: headings, paragraphs, quotes, bullet / numbered lists, checklists (display-only), GFM pipe tables, LaTeX math via KaTeX and fenced code blocks with a copy action. Markdown source is passed as the content property.

| Property | Type / default | Description |
|---|---|---|
| `content` | String, default `''` | Markdown source text; empty content renders nothing |
| `children` | — | Markdown declared directly as light-DOM children (slot capture); the content property wins when both are set |
| `editable` | Boolean, default `false` | Checklist checkboxes are interactive and emit checklist-toggle {line, checked} when true |

**Events:** `checklist-toggle`

#### `app-material-icon` — `AppMaterialIcon`

`src/components/common/app-material-icon/`

Material Symbols ligature icon (self-hosted variable font) with Google axes fill/weight/grade, family style, app size scale, and status color variants.

| Property | Type / default | Description |
|---|---|---|
| `fill` | Number, default `0` | Google FILL axis: 0 (outline) or 1 (filled) |
| `weight` | Number, default `400` | Google wght axis: 100..700 stroke weight (default 400) |
| `grade` | Number, default `0` | Google GRAD axis: -50..200 optical grade — thicker glyphs at larger sizes |
| `decorative` | Boolean, default `false` | Marks the glyph as decoration: aria-hidden, role=presentation, no accessible name from the ligature |

#### `app-material-icon-gallery` — `AppMaterialIconGallery`

`src/components/common/app-material-icon-gallery/`

Material Symbols palette with search by name, category and tags; toolbar controls family, size and Google axes; grid with roving tabindex fires icon-select and params-change events.

| Property | Type / default | Description |
|---|---|---|
| `icons` | Array, default `[]` | MaterialIconDef records rendered by the gallery (property binding, array) |
| `fill` | Number, default `0` | Initial FILL axis value for the toolbar (0\|1); changes fire params-change |
| `weight` | Number, default `400` | Initial wght axis value for the toolbar (100..700); changes fire params-change |
| `grade` | Number, default `0` | Initial GRAD axis value for the toolbar (-50..200); changes fire params-change |
| `disabled` | Boolean, default `false` | Blocks search, toolbar and grid interaction — the gallery renders read-only |

#### `app-menu` — `AppMenu`

`src/components/common/app-menu/`

Standalone accessible menu surface supporting both programmatic items arrays and declarative <app-menu-item>, <app-menu-header>, and <app-menu-divider> composition.

| Property | Type / default | Description |
|---|---|---|
| `items` | Array, default `[]` | Menu item definitions (label, icon, action, separators) |

**Events:** `select`

| Slot | Content |
|---|---|
| `(default)` | Declarative <app-menu-item>, <app-menu-header>, and <app-menu-divider> children |

| Child element | Role |
|---|---|
| `app-menu-header` | Section caption rendered at the top of the menu |
| `app-menu-item` | Menu row with label, icon, shortcut, checkable state, danger style |
| `app-menu-divider` | Horizontal separator between menu rows |

#### `app-menu-divider` — `AppMenuDivider`

`src/components/common/app-menu-divider/`

Declarative horizontal separator element for dividing sections of items inside <app-menu>.

| Property | Type / default | Description |
|---|---|---|
| `inset` | Boolean, default `false` | Applies left indentation aligned with icon-prefixed menu item labels |

#### `app-menu-header` — `AppMenuHeader`

`src/components/common/app-menu-header/`

Declarative section heading element for grouping related <app-menu-item> entries inside <app-menu>. The default slot supplies the header text markup when the label property is omitted.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `''` | Section heading text |

| Slot | Content |
|---|---|
| `(default)` | Header text markup (used when the label property is omitted) |

#### `app-menu-item` — `AppMenuItem`

`src/components/common/app-menu-item/`

Declarative interactive menu entry used inside <app-menu> with support for icons, shortcuts, checkmarks, danger, and disabled states. Canonical start / default / end slots carry leading graphics, label markup, and trailing content; icon and shortcut are legacy aliases of start / end.

| Property | Type / default | Description |
|---|---|---|
| `value` | String, default `''` | Action identifier emitted in the select event detail (falls back to id) |
| `label` | String, default `''` | Item text caption |
| `shortcut` | String, default `''` | Keyboard shortcut hint displayed on the right |
| `disabled` | Boolean, default `false` | Prevents clicking and keyboard activation |
| `danger` | Boolean, default `false` | Highlights destructive action styling |
| `checked` | Boolean, default `false` | Renders active checkmark state |
| `checkable` | Boolean, default `false` | Reserves checkmark gutter and toggles checked state on click |
| `icon` | String | Programmatic leading icon (TemplateResult or string) |

**Events:** `select`

| Slot | Content |
|---|---|
| `start` | Content rendered before the label (text, SVG icon, material icon) — centered vertically |
| `(default)` | Item label markup (used when the label property is omitted) |
| `end` | Content rendered on the right (text, SVG icon, material icon) — centered vertically |
| `icon` | Legacy alias of start |
| `shortcut` | Legacy alias of end |

| Child element | Role |
|---|---|
| `app-material-icon` | Icon rendered in the start / end slot before or after the item label |

#### `app-meta-grid` — `AppMetaGrid`

`src/components/common/app-meta-grid/`

Label/value boxes in strip (1×N) or grid (2-column) layout, with mono and danger value variants. The default slot accepts declarative app-meta-item children that append to the items prop.

| Property | Type / default | Description |
|---|---|---|
| `items` | Array, default `[]` | Meta field definitions (label + value, mono / danger variants, title tooltip, link { label, onClick }) |
| `columns` | Number, default `3` | Number of columns in the grid |
| `layout` | String, default `'strip'` | Rendering style: strip / grid / inline |

| Slot | Content |
|---|---|
| `(default)` | Declarative <app-meta-item> children filling the boxes (label, value, mono, danger, start / end graphics) |

| Child element | Role |
|---|---|
| `app-meta-item` | Declarative meta box (label, value, mono, danger, start / end slot graphics) appended to the items prop list |

#### `app-meta-item` — `AppMetaItem`

`src/components/common/app-meta-item/`

Declarative meta field carrier for app-meta-grid. Renders nothing; the parent collects its props from the slot.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `''` | Field caption shown above the value |
| `value` | String, default `''` | Field value (falls back to the element text) |
| `mono` | Boolean, default `false` | Monospaced tabular value style |
| `danger` | Boolean, default `false` | Danger-colored value style |

| Slot | Content |
|---|---|
| `start` | Graphic element rendered before the field value in the parent box (SVG, material icon) |
| `(default)` | Fallback value text used when the value property is omitted |
| `end` | Graphic element rendered after the field value in the parent box (SVG, material icon) |

#### `app-money` — `AppMoney`

`src/components/common/app-money/`

Tabular-numeral currency formatting (RUB/USD/EUR) with full and short (K/M) formats.

| Property | Type / default | Description |
|---|---|---|
| `amount` | Number, default `0` | Numeric amount |
| `currency` | String, default `'RUB'` | Currency code: RUB / USD / EUR (symbol and locale formatting follow UI language) |
| `format` | String, default `'full'` | full = grouped digits; short = K/M compact notation |

#### `app-option` — `AppOption`

`src/components/common/app-option/`

Declarative option carrier for option-list components. Renders nothing; the parent component collects its props from the slot.

| Property | Type / default | Description |
|---|---|---|
| `value` | String, default `''` | Option value emitted by the parent (falls back to the label) |
| `label` | String, default `''` | Option caption (falls back to the element text) |
| `color` | String, default `''` | Color indicator used by app-select rows |
| `icon` | String | Programmatic leading icon (TemplateResult or string) |
| `code` | String, default `''` | Entity code shown in entity-selector rows |
| `subtitle` | String, default `''` | Secondary line in entity-selector rows |
| `meta` | String, default `''` | Meta line in entity-selector rows |
| `badge` | String, default `''` | Badge text in entity-selector rows |
| `badgeColor` | String, default `''` | Badge color in entity-selector rows |
| `avatar` | String, default `''` | Avatar source (initials or image url) in entity-selector rows |
| `description` | String, default `''` | Description line used by app-radio-group cards |
| `keywords` | Array | Search keywords for the entity-selector filter |
| `disabled` | Boolean, default `false` | Option is not selectable |

| Slot | Content |
|---|---|
| `start` | Graphic element rendered before the option label in the parent row (SVG, material icon) |
| `(default)` | Fallback label text used when the label property is omitted |
| `end` | Graphic element rendered after the option label in the parent row (SVG, material icon) |

#### `app-otp-input` — `AppOtpInput`

`src/components/common/app-otp-input/`

6-cell numeric OTP / TOTP input with mobile autofill (autocomplete="one-time-code"), multi-digit clipboard paste, keyboard navigation, and automatic completion dispatch.

| Property | Type / default | Description |
|---|---|---|
| `length` | Number, default `6` | Number of verification code cells (default 6). |
| `value` | String, default `''` | Current numeric code string. |
| `disabled` | Boolean, default `false` | Disables all cells while verifying. |
| `error` | Boolean, default `false` | Highlights cells in danger palette and plays shake feedback. |
| `autofocus` | Boolean, default `false` | Automatically focuses the first cell on mount. |

**Events:** `otp-change`, `otp-complete`

#### `app-pagination` — `AppPagination`

`src/components/common/app-pagination/`

Pagination bar with smart page buttons, range summary, and mode-aware page-size presets for dense tables vs. multi-column card grids.

| Property | Type / default | Description |
|---|---|---|
| `totalItems` | Number, default `0` | Total record count across all pages |
| `page` | Number, default `1` | Current page number (1-based) |
| `pageSize` | Number, default `10` | Records per page |
| `pageSizeOptions` | Array | Choices offered in the page-size selector |
| `layoutMode` | String, default `'table'` | Density preset for table vs card grids |
| `variant` | String, default `'surface'` | Surface style |
| `compact` | Boolean, default `false` | Compact rendering |
| `showPageSize` | Boolean, default `true` | Shows the page-size selector |
| `showSummary` | Boolean, default `true` | Shows the "records x–y of z" summary |
| `locale` | String | Locale used for number formatting (defaults to UI language) |

**Events:** `page-change`, `page-size-change`

#### `app-persona` — `AppPersona`

`src/components/common/app-persona/`

Person representation: avatar (photo or initials on a colored tile), name, position/role line and a presence badge in seven sizes. The status is graphic only — its words live in the tooltip and the accessible name.

| Property | Type / default | Description |
|---|---|---|
| `size` | String, default `'48'` | Avatar diameter preset (24/32/40/48/56/72/100, default 48) |
| `image` | String, default `''` | Photo URL; falls back to initials when empty |
| `initials` | String, default `''` | Initials; derived from primaryText when not set (Cyrillic names included) |
| `primaryText` | String, default `''` | Name or identification |
| `secondaryText` | String, default `''` | Position / project role under the name |
| `tertiaryText` | String, default `''` | Extra line, e.g. "In a meeting" (sizes 56+) |
| `presence` | String, default `'none'` | Presence badge status (none/online/available/away/busy/dnd/blocked/offline); words go to the tooltip and accessible name, never to visible text |
| `showOverflowTooltip` | — | Native tooltip with the full text on truncated lines (default true) |
| `color` | String, default `''` | Background of the initials tile |
| `ariaLabel` | String, default `''` | Accessible name override |
| `interactive` | Boolean, default `true` | Renders the persona as a focusable ghost button (default true) so consumers bind @click / persona-click on the host; false renders plain markup |
| `personaDisabled` | Boolean, default `false` | Dims the persona and disables its button (attribute persona-disabled); the persona-click event is not dispatched |

#### `app-presence-icon` — `AppPresenceIcon`

`src/components/common/app-presence-icon/`

Presence status icon: a colored dot with the state glyph, the same geometry as the persona badge. Owns its styles, so it renders inside other components shadow trees (menu item icons) and can be slotted anywhere.

| Property | Type / default | Description |
|---|---|---|
| `presence` | String, default `'none'` | Presence status (none/online/available/away/busy/dnd/blocked/offline); none renders nothing |
| `size` | String, default `'12'` | Dot diameter in px (persona badge sizes are 8/12/16/20/24/32/40) |
| `glyph` | String, default `'auto'` | Glyph size in px; auto follows the persona rule (round(size x 0.6), suppressed below 16px), 0 forces a colour-only dot |
| `color` | String, default `''` | Dot fill override; defaults to the presence token color |
| `ariaLabel` | String, default `''` | Accessible name override; defaults to the presence label |
| `showOverflowTooltip` | — | Native tooltip with the presence label (default true) |

#### `app-progress-bar` — `AppProgressBar`

`src/components/common/app-progress-bar/`

Single-value or segmented progress bar with optional percentage label; sm/md heights.

| Property | Type / default | Description |
|---|---|---|
| `value` | Number, default `0` | Current percentage (0–100) |
| `segments` | Array, default `[]` | Optional segment definitions for multi-color bars |
| `color` | String, default `'var(--accent-primary, #6366f1)'` | Bar fill color (CSS value / token) |
| `showLabel` | Boolean, default `false` | Shows the percentage label |
| `size` | String, default `'md'` | Bar height preset |

#### `app-project-attachments` — `AppProjectAttachments`

`src/components/common/app-project-attachments/`

File attachment control for time entries and expenses. Allows uploading new files (saved directly to the project document library) or picking existing documents from the project library, with inline preview and download.

| Property | Type / default | Description |
|---|---|---|
| `project-id` | String, default `''` | Project ID used to scope existing library documents |
| `documentIds` | string[], default `[]` | Array of already-saved DocumentItem IDs attached to the record |
| `pendingFiles` | PendingAttachmentFile[], default `[]` | Array of newly selected browser files awaiting save |
| `label` | String, default `''` | Optional section heading override |
| `compact` | Boolean, default `false` | Compact display mode without secondary helper hint |
| `readonly` | Boolean, default `false` | Disables uploading, linking, and detaching files |

#### `app-project-requirements` — `AppProjectRequirements`

`src/components/common/app-project-requirements/`

Управление функциональными (FR) и нефункциональными (NFR) требованиями проекта, генерация из спецификации, трассировка к базе знаний и декомпозиция в задачи с помощью AI.

| Property | Type / default | Description |
|---|---|---|
| `projectId` | String, default `''` | Project whose requirements are listed (empty = all projects) |
| `currentLang` | — | UI language |

#### `app-radio-group` — `AppRadioGroup`

`src/components/common/app-radio-group/`

Accessible radio selection group with standard, horizontal, and rich card layouts. The default slot accepts declarative app-option children that append to the options prop.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `''` | Caption above the option list |
| `name` | String, default `''` | Native radio group name (shared within a page) |
| `value` | String, default `''` | Currently selected option value |
| `options` | Array, default `[]` | Option definitions (value + label) |
| `dataSource` | String | Data source for options: array, promise, or function returning an array (sync or async) |
| `orientation` | String, default `'vertical'` | Layout direction: vertical / horizontal |
| `variant` | String, default `'default'` | Visual style of the option rows |
| `disabled` | Boolean, default `false` | Disables all options |

**Events:** `change`

| Slot | Content |
|---|---|
| `(default)` | Declarative <app-option> children filling the option list (value, label, description, disabled, start / end graphics) |

| Child element | Role |
|---|---|
| `app-option` | Declarative radio row (value, label, description, disabled, start / end slot graphics) appended to the options prop list |

#### `app-recurrence-editor` — `AppRecurrenceEditor`

`src/components/common/app-recurrence-editor/`

Visual, human-friendly recurrence rule builder covering the full RFC 5545 specification (FREQ, INTERVAL, BYMONTH, BYWEEKNO, BYYEARDAY, BYMONTHDAY, BYDAY with ordinals, BYHOUR, BYMINUTE, BYSETPOS, COUNT, UNTIL, WKST) with two-way RRULE string initialization and canonical serialization.

| Property | Type / default | Description |
|---|---|---|
| `value` | String, default `''` | Initial and current RFC 5545 RRULE string (with or without RRULE: prefix) |
| `start-date` | String, default `''` | Reference DTSTART (YYYY-MM-DDTHH:mm) used for live upcoming dates preview |
| `include-prefix` | Boolean, default `true` | Whether emitted RRULE includes the "RRULE:" prefix (default true) |
| `allow-one-time` | Boolean, default `true` | Allows selecting "Does not repeat" empty rule (default true) |
| `compact` | Boolean, default `false` | Reduces vertical spacing for embedding inside modals |
| `hide-rrule-bar` | Boolean, default `false` | Hides raw RRULE string bar while preserving visual editing |

#### `app-reminder-form` — `AppReminderForm`

`src/components/common/app-reminder-form/`

Modal form for creating and editing polymorphic reminders linked to any system entity, using recurrence templates from Master Classifiers and a flexible multi-rule notifications builder.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens or closes the reminder form modal dialog |
| `reminder` | Reminder | null, default `null` | Existing Reminder entity to edit (null creates a new reminder) |
| `preset-entity-type` | String, default `''` | Preselected target entity type (company, contract, task, contact, etc.) |
| `preset-entity-id` | String, default `''` | Preselected target entity identifier |

**Events:** `close`, `saved`

#### `app-section-card` — `AppSectionCard`

`src/components/common/app-section-card/`

Card container with header (title, subtitle, actions slot) and body; optional collapsible mode. The icon slot renders a leading header graphic, header-left holds content at the left of the header, actions holds controls at the right, and the default slot is the section body.

| Property | Type / default | Description |
|---|---|---|
| `title` | String, default `''` | Section caption |
| `subtitle` | String, default `''` | Secondary line under the caption |
| `ariaLabel` | String, default `''` | Accessible name for the section region (aria-label); falls back to title when empty |
| `variant` | String, default `'default'` | Surface style: default / plain / elevated |
| `collapsible` | Boolean, default `false` | Enables collapse toggle in the header |
| `collapsed` | Boolean, default `false` | Current collapsed state (only for collapsible sections) |
| `maxHeight` | String, default `''` | CSS length ('26rem', '320px') capping the body height; the inner scrollbar activates on overflow |

**Events:** `toggle`

| Slot | Content |
|---|---|
| `icon` | Leading icon in the section header |
| `header-left` | Content at the left of the section header |
| `actions` | Controls at the right of the section header |
| `(default)` | Section body content |

| Child element | Role |
|---|---|
| `app-button` | Header control placed in the actions slot |
| `app-badge` | Count badge placed in the header-left slot |
| `app-material-icon` | Leading icon placed in the icon slot |

#### `app-segmented-switch` — `AppSegmentedSwitch`

`src/components/common/app-segmented-switch/`

Compact segmented control for switching between mutually exclusive views, timeframes, or filter modes. The default slot accepts declarative app-option children that append to the options prop.

| Property | Type / default | Description |
|---|---|---|
| `options` | Array, default `[]` | Segment definitions (value + label) |
| `dataSource` | String | Data source for segments: array, promise, or function returning an array (sync or async) |
| `value` | String, default `''` | Currently selected segment value |
| `size` | String, default `'md'` | Control height: sm / md / lg |
| `fullWidth` | Boolean, default `false` | Segments stretch to fill the container |
| `disabled` | Boolean, default `false` | Disables all segments |

**Events:** `change`

| Slot | Content |
|---|---|
| `(default)` | Declarative <app-option> children filling the segments (value, label, disabled, start / end graphics) |

| Child element | Role |
|---|---|
| `app-option` | Declarative segment (value, label, disabled, start / end slot graphics) appended to the options prop list |

#### `app-split-button` — `AppSplitButton`

`src/components/common/app-split-button/`

Dual-action button combining a primary action trigger with a secondary options menu. Canonical start / default / end slots carry leading graphics, label text, and trailing graphics; icon-start is a legacy alias of start. The default slot accepts declarative app-menu-item, app-menu-header, and app-menu-divider children.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `'Save'` | Main button caption |
| `variant` | String, default `'primary'` | Visual style of the main button |
| `size` | String, default `'md'` | Control height: sm / md / lg |
| `disabled` | Boolean, default `false` | Disables both halves of the button |
| `items` | Array, default `[]` | Menu items opened by the arrow half |

**Events:** `primary-click`, `select`

| Slot | Content |
|---|---|
| `start` | Content rendered before the main label (text, SVG icon, material icon) — centered vertically |
| `end` | Content rendered after the main label (text, SVG icon, material icon) — centered vertically |
| `icon-start` | Legacy alias of start |
| `(default)` | Optional declarative <app-menu-item>, <app-menu-header>, and <app-menu-divider> children |

| Child element | Role |
|---|---|
| `app-menu-header` | Section caption of the dropdown menu (declarative children replace the items prop) |
| `app-menu-item` | Menu row with label, icon, shortcut, checkable state, danger style |
| `app-menu-divider` | Horizontal separator between menu rows |
| `app-material-icon` | Icon rendered in the start / end slot before or after the main label |

#### `app-status-chip` — `AppStatusChip`

`src/components/common/app-status-chip/`

Domain-driven status chip: resolves label and badge variant from central STATUS_TOKENS registry.

| Property | Type / default | Description |
|---|---|---|
| `domain` | String, default `'task'` | Status vocabulary: task, contract, invoice, project, dueControl, ... |
| `status` | String, default `''` | Status code within the domain (rendered with its label and color) |
| `labelOverride` | String, default `''` | Custom label text rendered instead of the domain label; the badge variant stays domain-driven (empty = domain label) |
| `size` | String, default `'sm'` | Visual density: sm / md / lg |
| `appearance` | String, default `'soft'` | Rendering style: soft fill / solid / outline |
| `dot` | Boolean, default `false` | Shows a leading status dot |

#### `app-task-ai-panel` — `AppTaskAiPanel`

`src/components/common/app-task-ai-panel/`

Панель AI-ассистента для задач: автоматический подбор контекста из Базы знаний и Библиотеки документов, генерация структурированного описания и контекстный анализ рисков, трудоёмкости и подзадач через OpenAI-совместимый API.

| Property | Type / default | Description |
|---|---|---|
| `task` | Object | Task being analyzed |
| `analyses` | AnalysisSummary[], default `[]` | Saved analysis summaries, newest first; the panel renders each as app-analysis-summary |
| `clarifications` | Array, default `[]` | Clarification Q&A items |
| `compact` | Boolean, default `false` | Reduced layout for embedding inside modals |
| `timeSummary` | String, default `''` | Time-tracking summary rendered next to the analysis |
| `expenseSummary` | String, default `''` | Expense summary rendered next to the analysis |
| `discussionsSummary` | String, default `''` | Discussion summary rendered next to the analysis |

#### `app-toggle-button` — `AppToggleButton`

`src/components/common/app-toggle-button/`

Stateful pressable button supporting soft and solid active variants, icons, and accessibility aria-pressed. Canonical start / default / end slots carry leading graphics, label text, and trailing graphics; icon-start / icon-end are legacy aliases of start / end.

| Property | Type / default | Description |
|---|---|---|
| `pressed` | Boolean, default `false` | Pressed (toggled) visual state |
| `variant` | String, default `'soft'` | Visual style of the toggle surface |
| `size` | String, default `'md'` | Control height: sm / md / lg |
| `disabled` | Boolean, default `false` | Disables interaction |
| `iconOnly` | Boolean, default `false` | Renders only the icon, no text |
| `value` | String, default `''` | Group value emitted on toggle (for radio-style groups) |

**Events:** `change`

| Slot | Content |
|---|---|
| `start` | Content rendered before the label (text, SVG icon, material icon) — centered vertically |
| `(default)` | Button text — centered vertically |
| `end` | Content rendered after the label (text, SVG icon, material icon) — centered vertically |
| `icon-start` | Legacy alias of start |
| `icon-end` | Legacy alias of end |

| Child element | Role |
|---|---|
| `app-material-icon` | Icon rendered in the start / end slot before or after the label |

#### `card-footer` — `CardFooter`

`src/components/common/card-footer/`

Card footer row with a border-top chrome. Actions in the start slot align to the left edge of the card, actions in the end slot align to the right edge.

| Slot | Content |
|---|---|
| `start` | Actions aligned to the left edge of the card (app-button, labels, stat pills) |
| `end` | Actions aligned to the right edge of the card (app-button icon actions) |

| Child element | Role |
|---|---|
| `app-button` | Action button child placed in the start / end slot (size sm matches the historical card icon-btn) |

### Elements (4)

#### `app-button` — `AppButton`

`src/components/common/app-button/`

Interactive button with multiple semantic variants, sizes, and states. Canonical start / default / end slots carry leading graphics, label text, and trailing graphics; icon-start / icon-end are legacy aliases of start / end.

| Property | Type / default | Description |
|---|---|---|
| `variant` | String, default `'primary'` | Visual style: primary, secondary, outline, ghost, danger, icon (compact card action) |
| `size` | String, default `'md'` | Control height: sm / md / lg |
| `action` | String, default `'default'` | Business action driving the highlight color: default (neutral), view / edit / submit (accent), accept (success), delete / reject (danger), cancel (muted) |
| `disabled` | Boolean, default `false` | Disables interaction and dims the button |
| `loading` | Boolean, default `false` | Shows a spinner and blocks clicks |
| `iconOnly` | Boolean, default `false` | Renders only the start slot, no text; a button with only an icon becomes square automatically |
| `ariaLabel` | String, default `''` | Accessible name exposed as aria-label — for icon-only buttons and rows of icon actions where the label is graphical (the row title is mirrored here) |
| `type` | String, default `'button'` | Native HTML button type (button / submit) |

| Slot | Content |
|---|---|
| `start` | Content rendered before the label (text, SVG icon, material icon) — centered vertically |
| `(default)` | Button label text — centered vertically |
| `end` | Content rendered after the label (text, SVG icon, material icon) — centered vertically |
| `icon-start` | Legacy alias of start |
| `icon-end` | Legacy alias of end |

| Child element | Role |
|---|---|
| `app-material-icon` | Icon rendered in the start / end slot before or after the label |

#### `app-entity-emblem` — `AppEntityEmblem`

`src/components/common/app-entity-emblem/`

Графический идентификатор сущности (иконка + семантический цветовой акцент) для заголовков карточек, списков и хлебных крошек.

| Property | Type / default | Description |
|---|---|---|
| `entity` | String, default `'project'` | Тип сущности: project \| task \| requirement \| company \| counterparty \| contract \| calculation \| employee |
| `size` | String, default `'lg'` | Размер эмблемы: xs \| sm \| md \| lg |
| `variant` | String, default `'emblem'` | Режим отображения: emblem (квадрат с иконкой) \| pill (пилюля с подписью) |
| `color` | String, default `''` | Опциональный CSS-цвет акцента (например, цвет проекта) |

#### `app-link` — `AppLink`

`src/components/common/app-link/`

Text link with the canonical start / default / end slot API. Renders an anchor when href is set, a button-style link otherwise.

| Property | Type / default | Description |
|---|---|---|
| `href` | String, default `''` | Link target; with href the element renders as an anchor |
| `target` | String, default `''` | Anchor target (_blank adds rel="noopener noreferrer") |
| `variant` | String, default `'primary'` | Visual style: primary, secondary, danger |
| `size` | String, default `'md'` | Font scale sm / md / lg from the canonical control tokens |
| `disabled` | Boolean, default `false` | Blocks activation and dims the link |
| `ariaLabel` | String, default `''` | Accessible name (aria-label); falls back to title when empty |
| `active` | Boolean, default `false` | Segmented pill state: fills the link with the --link-active-bg hook. Default false keeps every existing consumer pixel-identical |

| Slot | Content |
|---|---|
| `start` | Content rendered before the label (text, SVG icon, material icon) — centered vertically |
| `(default)` | Link label text — centered vertically |
| `end` | Content rendered after the label (text, SVG icon, material icon) — centered vertically |

| Child element | Role |
|---|---|
| `app-material-icon` | Icon rendered in the start / end slot before or after the link label |

#### `app-tags-row` — `AppTagsRow`

`src/components/common/app-tags-row/`

Canonical tags row for document cards, preview bars and readonly displays. The component owns the chip list, the inline add form draft and the add button that toggles it; views pass the tags array, pick a mode (readonly shows plain chips without any editing UI, add-button shows editable chips with an add button opening the inline form, add-form shows editable chips with the form always open) and receive tag-remove / tag-add events carrying { tag } so they write to the store themselves. showEmptyLabel renders the no-tags hint for an empty list.

| Property | Type / default | Description |
|---|---|---|
| `tags` | Array, default `[]` | Tag strings rendered as chips (source of truth, never mutated by the component); combines with declarative app-option children |
| `mode` | — | readonly = plain chips; add-button = editable chips + add button opening the inline form; add-form = editable chips with the inline form always open |
| `showEmptyLabel` | Boolean, default `false` | Render the no-tags hint when the list is empty (preview bars) |

**Events:** `tag-add`, `tag-remove`

### Inputs (9)

#### `app-checkbox` — `AppCheckbox`

`src/components/common/app-checkbox/`

Checkbox element with checked, unchecked, indeterminate, and disabled states. The default slot overrides the label property with custom label markup.

| Property | Type / default | Description |
|---|---|---|
| `checked` | Boolean, default `false` | Checked state of the box |
| `indeterminate` | Boolean, default `false` | Mixed (partial selection) state — square dash instead of tick |
| `disabled` | Boolean, default `false` | Disables interaction |
| `label` | String, default `''` | Text next to the box |

**Events:** `change`

| Slot | Content |
|---|---|
| `(default)` | Label text next to the box (overrides the label property) |

#### `app-color-swatches` — `AppColorSwatches`

`src/components/common/app-color-swatches/`

Canonical color swatch picker. A row of round color buttons rendered from a palette array; the component owns the active highlight and a change event carrying { value } so the opening form writes the picked hex into its own field. Used by the project create/edit form for the project color; any view needing a fixed palette choice can pass its own colors array.

| Property | Type / default | Description |
|---|---|---|
| `colors` | Array, default `[]` | Palette of hex color strings rendered as round swatch buttons |
| `value` | String, default `''` | Currently selected hex (highlighted swatch) |

**Events:** `change`

#### `app-combobox` — `AppCombobox`

`src/components/common/app-combobox/`

Searchable multi-tag combobox input with autocomplete and tag removal. The default slot accepts declarative app-option children whose labels append to the items prop.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `''` | Caption above the field |
| `items` | Array, default `[]` | Suggestion item definitions (value + label) |
| `dataSource` | String | Data source for suggestions: array, promise, or function returning an array (sync or async) |
| `selected` | Array, default `[]` | Currently selected values |
| `placeholder` | String, default `'Add tag or filter...'` | Text shown in the input when empty |
| `allowCustom` | Boolean, default `true` | Typing a new value offers "+ Add" to create it |
| `size` | String, default `'md'` | Control size scale sm\|md\|lg (30/38/44px min-heights, md default) |

**Events:** `change`

| Slot | Content |
|---|---|
| `(default)` | Declarative <app-option> children adding suggestions (label is the suggestion text) |

| Child element | Role |
|---|---|
| `app-option` | Declarative suggestion (label is the suggestion text) appended to the items prop list |

#### `app-entity-selector` — `AppEntitySelector`

`src/components/common/app-entity-selector/`

Searchable portal selector for large collections (tasks, employees, counterparties, contracts) with multi-token filtering, match highlighting, secondary metadata, and windowed rendering. The default slot accepts declarative app-option children that append to the options prop.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `''` | Caption above the field |
| `value` | String, default `''` | Id of the currently selected entity |
| `options` | Array, default `[]` | Entity option definitions (id, label, meta) |
| `dataSource` | String | Data source for options: array, promise, or function returning an array (sync or async) |
| `placeholder` | String, default `''` | Text shown when nothing is selected |
| `searchPlaceholder` | String, default `''` | Placeholder inside the search box of the panel |
| `size` | String, default `'md'` | Control height: sm / md / lg |
| `disabled` | Boolean, default `false` | Disables the selector |
| `required` | Boolean, default `false` | Marks the field as required |
| `clearable` | Boolean, default `false` | Shows a clear (×) button when a value is selected |
| `showSelectedDetails` | Boolean, default `true` | Renders meta details of the selected entity under the field |
| `maxVisible` | Number, default `80` | Maximum options rendered in the panel at once |
| `error` | String, default `''` | Error message; renders the field in danger state |
| `hint` | String, default `''` | Helper text below the field |

**Events:** `change`, `search-change`

| Slot | Content |
|---|---|
| `(default)` | Declarative <app-option> children filling the option list (value, label, code, subtitle, meta, badge, avatar, keywords, start / end graphics) |

| Child element | Role |
|---|---|
| `app-option` | Declarative entity row (value, label, code, subtitle, meta, badge, avatar, keywords, start / end slot graphics) appended to the options prop list and included in the search filter |

#### `app-input` — `AppInput`

`src/components/common/app-input/`

Single-line text input field supporting labels, helpers, errors, and clear buttons. The icon slot renders a leading graphic inside the field.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `''` | Caption above the field |
| `placeholder` | String, default `''` | Placeholder text shown when empty |
| `value` | String, default `''` | Current input value |
| `type` | String, default `'text'` | Native input type (text, email, password, number, ...) |
| `required` | Boolean, default `false` | Marks the field as required (asterisk in label) |
| `disabled` | Boolean, default `false` | Disables editing |
| `error` | String, default `''` | Error message; renders the field in danger state |
| `helper` | String, default `''` | Helper text below the field |
| `clearable` | Boolean, default `false` | Shows a clear (×) button when the field has a value |
| `size` | String, default `'md'` | Control size scale sm\|md\|lg (30/38/44px heights, md default) |

**Events:** `input`, `change`

| Slot | Content |
|---|---|
| `icon` | Leading icon inside the field |

| Child element | Role |
|---|---|
| `app-material-icon` | Icon rendered in the leading icon slot inside the field |

#### `app-number-input` — `AppNumberInput`

`src/components/common/app-number-input/`

Numeric input with increment/decrement steppers, boundaries, and optional unit indicator.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `''` | Caption above the field |
| `value` | Number, default `0` | Current numeric value |
| `min` | Number, default `0` | Minimum allowed value |
| `max` | Number, default `1000` | Maximum allowed value |
| `step` | Number, default `1` | Increment for the stepper buttons |
| `unit` | String, default `''` | Unit suffix rendered inside the field |
| `size` | String, default `'md'` | Control height: sm / md / lg |
| `disabled` | Boolean, default `false` | Disables editing and steppers |

**Events:** `change`

#### `app-select` — `AppSelect`

`src/components/common/app-select/`

Custom dropdown select with indicator dots, keyboard navigation, and smooth popover. The default slot accepts declarative app-option children that append to the options prop.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `''` | Caption above the field |
| `value` | String, default `''` | Currently selected option value |
| `options` | Array, default `[]` | Option definitions (value + label) |
| `dataSource` | String | Data source for options: array, promise, or function returning an array (sync or async) |
| `disabled` | Boolean, default `false` | Disables the dropdown |
| `placeholder` | String, default `'Select...'` | Text shown when nothing is selected |
| `size` | String, default `'md'` | Control size scale sm\|md\|lg (30/38/44px heights, md default) |

**Events:** `change`

| Slot | Content |
|---|---|
| `(default)` | Declarative <app-option> children filling the dropdown list |

| Child element | Role |
|---|---|
| `app-option` | Declarative option row (value, label, color, start / end slot graphics) appended to the options prop list |

#### `app-switch` — `AppSwitch`

`src/components/common/app-switch/`

Toggle switch for boolean settings and feature flags. The default slot overrides the label property with custom label markup. Three additive hook groups extend it: size takes the canonical control scale sm\|md\|lg, frame draws a control box around the switch (the app-input geometry) so the switch can be placed in a modal exactly like a regular input, and field-label / field-label-style attach an external label row to that frame. All hooks default to the historical bare switch (size md, frame none, field-label-style none), so every existing consumer stays pixel-identical, and the caption inside the control behaves as before in every variant. The geometry lives in tokens — --switch-track-width (40px), --switch-track-height (22px), --switch-thumb-size (18px), --switch-thumb-offset (2px), --switch-thumb-travel (18px), --switch-caption-font-size (0.8125rem), --switch-gap (0.65rem) — and the frame box through --switch-frame-height (var(--control-height-md, 38px)), --switch-frame-bg (var(--bg-surface, #111827)), --switch-frame-border (1px solid var(--border-subtle, #334155)), --switch-frame-radius (var(--radius-md, 8px)) and --switch-frame-padding (0 0.75rem); the gap between the external label row and the control is --switch-label-gap (0.35rem, the app-input form-group gap). For frame=transparent the background and border are forced transparent regardless of the tokens.

| Property | Type / default | Description |
|---|---|---|
| `checked` | Boolean, default `false` | On/off state of the switch (boolean, default false) |
| `disabled` | Boolean, default `false` | Disables interaction (boolean, default false) |
| `label` | String, default `''` | Caption inside the control, next to the track (string; the default slot overrides it with custom markup) |
| `size` | String, default `'md'` | Control size scale (string, default md). Values: sm = 30px frame height, track 34x18px, thumb 14px, caption 0.75rem, gap 0.5rem, frame padding 0 0.6rem; md = the historical geometry — 38px frame height, track 40x22px, thumb 18px, caption 0.8125rem, gap 0.65rem, frame padding 0 0.75rem (default); lg = 44px frame height, track 46x26px, thumb 22px, caption 0.875rem, gap 0.8rem, frame padding 0 1rem. The frame heights follow the root control-height tokens (--control-height-sm/md/lg) |
| `frame` | String, default `'none'` | Frame variant (string, reflected as an attribute). Values: none = no frame, the bare switch (default); normal = the app-input control box around the switch — height var(--control-height-md, 38px), background var(--bg-surface), border 1px var(--border-subtle), radius var(--radius-md), padding 0 0.75rem, full row width; transparent = the identical box with background and border transparent, so the switch occupies a form row like an input without visible chrome |
| `fieldLabel` | String, default `''` | Text of the external label row attached to the frame (string). With field-label-style normal an empty text renders no row; with ghost an empty invisible row is rendered so the grid place is kept |
| `fieldLabelStyle` | — | External label row style (string, reflected as the field-label-style attribute). Values: none = no external label row (default); normal = visible row above the control with the app-input label typography (font-size 0.8125rem, font-weight 500, color var(--text-secondary)); ghost = the same row rendered invisible (visibility hidden) so it keeps its place in the form grid |

**Events:** `change`

| Slot | Content |
|---|---|
| `(default)` | Label text next to the switch (overrides the label property) |

#### `app-textarea` — `AppTextarea`

`src/components/common/app-textarea/`

Multiline text input with character counting, custom row limits, and auto-styling.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `''` | Caption above the field |
| `placeholder` | String, default `''` | Placeholder text shown when empty |
| `value` | String, default `''` | Current textarea value |
| `rows` | Number, default `3` | Visible row count (initial height) |
| `required` | Boolean, default `false` | Marks the field as required |
| `disabled` | Boolean, default `false` | Disables editing |
| `error` | String, default `''` | Error message; renders the field in danger state |
| `maxlength` | Number, default `0` | Maximum character count (0 = unlimited); shows a counter when set |
| `monospace` | Boolean, default `false` | Renders the text in the mono font family with tabular numerals — for code, rrule strings, file names and other literal values |

**Events:** `input`, `change`

### Layout (2)

#### `app-detail-shell` — `AppDetailShell`

`src/components/common/app-detail-shell/`

Shared skeleton of the entity detail views: top navigation bar (back button, entity switcher, action slots), overview card (emblem, title block, KPI strip, context grid) and page shell layout. The view supplies every piece of content through named slots; labels come from the view i18n section, and the shell emits `detail-back` and `entity-switch` so the view decides which entity to open.

| Property | Type / default | Description |
|---|---|---|
| `backLabel` | String, default `''` | Label of the back button (view i18n) |
| `switcherPlaceholder` | String, default `''` | Entity switcher placeholder (view i18n) |
| `switcherOptions` | EntitySelectorOption[], default `[]` | Options rendered by the entity switcher |
| `switcherValue` | String, default `''` | Id of the entity currently displayed |
| `entity` | String, default `'project'` | Emblem kind rendered in the hero identity |

**Events:** `detail-back`

| Slot | Content |
|---|---|
| `(default)` | Section cards and panels rendered below the overview card |
| `nav-actions` | Action buttons on the right of the top navigation bar |
| `hero-meta` | Content of the hero meta row (emblem pill, date, category, project link) |
| `title` | Content of the title row (heading, status chip, badges) |
| `hero-sub` | Secondary hero line (vendor and user, description, tags) |
| `hero-side` | Control placed to the right of the hero identity (status select) |
| `kpi` | KPI cells rendered inside the bordered KPI strip |
| `context` | Meta boxes rendered inside the context grid |

| Child element | Role |
|---|---|
| `app-button` | Action button in nav-actions (variant outline / primary / ghost, icon-start slot) |
| `app-link` | Linked meta value with the link-btn / meta-link token overrides |
| `app-status-chip` | Domain status chip inside the title row |
| `app-badge` | Secondary badge inside the title row |
| `app-persona` | User persona (avatar + presence badge) in the hero sub line |
| `app-section-card` | Panel below the overview card |
| `app-entity-emblem` | Emblem pill inside the hero meta row |

#### `app-page-header` — `AppPageHeader`

`src/components/common/app-page-header/`

Standard page header with title, subtitle, optional leading icon, and an actions zone on the right. The icon slot renders the leading graphic, the default slot adds extra content under the title, and the actions slot hosts action buttons on the right.

| Property | Type / default | Description |
|---|---|---|
| `title` | String, default `''` | Page caption |
| `subtitle` | String, default `''` | Secondary description line under the caption |

| Slot | Content |
|---|---|
| `icon` | Leading page icon (28px recommended) |
| `(default)` | Extra content under the title and subtitle |
| `actions` | Action buttons on the right of the header |

| Child element | Role |
|---|---|
| `app-button` | Action button placed in the actions slot |
| `app-material-icon` | Leading icon placed in the icon slot |

### Overlays (15)

#### `app-calculation-form` — `AppCalculationForm`

`src/components/common/app-calculation-form/`

Canonical calculation create and edit form. The component owns the contract picker, number, frequency, period start and end, quick period presets, include prior unaccounted, the collected items editor with billable rows, status and report notes, writes the calculation to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills the active contract, its billing frequency, the default period for that frequency, the next calc number, draft status and the notes template.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the form modal (rendered through the portal) |
| `calculation` | Calculation | null, default `null` | Calculation being edited (null = create mode) |
| `presetContractId` | string | null, default `null` | Contract prefilled for a context-bound opening (first active by default) |
| `showContractSelect` | Boolean, default `false` | Show the contract picker (list view openings) |
| `contextTitle` | String, default `''` | Modal title override for context-bound openings |

**Events:** `close`, `saved`

#### `app-company-form` — `AppCompanyForm`

`src/components/common/app-company-form/`

Canonical company create and edit form. The component owns the twelve fields, writes the company to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. The short name is required, an empty legal name falls back to it.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the form modal (rendered through the portal) |
| `company` | Company | null, default `null` | Company being edited (null = create mode) |

**Events:** `close`, `saved`

#### `app-contract-form` — `AppContractForm`

`src/components/common/app-contract-form/`

Canonical contract create and edit form. The component owns all fourteen fields, writes the contract to the store itself on save and emits a saved event with the written record; any close, including cancel, save and backdrop, dispatches a close event so the opening view resets its flag. Every opening renders the same field set; presets fill company, counterparty, project, status and the modal title.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the form modal (rendered through the portal) |
| `contract` | Contract | null, default `null` | Contract being edited (null = create mode) |
| `presetCounterpartyId` | String, default `''` | Counterparty prefilled for a quick opening |
| `presetProjectId` | String, default `''` | Project prefilled for a context-bound opening |
| `presetStatus` | String, default `'draft'` | Status a newly created contract starts with (draft by default) |
| `contextTitle` | String, default `''` | Modal title override for context-bound openings |

**Events:** `close`, `saved`

#### `app-counterparty-form` — `AppCounterpartyForm`

`src/components/common/app-counterparty-form/`

Canonical counterparty create and edit form. The component owns the twelve fields, writes the counterparty to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. The short name is required, rating stays clamped to one through five.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the form modal (rendered through the portal) |
| `counterparty` | Counterparty | null, default `null` | Counterparty being edited (null = create mode) |

**Events:** `close`, `saved`

#### `app-decompose-form` — `AppDecomposeForm`

`src/components/common/app-decompose-form/`

Схема данных, контракты API и выбор библиотек

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the draft editor modal (rendered through the portal) |
| `requirementIds` | string[], default `[]` | Requirement ids to decompose, also the fallback links for drafts without requirement ids |
| `decompose` | — | Public async method running the AI decomposition and opening the editor |
| `openWithDrafts` | — | Public method opening the editor with a prepared draft list (drafts, model, projectId) |

**Events:** `close`, `decompose-failed`, `saved`

#### `app-document-form` — `AppDocumentForm`

`src/components/common/app-document-form/`

Canonical document create and edit form. The component owns the file dropzone for uploads, the title, file name, category, status, scope with its conditional entity selector, uploading employee, AI summary bar, tags, description, text content and version note, writes the document to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills draft status, spec category, the target company, the current employee and the initial version note.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the form modal (rendered through the portal) |
| `document` | DocumentItem | null, default `null` | Document being edited (null = create mode, dropzone shown) |
| `presetCompanyId` | string | null, default `null` | Company prefilled for a context-bound opening (first company by default) |
| `presetProjectId` | string | null, default `null` | Project prefilled for a context-bound opening, switches the scope to project |
| `presetContractId` | string | null, default `null` | Contract prefilled for a context-bound opening |
| `presetCategory` | DocumentCategory | null, default `null` | Category prefilled for a quick upload (spec by default) |
| `presetStatus` | DocumentStatus | null, default `null` | Status prefilled for a quick upload (draft by default) |
| `presetTags` | String, default `''` | Tags prefilled for a quick upload (empty by default) |
| `contextTitle` | String, default `''` | Modal title override for context-bound openings |

**Events:** `close`, `saved`

#### `app-employee-form` — `AppEmployeeForm`

`src/components/common/app-employee-form/`

Canonical employee create and edit form. The component owns the ten fields, writes the employee to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. The full name is required, editing keeps the avatar of the existing record.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the form modal (rendered through the portal) |
| `employee` | User | null, default `null` | Employee being edited (null = create mode) |

**Events:** `close`, `saved`

#### `app-expense-form` — `AppExpenseForm`

`src/components/common/app-expense-form/`

Canonical expense create and edit form. The component owns the twelve fields of title project linked task category submitted by amount currency date status vendor billable and notes, writes the expense to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills the target project today infrastructure category 15000 amount RUB currency pending status and billable on.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the form modal (rendered through the portal) |
| `expense` | Expense | null, default `null` | Expense being edited (null = create mode) |
| `presetProjectId` | string | null, default `null` | Project prefilled for a context-bound opening (first project by default) |
| `presetTaskId` | string | null, default `null` | Linked task prefilled for a context-bound opening |
| `presetUserId` | string | null, default `null` | Submitter prefilled for a context-bound opening (first user by default) |
| `contextTitle` | String, default `''` | Modal title override for context-bound openings |

**Events:** `close`, `saved`

#### `app-modal` — `AppModal`

`src/components/common/app-modal/`

Customizable modal dialog with backdrop blur, customizable sizes, header, and footer actions. The title slot replaces the header caption, the default slot is the modal body, and the footer slot hosts footer buttons.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the modal (rendered through the portal) |
| `title` | String, default `''` | Header caption |
| `size` | String, default `'md'` | Modal width preset: sm / md / lg |
| `hideClose` | Boolean, default `false` | Hides the header close (×) button |
| `headerIcon` | Object, default `null` | Icon descriptor rendered before the title |

**Events:** `close`

| Slot | Content |
|---|---|
| `title` | Custom header content replacing the title text |
| `(default)` | Modal body content |
| `footer` | Footer area (buttons) |

| Child element | Role |
|---|---|
| `app-form-grid` | Form field grid rendered in the modal body |
| `app-button` | Footer action button placed in the footer slot |
| `app-input` | Text field child of the modal body |
| `app-select` | Dropdown select child of the modal body |
| `app-textarea` | Multiline text field child of the modal body |

#### `app-modal-portal` — `AppModalPortal`

`src/components/common/app-modal-portal/`

Fixed full-viewport portal overlay hosting modals, drawers, and popups while blocking background scroll and pointer events below in z-order.

#### `app-payment-form` — `AppPaymentForm`

`src/components/common/app-payment-form/`

Canonical payment registration form supporting incoming and outgoing payments, linked companies, company & counterparty bank requisites, and optional invoice reconciliation.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the form modal (rendered through the portal) |
| `invoice` | Invoice | null, default `null` | Optional target invoice the payment is recorded against |
| `payment` | InvoicePayment | null, default `null` | Existing InvoicePayment to edit (attribute: false, property binding only); null opens the create form |
| `payableInvoices` | Invoice[], default `[]` | Invoices the target selector may switch between |
| `defaultDirection` | String, default `'incoming'` | Initial direction for standalone payments (incoming \| outgoing) |
| `defaultCompanyId` | String, default `''` | Initial company ID for standalone payments |
| `defaultCounterpartyId` | String, default `''` | Initial counterparty ID for standalone payments |

**Events:** `close`, `saved`

#### `app-project-form` — `AppProjectForm`

`src/components/common/app-project-form/`

Canonical project create and edit form. The component owns the ten fields of name key status due date company counterparty budget progress color swatches and description, writes the project to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Presets fill company counterparty status key budget title and the save button caption.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the form modal (rendered through the portal) |
| `project` | Project | null, default `null` | Project being edited (null = create mode) |
| `presetCompanyId` | string | null, default `null` | Company prefilled for a context-bound opening |
| `presetCounterpartyId` | string | null, default `null` | Counterparty prefilled for a quick opening |
| `presetStatus` | ProjectStatus | null, default `null` | Status a newly created project starts with (planning by default) |
| `presetKey` | string | null, default `null` | Key prefilled for a quick opening |
| `presetBudget` | number | null, default `null` | Budget prefilled for a quick opening |
| `contextTitle` | String, default `''` | Modal title override for context-bound openings |
| `saveLabel` | String, default `''` | Primary button caption override (Создать for quick openings) |
| `saveDisabled` | Boolean, default `false` | Disables the primary save button while the modal stays open (attribute binding) |
| `beforeSave` | ((data: { name: string; key: string }) => Promise<boolean>) | null, default `null` | Async hook run before saving (attribute: false): receives { name, key } and returns Promise<boolean>; false cancels the save and keeps the form open |
| `extraContent` | TemplateResult | null, default `null` | TemplateResult rendered in an extra section of the body — create mode only (attribute: false) |
| `footerExtra` | TemplateResult | null, default `null` | TemplateResult rendered in the modal footer before the primary button (attribute: false) |

**Events:** `close`, `saved`

#### `app-requirement-form` — `AppRequirementForm`

`src/components/common/app-requirement-form/`

Canonical requirement create and edit form. The component owns the eleven fields of project code type category priority status source spec document linked knowledge articles title description and acceptance criteria, writes the requirement to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills the target project, its spec document, the next FR code, functional type Core category high priority and approved status.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the form modal (rendered through the portal) |
| `requirement` | ProjectRequirement | null, default `null` | Requirement being edited (null = create mode) |
| `presetProjectId` | string | null, default `null` | Project prefilled for a context-bound opening (first project by default) |

**Events:** `close`, `saved`

#### `app-task-modal` — `AppTaskModal`

`src/components/common/app-task-modal/`

Comprehensive task creation and editing modal dialog with subtasks, dates, and assignees.

| Property | Type / default | Description |
|---|---|---|
| `isOpen` | — | Opens the full task editor modal |
| `editingTask` | — | Task being edited (null = create mode) |
| `currentLang` | — | UI language of the form |

#### `app-time-entry-form` — `AppTimeEntryForm`

`src/components/common/app-time-entry-form/`

Canonical time entry create and edit form. The component owns the nine fields of project task employee date done hours spent category status billable and work description, writes the entry to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills the target project its first task today two hours development category logged status and billable on.

| Property | Type / default | Description |
|---|---|---|
| `open` | Boolean, default `false` | Opens the form modal (rendered through the portal) |
| `entry` | TimeEntry | null, default `null` | Entry being edited (null = create mode) |
| `presetProjectId` | string | null, default `null` | Project prefilled for a context-bound opening (first project by default) |
| `presetTaskId` | string | null, default `null` | Task prefilled for a context-bound opening (first task of the project by default) |
| `presetUserId` | string | null, default `null` | Employee prefilled for a context-bound opening (first user by default) |
| `contextTitle` | String, default `''` | Modal title override for context-bound openings |

**Events:** `close`, `saved`

### Feedback (3)

#### `app-activity-panel` — `AppActivityPanel`

`src/components/common/app-activity-panel/`

Slide-out drawer containing real-time chronological audit trail of all project events.

| Property | Type / default | Description |
|---|---|---|
| `logs` | — | Activity log entries rendered in the panel |
| `isOpen` | — | Panel open state |
| `currentLang` | — | UI language |

#### `app-empty-state` — `AppEmptyState`

`src/components/common/app-empty-state/`

Dashed-border placeholder for empty lists and tables with icon, title, message, and optional action. The icon slot renders an illustration graphic above the title, and the action slot hosts a button below the message.

| Property | Type / default | Description |
|---|---|---|
| `title` | String, default `''` | Headline of the empty state |
| `message` | String, default `''` | Secondary explanation text |
| `compact` | Boolean, default `false` | Reduced padding and typography for use inside cards |

| Slot | Content |
|---|---|
| `icon` | Illustration icon above the title |
| `action` | Optional action button below the message |

| Child element | Role |
|---|---|
| `app-button` | Action button placed in the action slot |
| `app-material-icon` | Illustration icon placed in the icon slot |

#### `app-toast` — `AppToast`

`src/components/common/app-toast/`

Automated floating notification stack with auto-dismiss and status colors.

| Property | Type / default | Description |
|---|---|---|
| `notifications` | — | Notification queue rendered as stacked toasts (type, title, message) |

### Other (3)

#### `app-data-table` — `AppDataTable`

`src/components/common/app-data-table/`

Data table with a fixed header and footer. Columns are declared as child app-table-column elements (field-driven formatting, mono/code cells, custom cellRender for rich cells and row actions). Sorting and pagination are internal: sortable headers sort the rows and emit sort-change, rows are sliced by page-size and the footer shows app-pagination whenever the table is not empty — even with a single page it hosts the page-size selector, so rows-per-page can always be changed from the footer. The table stretches to display all rendered rows; max-height caps the host so the body gets its own scrollbar.

| Property | Type / default | Description |
|---|---|---|
| `rows` | Record<string, unknown>[], default `[]` | Array of row objects rendered by the table |
| `page-size` | Number, default `10` | Rows per page for the internal pagination (default 10) |
| `page` | Number, default `1` | Initial page number (clamped to the available pages) |
| `sort-by` | String, default `''` | Field currently sorted; its header shows the active arrow |
| `sort-dir` | String, default `'asc'` | Current sort direction: asc / desc |
| `max-height` | Number, default `0` | Host height cap in px; 0 (default) stretches the table to show all rendered rows, a positive value gives the body its own scrollbar |
| `empty-title` | String, default `''` | Title passed to the compact empty state when rows is empty |
| `locale` | String, default `'ru-RU'` | Locale used for number formatting and the pagination summary |
| `sort-change event` | — | Emitted with detail { field, dir } when a header sort button is clicked |
| `page-change event` | — | Emitted with detail { page, pageSize, totalItems } when pagination changes |
| `page-size-change event` | — | Emitted with detail { page: 1, pageSize, totalItems } when the footer page-size selector changes; rows are re-sliced at the new size and the page resets to 1 |
| `selectable` | Boolean, default `false` | Leading checkbox column keyed by key-field (default id); header cell stays empty, select-all lives in the consumer toolbar |
| `key-field` | String, default `'id'` | Row field used as the selection key (default id) |
| `selected-keys` | Array, default `[]` | Array of currently selected row keys (property binding); toggling a checkbox updates it and emits selection-change |
| `selectedItems getter` | — | Rows whose key is in selectedKeys — the consumer reads the selection back from the table |
| `selection-change event` | — | Emitted with detail { selectedIds, selectedItems } when a row checkbox toggles |
| `row-click event` | — | Emitted with detail { row } when a row is activated; clicks on checkboxes, buttons and links inside cells do not activate the row |
| `contentStyles` | String | Additive hook: view-local CSS (string or CSSResult) injected into the shadow root as a <style> element for the cellRender content; default empty keeps consumers pixel-identical |

#### `app-table-column` — `AppTableColumn`

`src/components/common/app-table-column/` (без стори)

| Property | Type / default | Description |
|---|---|---|
| `field` | String, default `''` | — |
| `label` | String, default `''` | — |
| `type` | String, default `'text'` | — |
| `options` | ColumnOption[], default `[]` | — |
| `align` | String, default `'left'` | — |
| `mono` | Boolean, default `false` | — |
| `code` | Boolean, default `false` | — |
| `sortable` | Boolean, default `false` | — |
| `yesLabel` | String, default `''` | — |
| `noLabel` | String, default `''` | — |
| `cellRender` | String | — |
| `valueFn` | String | — |

**Events:** `column-change`

#### `app-table-scroll` — `AppTableScroll`

`src/components/common/app-table-scroll/`

| Property | Type / default | Description |
|---|---|---|
| `rows` | Record<string, unknown>[], default `[]` | Array of row objects rendered by the table |
| `sort-by` | String, default `''` | Field name currently used for sorting (arrow shown on its header) |
| `sort-dir` | String, default `'asc'` | Current sort direction: asc / desc |
| `active-key` | String, default `'isActive'` | Row property holding the active flag; falsy rows render as is-inactive |
| `empty-title` | String, default `''` | Title passed to the compact empty state when rows is empty |
| `locale` | String, default `'ru-RU'` | Locale used for number formatting (t.common.locale) |
| `striped` | Boolean, default `false` | Enables alternating row background coloring (zebra striping) |
| `sort-change event` | — | Emitted with detail { field, dir } when a header sort button is clicked |

## 5. Группа `layout` (4)

### Layout (4)

#### `app-header` — `AppHeader`

`src/components/layout/app-header/`

Top header bar with breadcrumbs, live search, quick notification badge, and primary action CTA.

| Property | Type / default | Description |
|---|---|---|
| `activeView` | — | Currently active view id (drives the breadcrumb) |
| `selectedProjectId` | — | Project filter selection in the breadcrumb |
| `detailProjectId` | — | Project id shown on detail pages |
| `detailContractId` | — | Contract id shown on detail pages |
| `detailTaskId` | — | Task code shown on detail pages |
| `theme` | — | Current theme (dark / light / cyberpunk / matrix / barbie / high-contrast) |
| `currentLang` | — | UI language |
| `activityCount` | — | Badge count in the activity button |
| `searchQuery` | — | Global search text |

#### `app-sidebar` — `AppSidebar`

`src/components/layout/app-sidebar/`

Collapsible navigation sidebar composed declaratively with <sidebar-group> and <sidebar-item> elements, supporting single (accordion) and multiple group expansion modes.

| Property | Type / default | Description |
|---|---|---|
| `collapsed` | Boolean, default `store.customization.sidebarCollapsed` | Icon-only sidebar width |
| `activeValue` | String, default `''` | Value of the currently active item |
| `groupMode` | String, default `store.customization.sidebarGroupMode` | Group behavior: single (accordion) / multiple |
| `standalone` | Boolean, default `false` | Rendered outside app-root (manages its own state) |
| `theme` | — | Current theme for icon accents |
| `currentLang` | — | UI language |
| `selectedProjectId` | — | Project filter selection shown in the projects group |

| Child element | Role |
|---|---|
| `sidebar-group` | Collapsible navigation group container composing the sidebar menu |
| `sidebar-item` | Navigation item with icon, badge, and active state (inside a sidebar-group) |

#### `sidebar-group` — `SidebarGroup`

`src/components/layout/sidebar-group/`

Collapsible navigation group container for <app-sidebar> supporting smooth CSS collapse animations and active-route indicator. The default slot accepts sidebar-item children.

| Property | Type / default | Description |
|---|---|---|
| `groupId` | String, default `''` | Stable group id used by the sidebar controller |
| `label` | String, default `''` | Group caption |
| `expanded` | Boolean, default `true` | Group is expanded (items visible) |
| `collapsed` | Boolean, default `false` | Sidebar is in icon-only mode |
| `hasActive` | Boolean, default `false` | Group contains the active item |

**Events:** `sidebar-group-toggle`

| Slot | Content |
|---|---|
| `(default)` | Sidebar items of the group |

| Child element | Role |
|---|---|
| `sidebar-item` | Navigation item with icon, badge, and active state rendered inside the group |

#### `sidebar-item` — `SidebarItem`

`src/components/layout/sidebar-item/`

Declarative navigation item component used to compose <app-sidebar> menus with icons, badges, and collapsed mode. Canonical start / default / end slots carry leading graphics, label markup, and trailing content; icon is a legacy alias of start.

| Property | Type / default | Description |
|---|---|---|
| `value` | String, default `''` | View id emitted when the item is clicked |
| `label` | String, default `''` | Item caption |
| `badge` | String, default `''` | Count badge on the right side |
| `active` | Boolean, default `false` | Item is the current view |
| `collapsed` | Boolean, default `false` | Sidebar is in icon-only mode |
| `disabled` | Boolean, default `false` | Item is not clickable |
| `icon` | String | Leading icon (SVG template) |

**Events:** `sidebar-select`

| Slot | Content |
|---|---|
| `start` | Content rendered before the label (text, SVG icon, material icon) — centered vertically |
| `(default)` | Item label markup (overrides the label property) |
| `end` | Content rendered after the label (text, SVG icon, material icon) — centered vertically |
| `icon` | Legacy alias of start |

| Child element | Role |
|---|---|
| `app-material-icon` | Icon rendered in the start / end slot before or after the item label |

## 6. Группа `dashboard` (4)

### Dashboard (4)

#### `app-chart-card` — `AppChartCard`

`src/components/dashboard/app-chart-card/`

Pure CSS & SVG visualization widget supporting horizontal bar charts, segmented donut charts, and area line trends. The actions slot renders controls at the right of the chart header.

| Property | Type / default | Description |
|---|---|---|
| `title` | String, default `''` | Chart caption |
| `subtitle` | String, default `''` | Secondary line under the caption |
| `type` | String, default `'bar'` | Chart type: bar / line / donut |
| `data` | Array, default `[]` | Data points (label + value) |
| `centerLabel` | String, default `''` | Caption in the middle of a donut chart |

| Slot | Content |
|---|---|
| `actions` | Controls at the right of the chart header |

| Child element | Role |
|---|---|
| `app-button` | Header control placed in the actions slot at the right of the chart header |

#### `app-metric-card` — `AppMetricCard`

`src/components/dashboard/app-metric-card/`

Executive KPI summary card featuring tabular numerals, trend delta, and optional inline SVG sparkline. The icon slot renders a leading graphic before the metric label.

| Property | Type / default | Description |
|---|---|---|
| `label` | String, default `''` | Metric caption |
| `value` | String, default `'0'` | Main value text |
| `delta` | String, default `''` | Change indicator text (e.g. +12%) |
| `trend` | String, default `'neutral'` | Delta color semantics: neutral / up / down |
| `subtitle` | String, default `''` | Secondary line under the value |
| `accentColor` | String, default `'var(--accent-primary, #6366f1)'` | Accent color of the card edge |
| `valueColor` | String, default `''` | Explicit color of the value text |
| `sparkline` | Array, default `[]` | Sparkline data points (small numbers) |
| `clickable` | Boolean, default `false` | Card emits a click event |
| `size` | String, default `'full'` | full = with sparkline; compact = label + value only |

| Slot | Content |
|---|---|
| `icon` | Leading icon before the metric label |

| Child element | Role |
|---|---|
| `app-material-icon` | Icon rendered in the leading icon slot before the metric label |

#### `app-project-overview` — `AppProjectOverview`

`src/components/dashboard/app-project-overview/`

Interactive D3.js Project Overview dashboard visualizing project progress, logged hours breakdown, and budget utilization.

| Property | Type / default | Description |
|---|---|---|
| `projectId` | String, default `'all'` | Project scope (all = portfolio overview) |
| `hideProjectSelector` | Boolean, default `false` | Hides the project selector row |
| `locale` | String | Locale for number/date formatting (defaults to UI language) |
| `projects` | Array | Project records |
| `tasks` | Array | Task records |
| `timeEntries` | Array | Time-tracking records |
| `expenses` | Array | Expense records |
| `users` | Array | User records (team workload) |

**Events:** `project-change`, `open-project`

#### `app-project-progress` — `AppProjectProgress`

`src/components/dashboard/app-project-progress/`

Portfolio progress tracker displaying completion bars, task ratios, and click-to-open project filtering. The actions slot renders controls at the right of the section header.

| Property | Type / default | Description |
|---|---|---|
| `title` | String, default `''` | Section caption |
| `projects` | Array, default `[]` | Project records to render progress for |
| `tasks` | Array, default `[]` | Task records used to compute progress |
| `lang` | String, default `'ru'` | UI language for labels and date formatting |

| Slot | Content |
|---|---|
| `actions` | Controls at the right of the section header |

| Child element | Role |
|---|---|
| `app-button` | Header control placed in the actions slot at the right of the section header |

## 7. Группа `views` (44)

### Views (41)

#### `app-analytics` — `AppAnalytics`

`src/components/views/app-analytics/`

Executive project health dashboards, KPI metrics, progress bars, and team workload table.

#### `app-auth` — `AppAuth`

`src/components/views/app-auth/`

Hybrid Authentication Flow view: local credentials with visibility toggle & password manager autofill, Google/Microsoft/Facebook OIDC, collapsible Enterprise SSO, account registration, recovery, and Step 2 TOTP 2FA.

| Property | Type / default | Description |
|---|---|---|
| `preview` | Boolean, default `false` | Runs the flow in sandboxed Storybook preview mode without overwriting the active workspace session. |
| `initial-step` | String, default `'login'` | Initial screen step to render: "login" \| "register" \| "forgot" \| "2fa". |

**Events:** `auth-success`

#### `app-blog` — `AppBlog`

`src/components/views/app-blog/`

Employee corporate blog supporting Markdown authoring with live split preview, formatting toolbar, feed & table views, in-page reader, likes, bookmarks, and team comments.

#### `app-calculation-detail` — `AppCalculationDetail`

`src/components/views/app-calculation-detail/`

Отдельная страница калькуляции: детализация оплачиваемых и неоплачиваемых (0 ₽) работ и расходов, стороны, статус согласования и переход к выставлению счёта.

#### `app-calculations` — `AppCalculations`

`src/components/views/app-calculations/`

Калькуляции: сводный реестр периодических отчётов работ и расходов по договорам, включая non-billable позиции по нулевой цене, согласование с клиентом и передачу в биллинг.

#### `app-calendar` — `AppCalendar`

`src/components/views/app-calendar/`

Interactive project schedule calendar supporting Month, Week, and Day views with task event badges.

#### `app-companies` — `AppCompanies`

`src/components/views/app-companies/`

Directory of group legal entities, tax requisites, leadership, and linked projects/contracts.

#### `app-company-detail` — `AppCompanyDetail`

`src/components/views/app-company-detail/`

Карточка компании: реквизиты, руководитель, штат, проекты, договоры, счета, привязанные файлы и база знаний.

#### `app-contacts` — `AppContacts`

`src/components/views/app-contacts/`

Unified contact persons directory across all counterparties with cards and table views, role/type filtering, quick copy, and full CRUD.

#### `app-contract-detail` — `AppContractDetail`

`src/components/views/app-contract-detail/`

Отдельная страница договора: финансовое исполнение, реквизиты сторон, процедура выставления счетов с автоподбором часов и расходов проекта.

#### `app-contracts` — `AppContracts`

`src/components/views/app-contracts/`

Contracts registry linking internal companies, counterparties, projects, owners, and budgets.

#### `app-counterparties` — `AppCounterparties`

`src/components/views/app-counterparties/`

CRM directory for clients, vendors, partners, and contractors with ratings and contract summaries.

#### `app-counterparty-detail` — `AppCounterpartyDetail`

`src/components/views/app-counterparty-detail/`

Отдельная страница контрагента: реквизиты, контакты, финансовые показатели, договоры, связанные проекты, калькуляции и счета.

#### `app-dashboard` — `AppDashboard`

`src/components/views/app-dashboard/`

Executive project management dashboard combining KPI metric cards, velocity/status/priority charts, project progress, and upcoming deadlines.

#### `app-data-grid` — `AppDataGrid`

`src/components/views/app-data-grid/`

Universal declarative enterprise data grid composed with <app-data-grid-column>, supporting virtual row scrolling, group-first multi-column sorting, multi-level hierarchical grouping, column visibility (hidden), custom templates, drag reorder, and column resize.

| Property | Type / default | Description |
|---|---|---|
| `rows` | Array | Row objects rendered by the grid |
| `rowKey` | String, default `'id'` | Field holding the row identity (attribute row-key); default id — used for selection, grouping and expansion |
| `selectedKeys` | Array | Keys of the currently selected rows (property binding, array) |
| `selectable` | Boolean, default `true` | Enables the row selection column; false renders no checkbox column |
| `virtual` | Boolean, default `true` | Virtualized row windowing (default true) — only visible rows render in high-volume lists |
| `emptyText` | String, default `''` | Caption passed to the compact empty state when rows is empty (attribute empty-text) |
| `exportFilename` | String, default `'projectflow_export'` | Base name of the CSV file produced by the export action (attribute export-filename); the date is appended |
| `groupBy` | String, default `''` | Field whose values define the first grouping level (attribute group-by); empty = no grouping |
| `sortBy` | String, default `''` | Field currently used for sorting (attribute sort-by); arrow shown on its header |
| `compact` | Boolean | High-density row layout (30px rows, tighter padding); falls back to the global density customization |
| `hideDensitySwitch` | Boolean, default `false` | Hides the comfortable/compact density switch in the grid toolbar (attribute hide-density-switch) |

**Events:** `row-click`, `selection-change`

| Child element | Role |
|---|---|
| `app-data-grid-column` | Declarative column config child (field, caption, width, resizable, hidden, sortable, groupable, template, sortValue) |

#### `app-directories` — `AppDirectories`

`src/components/views/app-directories/`

Unified master-detail workbench for administering all grouped reference directories and complex classifiers (Activity Types, Expense Types, Departments, Positions, Currencies, Countries, Units of Measure with live converter, Billing Frequencies, and custom classifiers).

#### `app-documents` — `AppDocuments`

`src/components/views/app-documents/`

Корпоративная библиотека документов: загрузка файлов с диска, предпросмотр изображений и кода/Markdown, версионирование и фильтрация по компаниям и проектам.

#### `app-employee-detail` — `AppEmployeeDetail`

`src/components/views/app-employee-detail/`

Отдельная страница сотрудника: профиль, ставка, загрузка в проектах по ролям, назначенные задачи, списанное время и расходы.

#### `app-employees` — `AppEmployees`

`src/components/views/app-employees/`

Employee directory with card/table switch, department & company filters, rates, and workload summary.

#### `app-expense-detail` — `AppExpenseDetail`

`src/components/views/app-expense-detail/`

Отдельная страница расхода: сумма и рублёвый эквивалент, статус согласования, чеки и документы в библиотеке проекта, перевыставление в калькуляциях и напоминания.

#### `app-expenses` — `AppExpenses`

`src/components/views/app-expenses/`

Учет затрат: реестр расходов по проектам и задачам, статусы согласования, фильтрация и сравнение с бюджетом проектов.

#### `app-gantt` — `AppGantt`

`src/components/views/app-gantt/`

2D virtualized timeline Gantt chart supporting thousands of tasks and multi-year schedules.

| Property | Type / default | Description |
|---|---|---|
| `virtual` | Boolean, default `true` | 2D windowing (vertical rows + horizontal days) — only visible tasks and day columns render; default true |
| `tasksData` | Array | Task objects rendered on the timeline (property binding, array); empty renders the empty state |
| `datasetMode` | String, default `'project'` | Built-in dataset to display (attribute dataset-mode): project (the working project schedule) or large (2,000-task multi-year stress dataset) |

#### `app-invoice-detail` — `AppInvoiceDetail`

`src/components/views/app-invoice-detail/`

Отдельная страница счёта: суммы с НДС, оплата и остаток, стороны, договор- и калькуляция-основание, позиции счёта, платежи по счёту и запись оплаты.

#### `app-invoices` — `AppInvoices`

`src/components/views/app-invoices/`

Standalone invoices registry across all contracts with cards and table views, payment progress tracking, due-control tags, itemized editor, preview sheet, and payment registration.

#### `app-kanban` — `AppKanban`

`src/components/views/app-kanban/`

Full-featured agile Kanban board with 5 workflow columns and drag-and-drop support.

#### `app-knowledge-base` — `AppKnowledgeBase`

`src/components/views/app-knowledge-base/`

База знаний по проектам и компаниям: архитектурные решения, регламенты, разборы инцидентов, онбординг и накопление опыта с привязкой к задачам и истории правок.

#### `app-payment-detail` — `AppPaymentDetail`

`src/components/views/app-payment-detail/`

Отдельная страница платежа: направление (входящий / исходящий), маршрут движения средств, банковские реквизиты компании и контрагента, закрытие счёта и связанные напоминания.

#### `app-payments` — `AppPayments`

`src/components/views/app-payments/`

Платежи: контроль сроков оплаты счетов, учёт частичных и полных платежей, просроченная задолженность и журнал платёжных документов.

#### `app-profile-settings` — `AppProfileSettings`

`src/components/views/app-profile-settings/`

User profile settings page in the interface-settings layout: user card, language option cards, timezone select with live clock, default project and default activity view.

#### `app-project-chat` — `AppProjectChat`

`src/components/views/app-project-chat/`

Внутренний чат сотрудников с разделением по каналам внутри проектов (создание, архивирование, удаление каналов участниками проекта), привязкой к задачам, ответами, закреплением сообщений и реакциями.

#### `app-project-detail` — `AppProjectDetail`

`src/components/views/app-project-detail/`

Dedicated single-project page with project overview, team management grouped by project roles, task summary, and linked contracts.

#### `app-projects` — `AppProjects`

`src/components/views/app-projects/`

Projects portfolio list with cards/table toggle, budgets, role summary, and navigation to single project view.

#### `app-reminder-detail` — `AppReminderDetail`

`src/components/views/app-reminder-detail/`

Отдельная страница напоминания: связанные объекты системы, расписание RFC 5545 и следующие срабатывания, участники, прикреплённые документы и гибкие правила уведомлений.

#### `app-reminders` — `AppReminders`

`src/components/views/app-reminders/`

Workspace Reminders Center with polymorphic linking to any entity, directory-driven recurrence templates, snooze presets, and per-reminder notification rules.

#### `app-requirement-detail` — `AppRequirementDetail`

`src/components/views/app-requirement-detail/`

Страница детальной работы с отдельным требованием: редактирование критериев приёмки, трассировка к спецификации и базе знаний, покрытие задачами, AI-декомпозиция и совместное уточнение с AI.

#### `app-requirements` — `AppRequirements`

`src/components/views/app-requirements/`

Реестр функциональных (FR) и нефункциональных (NFR) требований по проектам с фильтрацией, пагинацией, генерацией из спецификации и AI-декомпозицией в задачи.

#### `app-settings` — `AppSettings`

`src/components/views/app-settings/`

Full workspace personalization hub: Dark/Light theme toggle, 5 accent color themes, density modes, and language switcher.

#### `app-storybook` — `AppStorybook`

`src/components/views/app-storybook/`

In-app design system explorer showcasing all Lit web components, interactive stories, and API specs.

#### `app-task-detail` — `AppTaskDetail`

`src/components/views/app-task-detail/`

Dedicated Task Detail view unifying full task history: logged time entries, linked expenses, project chat discussions, audit changes, and subtasks.

#### `app-time-tracking` — `AppTimeTracking`

`src/components/views/app-time-tracking/`

Учет времени: быстрые отчёты по задачам, журнал трудозатрат, группировка план/факт по задачам и утверждение часов.

#### `app-timeentry-detail` — `AppTimeEntryDetail`

`src/components/views/app-timeentry-detail/`

Отдельная страница записи о времени: отработанные часы, статус утверждения, биллинг, прикреплённые файлы в библиотеке проекта и включение в калькуляции.

### Other (3)

#### `app-design-tokens` — `AppDesignTokens`

`src/components/views/app-design-tokens/` (без стори)

#### `app-material-icons` — `AppMaterialIcons`

`src/components/views/app-material-icons/` (без стори)

#### `app-task-grid` — `AppTaskGrid`

`src/components/views/app-task-grid/` (без стори)

---

## 8. Компоненты без стори (4)

Не зарегистрированы в app-storybook: мета отсутствует, API описан по исходнику (помечены «без стори»
в своих группах). По правилу проекта каждый компонент обязан иметь `.story.ts` — для этих компонентов
стори нужно добавить:

- `app-table-column` (common) — описание отсутствует
- `app-design-tokens` (views) — описание отсутствует
- `app-material-icons` (views) — описание отсутствует
- `app-task-grid` (views) — описание отсутствует

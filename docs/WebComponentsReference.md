# ProjectFlow: справочник веб-компонентов

Дата: 20.11.2026. Режим: **референс, код не изменяется.**

Всего компонентов: 139 (со стори: 139).
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
| `app-card-footer` | common | Common | Card footer row with a border-top chrome. |
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
| `app-reminder-form` | common | Common | Modal form for creating and editing polymorphic reminders linked to any system entity. |
| `app-requirement-form` | common | Overlays | Canonical requirement create and edit form. |
| `app-section-card` | common | Common | Card container with header (title, subtitle, actions slot) and body; optional collapsible… |
| `app-segmented-switch` | common | Common | Compact segmented control for switching between mutually exclusive views, timeframes, or … |
| `app-select` | common | Inputs | Custom dropdown select with indicator dots, keyboard navigation, and smooth popover. |
| `app-split-button` | common | Common | Dual-action button combining a primary action trigger with a secondary options menu. |
| `app-status-chip` | common | Common | Domain-driven status chip: resolves label and badge variant from central STATUS_TOKENS re… |
| `app-switch` | common | Inputs | Toggle switch for boolean settings and feature flags. |
| `app-table-column` | common | — | Declarative column config child of app-table-scroll: field / label / type (text, number, … |
| `app-table-scroll` | common | Common | Scrollable table shell with sticky sortable headers, zebra striping, inactive-row dimming… |
| `app-tags-row` | common | Elements | Canonical tags row for document cards, preview bars and readonly displays. |
| `app-task-ai-panel` | common | Common | Панель AI-ассистента для задач: автоматический подбор контекста из Базы знаний и Библиоте… |
| `app-task-modal` | common | Overlays | Comprehensive task creation and editing modal dialog with subtasks, dates, and assignees. |
| `app-textarea` | common | Inputs | Multiline text input with character counting, custom row limits, and auto-styling. |
| `app-time-entry-form` | common | Overlays | Canonical time entry create and edit form. |
| `app-toast` | common | Feedback | Automated floating notification stack with auto-dismiss and status colors. |
| `app-toggle-button` | common | Common | Stateful pressable button supporting soft and solid active variants, icons, and accessibi… |
| `app-header` | layout | Layout | Top header bar with breadcrumbs, live search, quick notification badge, and primary actio… |
| `app-sidebar` | layout | Layout | Collapsible navigation sidebar composed declaratively with <app-sidebar-group> and <app-s… |
| `app-sidebar-group` | layout | Layout | Collapsible navigation group container for <app-sidebar> supporting smooth CSS collapse a… |
| `app-sidebar-item` | layout | Layout | Declarative navigation item component used to compose <app-sidebar> menus with icons, bad… |
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
| `app-design-tokens` | views | Views | Live CSS custom property reference: token swatches grouped by category (backgrounds, text… |
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
| `app-material-icons` | views | Views | Material Symbols palette page: every ligature glyph of the self-hosted variable fonts (39… |
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
| `app-task-grid` | views | Views | The task table view: canonical skeleton (page header, Standard/Compact density segmented … |
| `app-time-tracking` | views | Views | Учет времени: быстрые отчёты по задачам, журнал трудозатрат, группировка план/факт по зад… |
| `app-timeentry-detail` | views | Views | Отдельная страница записи о времени: отработанные часы, статус утверждения, биллинг, прик… |

---

## 4. Группа `common` (87)

### Common (52)

#### `app-analysis-summary` — `AppAnalysisSummary`

`src/components/common/app-analysis-summary/`

One saved AI analysis summary for a task or requirement: author, model and date header, overview, effort, risks, recommendations; task summaries add suggested subtasks, requirement summaries add the clarification and decomposition into tasks. Action buttons fire events.

| Property | Type / default | Description |
|---|---|---|
| `summary` | Object | AnalysisSummary record (kind task\|requirement) |
| `expanded` | Boolean, default `true` | Collapsed history entries render only a short overview line |
| `addedTitles` | string[], default `[]` | Subtask titles already present on the owning task |

#### `app-avatar` — `AppAvatar`

`src/components/common/app-avatar/`

Circular initials/image avatar in five sizes, used for employees, assignees, and user profile.

| Property | Type / default | Description |
|---|---|---|
| `initials` | string, default `''` | Initials rendered when no image is set |
| `src` | string, default `''` | Image URL (falls back to initials on error) |
| `size` | 'xs' | 'sm' | 'md' | 'lg' | 'xl', default `'md'` | Avatar diameter preset |
| `color` | string, default `''` | Background color of the initials tile |
| `title` | string, default `''` | Native tooltip text |

#### `app-badge` — `AppBadge`

`src/components/common/app-badge/`

Semantic status, priority, and count badges supporting soft, solid, and outline styles. Canonical start / default / end slots carry leading graphics, badge text, and trailing content; icon is a legacy alias of start.

| Property | Type / default | Description |
|---|---|---|
| `variant` | BadgeVariant, default `'neutral'` | Semantic color of the badge (neutral, info, success, warning, danger) |
| `appearance` | BadgeAppearance, default `'soft'` | Rendering style: soft fill / outline |
| `size` | BadgeSize, default `'md'` | Visual density: sm / md / lg |
| `dot` | boolean, default `false` | Renders a status dot without text |
| `removable` | boolean, default `false` | Shows a remove (×) affordance |

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

Multi-bank, multi-currency bank requisites viewer and inline manager. Supports currency filtering, one-click clipboard copy, primary account selection, and inline add/edit/delete; deleting an account always goes through app-confirm-dialog (no opt-out).

| Property | Type / default | Description |
|---|---|---|
| `accounts` | BankRequisite[], default `[]` | Array of BankRequisite records |
| `editable` | boolean, default `false` | Enables Add / Edit / Delete / Set Primary actions |
| `compact` | boolean, default `false` | Uses single-column compact layout suitable inside modal forms |
| `hide-header` | boolean, default `false` | Hides internal header when embedded inside app-section-card |
| `hideHeader` | boolean, default `false` | Hides internal header when embedded inside app-section-card (attribute form hide-header) |
| `heading` | string, default `''` | Caption of the internal header; falls back to the localized bank-accounts title when empty |

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
| `orientation` | 'horizontal' | 'vertical', default `'horizontal'` | Layout direction of the group: horizontal / vertical |
| `attached` | boolean, default `true` | Shares borders between children (no gaps) |

| Slot | Content |
|---|---|
| `(default)` | app-button and app-toggle-button children rendered side by side (vertical) or joined (horizontal) |

| Child element | Role |
|---|---|
| `app-button` | Grouped action button child |
| `app-toggle-button` | Grouped toggle button child |

#### `app-card-footer` — `AppCardFooter`

`src/components/common/app-card-footer/`

Card footer row with a border-top chrome. Actions in the start slot align to the left edge of the card, actions in the end slot align to the right edge.

| Slot | Content |
|---|---|
| `start` | Actions aligned to the left edge of the card (app-button, labels, stat pills) |
| `end` | Actions aligned to the right edge of the card (app-button icon actions) |

| Child element | Role |
|---|---|
| `app-button` | Action button child placed in the start / end slot (size sm matches the historical card icon-btn) |

#### `app-cards-table` — `AppCardsTable`

`src/components/common/app-cards-table/`

A grid of entity cards built from a per-view template. The card content is produced by the cardRender function property (row) => TemplateResult, the same pattern as the cellRender of app-data-table; the card shell (surface background, border, radius, padding, hover lift, selection highlight) and the grid geometry belong to the component and are retuned locally through the geometry tokens. Pagination is internal: items are sliced by page-size and app-pagination (layout-mode="cards") sits in the footer below the grid whenever the grid is not empty. With clickable the shell activates on click and emits card-click; with selectable the selection lives in selectedKeys keyed by key-field, the chosen cards get the is-selected shell class, and toggling emits selection-change. Additive hooks with pixel-identical defaults: --cards-columns pins the column count (default auto-fill), the wide-collapse attribute collapses to one column at viewport <= 1024px (default off), cardClass(row) appends extra shell classes per row (is-dimmed reads --card-dimmed-opacity, default 0.68).

| Property | Type / default | Description |
|---|---|---|
| `rows` | Record<string, unknown>[], default `[]` | Array of card items rendered by the grid |
| `cardRender` | (row: Record<string, unknown>) => TemplateResult, default `() => html``` | Template function (row) => TemplateResult producing the card content |
| `page-size` | number, default `9` | Cards per page for the internal pagination (default 9) |
| `page` | number, default `1` | Initial page number (clamped to the available pages) |
| `clickable` | boolean, default `false` | The shell activates on click and emits card-click { item } (outside controls) |
| `selectable` | boolean, default `false` | Selection keyed by key-field; chosen cards get the is-selected shell class |
| `key-field` | string, default `'id'` | Field holding the selection key (default id) |
| `selectedKeys` | string[], default `[]` | Array of currently selected keys; toggleSelect(key) flips one key |
| `locale` | string, default `'ru-RU'` | Formatting locale passed to the footer pagination |
| `empty-title` | string, default `''` | Title of the compact app-empty-state shown for empty rows |
| `cardClass` | Object | Additive hook (row) => string appending extra shell classes per row (is-dimmed reads --card-dimmed-opacity, default 0.68) |
| `wide-collapse` | boolean, default `false` | Additive attribute hook collapsing the grid to one column at viewport <= 1024px (default off) |
| `--cards-columns` | CSS var | Grid column count token (default auto-fill); a view can pin an exact number of columns |
| `contentStyles` | String | Additive hook: view-local CSS (string or CSSResult) injected into the shadow root as a <style> element for the cardRender content; default empty keeps consumers pixel-identical |

#### `app-confirm-dialog` — `AppConfirmDialog`

`src/components/common/app-confirm-dialog/`

Confirmation modal built on app-modal: header icon + title, "выполняемое действие" and "ожидаемый результат" sections, cancel/confirm buttons. Variants: info, success, warning, danger; events confirm and cancel.

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens the dialog |
| `title` | string, default `''` | Header caption |
| `variant` | ConfirmVariant, default `'danger'` | Semantic color: info / success / warning / danger |
| `icon` | string, default `''` | Header icon name |
| `action` | string, default `''` | Text of the "action being performed" section |
| `result` | string, default `''` | Text of the "expected result" box |
| `message` | string, default `''` | Legacy single-body message (used when action/result are empty) |
| `actionLabel` | string, default `''` | Caption of the action section header |
| `resultLabel` | string, default `''` | Caption of the result section header |
| `confirmLabel` | string, default `''` | Caption of the confirm button |
| `cancelLabel` | string, default `''` | Caption of the cancel button |
| `size` | 'sm' | 'md' | 'lg' | 'xl', default `'sm'` | Dialog width preset |

**Events:** `confirm`, `cancel`

#### `app-context-chip` — `AppContextChip`

`src/components/common/app-context-chip/`

One context source chip: kind icon badge (requirement / knowledge base / document), entity title and the match reason line. Select mode toggles selection (chip-toggle), the arrow button opens the source entity (chip-open).

| Property | Type / default | Description |
|---|---|---|
| `data` | Object | ContextChipData record (key, kind, id, title, reason, selected) |
| `mode` | 'select' | 'display', default `'display'` | select = toggleable picker chip; display = read-only chip with open action |

#### `app-context-chips-list` — `AppContextChipsList`

`src/components/common/app-context-chips-list/`

A two-column grid of context source chips with an inner scrollbar. items carries ContextChipData records; mode selects the chip variant. chip-toggle and chip-open events from individual chips bubble through to the parent.

| Property | Type / default | Description |
|---|---|---|
| `items` | ContextChipData[], default `[]` | ContextChipData[] — key, kind, id, title, reason, selected |
| `mode` | 'select' | 'display', default `'display'` | select = toggleable picker chips; display = read-only chips with open action |

#### `app-counterparty-contacts` — `AppCounterpartyContacts`

`src/components/common/app-counterparty-contacts/`

Multi-person counterparty contacts viewer and inline CRUD manager. Supports personal details (full name, job title, department, birth date), multiple communication channels (phones, email, messenger), primary contact selection, and clipboard copy; deleting a contact always goes through app-confirm-dialog (no opt-out).

| Property | Type / default | Description |
|---|---|---|
| `contacts` | CounterpartyContact[], default `[]` | Array of CounterpartyContact records |
| `editable` | boolean, default `false` | Enables Add / Edit / Delete / Set Primary actions |
| `compact` | boolean, default `false` | Uses single-column compact layout suitable inside modal forms |
| `hide-header` | boolean, default `false` | Hides internal header when embedded inside app-section-card |
| `hideHeader` | boolean, default `false` | Hides internal header when embedded inside app-section-card (attribute form hide-header) |
| `heading` | string, default `''` | Caption of the internal header; falls back to the localized contact-persons title when empty |

**Events:** `contacts-change`

#### `app-data-grid-column` — `AppDataGridColumn`

`src/components/common/app-data-grid-column/`

Universal declarative column configuration element (<app-data-grid-column>) for <app-data-grid>, supporting caption, hidden, resizable, sortable, groupable, sortValue, and custom JS or HTML <template> cell rendering.

| Property | Type / default | Description |
|---|---|---|
| `field` | string, default `''` | Property name or dot-path in each row object |
| `caption` | string, default `''` | Column header text (falls back to header or field) |
| `hidden` | — | Hides the column initially while keeping it toggleable in the column menu |
| `resizable` | boolean, default `true` | Enables drag-to-resize handle on the column header (use resizable="false" to lock width) |
| `sortable` | boolean, default `false` | Allows sorting by clicking the header; grouped columns sort automatically first |
| `groupable` | boolean, default `false` | Allows grouping by this column via toolbar selector or drag-to-group bar |
| `reorderable` | boolean, default `true` | Allows drag reordering of the column header |
| `hideable` | boolean, default `true` | Controls whether the column appears in the Columns visibility popover |
| `exportable` | boolean, default `true` | Controls whether the column is included when exporting CSV |
| `align` | 'left' | 'center' | 'right', default `'left'` | Horizontal cell & header alignment: left \| center \| right |
| `cellType` | DataGridCellType, default `'text'` | Built-in formatter preset (text \| key \| title \| status \| priority \| assignee \| dates \| progress \| tags \| badge) |
| `template` | Object | JS callback (row, value) => TemplateResult \| string \| number; alternatively pass an HTML <template> child using {{field}} / {{value}} placeholders |
| `sortValue` | Object | Custom comparator value extractor (row, value) => string \| number |
| `groupFormatter` | Object | Custom group header label formatter (value) => string |
| `header` | string, default `''` | Secondary header text; used as caption when caption is empty (caption → header → field) |
| `width` | number, default `150` | Initial column width in px (default 150); the grid keeps user-resized widths in its own state |
| `min-width` | number, default `70` | Smallest width the resize handle can drag to, in px (default 70); declared as min-width, documented as minWidth |
| `override` | Boolean, default `false` | Property name override for the reflected hidden attribute (declared as `override hidden`); lets a column bind a row field named hidden without colliding |
| `minWidth` | number, default `70` | Smallest width the resize handle can drag to, in px (default 70); attribute form min-width |
| `visible` | boolean, default `true` | Initial column visibility (default true; false hides it, hideable columns stay toggleable in the Columns popover) |
| `renderer` | Object | Alias of template — cell render callback (row, value) => TemplateResult \| string \| number; the grid reads template ?? renderer |

**Events:** `column-change`

| Slot | Content |
|---|---|
| `(default)` | Optional HTML <template> element with {{field}} / {{value}} placeholders for declarative cell markup |

#### `app-date-input` — `AppDateInput`

`src/components/common/app-date-input/`

Fully custom-styled theme-aware Date Picker with interactive calendar popover, min/max bounds, and localization.

| Property | Type / default | Description |
|---|---|---|
| `label` | string, default `''` | Caption above the field |
| `value` | string, default `''` | Selected date in YYYY-MM-DD format |
| `placeholder` | string, default `'YYYY-MM-DD'` | Placeholder text shown when empty |
| `min` | string, default `''` | Earliest selectable date (YYYY-MM-DD) |
| `max` | string, default `''` | Latest selectable date (YYYY-MM-DD) |
| `required` | boolean, default `false` | Marks the field as required |
| `disabled` | boolean, default `false` | Disables editing and the calendar popover |
| `error` | string, default `''` | Error message; renders the field in danger state |
| `size` | 'sm' | 'md' | 'lg', default `'md'` | Control size scale sm\|md\|lg (30/38/44px heights, md default) |

**Events:** `change`

#### `app-directory-record-modal` — `AppDirectoryRecordModal`

`src/components/common/app-directory-record-modal/`

Schema-driven modal form for creating and editing both simple (code, name, sortOrder) and complex extended classifier records (Units of Measure, Currencies, Activity Types, etc.).

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Controls modal visibility |
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
| `drop` | 'before' | 'after' | null, default `null` | drop indicator on this row: before \| after \| null |

#### `app-dropdown-button` — `AppDropdownButton`

`src/components/common/app-dropdown-button/`

Action button paired with a contextual dropdown menu popover and outside-click dismissal. Canonical start / default / end slots carry leading graphics, label text, and trailing graphics; icon-start is a legacy alias of start. The default slot accepts declarative app-menu-item, app-menu-header, and app-menu-divider children.

| Property | Type / default | Description |
|---|---|---|
| `label` | string, default `'Actions'` | Button caption |
| `variant` | ButtonVariant, default `'secondary'` | Visual style of the button surface |
| `size` | ButtonSize, default `'md'` | Control height: sm / md / lg |
| `placement` | 'bottom-start' | 'bottom-end', default `'bottom-start'` | Menu placement relative to the button (bottom-start, bottom-end, ...) |
| `disabled` | boolean, default `false` | Disables interaction |
| `items` | MenuItem[], default `[]` | Menu item definitions rendered in the dropdown |

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
| `entity-type` | ReminderEntityType, default `'project'` | Linked entity kind (company, contract, task, contact, etc.) |
| `entity-id` | string, default `''` | Target entity record identifier |

#### `app-file-dropzone` — `AppFileDropzone`

`src/components/common/app-file-dropzone/`

Интерактивная область загрузки файлов (drag & drop + системный выбор файла) с отображением выбранного файла, его размера и кнопкой очистки.

| Property | Type / default | Description |
|---|---|---|
| `accept` | string, default `''` | Accepted file extensions (native accept attribute) |
| `title` | string, default `''` | Headline inside the drop area |
| `hint` | string, default `''` | Secondary hint text under the headline |
| `buttonLabel` | string, default `''` | Caption of the browse button |
| `clearLabel` | string, default `''` | Caption of the clear button for a selected file |
| `selectedLabel` | string, default `''` | Template caption for the selected-file line |
| `compact` | boolean, default `false` | Reduced height for dense forms |
| `selectedFileName` | string, default `''` | Name of the file already selected outside the component — renders the selected-file line (attribute form selected-file-name) |
| `selectedFileSize` | number, default `0` | Size in bytes shown next to the selected file name; 0 hides the size (attribute form selected-file-size) |
| `disabled` | boolean, default `false` | Disables drop and browse |
| `selected-file-name` | string, default `''` | Name of the file already selected outside the component — renders the selected-file line (attribute form selected-file-name) |
| `selected-file-size` | number, default `0` | Size in bytes shown next to the selected file name; 0 hides the size (attribute form selected-file-size) |
| `multiple` | boolean, default `false` | Allows picking several files (native multiple on the input); the files event carries all of them, false carries only the first |

**Events:** `files-selected`, `file-selected`, `file-cleared`

#### `app-filter-bar` — `AppFilterBar`

`src/components/common/app-filter-bar/`

Toolbar with search input, N filter selects, optional reset button and trailing actions slot. The prefix slot renders extra controls before the filter selects, and the default slot appends additional controls after them.

| Property | Type / default | Description |
|---|---|---|
| `searchValue` | string, default `''` | Current text of the search box |
| `searchEnabled` | boolean, default `true` | Shows the search input |
| `filters` | FilterDef[], default `[]` | Filter definitions (key, options, type select \| entity) |
| `values` | Record<string, string>, default `{}` | Current filter values keyed by filter id |
| `placeholder` | string, default `''` | Search box placeholder |
| `variant` | 'card' | 'bare', default `'card'` | Surface style: card / plain |
| `showReset` | boolean, default `false` | Shows the reset button when filters are active |

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
| `columns` | number, default `2` | Number of form grid columns (children span full width via col-span) |

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
| `columns` | number, default `4` | Number of grid columns for the metric cards |
| `variant` | 'grid' | 'strip', default `'grid'` | Layout style: grid / strip |

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
| `name` | String, default `'star'` | — |
| `family` | MaterialIconFamily, default `'outlined'` | — |
| `variant` | MaterialIconVariant, default `'neutral'` | — |

#### `app-material-icon-gallery` — `AppMaterialIconGallery`

`src/components/common/app-material-icon-gallery/`

Material Symbols palette with search by name, category and tags; toolbar controls family, size and Google axes; grid with roving tabindex fires icon-select and params-change events.

| Property | Type / default | Description |
|---|---|---|
| `icons` | MaterialIconDef[], default `[]` | MaterialIconDef records rendered by the gallery (property binding, array) |
| `fill` | Number, default `0` | Initial FILL axis value for the toolbar (0\|1); changes fire params-change |
| `weight` | Number, default `400` | Initial wght axis value for the toolbar (100..700); changes fire params-change |
| `grade` | Number, default `0` | Initial GRAD axis value for the toolbar (-50..200); changes fire params-change |
| `disabled` | Boolean, default `false` | Blocks search, toolbar and grid interaction — the gallery renders read-only |
| `query` | String, default `''` | — |
| `category` | String, default `'all'` | — |
| `family` | GalleryFamily, default `'outlined'` | — |

#### `app-menu` — `AppMenu`

`src/components/common/app-menu/`

Standalone accessible menu surface supporting both programmatic items arrays and declarative <app-menu-item>, <app-menu-header>, and <app-menu-divider> composition.

| Property | Type / default | Description |
|---|---|---|
| `items` | MenuItem[], default `[]` | Menu item definitions (label, icon, action, separators) |

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
| `inset` | boolean, default `false` | Applies left indentation aligned with icon-prefixed menu item labels |

#### `app-menu-header` — `AppMenuHeader`

`src/components/common/app-menu-header/`

Declarative section heading element for grouping related <app-menu-item> entries inside <app-menu>. The default slot supplies the header text markup when the label property is omitted.

| Property | Type / default | Description |
|---|---|---|
| `label` | string, default `''` | Section heading text |

| Slot | Content |
|---|---|
| `(default)` | Header text markup (used when the label property is omitted) |

#### `app-menu-item` — `AppMenuItem`

`src/components/common/app-menu-item/`

Declarative interactive menu entry used inside <app-menu> with support for icons, shortcuts, checkmarks, danger, and disabled states. Canonical start / default / end slots carry leading graphics, label markup, and trailing content; icon and shortcut are legacy aliases of start / end.

| Property | Type / default | Description |
|---|---|---|
| `value` | string, default `''` | Action identifier emitted in the select event detail (falls back to id) |
| `label` | string, default `''` | Item text caption |
| `shortcut` | string, default `''` | Keyboard shortcut hint displayed on the right |
| `disabled` | boolean, default `false` | Prevents clicking and keyboard activation |
| `danger` | boolean, default `false` | Highlights destructive action styling |
| `checked` | boolean, default `false` | Renders active checkmark state |
| `checkable` | boolean, default `false` | Reserves checkmark gutter and toggles checked state on click |
| `icon` | Object | Programmatic leading icon (TemplateResult or string) |

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
| `items` | MetaItem[], default `[]` | Meta field definitions (label + value, mono / danger variants, title tooltip, link { label, onClick }) |
| `columns` | number, default `3` | Number of columns in the grid |
| `layout` | 'strip' | 'grid', default `'strip'` | Rendering style: strip / grid / inline |

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
| `label` | string, default `''` | Field caption shown above the value |
| `value` | string, default `''` | Field value (falls back to the element text) |
| `mono` | boolean, default `false` | Monospaced tabular value style |
| `danger` | boolean, default `false` | Danger-colored value style |

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
| `amount` | number, default `0` | Numeric amount |
| `currency` | BankCurrency, default `'RUB'` | Currency code: RUB / USD / EUR (symbol and locale formatting follow UI language) |
| `format` | 'full' | 'short', default `'full'` | full = grouped digits; short = K/M compact notation |

#### `app-option` — `AppOption`

`src/components/common/app-option/`

Declarative option carrier for option-list components. Renders nothing; the parent component collects its props from the slot.

| Property | Type / default | Description |
|---|---|---|
| `value` | string, default `''` | Option value emitted by the parent (falls back to the label) |
| `label` | string, default `''` | Option caption (falls back to the element text) |
| `color` | string, default `''` | Color indicator used by app-select rows |
| `icon` | Object | Programmatic leading icon (TemplateResult or string) |
| `code` | string, default `''` | Entity code shown in entity-selector rows |
| `subtitle` | string, default `''` | Secondary line in entity-selector rows |
| `meta` | string, default `''` | Meta line in entity-selector rows |
| `badge` | string, default `''` | Badge text in entity-selector rows |
| `badgeColor` | string, default `''` | Badge color in entity-selector rows |
| `avatar` | string, default `''` | Avatar source (initials or image url) in entity-selector rows |
| `description` | string, default `''` | Description line used by app-radio-group cards |
| `keywords` | Array | Search keywords for the entity-selector filter |
| `disabled` | boolean, default `false` | Option is not selectable |

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
| `length` | number, default `6` | Number of verification code cells (default 6). |
| `value` | string, default `''` | Current numeric code string. |
| `disabled` | boolean, default `false` | Disables all cells while verifying. |
| `error` | boolean, default `false` | Highlights cells in danger palette and plays shake feedback. |
| `autofocus` | boolean, default `false` | Automatically focuses the first cell on mount. |

**Events:** `otp-change`, `otp-complete`

#### `app-pagination` — `AppPagination`

`src/components/common/app-pagination/`

Pagination bar with smart page buttons, range summary, and mode-aware page-size presets for dense tables vs. multi-column card grids.

| Property | Type / default | Description |
|---|---|---|
| `totalItems` | number, default `0` | Total record count across all pages |
| `page` | number, default `1` | Current page number (1-based) |
| `pageSize` | number, default `10` | Records per page |
| `pageSizeOptions` | Array | Choices offered in the page-size selector |
| `layoutMode` | PaginationLayoutMode, default `'table'` | Density preset for table vs card grids |
| `variant` | PaginationVariant, default `'surface'` | Surface style |
| `compact` | boolean, default `false` | Compact rendering |
| `showPageSize` | boolean, default `true` | Shows the page-size selector |
| `showSummary` | boolean, default `true` | Shows the "records x–y of z" summary |
| `locale` | String | Locale used for number formatting (defaults to UI language) |

**Events:** `page-change`, `page-size-change`

#### `app-persona` — `AppPersona`

`src/components/common/app-persona/`

Person representation: avatar (photo or initials on a colored tile), name, position/role line and a presence badge in seven sizes. The status is graphic only — its words live in the tooltip and the accessible name.

| Property | Type / default | Description |
|---|---|---|
| `size` | PersonaSize, default `'48'` | Avatar diameter preset (24/32/40/48/56/72/100, default 48) |
| `image` | string, default `''` | Photo URL; falls back to initials when empty |
| `initials` | string, default `''` | Initials; derived from primaryText when not set (Cyrillic names included) |
| `primaryText` | string, default `''` | Name or identification |
| `secondaryText` | string, default `''` | Position / project role under the name |
| `tertiaryText` | string, default `''` | Extra line, e.g. "In a meeting" (sizes 56+) |
| `presence` | PersonaPresence, default `'none'` | Presence badge status (none/online/available/away/busy/dnd/blocked/offline); words go to the tooltip and accessible name, never to visible text |
| `showOverflowTooltip` | — | Native tooltip with the full text on truncated lines (default true) |
| `color` | string, default `''` | Background of the initials tile |
| `ariaLabel` | string, default `''` | Accessible name override |
| `interactive` | boolean, default `true` | Renders the persona as a focusable ghost button (default true) so consumers bind @click / persona-click on the host; false renders plain markup |
| `personaDisabled` | boolean, default `false` | Dims the persona and disables its button (attribute persona-disabled); the persona-click event is not dispatched |

#### `app-presence-icon` — `AppPresenceIcon`

`src/components/common/app-presence-icon/`

Presence status icon: a colored dot with the state glyph, the same geometry as the persona badge. Owns its styles, so it renders inside other components shadow trees (menu item icons) and can be slotted anywhere.

| Property | Type / default | Description |
|---|---|---|
| `presence` | PersonaPresence, default `'none'` | Presence status (none/online/available/away/busy/dnd/blocked/offline); none renders nothing |
| `size` | string, default `'12'` | Dot diameter in px (persona badge sizes are 8/12/16/20/24/32/40) |
| `glyph` | string, default `'auto'` | Glyph size in px; auto follows the persona rule (round(size x 0.6), suppressed below 16px), 0 forces a colour-only dot |
| `color` | string, default `''` | Dot fill override; defaults to the presence token color |
| `ariaLabel` | string, default `''` | Accessible name override; defaults to the presence label |
| `showOverflowTooltip` | — | Native tooltip with the presence label (default true) |

#### `app-progress-bar` — `AppProgressBar`

`src/components/common/app-progress-bar/`

Single-value or segmented progress bar with optional percentage label; sm/md heights.

| Property | Type / default | Description |
|---|---|---|
| `value` | number, default `0` | Current percentage (0–100) |
| `segments` | ProgressSegment[], default `[]` | Optional segment definitions for multi-color bars |
| `color` | string, default `'var(--accent-primary, #6366f1)'` | Bar fill color (CSS value / token) |
| `showLabel` | boolean, default `false` | Shows the percentage label |
| `size` | 'sm' | 'md', default `'md'` | Bar height preset |

#### `app-project-attachments` — `AppProjectAttachments`

`src/components/common/app-project-attachments/`

File attachment control for time entries and expenses. Allows uploading new files (saved directly to the project document library) or picking existing documents from the project library, with inline preview and download.

| Property | Type / default | Description |
|---|---|---|
| `project-id` | string, default `''` | Project ID used to scope existing library documents |
| `documentIds` | string[], default `[]` | Array of already-saved DocumentItem IDs attached to the record |
| `pendingFiles` | PendingAttachmentFile[], default `[]` | Array of newly selected browser files awaiting save |
| `label` | string, default `''` | Optional section heading override |
| `compact` | boolean, default `false` | Compact display mode without secondary helper hint |
| `readonly` | boolean, default `false` | Disables uploading, linking, and detaching files |

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
| `label` | string, default `''` | Caption above the option list |
| `name` | string, default `''` | Native radio group name (shared within a page) |
| `value` | string, default `''` | Currently selected option value |
| `options` | RadioOption[], default `[]` | Option definitions (value + label) |
| `dataSource` | Object | Data source for options: array, promise, or function returning an array (sync or async) |
| `orientation` | 'vertical' | 'horizontal', default `'vertical'` | Layout direction: vertical / horizontal |
| `variant` | 'default' | 'card', default `'default'` | Visual style of the option rows |
| `disabled` | boolean, default `false` | Disables all options |

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
| `value` | string, default `''` | Initial and current RFC 5545 RRULE string (with or without RRULE: prefix) |
| `start-date` | string, default `''` | Reference DTSTART (YYYY-MM-DDTHH:mm) used for live upcoming dates preview |
| `include-prefix` | boolean, default `true` | Whether emitted RRULE includes the "RRULE:" prefix (default true) |
| `allow-one-time` | boolean, default `true` | Allows selecting "Does not repeat" empty rule (default true) |
| `compact` | boolean, default `false` | Reduces vertical spacing for embedding inside modals |
| `hide-rrule-bar` | boolean, default `false` | Hides raw RRULE string bar while preserving visual editing |

#### `app-reminder-form` — `AppReminderForm`

`src/components/common/app-reminder-form/`

Modal form for creating and editing polymorphic reminders linked to any system entity. The recurrence rule is picked from Master Classifiers templates, typed manually directly in the RRULE field (live RFC 5545 validation with the rruleErrors canon, template re-matching), or configured through the app-recurrence-editor dialog reused from the recurrence templates directory; a summary card shows the plain-language rule description next to the code, same canon as the editor live summary; notifications use a flexible multi-rule builder, and removing a notification rule (danger button) is guarded by app-confirm-dialog naming the rule.

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens or closes the reminder form modal dialog |
| `reminder` | Reminder | null, default `null` | Existing Reminder entity to edit (null creates a new reminder) |
| `preset-entity-type` | ReminderEntityType | '', default `''` | Preselected target entity type (company, contract, task, contact, etc.) |
| `preset-entity-id` | string, default `''` | Preselected target entity identifier |

**Events:** `close`, `saved`

#### `app-section-card` — `AppSectionCard`

`src/components/common/app-section-card/`

Card container with header (title, subtitle, actions slot) and body; optional collapsible mode. The icon slot renders a leading header graphic, header-left holds content at the left of the header, actions holds controls at the right, and the default slot is the section body.

| Property | Type / default | Description |
|---|---|---|
| `title` | string, default `''` | Section caption |
| `subtitle` | string, default `''` | Secondary line under the caption |
| `ariaLabel` | string, default `''` | Accessible name for the section region (aria-label); falls back to title when empty |
| `variant` | 'default' | 'plain' | 'panel' | 'tabbed', default `'default'` | Surface style: default / plain / elevated |
| `collapsible` | boolean, default `false` | Enables collapse toggle in the header |
| `collapsed` | boolean, default `false` | Current collapsed state (only for collapsible sections) |
| `maxHeight` | string, default `''` | CSS length ('26rem', '320px') capping the body height; the inner scrollbar activates on overflow |

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
| `options` | SegmentedOption[], default `[]` | Segment definitions (value + label) |
| `dataSource` | Object | Data source for segments: array, promise, or function returning an array (sync or async) |
| `value` | string, default `''` | Currently selected segment value |
| `size` | 'sm' | 'md' | 'lg', default `'md'` | Control height: sm / md / lg |
| `fullWidth` | boolean, default `false` | Segments stretch to fill the container |
| `disabled` | boolean, default `false` | Disables all segments |

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
| `label` | string, default `'Save'` | Main button caption |
| `variant` | 'primary' | 'secondary' | 'outline', default `'primary'` | Visual style of the main button |
| `size` | ButtonSize, default `'md'` | Control height: sm / md / lg |
| `disabled` | boolean, default `false` | Disables both halves of the button |
| `items` | MenuItem[], default `[]` | Menu items opened by the arrow half |

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
| `domain` | StatusDomain, default `'task'` | Status vocabulary: task, contract, invoice, project, dueControl, ... |
| `status` | string, default `''` | Status code within the domain (rendered with its label and color) |
| `labelOverride` | string, default `''` | Custom label text rendered instead of the domain label; the badge variant stays domain-driven (empty = domain label) |
| `size` | 'sm' | 'md' | 'lg', default `'sm'` | Visual density: sm / md / lg |
| `appearance` | 'soft' | 'solid' | 'outline', default `'soft'` | Rendering style: soft fill / solid / outline |
| `dot` | boolean, default `false` | Shows a leading status dot |

#### `app-table-scroll` — `AppTableScroll`

`src/components/common/app-table-scroll/`

Scrollable table shell with sticky sortable headers, zebra striping, inactive-row dimming and a compact empty state; columns are declared as child app-table-column elements.

| Property | Type / default | Description |
|---|---|---|
| `rows` | Record<string, unknown>[], default `[]` | Array of row objects rendered by the table |
| `sort-by` | string, default `''` | Field name currently used for sorting (arrow shown on its header) |
| `sort-dir` | SortDirection, default `'asc'` | Current sort direction: asc / desc |
| `active-key` | string, default `'isActive'` | Row property holding the active flag; falsy rows render as is-inactive |
| `empty-title` | string, default `''` | Title passed to the compact empty state when rows is empty |
| `sortBy` | string, default `''` | Field name currently used for sorting (attribute form sort-by; arrow shown on its header) |
| `sortDir` | SortDirection, default `'asc'` | Current sort direction asc / desc (attribute form sort-dir) |
| `activeKey` | string, default `'isActive'` | Row property holding the active flag, default isActive (attribute form active-key); falsy rows render as is-inactive |
| `emptyTitle` | string, default `''` | Title passed to the compact empty state when rows is empty (attribute form empty-title) |
| `locale` | string, default `'ru-RU'` | Locale used for number formatting (t.common.locale) |
| `striped` | boolean, default `false` | Enables alternating row background coloring (zebra striping) |
| `sort-change event` | — | Emitted with detail { field, dir } when a header sort button is clicked |

#### `app-task-ai-panel` — `AppTaskAiPanel`

`src/components/common/app-task-ai-panel/`

Панель AI-ассистента для задач: автоматический подбор контекста из Базы знаний и Библиотеки документов, генерация структурированного описания и контекстный анализ рисков, трудоёмкости и подзадач через OpenAI-совместимый API.

| Property | Type / default | Description |
|---|---|---|
| `task` | Object | Task being analyzed |
| `analyses` | AnalysisSummary[], default `[]` | Saved analysis summaries, newest first; the panel renders each as app-analysis-summary |
| `clarifications` | TaskAiClarificationMessage[], default `[]` | Clarification Q&A items |
| `compact` | Boolean, default `false` | Reduced layout for embedding inside modals |
| `timeSummary` | String, default `''` | Time-tracking summary rendered next to the analysis |
| `expenseSummary` | String, default `''` | Expense summary rendered next to the analysis |
| `discussionsSummary` | String, default `''` | Discussion summary rendered next to the analysis |

#### `app-toggle-button` — `AppToggleButton`

`src/components/common/app-toggle-button/`

Stateful pressable button supporting soft and solid active variants, icons, and accessibility aria-pressed. Canonical start / default / end slots carry leading graphics, label text, and trailing graphics; icon-start / icon-end are legacy aliases of start / end.

| Property | Type / default | Description |
|---|---|---|
| `pressed` | boolean, default `false` | Pressed (toggled) visual state |
| `variant` | 'soft' | 'solid', default `'soft'` | Visual style of the toggle surface |
| `size` | 'xxs' | 'sm' | 'md' | 'lg', default `'md'` | Control height: sm / md / lg |
| `disabled` | boolean, default `false` | Disables interaction |
| `iconOnly` | boolean, default `false` | Renders only the icon, no text |
| `value` | string, default `''` | Group value emitted on toggle (for radio-style groups) |

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

### Elements (4)

#### `app-button` — `AppButton`

`src/components/common/app-button/`

Interactive button with multiple semantic variants, sizes, and states. Canonical start / default / end slots carry leading graphics, label text, and trailing graphics; icon-start / icon-end are legacy aliases of start / end.

| Property | Type / default | Description |
|---|---|---|
| `variant` | ButtonVariant, default `'primary'` | Visual style: primary, secondary, outline, ghost, danger, icon (compact card action) |
| `size` | ButtonSize, default `'md'` | Control height: sm / md / lg |
| `action` | ButtonAction, default `'default'` | Business action driving the highlight color: default (neutral), view / edit / submit (accent), accept (success), delete / reject (danger), cancel (muted) |
| `disabled` | boolean, default `false` | Disables interaction and dims the button |
| `loading` | boolean, default `false` | Shows a spinner and blocks clicks |
| `iconOnly` | boolean, default `false` | Renders only the start slot, no text; a button with only an icon becomes square automatically |
| `ariaLabel` | string, default `''` | Accessible name exposed as aria-label — for icon-only buttons and rows of icon actions where the label is graphical (the row title is mirrored here) |
| `type` | 'button' | 'submit' | 'reset', default `'button'` | Native HTML button type (button / submit) |

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
| `entity` | EntityEmblemKind, default `'project'` | Тип сущности: project \| task \| requirement \| company \| counterparty \| contract \| calculation \| employee |
| `size` | 'xs' | 'sm' | 'md' | 'lg', default `'lg'` | Размер эмблемы: xs \| sm \| md \| lg |
| `variant` | 'emblem' | 'pill', default `'emblem'` | Режим отображения: emblem (квадрат с иконкой) \| pill (пилюля с подписью) |
| `color` | string, default `''` | Опциональный CSS-цвет акцента (например, цвет проекта) |

#### `app-link` — `AppLink`

`src/components/common/app-link/`

Text link with the canonical start / default / end slot API. Renders an anchor when href is set, a button-style link otherwise.

| Property | Type / default | Description |
|---|---|---|
| `href` | string, default `''` | Link target; with href the element renders as an anchor |
| `target` | string, default `''` | Anchor target (_blank adds rel="noopener noreferrer") |
| `variant` | LinkVariant, default `'primary'` | Visual style: primary, secondary, danger |
| `size` | LinkSize, default `'md'` | Font scale sm / md / lg from the canonical control tokens |
| `disabled` | boolean, default `false` | Blocks activation and dims the link |
| `ariaLabel` | string, default `''` | Accessible name (aria-label); falls back to title when empty |
| `active` | boolean, default `false` | Segmented pill state: fills the link with the --link-active-bg hook. Default false keeps every existing consumer pixel-identical |

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
| `tags` | string[], default `[]` | Tag strings rendered as chips (source of truth, never mutated by the component); combines with declarative app-option children |
| `mode` | 'readonly' | 'add-button' | 'add-form', default `'readonly'` | readonly = plain chips; add-button = editable chips + add button opening the inline form; add-form = editable chips with the inline form always open |
| `showEmptyLabel` | Boolean, default `false` | Render the no-tags hint when the list is empty (preview bars) |

**Events:** `tag-add`, `tag-remove`

### Inputs (9)

#### `app-checkbox` — `AppCheckbox`

`src/components/common/app-checkbox/`

Checkbox element with checked, unchecked, indeterminate, and disabled states. The default slot overrides the label property with custom label markup.

| Property | Type / default | Description |
|---|---|---|
| `checked` | boolean, default `false` | Checked state of the box |
| `indeterminate` | boolean, default `false` | Mixed (partial selection) state — square dash instead of tick |
| `disabled` | boolean, default `false` | Disables interaction |
| `label` | string, default `''` | Text next to the box |

**Events:** `change`

| Slot | Content |
|---|---|
| `(default)` | Label text next to the box (overrides the label property) |

#### `app-color-swatches` — `AppColorSwatches`

`src/components/common/app-color-swatches/`

Canonical color swatch picker. A row of round color buttons rendered from a palette array; the component owns the active highlight and a change event carrying { value } so the opening form writes the picked hex into its own field. Used by the project create/edit form for the project color; any view needing a fixed palette choice can pass its own colors array.

| Property | Type / default | Description |
|---|---|---|
| `colors` | string[], default `[]` | Palette of hex color strings rendered as round swatch buttons |
| `value` | string, default `''` | Currently selected hex (highlighted swatch) |

**Events:** `change`

#### `app-combobox` — `AppCombobox`

`src/components/common/app-combobox/`

Searchable multi-tag combobox input with autocomplete and tag removal. The default slot accepts declarative app-option children whose labels append to the items prop.

| Property | Type / default | Description |
|---|---|---|
| `label` | string, default `''` | Caption above the field |
| `items` | string[], default `[]` | Suggestion item definitions (value + label) |
| `dataSource` | Object | Data source for suggestions: array, promise, or function returning an array (sync or async) |
| `selected` | string[], default `[]` | Currently selected values |
| `placeholder` | string, default `'Add tag or filter...'` | Text shown in the input when empty |
| `allowCustom` | boolean, default `true` | Typing a new value offers "+ Add" to create it |
| `size` | 'sm' | 'md' | 'lg', default `'md'` | Control size scale sm\|md\|lg (30/38/44px min-heights, md default) |

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
| `label` | string, default `''` | Caption above the field |
| `value` | string, default `''` | Id of the currently selected entity |
| `options` | EntitySelectorOption[], default `[]` | Entity option definitions (id, label, meta) |
| `dataSource` | Object | Data source for options: array, promise, or function returning an array (sync or async) |
| `placeholder` | string, default `''` | Text shown when nothing is selected |
| `searchPlaceholder` | string, default `''` | Placeholder inside the search box of the panel |
| `size` | EntitySelectorSize, default `'md'` | Control height: sm / md / lg |
| `disabled` | boolean, default `false` | Disables the selector |
| `required` | boolean, default `false` | Marks the field as required |
| `clearable` | boolean, default `false` | Shows a clear (×) button when a value is selected |
| `showSelectedDetails` | boolean, default `true` | Renders meta details of the selected entity under the field |
| `maxVisible` | number, default `80` | Maximum options rendered in the panel at once |
| `error` | string, default `''` | Error message; renders the field in danger state |
| `hint` | string, default `''` | Helper text below the field |

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
| `label` | string, default `''` | Caption above the field |
| `placeholder` | string, default `''` | Placeholder text shown when empty |
| `value` | string, default `''` | Current input value |
| `type` | string, default `'text'` | Native input type (text, email, password, number, ...) |
| `required` | boolean, default `false` | Marks the field as required (asterisk in label) |
| `disabled` | boolean, default `false` | Disables editing |
| `error` | string, default `''` | Error message; renders the field in danger state |
| `helper` | string, default `''` | Helper text below the field |
| `clearable` | boolean, default `false` | Shows a clear (×) button when the field has a value |
| `size` | InputSize, default `'md'` | Control size scale sm\|md\|lg (30/38/44px heights, md default) |

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
| `label` | string, default `''` | Caption above the field |
| `value` | number, default `0` | Current numeric value |
| `min` | number, default `0` | Minimum allowed value |
| `max` | number, default `1000` | Maximum allowed value |
| `step` | number, default `1` | Increment for the stepper buttons |
| `unit` | string, default `''` | Unit suffix rendered inside the field |
| `size` | 'sm' | 'md' | 'lg', default `'md'` | Control height: sm / md / lg |
| `disabled` | boolean, default `false` | Disables editing and steppers |

**Events:** `change`

#### `app-select` — `AppSelect`

`src/components/common/app-select/`

Custom dropdown select with indicator dots, keyboard navigation, and smooth popover. The default slot accepts declarative app-option children that append to the options prop.

| Property | Type / default | Description |
|---|---|---|
| `label` | string, default `''` | Caption above the field |
| `value` | string, default `''` | Currently selected option value |
| `options` | SelectOption[], default `[]` | Option definitions (value + label) |
| `dataSource` | Object | Data source for options: array, promise, or function returning an array (sync or async) |
| `disabled` | boolean, default `false` | Disables the dropdown |
| `placeholder` | string, default `'Select...'` | Text shown when nothing is selected |
| `size` | SelectSize, default `'md'` | Control size scale sm\|md\|lg (30/38/44px heights, md default) |

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
| `checked` | boolean, default `false` | On/off state of the switch (boolean, default false) |
| `disabled` | boolean, default `false` | Disables interaction (boolean, default false) |
| `label` | string, default `''` | Caption inside the control, next to the track (string; the default slot overrides it with custom markup) |
| `size` | SwitchSize, default `'md'` | Control size scale (string, default md). Values: sm = 30px frame height, track 34x18px, thumb 14px, caption 0.75rem, gap 0.5rem, frame padding 0 0.6rem; md = the historical geometry — 38px frame height, track 40x22px, thumb 18px, caption 0.8125rem, gap 0.65rem, frame padding 0 0.75rem (default); lg = 44px frame height, track 46x26px, thumb 22px, caption 0.875rem, gap 0.8rem, frame padding 0 1rem. The frame heights follow the root control-height tokens (--control-height-sm/md/lg) |
| `frame` | SwitchFrame, default `'none'` | Frame variant (string, reflected as an attribute). Values: none = no frame, the bare switch (default); normal = the app-input control box around the switch — height var(--control-height-md, 38px), background var(--bg-surface), border 1px var(--border-subtle), radius var(--radius-md), padding 0 0.75rem, full row width; transparent = the identical box with background and border transparent, so the switch occupies a form row like an input without visible chrome |
| `fieldLabel` | string, default `''` | Text of the external label row attached to the frame (string). With field-label-style normal an empty text renders no row; with ghost an empty invisible row is rendered so the grid place is kept, and when field-label is not set with ghost the row text falls back to the label property |
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
| `label` | string, default `''` | Caption above the field |
| `placeholder` | string, default `''` | Placeholder text shown when empty |
| `value` | string, default `''` | Current textarea value |
| `rows` | number, default `3` | Visible row count (initial height) |
| `required` | boolean, default `false` | Marks the field as required |
| `disabled` | boolean, default `false` | Disables editing |
| `error` | string, default `''` | Error message; renders the field in danger state |
| `maxlength` | number, default `0` | Maximum character count (0 = unlimited); shows a counter when set |
| `monospace` | boolean, default `false` | Renders the text in the mono font family with tabular numerals — for code, rrule strings, file names and other literal values |

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
| `entity` | EntityEmblemKind, default `'project'` | Emblem kind rendered in the hero identity |

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
| `title` | string, default `''` | Page caption |
| `subtitle` | string, default `''` | Secondary description line under the caption |

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
| `open` | boolean, default `false` | Opens the form modal (rendered through the portal) |
| `calculation` | Calculation | null, default `null` | Calculation being edited (null = create mode) |
| `presetContractId` | string | null, default `null` | Contract prefilled for a context-bound opening (first active by default) |
| `showContractSelect` | boolean, default `false` | Show the contract picker (list view openings) |
| `contextTitle` | string, default `''` | Modal title override for context-bound openings |

**Events:** `close`, `saved`

#### `app-company-form` — `AppCompanyForm`

`src/components/common/app-company-form/`

Canonical company create and edit form. The component owns the twelve fields, writes the company to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. The short name is required, an empty legal name falls back to it.

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens the form modal (rendered through the portal) |
| `company` | Company | null, default `null` | Company being edited (null = create mode) |

**Events:** `close`, `saved`

#### `app-contract-form` — `AppContractForm`

`src/components/common/app-contract-form/`

Canonical contract create and edit form. The component owns all fourteen fields, writes the contract to the store itself on save and emits a saved event with the written record; any close, including cancel, save and backdrop, dispatches a close event so the opening view resets its flag. Every opening renders the same field set; presets fill company, counterparty, project, status and the modal title.

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens the form modal (rendered through the portal) |
| `contract` | Contract | null, default `null` | Contract being edited (null = create mode) |
| `presetCounterpartyId` | string, default `''` | Counterparty prefilled for a quick opening |
| `presetProjectId` | string, default `''` | Project prefilled for a context-bound opening |
| `presetStatus` | ContractStatus, default `'draft'` | Status a newly created contract starts with (draft by default) |
| `contextTitle` | string, default `''` | Modal title override for context-bound openings |

**Events:** `close`, `saved`

#### `app-counterparty-form` — `AppCounterpartyForm`

`src/components/common/app-counterparty-form/`

Canonical counterparty create and edit form. The component owns the twelve fields, writes the counterparty to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. The short name is required, rating stays clamped to one through five.

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens the form modal (rendered through the portal) |
| `counterparty` | Counterparty | null, default `null` | Counterparty being edited (null = create mode) |

**Events:** `close`, `saved`

#### `app-decompose-form` — `AppDecomposeForm`

`src/components/common/app-decompose-form/`

Схема данных, контракты API и выбор библиотек

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens the draft editor modal (rendered through the portal) |
| `requirementIds` | string[], default `[]` | Requirement ids to decompose, also the fallback links for drafts without requirement ids |
| `decompose` | — | Public async method running the AI decomposition and opening the editor |
| `openWithDrafts` | — | Public method opening the editor with a prepared draft list (drafts, model, projectId) |

**Events:** `close`, `decompose-failed`, `saved`

#### `app-document-form` — `AppDocumentForm`

`src/components/common/app-document-form/`

Canonical document create and edit form. The component owns the file dropzone for uploads, the title, file name, category, status, scope with its conditional entity selector, uploading employee, AI summary bar, tags, description, text content and version note, writes the document to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills draft status, spec category, the target company, the current employee and the initial version note.

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens the form modal (rendered through the portal) |
| `document` | DocumentItem | null, default `null` | Document being edited (null = create mode, dropzone shown) |
| `presetCompanyId` | string | null, default `null` | Company prefilled for a context-bound opening (first company by default) |
| `presetProjectId` | string | null, default `null` | Project prefilled for a context-bound opening, switches the scope to project |
| `presetContractId` | string | null, default `null` | Contract prefilled for a context-bound opening |
| `presetCategory` | DocumentCategory | null, default `null` | Category prefilled for a quick upload (spec by default) |
| `presetStatus` | DocumentStatus | null, default `null` | Status prefilled for a quick upload (draft by default) |
| `presetTags` | string, default `''` | Tags prefilled for a quick upload (empty by default) |
| `contextTitle` | string, default `''` | Modal title override for context-bound openings |

**Events:** `close`, `saved`

#### `app-employee-form` — `AppEmployeeForm`

`src/components/common/app-employee-form/`

Canonical employee create and edit form. The component owns the ten fields, writes the employee to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. The full name is required, editing keeps the avatar of the existing record.

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens the form modal (rendered through the portal) |
| `employee` | User | null, default `null` | Employee being edited (null = create mode) |

**Events:** `close`, `saved`

#### `app-expense-form` — `AppExpenseForm`

`src/components/common/app-expense-form/`

Canonical expense create and edit form. The component owns the twelve fields of title project linked task category submitted by amount currency date status vendor billable and notes, writes the expense to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills the target project today infrastructure category 15000 amount RUB currency pending status and billable on.

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens the form modal (rendered through the portal) |
| `expense` | Expense | null, default `null` | Expense being edited (null = create mode) |
| `presetProjectId` | string | null, default `null` | Project prefilled for a context-bound opening (first project by default) |
| `presetTaskId` | string | null, default `null` | Linked task prefilled for a context-bound opening |
| `presetUserId` | string | null, default `null` | Submitter prefilled for a context-bound opening (first user by default) |
| `contextTitle` | string, default `''` | Modal title override for context-bound openings |

**Events:** `close`, `saved`

#### `app-modal` — `AppModal`

`src/components/common/app-modal/`

Customizable modal dialog with backdrop blur, customizable sizes, header, and footer actions. The title slot replaces the header caption, the default slot is the modal body, and the footer slot hosts footer buttons.

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens the modal (rendered through the portal) |
| `title` | string, default `''` | Header caption |
| `size` | ModalSize, default `'md'` | Modal width preset: sm / md / lg |
| `hideClose` | boolean, default `false` | Hides the header close (×) button |
| `headerIcon` | TemplateResult | null, default `null` | Icon descriptor rendered before the title |

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
| `open` | boolean, default `false` | Opens the form modal (rendered through the portal) |
| `invoice` | Invoice | null, default `null` | Optional target invoice the payment is recorded against |
| `payment` | InvoicePayment | null, default `null` | Existing InvoicePayment to edit (attribute: false, property binding only); null opens the create form |
| `payableInvoices` | Invoice[], default `[]` | Invoices the target selector may switch between |
| `defaultDirection` | PaymentDirection, default `'incoming'` | Initial direction for standalone payments (incoming \| outgoing) |
| `defaultCompanyId` | String, default `''` | Initial company ID for standalone payments |
| `defaultCounterpartyId` | String, default `''` | Initial counterparty ID for standalone payments |

**Events:** `close`, `saved`

#### `app-project-form` — `AppProjectForm`

`src/components/common/app-project-form/`

Canonical project create and edit form. The component owns the ten fields of name key status due date company counterparty budget progress color swatches and description, writes the project to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Presets fill company counterparty status key budget title and the save button caption.

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens the form modal (rendered through the portal) |
| `project` | Project | null, default `null` | Project being edited (null = create mode) |
| `presetCompanyId` | string | null, default `null` | Company prefilled for a context-bound opening |
| `presetCounterpartyId` | string | null, default `null` | Counterparty prefilled for a quick opening |
| `presetStatus` | ProjectStatus | null, default `null` | Status a newly created project starts with (planning by default) |
| `presetKey` | string | null, default `null` | Key prefilled for a quick opening |
| `presetBudget` | number | null, default `null` | Budget prefilled for a quick opening |
| `contextTitle` | string, default `''` | Modal title override for context-bound openings |
| `saveLabel` | string, default `''` | Primary button caption override (Создать for quick openings) |
| `saveDisabled` | boolean, default `false` | Disables the primary save button while the modal stays open (attribute binding) |
| `beforeSave` | ((data: { name: string; key: string }) => Promise<boolean>) | null, default `null` | Async hook run before saving (attribute: false): receives { name, key } and returns Promise<boolean>; false cancels the save and keeps the form open |
| `extraContent` | TemplateResult | null, default `null` | TemplateResult rendered in an extra section of the body — create mode only (attribute: false) |
| `footerExtra` | TemplateResult | null, default `null` | TemplateResult rendered in the modal footer before the primary button (attribute: false) |

**Events:** `close`, `saved`

#### `app-requirement-form` — `AppRequirementForm`

`src/components/common/app-requirement-form/`

Canonical requirement create and edit form. The component owns the eleven fields of project code type category priority status source spec document linked knowledge articles title description and acceptance criteria, writes the requirement to the store itself on save and emits a saved event with the written record; any close dispatches a close event so the opening view resets its flag. Create prefills the target project, its spec document, the next FR code, functional type Core category high priority and approved status.

| Property | Type / default | Description |
|---|---|---|
| `open` | boolean, default `false` | Opens the form modal (rendered through the portal) |
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
| `open` | boolean, default `false` | Opens the form modal (rendered through the portal) |
| `entry` | TimeEntry | null, default `null` | Entry being edited (null = create mode) |
| `presetProjectId` | string | null, default `null` | Project prefilled for a context-bound opening (first project by default) |
| `presetTaskId` | string | null, default `null` | Task prefilled for a context-bound opening (first task of the project by default) |
| `presetUserId` | string | null, default `null` | Employee prefilled for a context-bound opening (first user by default) |
| `contextTitle` | string, default `''` | Modal title override for context-bound openings |

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
| `title` | string, default `''` | Headline of the empty state |
| `message` | string, default `''` | Secondary explanation text |
| `compact` | boolean, default `false` | Reduced padding and typography for use inside cards |

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

### Other (2)

#### `app-data-table` — `AppDataTable`

`src/components/common/app-data-table/`

Data table with a fixed header and footer. Columns are declared as child app-table-column elements (field-driven formatting, mono/code cells, custom cellRender for rich cells and row actions). Sorting and pagination are internal: sortable headers sort the rows and emit sort-change, rows are sliced by page-size and the footer shows app-pagination whenever the table is not empty — even with a single page it hosts the page-size selector, so rows-per-page can always be changed from the footer. The table stretches to display all rendered rows; max-height caps the host so the body gets its own scrollbar.

| Property | Type / default | Description |
|---|---|---|
| `rows` | Record<string, unknown>[], default `[]` | Array of row objects rendered by the table |
| `page-size` | number, default `10` | Rows per page for the internal pagination (default 10) |
| `page` | number, default `1` | Initial page number (clamped to the available pages) |
| `sort-by` | string, default `''` | Field currently sorted; its header shows the active arrow |
| `sort-dir` | SortDirection, default `'asc'` | Current sort direction: asc / desc |
| `max-height` | number, default `0` | Host height cap in px; 0 (default) stretches the table to show all rendered rows, a positive value gives the body its own scrollbar |
| `empty-title` | string, default `''` | Title passed to the compact empty state when rows is empty |
| `locale` | string, default `'ru-RU'` | Locale used for number formatting and the pagination summary |
| `sort-change event` | — | Emitted with detail { field, dir } when a header sort button is clicked |
| `page-change event` | — | Emitted with detail { page, pageSize, totalItems } when pagination changes |
| `page-size-change event` | — | Emitted with detail { page: 1, pageSize, totalItems } when the footer page-size selector changes; rows are re-sliced at the new size and the page resets to 1 |
| `selectable` | boolean, default `false` | Leading checkbox column keyed by key-field (default id); header cell stays empty, select-all lives in the consumer toolbar |
| `key-field` | string, default `'id'` | Row field used as the selection key (default id) |
| `selected-keys` | string[], default `[]` | Array of currently selected row keys (property binding); toggling a checkbox updates it and emits selection-change |
| `selectedItems getter` | — | Rows whose key is in selectedKeys — the consumer reads the selection back from the table |
| `selection-change event` | — | Emitted with detail { selectedIds, selectedItems } when a row checkbox toggles |
| `row-click event` | — | Emitted with detail { row } when a row is activated; clicks on checkboxes, buttons and links inside cells do not activate the row |
| `contentStyles` | String | Additive hook: view-local CSS (string or CSSResult) injected into the shadow root as a <style> element for the cellRender content; default empty keeps consumers pixel-identical |

#### `app-table-column` — `AppTableColumn`

`src/components/common/app-table-column/`

Declarative column config child of app-table-scroll: field / label / type (text, number, boolean, select), alignment, mono and code cells, sortable headers, yes/no labels for booleans, option mapping for selects, plus cellRender and valueFn hooks. The element renders nothing itself — the table reads its properties.

| Property | Type / default | Description |
|---|---|---|
| `field` | string, default `''` | Row property the column reads (empty label column when combined with cellRender) |
| `label` | string, default `''` | Header caption shown in the sticky header row |
| `type` | TableCellType, default `'text'` | Cell formatting preset: text \| number \| boolean \| select |
| `options` | ColumnOption[], default `[]` | Value → label pairs used by type="select" cells |
| `align` | CellAlign, default `'left'` | Horizontal alignment of header and cells: left \| center \| right |
| `mono` | boolean, default `false` | Renders the value in the mono font family with tabular numerals |
| `code` | boolean, default `false` | Renders the value as a code chip |
| `sortable` | boolean, default `false` | Header shows the sort button; clicking emits sort-change on the table |
| `yes-label` | string, default `''` | Text for boolean true (falls back to the localized yes) |
| `no-label` | string, default `''` | Text for boolean false (falls back to the localized no) |
| `cellRender` | Object | Custom cell renderer (row, value) => TemplateResult \| string \| number |
| `valueFn` | Object | Custom value extractor (row) => unknown, replacing the plain row[field] read |

**Events:** `column-change`

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

Collapsible navigation sidebar composed declaratively with <app-sidebar-group> and <app-sidebar-item> elements, supporting single (accordion) and multiple group expansion modes.

| Property | Type / default | Description |
|---|---|---|
| `collapsed` | boolean, default `store.customization.sidebarCollapsed` | Icon-only sidebar width |
| `activeValue` | string, default `''` | Value of the currently active item |
| `groupMode` | SidebarGroupMode, default `store.customization.sidebarGroupMode` | Group behavior: single (accordion) / multiple |
| `standalone` | boolean, default `false` | Rendered outside app-root (manages its own state) |
| `theme` | — | Current theme for icon accents |
| `currentLang` | — | UI language |
| `selectedProjectId` | — | Project filter selection shown in the projects group |

| Child element | Role |
|---|---|
| `app-sidebar-group` | Collapsible navigation group container composing the sidebar menu |
| `app-sidebar-item` | Navigation item with icon, badge, and active state (inside an app-sidebar-group) |

#### `app-sidebar-group` — `AppSidebarGroup`

`src/components/layout/app-sidebar-group/`

Collapsible navigation group container for <app-sidebar> supporting smooth CSS collapse animations and active-route indicator. The default slot accepts app-sidebar-item children.

| Property | Type / default | Description |
|---|---|---|
| `groupId` | string, default `''` | Stable group id used by the sidebar controller |
| `label` | string, default `''` | Group caption |
| `expanded` | boolean, default `true` | Group is expanded (items visible) |
| `collapsed` | boolean, default `false` | Sidebar is in icon-only mode |
| `hasActive` | boolean, default `false` | Group contains the active item |

**Events:** `sidebar-group-toggle`

| Slot | Content |
|---|---|
| `(default)` | Sidebar items of the group |

| Child element | Role |
|---|---|
| `app-sidebar-item` | Navigation item with icon, badge, and active state rendered inside the group |

#### `app-sidebar-item` — `AppSidebarItem`

`src/components/layout/app-sidebar-item/`

Declarative navigation item component used to compose <app-sidebar> menus with icons, badges, and collapsed mode. Canonical start / default / end slots carry leading graphics, label markup, and trailing content; icon is a legacy alias of start.

| Property | Type / default | Description |
|---|---|---|
| `value` | string, default `''` | View id emitted when the item is clicked |
| `label` | string, default `''` | Item caption |
| `badge` | string, default `''` | Count badge on the right side |
| `active` | boolean, default `false` | Item is the current view |
| `collapsed` | boolean, default `false` | Sidebar is in icon-only mode |
| `disabled` | boolean, default `false` | Item is not clickable |
| `icon` | Object | Leading icon (SVG template) |

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
| `title` | string, default `''` | Chart caption |
| `subtitle` | string, default `''` | Secondary line under the caption |
| `type` | 'bar' | 'donut' | 'line', default `'bar'` | Chart type: bar / line / donut |
| `data` | ChartDataPoint[], default `[]` | Data points (label + value) |
| `centerLabel` | string, default `''` | Caption in the middle of a donut chart |

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
| `label` | string, default `''` | Metric caption |
| `value` | string, default `'0'` | Main value text |
| `delta` | string, default `''` | Change indicator text (e.g. +12%) |
| `trend` | 'up' | 'down' | 'neutral', default `'neutral'` | Delta color semantics: neutral / up / down |
| `subtitle` | string, default `''` | Secondary line under the value |
| `accentColor` | string, default `'var(--accent-primary, #6366f1)'` | Accent color of the card edge |
| `valueColor` | string, default `''` | Explicit color of the value text |
| `sparkline` | number[], default `[]` | Sparkline data points (small numbers) |
| `clickable` | boolean, default `false` | Card emits a click event |
| `size` | 'full' | 'compact' | 'strip', default `'full'` | full = with sparkline; compact = label + value only |

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
| `projectId` | string, default `'all'` | Project scope (all = portfolio overview) |
| `hideProjectSelector` | boolean, default `false` | Hides the project selector row |
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
| `title` | string, default `''` | Section caption |
| `projects` | Project[], default `[]` | Project records to render progress for |
| `tasks` | Task[], default `[]` | Task records used to compute progress |
| `lang` | 'ru' | 'en', default `'ru'` | UI language for labels and date formatting |

| Slot | Content |
|---|---|
| `actions` | Controls at the right of the section header |

| Child element | Role |
|---|---|
| `app-button` | Header control placed in the actions slot at the right of the section header |

## 7. Группа `views` (44)

### Views (44)

#### `app-analytics` — `AppAnalytics`

`src/components/views/app-analytics/`

Executive project health dashboards, KPI metrics, progress bars, and team workload table.

#### `app-auth` — `AppAuth`

`src/components/views/app-auth/`

Hybrid Authentication Flow view: local credentials with visibility toggle & password manager autofill, Google/Microsoft/Facebook OIDC, collapsible Enterprise SSO, account registration, recovery, and Step 2 TOTP 2FA.

| Property | Type / default | Description |
|---|---|---|
| `preview` | boolean, default `false` | Runs the flow in sandboxed Storybook preview mode without overwriting the active workspace session. |
| `initial-step` | AuthScreenStep, default `'login'` | Initial screen step to render: "login" \| "register" \| "forgot" \| "2fa". |

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
| `rowKey` | string, default `'id'` | Field holding the row identity (attribute row-key); default id — used for selection, grouping and expansion |
| `selectedKeys` | Array | Keys of the currently selected rows (property binding, array) |
| `selectable` | boolean, default `true` | Enables the row selection column; false renders no checkbox column |
| `virtual` | boolean, default `true` | Virtualized row windowing (default true) — only visible rows render in high-volume lists |
| `emptyText` | string, default `''` | Caption passed to the compact empty state when rows is empty (attribute empty-text) |
| `exportFilename` | string, default `'projectflow_export'` | Base name of the CSV file produced by the export action (attribute export-filename); the date is appended |
| `groupBy` | string, default `''` | Field whose values define the first grouping level (attribute group-by); empty = no grouping |
| `sortBy` | string, default `''` | Field currently used for sorting (attribute sort-by); arrow shown on its header |
| `compact` | Boolean | High-density row layout (30px rows, tighter padding); falls back to the global density customization |
| `hideDensitySwitch` | boolean, default `false` | Hides the comfortable/compact density switch in the grid toolbar (attribute hide-density-switch) |

**Events:** `row-click`, `selection-change`

| Child element | Role |
|---|---|
| `app-data-grid-column` | Declarative column config child (field, caption, width, resizable, hidden, sortable, groupable, template, sortValue) |

#### `app-design-tokens` — `AppDesignTokens`

`src/components/views/app-design-tokens/`

Live CSS custom property reference: token swatches grouped by category (backgrounds, text, borders, accent, status colors, scrollbars, shadows) with a theme switch across Light, Dark, Cyberpunk, Matrix, Barbie and High Contrast — values read live from the active theme.

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
| `virtual` | boolean, default `true` | 2D windowing (vertical rows + horizontal days) — only visible tasks and day columns render; default true |
| `tasksData` | Array | Task objects rendered on the timeline (property binding, array); empty renders the empty state |
| `datasetMode` | 'project' | 'large', default `'project'` | Built-in dataset to display (attribute dataset-mode): project (the working project schedule) or large (2,000-task multi-year stress dataset) |

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

#### `app-material-icons` — `AppMaterialIcons`

`src/components/views/app-material-icons/`

Material Symbols palette page: every ligature glyph of the self-hosted variable fonts (3945 icons) with search by name, category and tags; the gallery toolbar drives the snippet panel, Enter/Space on a cell copies its name into the snippet, and the copy button writes the snippet to the clipboard.

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

Workspace Reminders Center with polymorphic linking to any entity, directory-driven recurrence templates shown in the card meta row together with their plain-language description (editor summary canon), snooze presets, and per-reminder notification rules.

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

#### `app-task-grid` — `AppTaskGrid`

`src/components/views/app-task-grid/`

The task table view: canonical skeleton (page header, Standard/Compact density segmented switch with the filter toggle, filter bar with project/status/priority/assignee filters bound to the store task filters) and app-data-grid in store mode inside the framed card; the grid keeps its own toolbar (bulk actions, grouping, column menu, export) and hides its internal density switch because the view owns the mode row.

#### `app-time-tracking` — `AppTimeTracking`

`src/components/views/app-time-tracking/`

Учет времени: быстрые отчёты по задачам, журнал трудозатрат, группировка план/факт по задачам и утверждение часов.

#### `app-timeentry-detail` — `AppTimeEntryDetail`

`src/components/views/app-timeentry-detail/`

Отдельная страница записи о времени: отработанные часы, статус утверждения, биллинг, прикреплённые файлы в библиотеке проекта и включение в калькуляции.

---

## 8. Компоненты без стори (0)

Не зарегистрированы в app-storybook: мета отсутствует, API описан по исходнику (помечены «без стори»
в своих группах). По правилу проекта каждый компонент обязан иметь `.story.ts` — для этих компонентов
стори нужно добавить:


# Контекст проекта (срез на конец сессии)

Живой документ: фиксирует состояние и незакрытые вопросы, которые не
закрываются `AGENTS.md` и git-историей. Конвенции кода — только в `AGENTS.md`,
этапы работы — в истории коммитов; здесь не дублировать.

## Состояние

- Слияния в `main`: HEAD — срез документации серии; origin/main = `f8a4de7`,
  незапушенных нет (слиты и запушены серия внешних рекомендаций `c8063b6`…
  `19a049a`, серия event-detail interfaces, серия событий Storybook
  `e4c12bc`…`9bbef45`, фикс `app-page-header` `f8a4de7`).
- Локальных feature-веток нет: удалены 31 отработанная ветка (все были слиты,
  неслитых изменений не потеряно). Работа над фичой начинается с
  `git checkout -b feature/<name>` от `main` (процесс — §0 `AGENTS.md`).
- Рабочий стек: Lit 3 + TypeScript + Vite; проверки перед коммитом —
  `npx tsc --noEmit` и `npm run build`.

## Сделано в последних сериях коммитов

- Карточные представления Договоров и Калькуляций (карточки — режим по
  умолчанию, канонический скелет view с mode-row и фильтром).
- Новая страница `invoice-detail` (по аналогии с `calculation-detail`);
  шевроны действий в Калькуляциях и Счетах ведут на страницы сущностей.
- Редактор повторяемости вынесен из модалки записи справочника в отдельный
  диалог (`app-directory-record-modal`).
- В `AGENTS.md` зафиксированы: канон порядка кнопок действий (LTR: просмотр →
  доменные → правка → удаление последним; в футерах диалогов отмена слева,
  опасное подтверждение справа) и веточный процесс разработки.
- Модалка записи справочника: флаг `framelessSwitch` удалён (тип + 7 данных),
  boolean-поля всегда канонические — `app-switch frame="transparent"
  field-label-style="ghost" field-label="…"`; ghost-лейбл держит лейбл-строку,
  контрол вровень с соседним инпутом. Одинокий switch в последней строке сетки —
  `frame="none"`, `field-label-style="none"` (свой caption, без ghost-лейбла).
- Канон порядка кнопок действий применён во всех наборах: Калькуляции (ряд
  открывается «Открыть калькуляцию»), Компании (открытие карточки первым,
  удаление последним), Контакты (таблица), Документы (карточный ряд, ранее
  полностью обратный), Счета (таблица и карточки), Платежи (проверен — ряды
  канонические), Блог (чтение статьи первым), Справочники (удаление последним).
  Вложенные списки detail-страниц проверены сканером — нарушений нет.
- Представление «Платежи»: `app-filter-bar` без атрибута `variant` —
  канонический carded вид (был единственным view с `variant="bare"`).
- Storybook: история `app-invoice-detail` зарегистрирована в `ALL_STORIES`
  (файл истории был, импорта не было); документация компонентов регенерирована
  (`docs/components.json`, `docs/WebComponentsReference.md`).
- Storybook закрыт полностью: добавлены 4 отсутствующие истории
  (`app-table-column`, `app-design-tokens`, `app-material-icons`, `app-task-grid`)
  и зарегистрированы в `ALL_STORIES` — 139 компонентов, 139 со story, 139 с
  описанием; сам `app-storybook` в реестр не входит (листать самого себя
  нельзя), поэтому сайдбар показывает 138 элементов. propsDoc заполнен до
  полного покрытия (`app-data-grid` 11/11, `app-gantt`, `app-material-icon`,
  `app-material-icon-gallery`, `app-project-form`, `app-file-dropzone`,
  `app-data-grid-column`, `app-link`, `app-persona`, `app-section-card`,
  `app-textarea`, `app-payment-form`, `app-bank-requisites`,
  `app-counterparty-contacts`); ключ propsDoc — camelCase имя свойства.
  Аудит (`E:\TEMP\opencode\props-gap.js`) даёт 0 пропусков.
- Унификация префикса тегов: `sidebar-item` → `app-sidebar-item`,
  `sidebar-group` → `app-sidebar-group`, `card-footer` → `app-card-footer`
  (папка, файл, тег, класс `App*`; скан берёт тег из имени папки). Все 140
  custom-элементов теперь с префиксом `app-`. Сохранены стабильные API: события
  `sidebar-select` / `sidebar-group-toggle`, методы store
  (`setSidebarGroupMode`, `toggleSidebarGroup`), тип `SidebarGroupMode`, CSS-хуки
  `--card-footer-gap` / `-padding-top` / `-start-gap` / `-end-gap`, локальный
  класс `.card-footer` в `app-auth`. Заголовки историй префикс не носят
  (`Layout/SidebarItem`, `Common/CardFooter`).
- Правило confirm-диалогов закрыто по всему коду: каждая кнопка с
  `action="delete"` / `variant="danger"` обязана открывать `app-confirm-dialog`
  перед разрушительным действием. Аудит-сканер
  (`E:\TEMP\opencode\confirm-audit4.js`, скобочный разбор обработчиков +
  резолв тел методов) — 74 кнопок, 0 настоящих пропусков. Коммиты серии:
  `app-bank-requisites` и `app-counterparty-contacts` (свойство `confirm-delete`
  и ветка немедленного удаления удалены — диалог обязателен всегда, потребители
  потеряли атрибут); `app-knowledge-base` (plain-модалка заменена диалогом,
  ключ `confirmDialogs.knowledgeArticleDelete`, старый `knowledgeBase.deleteConfirm`
  удалён); `app-project-attachments` (открепление документа через диалог,
  `confirmDialogs.attachmentDetach`, confirm-лейбл `attachments.removeButton`);
  `app-requirement-detail` (4 диалога: критерий приёмки, отвязка задачи,
  исходного документа, статьи БЗ — ключи `criterionDelete`/`taskUnlink`/
  `sourceDocUnlink`/`kbArticleUnlink`, добавлен `common.unlink`);
  `app-task-detail` (модалка удаления задачи → диалог `taskDelete`,
  `@item-remove` подзадачи → диалог `subtaskDelete`, неиспользуемый
  `common.confirmDelete` удалён из обоих ресурсов). Принятые исключения
  (решение пользователя): отвязка pending-файла в attachments (локальный
  черновик, запись в store отсутствует), logout в `app-profile-settings`
  (сессия, не данные), `app-draggable-list-item` (эмитит `item-remove` —
  подтверждение на стороне потребителя).
- `app-switch`: при `field-label-style="ghost"` и незаданном `field-label`
  призрачная строка берёт текст из `label` — один атрибут держит и геометрию
  ghost-строки, и caption внутри контрола (`visibility: hidden`, layout не
  меняется, потребители пиксельно идентичны). Канон boolean-поля модалки
  сокращается до `<app-switch size="md" frame="transparent"
  field-label-style="ghost" label="…">`.
- `app-reminder-form` — скролл по канону: прокрутку держит `modal-body`
  (`flex:1`, `overflow-y:auto`, стилизованный скролл под шапкой `90vh`);
  внутренний `.reminder-form-scroll` (70vh + локальные scrollbar-правила)
  превращён в plain-обёртку `.reminder-form-body` без max-height/overflow.
- `app-reminder-form` — повторяемость по канону справочника: правило выбирается
  из шаблонов справочника (select), индивидуальная настройка — отдельный диалог
  с тем же `app-recurrence-editor`, что в `app-directory-record-modal`
  (disabled mono-ряд RRULE + кнопка «Настроить правило»; draft применяется
  только по «Применить», cancel не трогает форму; совпадение с шаблоном
  справочника сохраняет его код, иначе `CUSTOM`). Ключи `reminders.fieldRrule`
  / `editRecurrenceBtn` / `recurrenceModalTitle`.
- `app-recurrence-editor` — кнопка копирования RRULE сделана иконочной (лейбл
  убран, title «Копировать» сохранён).
- `app-reminder-form` — summary-карточка правила: kicker
  `t.viewTexts.recurrenceEditor.summaryLabel` + человекочитаемое описание через
  `formatRRuleHumanSummary` (ONCE → «Не повторяется — сработает один раз»),
  CSS по канону редактора.
- `app-reminder-form` — ручной ввод RRULE прямо в поле: `app-input` ряда
  «Правило повторяемости» стал редактируемым (placeholder
  `reminders.rruleInputPlaceholder`, live-валидация `parseRRule` при каждом
  вводе; при парсе без успеха danger-баннер под полем с текстом
  `reminders.rruleErrors[errorCode]` по канону `.re-error-banner` редактора,
  состояние `fRruleError`); правило перематчится со справочником по канонической
  сериализации (совпадение сохраняет код, иначе `CUSTOM`), пустой текст → `ONCE`;
  сохранение с непарсящимся правилом блокируется тем же текстом в `formError`.
- `app-reminder-form` — кнопка удаления правила уведомлений (trash в карточке
  канала) помечена опасной: `action="delete"` вместо ghost, удаление только
  через `app-confirm-dialog` (`confirmDialogs.notificationRuleDelete`,
  правило названо каналом и отступом по `reminders.channels` +
  `reminders.leadUnits`).
- `app-detail-shell` — канон масштаба контролов: slotted-кнопки навигации больше не
  получают `--control-height-xs: 34px`; xs остаётся плотным шагом 24px ниже sm (30px),
  ряд никогда не рендерит xs выше соседних sm. Канон ряда заголовка detail-страниц —
  sm-тулбар, и хвостовая icon-кнопка удаления (`action="delete"`) теперь `size="sm"`
  в reminder/expense/timeentry/payment/calculation/invoice/task/requirement/employee/
  counterparty/project + reader-ряд knowledge-base (pin + delete). Локальные
  `--control-height-xs` выше sm удалены из CSS этих view; плотные row-ряды рендерят
  канонические 24px (row-оверрайд `.sm-action` 26px сохранён).
- `app-reminders` — карточка в meta-ряду показывает понятное описание правила рядом с
  именем шаблона: «Еженедельно — Каждую неделю · Вт, Чт»; для разовых — канон
  `viewTexts.recurrenceEditor.summaryOnce`. Дубликаты (описание = имя) не повторяются,
  tooltip — полное описание.
- Кнопка «Отмена» унифицирована: канон футера диалога — ghost (прозрачный фон,
  вторичный глиф) слева + solid-подтверждение справа. Аудит-сканер
  (`E:\TEMP\opencode\cancel-audit.js`, скобочный разбор тегов `app-button` с
  резолвом лейбла cancel/close) — 30 контролов, из них ровно один outline
  (футер `app-reminder-form`) исправлен на ghost; остальных 29 уже канон.

## Не закрыто

- Проверено в браузере (dev-server, порт 3002): карточные режимы Договоров
  (6 карточек + футер пагинации) и Калькуляций (3 карточки + футер), рендер
  `invoice-detail` (`inv-1`: 3 `app-section-card`, статус-чип, кнопки «К счетам»
  / «Открыть договор», пустого состояния нет), открытие диалога повторяемости
  (стек модалок, редактор внутри), выравнивание switch «Пропуск выходных»
  (ряд h60 top 651, контрол top 673, h38, w367 — идентично соседнему инпуту).
- **Интерактивные сценарии не проверялись**: запись оплаты и смена статуса в
  `invoice-detail`. Dev-server перед проверкой перезапускать
  (`npx vite --port=3002 --host=0.0.0.0`), он отдаёт stale CSS.
- В `invoice-detail` намеренно нет редактирования счёта (согласовано);
  правка — из реестра счетов.
- Аудит документации компонентов закрыт (см. «Сделано»). `docs/ComponentApiSpecs.md`
  упоминает только имена событий (`sidebar-select`, `sidebar-group-toggle`) — они
  намеренно сохранены, переименования не требуется.
- Предупреждение `change-in-update` в `app-data-grid` — **исправлено** (`ed998ea`):
  виртуальное окно пересчитывается в `willUpdate()`, чтение слотов и viewport —
  микрозадача после первого рендера. Проба: /grid с 280 задачами, предупреждение
  исчезло, окно реагирует на скролл (19 → 29 рядов), compact меняет
  `--grid-row-height` 42px → 30px (34 ряда).
- Предупреждение `change-in-update` в `app-modal` — **исправлено** (`c8063b6`):
  сброс `isVisualOpen` при закрытии перенесён из `updated()` в микрозадачу.
  Проба с обёрткой `requestUpdate`/`performUpdate`: каждый цикл заканчивается
  `pending=false`, предупреждения нет, анимация закрытия сохранена.
- Серия внешних рекомендаций зафиксирована в `AGENTS.md` §6/§9 и выполнена по
  порядку: (1) фикс `app-modal` `c8063b6`, (2) фикс `app-data-grid` `ed998ea`,
  (3) `strict` в `tsconfig.json` `4ea5189` (замер: 0 ошибок),
  (4) `:host([hidden])` — 135 `.css` + 2 инлайн-компонента `12a924c`,
  (5) `type:` у 82 `@property` + приоритет TS-аннотации в генераторе документации
  `cabbb07`, (6) именованные event-detail interfaces — 45 компонентов по одному
  коммиту (контролы, формы, layout, previewer, entity-selector, project-overview,
  auth, data-grid; `d5a3fed`…`ed951c3`), генератор документации теперь сканирует
  типизированные диспетчи `new CustomEvent<XDetail>('name')` (`19a049a`).
  Событий без detail (`close`, `confirm`, `cancel`, `reset`, `primary-click`) и
  пустого `detail: {}` (`file-cleared`) правило не касается. Проба: geometry
  идентична (row 42px, sidebar 260px, header 69px, 16 card footers),
  selection-change detail `{ ids:['CORE-101'], rows:1 }`, switch detail `false`,
  errors 0. Остались точечные: `repeat()` для динамических списков,
  `HTMLElementTagNameMap` для публичного API;
  затем браузерная проба интерактивных сценариев `invoice-detail`;
  **последним и очень внимательно** — перевод 200 статических inline-стилей
  продуктового кода в классы `.css` (129 динамических остаются, 218 в story
  — отдельной серией), каждый view отдельным коммитом с pixel-проверкой.
- Серия событий в Storybook: `EventsDoc`/`EventDoc` типы и опциональное поле
  `eventsDoc` в `ComponentStoryMeta`; `app-storybook` рендерит таблицу
  «События» (Событие / Detail / Описание) под таблицей props в API-спецификации,
  строки — через i18n (`eventsTitle`, `thEvent`, `thDetail`). `eventsDoc` добавлен
  во все 60 компонентов с событиями, по одному коммиту на компонент
  (`e4c12bc` инфраструктура, `79134b3`…`6dfbcdb` компоненты, `9bbef45` генератор);
  деталь описана точной TS-формой из экспортированных interfaces. Генератор
  документации сканирует `eventsDoc` и рендерит markdown-таблицу ( pipes внутри
  detail экранированы). Проба: storybook, app-checkbox — таблица с заголовками
  Событие/Detail/Описание и рядом `change { checked: boolean }`, app-data-grid —
  row-click + selection-change, app-button без событий — секции нет (корректно),
  errors 0.
- `app-page-header`: убран `max-width: var(--header-left-max-width, 50%)` из
  `.header-left` (`f8a4de7) — `flex: 1 0 var(--header-left-basis, 50%)` сам держит
  половину шапки; токен `--header-left-max-width` удалён из кода (consumers не было),
  `--header-left-basis` остаётся ручкой. Pixel-проба идентична: 5 view, leftW = 50%
  headerW (491/981, 498/996, 493/986), headerH 69px.
- Актуализация документации и view `/design-tokens`: аудит токенов скриптом против
  `index.css` (`88a39f8` — добавлены `--control-height-xxs/xs`); регенерация
  reference с датой 21.11 (`317e744`); статусные пометки planning-доков (`5210655`).
  View `app-design-tokens` получил полный набор токенов: statusColors c
  `-bg/-border` (16), категории radii, controlHeights, density, transitions,
  typography, glow, sidebar + i18n-заголовки (`130656c`). `DesignTokens.md`:
  шести тем (ThemeMode — light/dark/cyberpunk/matrix/barbie/high-contrast), все
  таблицы сверены с `index.css` скриптом; примечания: пресеты фона — только
  Light/Dark, вариации акцента `[data-accent] :not high-contrast` — Light/Dark/
  Cyberpunk/Matrix/Barbie, ambient `body::after` — cyberpunk и matrix (`7f15595`).
  Проба: 67 token rows, live-значения matrix/barbie/high-contrast совпадают
  (#020603/#00ff41, #fff1f7/#d61f77, #000000/#fde047), headerH 69px, errors 0.
- Браузерные пробы оставляют следы в localStorage: режимы
  contacts=table, invoices=cards, documents=cards, расчётный режим всех
  карточных view выставлен в `cards` при проверке футеров; перед сдачей сессии
  чистить `viewModes`, поисковый запрос и активный view.
- Проверено в браузере (dev-server, порт 3002, кэш `.vite` очищен): сайдбар —
  4 `app-sidebar-group` + 29 `app-sidebar-item`, сворачивание/разворачивание
  группы работает, активный пункт сохраняется; карточные режимы 12 view —
  1352 `app-card-footer` с родной хромированной строкой (border-top 1px, flex,
  space-between), легаси-тегов 0; истории SidebarItem / SidebarGroup /
  CardFooter / TableColumn / Table Scroll рендерятся. Console errors 0.
- Confirm-диалоги серии проверены в браузере (dev-server, порт 3002; после
  перезапуска сервера и чистки `.vite`): bank-requisites story — удаление
  счёта через диалог (4 → 4 при отмене, 4 → 3 при подтверждении);
  counterparty-contacts story (3 → 3 cancel, 3 → 2 confirm); knowledge-base view
  (8 → 8 cancel, 8 → 7 confirm; тексты диалога корректны в ru и en — секции
  «Выполняемое действие / Ожидаемый результат», footer Отмена/Удалить);
  attachments story (2 → 2 cancel, 2 → 1 confirm); requirement-detail view на
  req-101 (критерий 3 → 3 cancel, 3 → 2 confirm; отвязка задачи, документа
  `doc-4` и статьи БЗ — диалог открывается, cancel сохраняет, confirm снимает
  связь); task-detail view (подзадачи 4 → 4 cancel, 4 → 3 confirm; модалка
  удаления задачи заменена диалогом с текстом `taskDelete`, cancel сохраняет
  задачу). Проба восстановила seed-состояние req-101 (3 критерия, doc-4,
  kb-101) и подзадачи задачи. Console errors 0 во всех пробах.
- Проверено в браузере (dev-server, порт 3002): ghost-фолбэк `app-switch` —
  все 4 ряда истории Inputs/Switch держат высоту лейбл-строки 17px, новый ряд
  `field-label-style="ghost"` только с `label` — строка скрыта, текст равен
  `label`, `fieldLabel` пуст; скролл модалки напоминания — полоса на
  `modal-body` (clientH 667 vs scrollH 2307), диалог ограничен 90vh,
  `.reminder-form-body` — overflow visible / max-height none, внутренних
  скроллеров 0; повторяемость reminder-form — ряд отображения RRULE пуст для
  ONCE, кнопка открывает диалог «Правило повторяемости» с редактором, пресет
  «Каждый день» ставит draft без изменения отображения, cancel сохраняет пусто,
  Применить ставит `FREQ=DAILY` и `fTemplateCode='DAILY'` (совпадение со
  справочником). Проба закрыла модалку, создания в store нет. Console errors 0.
- Проверено в браузере (dev-server, порт 3002, fresh tab): ручной ввод RRULE —
  поле редактируемое; `FREQ=WEEKLY;BYDAY=MO,WE,FR` даёт summary «Каждую неделю ·
  Пн, Ср, Пт» и `fTemplateCode='CUSTOM'` без ошибок; `FREQ=BOGUS` ставит
  `fRruleError` и баннер «Недопустимое значение FREQ (ожидается MINUTELY, HOURLY,
  DAILY, WEEKLY, MONTHLY или YEARLY)»; Сохранить блокирует с тем же текстом в
  `formError`, напоминание не создаётся (store delta 0), форма открыта; очистка
  поля → `ONCE` и summary «Не повторяется — сработает один раз». Удаление канала
  уведомлений: trash-кнопка `action="delete"`; диалог «Удалить канал
  уведомлений?» (danger) называет правило «В системе (In-App) · 30 мин. до»,
  секции и лейблы корректны, Отмена сохраняет набор (3 → 3), Удалить снимает
  правило (3 → 2), диалог закрывается. Проба закрыла модалку. Console errors 0.
- Проверено в браузере (dev-server, порт 3002, fresh tab): масштаб контролов в рядах
  заголовков detail-страниц — все sm-кнопки h30, хвостовая icon-кнопка удаления
  `action="delete"` h30/w30 (reminder/expense/timeentry/payment/calculation/invoice/
  task/requirement/counterparty/project/employee + reader-ряд knowledge-base);
  плотные row-ряды (member-row, row-right) рендерят канонические xs h24/w24 — xs
  больше не превышает sm. Карточки /reminders: 23 meta-ряда с описанием — «Еженедельно
  — Каждую неделю · Вт, Чт», «Ежемесячно — Каждый месяц · число: 18», «По рабочим дням
  (Пн–Пт) — Каждую неделю · Пн, Вт, Ср, Чт, Пт», разовое «Без повтора (разовое) — Не
  повторяется — сработает один раз»; после `setLanguage('en')` — "Weekly — Every week ·
  Tue, Thu", "No repeat (One-time) — Does not repeat — triggers once". Console errors 0.
- Проверено в браузере (dev-server, порт 3002, fresh tab): футер модалки «Новое
  напоминание» — Отмена `variant="ghost"` (фон rgba(0,0,0,0), граница прозрачная),
  Сохранить `variant="primary"` (фон rgb(99,102,241)); повторный аудит после правки —
  outline-кнопок cancel/close в коде 0. Console errors 0.
- `app-invoices` — канон перехода по номеру: ссылка номера счёта (карточный
  `app-link.cp-link-btn` и табличный `.contract-link-btn`) ведёт на страницу
  `invoice-detail` через `store.openInvoiceDetail`, а не модалку предпросмотра;
  быстрый предпросмотр сохранён на кнопке-глазе в ряду действий.
- Проверено в браузере (dev-server, порт 3002, fresh tab): клик по номеру счёта
  «СЧ-2026/003» из карточки и из табличной ячейки — `activeView='invoice-detail'`,
  `detailInvoiceId='inv-3'`, `app-invoice-detail` отрендерен (1), открытых модалок
  0; проба вернула view на /invoices и режим обратно в cards. Console errors 0.
- `app-blog` — комментарии с одноуровневым ответом: комментарий верхнего уровня
  корень диалога, ответы цепляются только к нему (`BlogComment.parentId`, опциональный;
  `addBlogComment` валидирует parent по существующим корням поста, ответ-на-ответ
  отклоняется). Удаление корня снимает всю ветку ответов, удаление ответа — только
  его. В рендере корни по времени с ответами под отступом (`.comment-root`,
  `.comment-reply`), в ряду корня кнопка ответа `action="add"` (iconCornerUpLeft) перед
  хвостовым удалением; клик по «Ответить» открывает инлайн-композер внутри треда
  (чип «Ответ <корреспондент>», Отмена ghost + solid-отправка), глобальный композер
  верхнего уровня в режиме ответа скрыт. Диалог удаления корня называет размер ветки.
- Проверено в браузере (dev-server, порт 3002, fresh tab, seed blog-101..104): карточка
  reader /blog/blog-101 — 2 корня, 2 кнопки «Ответить» (только у корней), 1 ответ
  рендерен; клик по «Ответить» — композер открыт, чип «Ответ Александр Морозов»,
  глобальный композер скрыт; отправка «Отправить ответ» — +1 комментарий с
  `parentId='bcom-101-1'` и автором из селекта, тред перерисован (2 ответа), композер
  закрыт. Удаление корня bcom-101-1: диалог danger «Удалить комментарий?» с текстом
  «Выбранный комментарий и ответы на него (1) будут удалены…» (в en —
  “…and its replies (1)…”, результат — «вся ветка ответов исчезнет»); Отмена ghost
  сохраняет набор (4 → 4), Удалить снимает корень и ветку (4 → 1, `rootGone` и
  `branchGone`). Диалог удаления ответа — текст без ветки. Английские лейблы: Reply /
  Reply to Наталья Орлова / Write a reply… / Cancel reply + Post Reply. Console errors 0.
- `app-blog` — канон одноуровневых диалогов (заменил `parentId`): `BlogComment.replyToId`
  — сообщение, на которое отвечают (корень или ответ), `quote: boolean` — опциональная
  цитата источника. Ответ всегда дописывается в конец своего диалога, новый уровень
  иерархии не создаётся; `addBlogComment(postId, text, authorId?, replyToId?, quote?)`
  валидирует цель по любому сообщению поста. Ряд каждого сообщения: кнопка ответа
  `action="add"` (iconCornerUpLeft) перед хвостовым удалением; ряд ответа показывает
  `.reply-to-chip` («Ответ <автор цели>») и опциональный `.comment-quote` (автор +
  курсивный текст). Композер инлайн в конце диалога: чип называет автора цели,
  переключатель цитаты — голый `app-switch size="sm"` только с `label` (без frame и
  field-label), футер Отмена ghost + solid-отправка; глобальный композер верхнего
  уровня в режиме ответа скрыт. Удаление корня снимает весь диалог — диалог называет
  его размер (`blogCommentDelete.action/result(messages)`); удаление ответа снимает
  только его, корень сохраняется, отвечавшие ему перепринудированы к родителю
  (`blogCommentDeleteReply` — «Удалить ответ?»).
- Проверено в браузере (dev-server, порт 3002, fresh tab, seed blog-101): ответ на
  ответ (`replyItem bcom-101-3`) — +1 комментарий с `replyToId='bcom-101-3'` и
  `quote=true`, дописан в конец своего диалога (2 диалога рендерятся отдельно), чип
  «Ответ Ольга Кузнецова», блок цитаты с автором; композер отвечает автору цели, не id.
  Переключатель цитаты (клик по `.switch-container`) — `checked` true → false,
  отправленный ответ `quote=false`, чип есть, блок цитаты не рендерен. Удаление
  ответа bcom-101-3: диалог «Удалить ответ?» (danger), Отмена ghost сохраняет набор
  (6 → 6), Удалить снимает только ответ (6 → 5), корень bcom-101-1 жив, дети
  bcom-101-4 и новый ответ перепринудированы на `bcom-101-1`, чипы пересчитаны.
  Удаление корня: диалог «Выбранный комментарий и все сообщения диалога (3)…» +
  «Диалог целиком исчезнет…», Отмена ghost сохраняет (5 → 5), Удалить снимает весь
  диалог (остались `bcom-101-2`, `bcom-060861`). Английские лейблы: Reply /
  «Reply to Игорь Белов» / Cancel reply ghost + Post Reply primary, диалог
  «Delete reply?» с текстом про сохранение корня и перепринудирование; композер
  закрывается по Cancel reply. Console errors 0.
- Браузерная аналитика диалогов: `app-modal` при открытии уезжает в portal, его
  light-DOM футер (кнопки) переезжает вместе с ним — кнопки открытого диалога
  ищутся по предку `app-modal` с совпадающим `title`, а не по subtree
  `app-confirm-dialog`; закрытые диалоги остаются в DOM призраками, клик по лейблу
  без привязки к модалке бьёт по чужой кнопке.

## Бэклог идей (обсуждено, не начато)

- `app-entity-card` по п.18 `docs/ComponentReuseRecommendations.md` + сервис
  preview-поповеров поверх `portalManager` (быстрый просмотр сущностей без
  модалок/страниц). Делать только при появлении второго потребителя карточки.
- Включение `strict` в `tsconfig.json` — решение принято (замер:
  `npx tsc --noEmit --strict` = 0 ошибок), выполняется отдельным коммитом.
- Расщепление `src/state/store.ts` (~6 тыс. строк) на доменные срезы.
- Тесты (Vitest) поверх чистой логики (`domain/rfc5545.ts`, фильтры-Selectors);
  ESLint/Prettier; кастомные правила под запреты §1/§7 `AGENTS.md`.

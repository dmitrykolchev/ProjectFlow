# Контекст проекта (срез на конец сессии)

Живой документ: фиксирует состояние и незакрытые вопросы, которые не
закрываются `AGENTS.md` и git-историей. Конвенции кода — только в `AGENTS.md`,
этапы работы — в истории коммитов; здесь не дублировать.

## Состояние

- Слияния в `main`: HEAD `44be540`; origin/main = `585be96`, 34 незапушенных
  коммитов.
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

## Не закрыто

- Проверено в браузере (dev-server, порт 3002): карточные режимы Договоров
  (6 карточек + футер пагинации) и Калькуляций (3 карточки + футер), рендер
  `invoice-detail` (`inv-1`: 3 `app-section-card`, статус-чип, кнопки «К счетам»
  / «Открыть договор», пустого состояния нет), открытие диалога повторяемости
  (стек модалок, редактор внутри), выравнивание switch «Пропуск выходных»
  (ряд h60 top 651, контрол top 673, h38, w367 — идентично соседнему инпуту).
- **Интерактивные сценарии не проверялись**: запись оплаты и смена статуса в
  `invoice-detail`, применение/отмена диалога повторяемости. Dev-server перед
  проверкой перезапускать (`npx vite --port=3002 --host=0.0.0.0`), он отдаёт
  stale CSS.
- В `invoice-detail` намеренно нет редактирования счёта (согласовано);
  правка — из реестра счетов.
- Аудит документации компонентов закрыт (см. «Сделано»). `docs/ComponentApiSpecs.md`
  упоминает только имена событий (`sidebar-select`, `sidebar-group-toggle`) — они
  намеренно сохранены, переименования не требуется.
- Предупреждение `change-in-update` в `app-data-grid` (`firstUpdated()` +
  `updated()` → `recomputeVirtualWindow()`, slotchange → `readSlottedColumns()`)
  — фикс обсуждён, не начат (ждём команды).
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

## Бэклог идей (обсуждено, не начато)

- `app-entity-card` по п.18 `docs/ComponentReuseRecommendations.md` + сервис
  preview-поповеров поверх `portalManager` (быстрый просмотр сущностей без
  модалок/страниц). Делать только при появлении второго потребителя карточки.
- Включение `strict` в `tsconfig.json` (разовая причёска типов).
- Расщепление `src/state/store.ts` (~6 тыс. строк) на доменные срезы.
- Тесты (Vitest) поверх чистой логики (`domain/rfc5545.ts`, фильтры-Selectors);
  ESLint/Prettier; кастомные правила под запреты §1/§7 `AGENTS.md`.

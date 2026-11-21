# ProjectFlow Frontend — правила создания карточек и представлений

Обязательный свод правил для всех, кто меняет этот репозиторий. Документ фиксирует
конвенции компонентов (карточки, модалки, диалоги) и представлений (view'ы),
выверенные сериями миграций компонентов (история коммитов `main`).

## 0. Рабочий процесс

- **`main` не трогается при реализации новой фичи.** Сначала создаётся ветка
  (`feature/<name>`) от актуального `main` — фича полностью реализуется в ней.
- По готовности ветка фичи вливается в `main` (merge, fast-forward по возможности)
  и пушится на origin.
- Каждая миграция/правило — **отдельный коммит** на один view или один компонент.
- Перед каждым коммитом: `npx tsc --noEmit` (чисто) и `npm run build` (успешно).
- Визуальный результат миграции обязан совпадать с оригиналом пиксель в пиксель
  («Результат не должен отличаться от оригинала!»). Эталон — актуальный `main`,
  от которого создана ветка фичи.
- Vite dev-server отдаёт stale CSS после правок: перед браузерной проверкой убивать PID
  на порту и перезапускать (`npx vite --port=3002 --host=0.0.0.0`).

## 1. i18n — абсолютный запрет строк и проверок языка в компонентах

**Запрещено в любом `.ts` компоненте (кроме `src/i18n/*.ts`):**

1. Билингвальные строковые литералы: `isRu ? 'X' : 'Y'`, `currentLang === 'ru' ? ...`.
2. Любые проверки языка: `isRu`, `this.currentLang === 'ru'`, `this.effectiveLang === 'ru'`.
3. Прямые UI-строки (заголовки, подписи, placeholder'ы, тексты ошибок).

**Правила:**

- Язык берётся один раз в методе: `const t = getTranslation(this.currentLang);`
  (`import { getTranslation } from '../../../i18n'`). В handler-методах без `t` —
  `getTranslation(this.currentLang).<путь>` напрямую.
- Строки живут в `src/i18n/ru.ts` / `en.ts`. Интерфейс — `typeof ru`; `en.ts`
  обязан совпадать по структуре (TypeScript проверит).
- Для view'ов — секция `viewTexts` с подсекциями ясного имени:
  `viewTexts.pageSubtitles.<view>`, `viewTexts.<view>` (лейблы, KPI, th, labels,
  modalTitle*), `viewTexts.confirmSectionLabels`, `viewTexts.confirmDialogs`.
- Строки с интерполяцией — **функции** в ресурсе:
  ```ts
  action: (name: string) => `Проект «${name}» будет удалён из системы.`,
  kpiRateBase: (rate: string) => `Базовая ставка ${rate} ₽/ч`,
  daysLeftTemplate: (days: number) => `Осталось ${days} дн.`,
  ```
- Общие слова — `t.common` (`cancel`, `delete`, `edit`, `save`, `required`).
- Локаль форматирования чисел/дат — `t.common.locale` ('ru-RU'/'en-US'), НЕ проверка языка.
- Переключатель языка — `t.common.otherLang`.
- **Data-коды** (значения полей, например `unit: 'ч'`, `'усл.'`, `'этап'`) остаются
  стабильными кодами; перевод — только при отображении через helper
  (`unitLabel(unit, t)`), сравнение в логике идёт по коду.
- Суффиксы единиц (' ч', '₽/ч', 'M ₽') — ключи i18n (`hoursSuffix`, `rateUnit`,
  `millionsSuffix`), включая ведущий пробел.
- Имена данных из массивов (категории токенов, палитры) — `key` в компоненте +
  record в ресурсе: `t.viewTexts.designTokens.categories[cat.key]`.

## 2. Стандартное представление (view)

Каждый view — папка `src/components/views/app-<name>/` с `app-<name>.ts`,
`app-<name>.css`, `app-<name>.story.ts`.

**`:host` — обязательный шаблон (скролл, единая рамка):**

```css
*, *::before, *::after { box-sizing: border-box; }

:host {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-canvas, #090d16);
  padding: 1.5rem;
  gap: 1.25rem;
}
```

**Скелет render():**

```ts
render() {
  const t = getTranslation(this.currentLang);
  return html`
    <app-page-header title="${t.navigation.<view>}" subtitle="${t.viewTexts.pageSubtitles.<view>}">
      <span slot="icon">${icon<...>(28)}</span>
      <app-button slot="actions" variant="primary" size="md" @click="${...}">
        <span slot="icon-start">${iconPlus(16)}</span>
        <span>${t.viewTexts.<view>.<newButton>}</span>
      </app-button>
    </app-page-header>

    <app-kpi-strip columns="4">
      <app-metric-card size="compact" label="${t.viewTexts.<view>.kpi...}" value="${...}"></app-metric-card>
    </app-kpi-strip>

    <app-filter-bar
      style="--filter-search-min: 280px; --filter-search-max: 280px;"
      placeholder="${t.viewTexts.<view>.searchPlaceholder}"
      .searchValue="${this.localSearch}"
      .filters="${[...]}">
    </app-filter-bar>

    ${filtered.length === 0
      ? html`<app-empty-state title="${t.viewTexts.<view>.empty...}"></app-empty-state>`
      : this.renderCards(filtered, t)}

    ${this.renderFormModal(t, ...)}
    ${this.renderDeleteModal(t)}
  `;
}
```

- List-view обязаны иметь иконку в header (`slot="icon"`, размер 28).
- Search filter-bar — единая ширина **280px** (`--filter-search-min/max`).
- render-методы секций принимают `t: ReturnType<typeof getTranslation>`,
  **не принимают `isRu`**.
- Пустота — только `app-empty-state` (compact — внутри карточек/таблиц).

**Регистрация нового view (5 мест):**

1. `ActiveView` union в `src/types/index.ts`;
2. loader в `VIEW_LOADERS` (`src/app-root.ts`);
3. `case` в рендере `app-root.ts`;
4. app-sidebar-item в группе сайдбара (`app-root.ts`, `.icon="${icon...()}"`, label из `t.navigation`);
5. метка в `navigation` секции `ru.ts`/`en.ts`.

## 3. Карточки

- **Панель/секция** — только `app-section-card` (`title`, `subtitle`, slots
  `header-left`, `actions`, `default`). Локальные `.section-card/.panel-card` запрещены.
- **Карточка сущности** (project/company/cp/employee) — фон `var(--bg-surface)`,
  граница `1px solid var(--border-subtle)`, `border-radius: var(--radius-lg)`,
  `box-shadow: var(--shadow-sm)`; cyberpunk-хук `--surface-glow` применять только
  через токен, не хардкодом.
- **KPI** — `app-kpi-strip columns="3|4|6"` + `app-metric-card size="compact"`;
  цвет значения — `valueColor` (success/warning/danger hex из токенов статуса).
- **Статусы** — только `app-status-chip domain="..." status="..."`
  (`appearance="soft|outline"`, `size="sm"`); локальные `.status-chip/.micro-pill` запрещены.
- **Мета-поля** — `meta-label`/`meta-val` единообразно; числа — `mono` + tabular-nums.
- Клик по карточке — `app-button`/`type="button"` span с `title="${t...}"`,
  переход через `store.setActiveView(...)`.

**Порядок кнопок действий (канон, зафиксирован):**

Ряды icon-кнопок действий в карточках/таблицах читаются слева направо (LTR) от
самого частого/безопасного к самому редкому/разрушительному:

```
[открыть/просмотр] → [производные действия домена*] → [редактировать] → [удаление]
 *счёт, калькуляция, отправка на согласование и т.п. — в порядке частоты использования
```

- Частое действие — на стабильной стартовой позиции ряда (моторная память:
  пользователь бьёт в позицию, не читая кнопки).
- Удаление — **всегда последним**: в конце ряда у него один сосед, оно дальше
  всего от зоны частых кликов; стилистика — только `action="delete"`
  (danger-палитра компонента) + подтверждение через `app-confirm-dialog`.
- Порядок единообразен во всех view; «опасное слева» запрещено —
  противоречит конвенциям (Material, Atlassian, NNG) и не добавляет защиты:
  изоляция достигается позицией в конце + danger-стилем + обязательным
  confirm-диалогом, а не перестановкой.

## 4. Формы и модалки

- Модалка создания/редактирования — `app-modal size="lg"` + `app-form-grid columns="2"`;
  поля-на всю ширину — `col-span` у ребёнка.
- Заголовок модалки: `title="${this.editingId ? t.viewTexts.<view>.modalTitleEdit : t.viewTexts.<view>.modalTitleCreate}"`.
- Кнопки футера — `t.common.cancel` слева, подтверждение (`save`/`delete`)
  справа; опасное подтверждение — правее безопасной отмены (конвенция
  Windows/Linux, совпадает с футером `app-confirm-dialog`). Не переставлять.
- Обязательное поле: `this.formError = getTranslation(this.currentLang).common.required;`
- Все handler'ы значений контролов — **только** через `eventValue(e)`
  (`import { eventValue } from '../../common/event-value'`):
  ```ts
  @input="${(e: CustomEvent) => (this.formName = eventValue(e))}"
  ```
  Нативные input/change события из shadow DOM не имеют `detail` — прямой
  `e.detail.value` падает с TypeError.

**Универсальное выравнивание контролов (ghost label):**

Контролы без собственного лейбла-строки (app-switch и т.п.) выравниваются по
сетке формы через **призрачный лейбл**: компонент сам рисует невидимую строку
лейбла с той же типографией, что у `app-input` (`font-size 0.8125rem`,
`font-weight 500`), и она держит высоту лейбл-строки. Контрол занимает строку с
геометрией `app-input` (`control-height-md`, `radius-md`, padding 0.75rem).
Никаких магических `min-height`/px-чисел и локальных `.switch-field/.switch-box`:
выравнивание по верху `input-wrapper` получается само собой, rem-база не важна.
Кэпшен контрола — стандартный (`label` свойство контрола, видимость внутри).

- Шаблон boolean-поля — один контрол с хуками компонента:
  `<app-switch size="md" frame="transparent" field-label-style="ghost"
  field-label="${label}" label="${label}">`. На модалках `frame="transparent"` —
  контрол стоит на родном фоне модалки (фон и рамка прозрачные), вровень с
  соседним инпутом; в формах view'ов — `frame="normal"` (видимая строка-бокс).
- Индикатор активности записи («Запись активна») — исключение: чистый
  `app-switch` на всю строку (`col-span-2`, `width: 100%`), **без** ghost-лейбла
  и **без** рамки/бокса.

## 5. Confirm-диалоги

- **Нативный `confirm()` запрещён везде.** Только `app-confirm-dialog`.
- Дизайн (зафиксирован): header = иконка + title, **без ✕** (`hideClose`);
  секции «ВЫПОЛНЯЕМОЕ ДЕЙСТВИЕ:» и «ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:»; box результата с
  левой границей цвета варианта; кнопки Отмена/подтверждение.
- API: `open`, `title`, `variant` (`info|success|warning|danger`), `icon`,
  `action`, `result`, `actionLabel`, `resultLabel`, `confirmLabel`, `cancelLabel`,
  `size`; legacy `message` — когда action/result пустые.
- Цвет варианта: danger `#ef4444`, warning `#f59e0b`, info accent, success `#22c55e`
  (через `--confirm-color`).
- Все тексты — из `t.viewTexts.confirmDialogs.<key>` (title/action(…)/result) и
  `t.viewTexts.confirmSectionLabels.action/result`; кнопки — `t.common.cancel/delete`.
- Удаление задачи/подзадачи в `app-task-modal` и массовое удаление в `app-data-grid`
  используют двухступенчатый поток: первый диалог открывает второй (subtask) /
  `confirmBulkDeleteOpen`.

## 6. Lit-конвенции

- Свойства с camelCase — **property binding** `.prop="${...}"`; атрибут по умолчанию
  строчный без дефисов, `.prop="X"` обязателен для многобуквенных имён.
- События — `CustomEvent` c `bubbles: true, composed: true`, detail — объект.
- Дропдауны/поповеры — только через `portalManager.mountTemplate`; portal `:host`
  обязан иметь override `background: transparent; overflow: visible;` (иначе
  копируемая view CSS делает фон непрозрачным).
- При открытии модалки `app-modal` перемещается в portal: light-DOM дети
  (кнопки, form-grid) переезжают вместе с ним.
- Темы — только `data-theme` на `<html>`; селектор `:root.dark` запрещён
  (перебивает токены cyberpunk по специфичности).
- Все цвета/радиусы/тени/высоты контролов — `var(--...)` с фолбэком.

## 7. Проверка результата

1. `npx tsc --noEmit` и `npm run build` — чисто.
2. Финальный grep по `src` (кроме `i18n/`): `isRu`, `currentLang === 'ru'`,
   `effectiveLang === 'ru'` — **0 совпадений**; кириллические литералы в template — 0.
3. Браузер: projects/companies/settings рендерятся, диалоги показывают корректные
   лейблы в обоих языках; переключение языка меняет подписи (KPI, subtitle,
   имена палитр, описания карточек).

## 8. Зависимости — лицензионное правило

**Можно использовать только продукты с лицензиями, которые не ограничивают
закрытое коммерческое использование готового продукта и не требуют
распространения исходников.**

- Разрешены: MIT, BSD (2/3-Clause), ISC, Apache-2.0, Unicode-DFS и т.п.
- **Запрещены copyleft/GPL-наследственные** лицензии, обязывающие открывать
  исходники производного продукта или ограничивающие коммерческое
  использование готового продукта (GPL, AGPL, LGPL в linking-сценариях,
  CC-BY-SA, и т.аналогично).
- Проверка лицензии — до добавления в `package.json`; текущий набор
  (`lit` BSD-3, `d3` ISC, `vite`/`esbuild` MIT, `typescript` Apache-2.0)
  соответствует; планируемая `katex` — MIT, соответствует.

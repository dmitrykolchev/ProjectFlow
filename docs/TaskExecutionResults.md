# ProjectFlow: результаты выполнения задач в проектах разработки ПО

Дата: 20.11.2026. Режим: **проектирование, код не изменяется.**

Документ описывает замкнутый конвейер «спецификация → задача → реализация → верификация», в котором
результат выполнения задачи собирается в её карточке автоматически и доказательно. Задача закрывается
тогда, когда в ней есть все четыре доказательства: коммиты, PR, обновлённая документация/сторибуки,
отчёт верификации по критериям приёмки.

---

## 1. Принцип конвейера

ProjectFlow выступает не пассивным трекером, а **компилятором бизнес-смыслов в верифицированный
продукт**: каждый артефакт разработки (коммит, PR, CI-прогон, story) обязан быть привязан к исходному
требованию, и каждый этап порождает сущность, которая возвращается в карточку задачи.

Три инварианта:

1. **Сквозная трассируемость.** Любой коммит находится по ID задачи, любая задача — по коду требования,
   любое требование — по ID исходной спецификации.
2. **Доказательная готовность (Definition of Done).** Статус `done` ставится только при полном наборе
   доказательств; слова «я закончил» статус не меняют.
3. **Автоматический сбор.** Артефакты попадают в карточку из GitHub-событий, а не ручного ввода; человек
   принимает только вердикт по критериям приёмки.

---

## 2. Граф сущностей и сквозные идентификаторы

| # | Этап | Сущность ProjectFlow | ID / код | Кто генерирует |
|---|---|---|---|---|
| 1 | Ввод | `DocumentItem` (`category: 'spec'`, `scope: 'project'`) | `SPEC-<projectKey>-<n>` | Аналитик; связь: `Project.specDocumentId` |
| 2 | Декомпозиция | `ProjectRequirement` | `code: FR-01 / NFR-01` (поле уже есть) | Доверенный ИИ (`AnalysisSummary.decomposition`) + подтверждение человека |
| 2a | Критерии приёмки | `ProjectRequirement.acceptanceCriteria[]` | `AC-<reqCode>-<n>` | Доверенный ИИ, человек утверждает |
| 3 | Планирование | `Task` (`requirementIds`, `knowledgeArticleIds`) | `id: <ProjectKey>-<num>` — уже генерируется в `addTask()` (`PF-108`) | Декомпозиция требования; parent-эпик — `Task` с `parentTaskId` (см. §3) |
| 4 | Реализация | ветка, коммиты, PR в Git | `feat/<TASK-id>`, `[<TASK-id>]` в сообщении коммита, PR-номер | GitHub App ProjectFlow + OpenCode |
| 5 | Верификация | новая сущность `VerificationReport` | `VER-<TASK-id>` | Доверенный ИИ по diff PR + CI |
| 6 | Знания | `KnowledgeArticle` (`linkedTaskIds`) | статья проекта/компании | Автообновление из `docs/**` после merge |

Формат ID задачи уже соответствует схеме: `addTask()` строит `id = ${project.key}-${nextNum}`, то есть
`PF-108`. Ветка и коммит используют ровно этот ID, без дополнительных префиксов: ветка `feat/PF-108`,
коммит `[PF-108] ...`, PR с заголовком `[PF-108] <title>`.

Ключевые связи существующей модели (ничего не изобретается, только дополняется):

```ts
Project.specDocumentId: string;            // спецификация
ProjectRequirement.code: 'FR-01' | ...     // код требования
ProjectRequirement.acceptanceCriteria: string[];
ProjectRequirement.linkedTaskIds?: string[];
Task.requirementIds?: string[];            // задача ↔ требование
Task.knowledgeArticleIds?: string[];       // задача ↔ база знаний
DocumentItem.taskId?: string;              // документ ↔ задача (scope 'task')
KnowledgeArticle.linkedTaskIds?: string[];
```

---

## 3. Модель данных: расширение сущностей

Все изменения additive: существующие поля не меняются, новые поля опциональны, дефолт пустого массива
сохраняет поведение всех текущих потребителей. Персистенция — по конвенции store: отдельный ключ
localStorage на сущность (`projectflow_execution_v1`, `projectflow_verifications_v1`), CRUD-методы по
образцу существующих, запись в `ActivityLogItem` (расширить `targetType` значениями `execution_result`
и `verification`).

```ts
/** Артефакт реализации: один коммит, PR или CI-прогон, привязанный к задаче. */
export interface ExecutionArtifact {
  id: string;                 // exec-<uuid>
  taskId: string;             // PF-108
  kind: 'commit' | 'pull_request' | 'ci_run';
  externalId: string;         // sha PR#42 run-id
  url: string;                // https://github.com/...
  title: string;              // сообщение коммита / заголовок PR / имя workflow
  authorName: string;
  createdAt: string;
  branch?: string;            // feat/PF-108
  filesChanged?: number;
  /** Пути затронутых файлов, классифицированные при сборе (§5). */
  docFiles?: string[];        // docs/**, *.story.ts
  testFiles?: string[];       // *.spec.*, *.test.*
  sourceFiles?: string[];     // src/**
}

/** Отчёт верификации доверенного ИИ по критериям приёмки задачи. */
export interface VerificationReport {
  id: string;                 // VER-PF-108
  taskId: string;
  requirementIds: string[];   // FR-01, ...
  pullRequestUrl: string;
  ciRunId?: string;
  ciStatus: 'passed' | 'failed' | 'running';
  criteria: VerificationCriterion[];
  verdict: 'passed' | 'partial' | 'failed';
  model: string;              // конвенция AnalysisSummary: модель фиксируется
  authorId: string;           // пользователь, инициировавший верификацию
  createdAt: string;
}

export interface VerificationCriterion {
  code: string;               // AC-PF-108-1
  text: string;               // текст критерия из ProjectRequirement.acceptanceCriteria
  status: 'passed' | 'partial' | 'failed';
  evidence: string[];         // ссылки на код/тест/story: "src/components/.../x.ts:142", "story Frames"
  note?: string;
}

/** Связь задачи с внешним репозиторием (одна задача — одна ветка). */
export interface TaskRepoLink {
  taskId: string;
  provider: 'github';
  repo: string;               // dmitrykolchev/ProjectFlow
  branch: string;             // feat/PF-108
  baseBranch: string;         // main
  prNumber?: number;
  prUrl?: string;
  contextFile: '.pf-task.md'; // контракт контекста (§4)
  createdAt: string;
}

// additive-расширения существующих типов
export interface Task {
  /* ...существующие поля... */
  parentTaskId?: string;                 // эпик → атомарные задачи
  repoLink?: TaskRepoLink;
  executionArtifacts?: ExecutionArtifact[];
  verificationReport?: VerificationReport;
}

export interface ProjectRequirement {
  /* ...существующие поля... */
  acceptanceCodes?: string[];            // AC-01..AC-N по индексу acceptanceCriteria
  verificationReports?: VerificationReport[];
}
```

`TaskStatus` и `RequirementStatus` не меняются: `review → done` и `implemented → verified` используются
как точки закрытия (§6).

---

## 4. Контракт контекста `.pf-task.md`

При переводе задачи в статус готовности к разработке ProjectFlow создаёт ветку и кладёт в её корень
файл `.pf-task.md` — единственный источник истины для агента. Файл генерируется из данных задачи,
живёт только в ветке, удаляется перед PR.

```md
# PF-108 — Валидация схемы фильтров требований

## Requirement
FR-01. Система позволяет фильтровать требования по статусу, приоритету и типу.
Status: approved. Priority: high.

## Acceptance Criteria
AC-PF-108-1. Фильтр по статусу меняет набор карточек без перезагрузки страницы.
AC-PF-108-2. Комбинация «приоритет + тип» даёт пересечение, а не объединение.
AC-PF-108-3. Сброс фильтра возвращает полный набор и восстанавливает состояние store.

## Context Pack (читать перед правкой)
- src/components/views/app-requirements/app-requirements.ts   — view, mode-row cards/table/grid
- src/components/common/app-filter-bar/app-filter-bar.ts      — канонический фильтр
- src/state/store.ts: requirements, setActivePage, setViewMode
- docs/ComponentApiSpecs.md (раздел фильтра), AGENTS.md

## Правила реализации
1. Соблюдать AGENTS.md: i18n через getTranslation, строки только в src/i18n/{ru,en}.ts;
   канонические компоненты; пиксельная сверка с main.
2. Каждый коммит начинается с `[PF-108]`. Один коммит = одна логическая change.
3. Обновить документацию: `docs/**` и `.story.ts` новых/изменённых компонентов.
4. Проверить перед PR: `npx tsc --noEmit`, `npm run build`, браузерная сверка storybook.
5. Перед PR удалить `.pf-task.md`; в теле PR — резюме изменений по AC.
```

Инструкция для OpenCode фиксируется один раз в `AGENTS.md` (раздел «Контракт задач ProjectFlow»), а не
в промпте каждой сессии: агент читает `.pf-task.md`, реализует, обновляет docs и сторибуки, коммитит с
префиксом задачи, готовит PR. Лицензионное правило AGENTS.md §8 действует на всю цепочку: зависимости
только с permissive-лицензиями (MIT/BSD/ISC/Apache-2.0), copyleft запрещён — GitHub App, webhook-обработчик
и CI-плагины проверяются до добавления.

---

## 5. Протокол обратной связи (GitHub → ProjectFlow)

ProjectFlow подписывается на три события репозитория и наполняет блок «Результаты выполнения» задачи.

| Событие | Обработка | Что попадает в задачу |
|---|---|---|
| `push` | Парсить `[<TASK-id>]` из сообщений коммитов; классифицировать пути файлов | `ExecutionArtifact(kind: 'commit')`: sha, url, автор, `docFiles` (`docs/**`, `*.story.ts`), `testFiles` (`*.spec.*`, `*.test.*`), `sourceFiles` |
| `pull_request` (opened / synchronize / closed) | Линковка PR по ID задачи; при `closed + merged` — переход к закрытию (§6) | `ExecutionArtifact(kind: 'pull_request')`, `TaskRepoLink.prNumber/prUrl` |
| `check_suite` / `workflow_run` (completed) | Статус CI по PR | `ExecutionArtifact(kind: 'ci_run')`, `VerificationReport.ciStatus` |

Классификация файлов берётся из конвенций репозитория, а не из общих эвристики:
документация = `docs/**` и `*.story.ts` (ProjectFlow: Lit-стори, не `.stories.tsx`), тесты = `*.spec.*`/`*.test.*`,
исходники = `src/**`.

Обработчик идемпотентен: повторная доставка события не создаёт дубль артефакта (ключ `externalId`).
Все записи идут через store-методы с `logActivity('update', 'task', ...)`, чтобы история карточки осталась
единой.

### Верификация доверенным ИИ

Когда PR открыт и CI зелёный, ИИ получает `git diff` PR + текст требования + AC и строит
`VerificationReport`: по каждому AC — статус и ссылки на конкретные строки кода/теста/story.
Модель и автор фиксируются (конвенция `AnalysisSummary`). Отчёт никогда не меняет статус сам:
он выносит вердикт, решение принимает человек.

CI-контур для ProjectFlow минимален и отражает реальные проверки репозитория:

```yaml
# .github/workflows/pf-ci.yml (проект, не код этого документа)
jobs:
  checks:
    steps:
      - run: npx tsc --noEmit
      - run: npm run build          # включает сборку storybook-стори
      - run: node scripts/check-i18n.mis  # grep-контроль isRu/строк (AGENTS.md §7)
```

---

## 6. Definition of Done и закрытие цикла

Задача переходит в `done` только при четырёх доказательствах в карточке:

1. ≥1 коммит с префиксом `[TASK-id]` (`ExecutionArtifact.kind: 'commit'`);
2. PR, смёрженный в base-ветку (`TaskRepoLink.prUrl` + событие merge);
3. затронутая документация: `docFiles` непуст (docs и/или `.story.ts`) — для change без изменений
   компонентов допустим пустой, но это фиксируется явным флагом в отчёте;
4. `VerificationReport.verdict === 'passed'` по всем AC, принятый человеком.

Цепочка закрытия:

```
PR merged → webhook → артефакты записаны → CI passed → VER-report verdict=passed
→ человек подтверждает → Task.status = 'done'
→ Requirement.status: implemented → verified (все AC passed)
→ KnowledgeArticle: автообновление/новая статья из docs-изменений, linkedTaskIds += задача
→ ProjectRequirement.progress и Project.progress пересчитываются по закрытым задачам/требованиям
```

Закрытие требования (`verified`) возможно только когда все его задачи `done` и их отчёты `passed`;
частичный вердикт оставляет требование в `implemented`.

---

## 7. Отображение результатов в карточке задачи

Блок «Результаты выполнения» — канонические компоненты, без локальных CSS-паттернов (AGENTS.md §3):

```ts
renderExecution(t: ReturnType<typeof getTranslation>) {
  const artifacts = this.task.executionArtifacts ?? [];
  const commits = artifacts.filter((a) => a.kind === 'commit');
  const prs = artifacts.filter((a) => a.kind === 'pull_request');
  const report = this.task.verificationReport;
  return html`
    <app-section-card title="${t.viewTexts.taskDetail.executionTitle}">
      <app-status-chip slot="actions" domain="ci" status="${report?.ciStatus ?? 'pending'}"
        appearance="soft" size="sm"></app-status-chip>

      ${commits.map((c) => html`
        <div class="artifact-row">
          <app-link href="${c.url}" target="_blank">${c.externalId}</app-link>
          <span class="artifact-title">${c.title}</span>
        </div>`)}

      <app-meta-grid>
        <div class="meta-label">${t.viewTexts.taskDetail.prTitle}</div>
        <div class="meta-val">${prs.map((p) => html`<app-link href="${p.url}" target="_blank">${p.title}</app-link>`)}</div>
        <div class="meta-label">${t.viewTexts.taskDetail.docsTitle}</div>
        <div class="meta-val mono">${commits.flatMap((c) => c.docFiles ?? []).join(', ')}</div>
      </app-meta-grid>

      ${report?.criteria.map((ac) => html`
        <div class="criteria-row">
          <app-status-chip domain="${ac.status === 'passed' ? 'success' : ac.status === 'partial' ? 'warning' : 'danger'}"
            appearance="soft" size="sm">${ac.code} ${t.viewTexts.taskDetail[ac.status]}</app-status-chip>
          <span class="evidence mono">${ac.evidence.join(', ')}</span>
        </div>`)}
    </app-section-card>
  `;
}
```

Тексты — только i18n: `t.viewTexts.taskDetail.executionTitle`, `commitsTitle`, `prTitle`, `docsTitle`,
`verificationTitle`, `verdictPassed/Partial/Failed`; статусные цвета — через domain-чипы, не хардкодом.
Блок появляется в `app-task-detail` / `app-task-modal` как секция, в карточках kanban — компактный бейдж
полноты доказательств (4 слота: коммит/PR/docs/VER), на grid — колонка «Доказательства».

---

## 8. Интеграция со стеком ProjectFlow

**Факт о текущем стеке.** ProjectFlow — одностраничное приложение на **Lit 3 + TypeScript + Vite + чистый
CSS**; состояние — store-синглтон `src/state/store.ts` с персистенцией каждой сущности в localStorage
(`projectflow_tasks_v2`, `projectflow_requirements_v1`, ...); бэкенда и БД нет. Доверенный ИИ подключается
локально: OpenCode работает в репозитории, контекст получает из `AGENTS.md`, `docs/**`, `.story.ts` и
исходников (файловый индекс, без RAG/векторной базы). GitHub-репозиторий —
`github.com/dmitrykolchev/ProjectFlow`.

Отсюда два контура внедрения, оба совместимы с текущей архитектурой:

**Контур A (MVP, без бэкенда).** Локальный коннектор — Node-скрипт/сервис на том же TypeScript, который
(1) читает задачи из localStorage-совместимого JSON, (2) вызывает GitHub API (создание ветки, `.pf-task.md`),
(3) принимает webhook на локальный HTTP-порт, (4) пишет артефакты и отчёты в те же ключи localStorage
(`projectflow_execution_v1`, `projectflow_verifications_v1`). UI читает их через store как любую сущность.
Этот контур даёт полный замкнутый цикл на одном ноутбуке, без сервера и БД.

**Контур B (полный).** Бэкенд Node/TS + PostgreSQL (или SQLite для одиночного развёртывания), таблицы:

```sql
CREATE TABLE task_repo_links (task_id TEXT PRIMARY KEY, repo TEXT, branch TEXT, base_branch TEXT,
  pr_number INTEGER, pr_url TEXT, created_at TEXT);
CREATE TABLE execution_artifacts (id TEXT PRIMARY KEY, task_id TEXT, kind TEXT, external_id TEXT,
  url TEXT, title TEXT, author_name TEXT, created_at TEXT, files JSONB);
CREATE TABLE verification_reports (id TEXT PRIMARY KEY, task_id TEXT, pr_url TEXT, ci_status TEXT,
  verdict TEXT, model TEXT, author_id TEXT, created_at TEXT, criteria JSONB);
CREATE TABLE requirement_verifications (requirement_code TEXT, verification_id TEXT, PRIMARY KEY(requirement_code, verification_id));
```

Контур B нужен при мультипользовательской работе и централизованном CI; UI-слой и модель типов из §3
не меняются — меняется только источник персистенции (store читает API вместо localStorage).

---

## 9. Поэтапное внедрение

| Этап | Содержание | Критерий приёмки | Оценка |
|---|---|---|---|
| M1 | Типы §3 + store-методы CRUD + ключи localStorage + блок результатов в `app-task-detail` (ручной ввод) | Карточка показывает коммиты/PR/docs/VER; tsc/build чистые | 1 день |
| M2 | Генератор `.pf-task.md` из задачи+AC+context pack; раздел контракта в `AGENTS.md` | Файл корректно генерируется для 3 задач, OpenCode реализует по нему без ручных пояснений | 1 день |
| M3 | Коннектор MVP: GitHub API (ветка + файл), webhook push/PR → артефакты в store | Ветка `feat/PF-<id>`, коммиты `[PF-<id>]` появляются в карточке автоматически, дублей нет | 2 дня |
| M4 | CI-workflow + сборка статуса; верификация ИИ по diff+AC с отчётом | Отчёт содержит статус по каждому AC и evidence-ссылки; verdict не меняет статус сам | 2 дня |
| M5 | Закрытие цикла: подтверждение человеком → `done`/`verified`, пересчёт прогресса, автообновление базы знаний | Задача без 4 доказательств не закрывается; требование `verified` только при всех AC passed | 1–2 дня |

M1–M2 не требуют внешних сервисов и дают основную ценность: структурированные, доказательные результаты
задач. M3–M5 — автоматизация контура.

---

## 10. Ответы на вопросы о стеке

1. **Бэкенд и БД ProjectFlow:** их нет. Frontend: Lit 3 custom elements + Shadow DOM, TypeScript, Vite
   (`vite-plugin-lit-css`), store-синглтон с localStorage-персистенцией по сущностям, i18n ru/en, встроенный
   storybook. Обработчик вебхуков проектируется как отдельный Node/TS-сервис (Контур A/B §8), модель
   типов §3 переносится в него без изменений.
2. **Подключение доверенного ИИ:** OpenCode в локальной репе, контекст — файловый (`AGENTS.md`, `docs/**`,
   `.story.ts`, исходники), RAG/векторной базы нет. Для конвейера достаточно контракта `.pf-task.md`
   (Context Pack с явными путями модулей) — это точнее векторного поиска, потому что пути к модулям
   известны из структуры репозитория и связей задачи (`requirementIds`, `knowledgeArticleIds`).

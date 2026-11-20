// Renders docs/WebComponentsReference.md from docs/components.json (produced by scan.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const items = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'components.json'), 'utf8'));

const groupOrder = ['common', 'layout', 'dashboard', 'views'];
const catOrder = ['Common', 'Elements', 'Inputs', 'Layout', 'Overlays', 'Feedback', 'Dashboard', 'Views', 'engineering'];

function esc(s) {
  return (s || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function short(desc, n) {
  const first = esc(desc).split(/(?<=\.)\s+/)[0] || '';
  return first.length > n ? first.slice(0, n - 1) + '…' : first;
}

function norm(s) {
  return s.replace(/-/g, '').toLowerCase();
}

const byGroup = {};
for (const i of items) (byGroup[i.group] ||= []).push(i);

function propRows(item) {
  const byName = new Map(item.propsList.map((p) => [norm(p.name), p]));
  const used = new Set();
  const rows = [];
  for (const d of item.propsDoc) {
    if (d.k.startsWith('--')) {
      rows.push(`| \`${d.k}\` | CSS var | ${esc(d.v)} |`);
      continue;
    }
    const p = byName.get(norm(d.k));
    if (p) used.add(norm(d.k));
    const attr = p && p.attr && norm(p.attr) !== norm(p.name) ? ` \`${p.attr}\`` : '';
    const def = p && p.def ? `, default \`${p.def}\`` : '';
    rows.push(`| \`${d.k}\`${attr} | ${p ? p.type : '—'}${def} | ${esc(d.v)} |`);
  }
  for (const p of item.propsList) {
    if (!used.has(norm(p.name))) {
      const attr = p.attr && norm(p.attr) !== norm(p.name) ? ` \`${p.attr}\`` : '';
      const def = p.def ? `, default \`${p.def}\`` : '';
      rows.push(`| \`${p.name}\`${attr} | ${p.type}${def} | — |`);
    }
  }
  return rows;
}

function entry(item, p) {
  const lines = [];
  lines.push(`#### \`${item.tag}\` — \`${item.cls}\``);
  lines.push('');
  lines.push(`\`${p}\`${item.hasStory ? '' : ' (без стори)'}`);
  lines.push('');
  if (item.desc) {
    lines.push(esc(item.desc));
    lines.push('');
  }
  const rows = propRows(item);
  if (rows.length) {
    lines.push('| Property | Type / default | Description |');
    lines.push('|---|---|---|');
    lines.push(...rows);
    lines.push('');
  }
  if (item.events.length) {
    lines.push(`**Events:** ${item.events.map((e) => '`' + e + '`').join(', ')}`);
    lines.push('');
  }
  const slotRows = item.slotsDoc.map((s) => `| \`${s.k}\` | ${esc(s.v)} |`);
  if (slotRows.length) {
    lines.push('| Slot | Content |');
    lines.push('|---|---|');
    lines.push(...slotRows);
    lines.push('');
  }
  const childRows = item.childrenDoc.map((c) => `| \`${c.k}\` | ${esc(c.v)} |`);
  if (childRows.length) {
    lines.push('| Child element | Role |');
    lines.push('|---|---|');
    lines.push(...childRows);
    lines.push('');
  }
  return lines.join('\n');
}

const out = [];
out.push('# ProjectFlow: справочник веб-компонентов');
out.push('');
out.push('Дата: 20.11.2026. Режим: **референс, код не изменяется.**');
out.push('');
out.push(`Всего компонентов: ${items.length} (со стори: ${items.filter((i) => i.hasStory).length}).`);
out.push('Документ генерируется из исходников: мета берётся из `.story.ts` (title / category / description /');
out.push('propsDoc / slotsDoc / childrenDoc), API — из файла компонента (`@property`, `dispatchEvent`, `slot`).');
out.push('**После изменений кода референс актуализируется командой `npm run docs:components`**');
out.push('(сканирование `src/components` → `docs/components.json` → рендер этого документа). Сгенерированный');
out.push('файл коммитится вместе с изменениями кода.');
out.push('');
out.push('---');
out.push('');
out.push('## 1. Конвенции (обязательны для всех компонентов)');
out.push('');
out.push('- **Стек**: Lit 3 custom elements + Shadow DOM, TypeScript, Vite (`vite-plugin-lit-css`), токены из');
out.push('  `src/index.css`; стили компонента — `.css`-файл рядом с компонентом.');
out.push('- **Именование**: тег `app-<kebab>`, класс `App<Pascal>`, файл `src/components/<group>/<tag>/<tag>.ts|.css|.story.ts`.');
out.push('- **Свойства**: `@property` с attribute в kebab-case (`full-width` ↔ `fullWidth`); массивы/объекты —');
out.push('  `attribute: false` или JSON-attr; логические — `Boolean` + `reflect`, где нужен CSS-хук.');
out.push('- **События**: только `CustomEvent` c `bubbles: true, composed: true`; detail всегда объект');
out.push('  (`{ value }`, `{ id }`, `{ rows }`). Имена: `change`, `select`, `pick`, `close`, `confirm`, `cancel`,');
out.push('  `remove`, `row-click`.');
out.push('- **Слоты**: `default` для контента; именованные `actions`, `icon`, `title`; слот-контент наследует');
out.push('  токены темы (light DOM).');
out.push('- **Тексты**: только i18n через `getTranslation`, строки в `src/i18n/ru.ts` / `en.ts`; ветвление по');
out.push('  locale, не по проверке языка.');
out.push('- **Story**: каждый компонент имеет `.story.ts`, зарегистрированный в `ALL_STORIES` app-storybook;');
out.push('  мета стори (description / propsDoc / slotsDoc) — источник истины для этого справочника и для');
out.push('  spec-таблицы в storybook.');
out.push('- **Лицензии**: только permissive (MIT/BSD/ISC/Apache-2.0/OFL); copyleft запрещён (AGENTS.md §8).');
out.push('');
out.push('---');
out.push('');
out.push('## 2. Каноническая структура view');
out.push('');
out.push('Порядок блоков в полноэкранном view (обязателен, блоки 1 и 5 обязательны, остальные опциональны):');
out.push('');
out.push('1. **Page header** — `app-page-header` (`title`, `subtitle`, `slot="icon"` размер 28, `slot="actions"` с кнопкой создания).');
out.push('2. **KPI strip** — `app-kpi-strip columns="3|4|6"` + `app-metric-card size="compact"` (цвет значения через');
out.push('   `valueColor` из токенов статуса).');
out.push('3. **Переключатель режимов отображения** (cards / table / grid / …) — `app-segmented-switch` (`size="sm"`)');
out.push('   в `.mode-row`; располагается сразу за KPI и перед фильтром. Переключение режима записывается в историю');
out.push('   навигации: адрес `#/<view>?mode=<mode>&page=<n>`, режим и номер страницы восстанавливаются при');
out.push('   переходе назад/вперёд.');
out.push('4. **Фильтр** — `app-filter-bar` (единая ширина поиска 280px: `--filter-search-min/max`); фильтр может');
out.push('   контекстуально зависеть от режима отображения. Рядом с переключателем режимов — toggle-кнопка');
out.push('   (`app-toggle-button` с иконкой воронки и надписью «Фильтр»), показывающая/скрывающая фильтр.');
out.push('5. **Data representation** — `app-cards-table` (карточки + таблица), `app-data-grid`, `app-kanban`,');
out.push('   `app-gantt`, `app-calendar`; пустота — только `app-empty-state` (compact внутри карточек/таблиц).');
out.push('');
out.push('Модалки форм — `app-modal size="lg"` + `app-form-grid columns="2"`; подтверждения — только');
out.push('`app-confirm-dialog` (нативный `confirm()` запрещён). Панель/секция — только `app-section-card`.');
out.push('Статусы — только `app-status-chip domain=… status=…`. Контролы значений читаются через `eventValue(e)`.');
out.push('');
out.push('---');
out.push('');
out.push('## 3. Быстрый индекс');
out.push('');
out.push('| Компонент | Группа | Категория | Назначение |');
out.push('|---|---|---|---|');
for (const g of groupOrder) {
  for (const i of byGroup[g]) {
    out.push(`| \`${i.tag}\` | ${g} | ${i.category || '—'} | ${short(i.desc, 90) || '—'} |`);
  }
}
out.push('');
out.push('---');
out.push('');

let n = 3;
for (const g of groupOrder) {
  n++;
  const list = byGroup[g];
  out.push(`## ${n}. Группа \`${g}\` (${list.length})`);
  out.push('');
  const cats = [...new Set(list.map((i) => i.category || 'Other'))];
  cats.sort((a, b) => {
    const ia = catOrder.indexOf(a), ib = catOrder.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  for (const c of cats) {
    const sub = list.filter((i) => (i.category || 'Other') === c);
    out.push(`### ${c} (${sub.length})`);
    out.push('');
    for (const item of sub) out.push(entry(item, `src/components/${g}/${item.tag}/`));
  }
}

out.push('---');
out.push('');
out.push(`## ${n + 1}. Компоненты без стори (${items.filter((i) => !i.hasStory).length})`);
out.push('');
out.push('Не зарегистрированы в app-storybook: мета отсутствует, API описан по исходнику (помечены «без стори»');
out.push('в своих группах). По правилу проекта каждый компонент обязан иметь `.story.ts` — для этих компонентов');
out.push('стори нужно добавить:');
out.push('');
for (const item of items.filter((i) => !i.hasStory)) {
  out.push(`- \`${item.tag}\` (${item.group}) — ${short(item.desc, 90) || 'описание отсутствует'}`);
}

fs.writeFileSync(path.join(root, 'docs', 'WebComponentsReference.md'), out.join('\n') + '\n');
console.log('written:', items.length, 'entries → docs/WebComponentsReference.md');

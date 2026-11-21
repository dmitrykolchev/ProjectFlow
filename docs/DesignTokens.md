# Design Tokens — система тем ProjectFlow

Дата: 21.11.2026. Источник истины: `src/index.css`. Механизм применения:
`store.applyThemeAndCustomization()` (`src/state/store.ts`).

## Как работает система

- Все токены — CSS Custom Properties, объявленные на `:root` (light по умолчанию) и переопределяемые селекторами темы. Никаких препроцессоров и Tailwind.
- Тема вешается атрибутами/классом **только на `<html>`** (`data-theme`, `data-bg`, `data-accent`, `data-density`, класс `.dark`); `<body>` атрибуты снимает, чтобы не перекрывать пресеты.
- Три действующие темы: **Light** (`:root`), **Dark** (`:root.dark` / `[data-theme='dark']`), **Cyberpunk** (`[data-theme='cyberpunk']`). Цикл переключения в header: Light → Dark → Cyberpunk.
- `store.getEffectiveBaseColors()` вычисляет базные цвета с учётом пресета фона, акцента, custom-цвета и пользовательских overrides, и инжектит их inline-переменными; cyberpunk базные цвета фиксированы (акцент/пресеты к нему не применяются).
- Компоненты используют токены с fallback: `var(--text-secondary, #94a3b8)` — значение fallback совпадает с dark-темой.

## Категории токенов

| Категория | Токены |
|---|---|
| Типографика | `--font-sans`, `--font-mono` |
| Радиусы | `--radius-sm/md/lg/xl` |
| Переходы | `--transition-fast`, `--transition-normal` |
| Фоны | `--bg-canvas`, `--bg-surface`, `--bg-surface-elevated`, `--bg-subtle`, `--bg-hover`, `--bg-active` |
| Текст | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`, `--text-on-accent` |
| Границы | `--border-subtle`, `--border-strong`, `--border-focus` |
| Тени | `--shadow-sm/md/lg/xl` |
| Скроллбары | `--scrollbar-track`, `--scrollbar-thumb`, `--scrollbar-thumb-hover` |
| Статусные цвета | `--color-{success,warning,danger,info}` + суффиксы `-solid`, `-bg`, `-border` |
| Плотность | `--control-height-xxs/xs/sm/md/lg`, `--density-padding-base/compact`, `--density-row-height`, `--density-header-height`, `--sidebar-width`, `--sidebar-collapsed-width` |
| Акцент | `--accent-primary`, `--accent-hover`, `--accent-soft`, `--accent-border`, `--accent-gradient` |
| Glow/анимации (cyberpunk) | `--surface-glow`, `--accent-glow`, `--accent-glow-hover`, `--cyber-text-shadow`, `--cyber-pulse-anim`, `--cyber-surface-anim`, `--cyber-gradient-anim` |

## Общая база (наследуются всеми темами)

| Токен | Значение |
|---|---|
| `--font-sans` | `'Manrope', -apple-system, …, sans-serif` |
| `--font-mono` | `'JetBrains Mono', monospace` |
| `--radius-sm / md / lg / xl` | `6px / 8px / 12px / 16px` |
| `--transition-fast` | `150ms cubic-bezier(0.16, 1, 0.3, 1)` |
| `--transition-normal` | `200ms cubic-bezier(0.16, 1, 0.3, 1)` |
| `--control-height-xxs / xs / sm / md / lg` | `28px / 24px / 30px / 38px / 44px` (масштаб контролов: `xs` никогда не рендерится крупнее `sm`) |
| `--density-padding-base / compact` | `0.75rem / 0.5rem` |
| `--density-row-height / header-height` | `44px / 60px` |
| `--sidebar-width / collapsed` | `260px / 68px` |
| `--text-on-accent` | `#ffffff` |

## Таблица значений трёх тем

«—» = токен не переопределяется в теме, наследует значение `:root`.

### Фоны

| Токен | Light | Dark | Cyberpunk |
|---|---|---|---|
| `--bg-canvas` | `#f8fafc` | `#090d16` | `#06040f` |
| `--bg-surface` | `#ffffff` | `#111827` | `#0d0a1f` |
| `--bg-surface-elevated` | `#ffffff` | `#162032` | `#141030` |
| `--bg-subtle` | `#f1f5f9` | `#1a2438` | `#1a143d` |
| `--bg-hover` | `#e2e8f0` | `#223049` | `#241b52` |
| `--bg-active` | `#cbd5e1` | `#2b3d5c` | `#32246e` |

### Текст

| Токен | Light | Dark | Cyberpunk |
|---|---|---|---|
| `--text-primary` | `#0f172a` | `#f8fafc` | `#f4f6ff` |
| `--text-secondary` | `#475569` | `#94a3b8` | `#b8c4f0` |
| `--text-muted` | `#64748b` | `#64748b` (наслед.) | `#7c88bf` |
| `--text-inverse` | `#ffffff` | `#0f172a` | `#06040f` |

### Границы

| Токен | Light | Dark | Cyberpunk |
|---|---|---|---|
| `--border-subtle` | `#e2e8f0` | `#1e293b` | `#1e2d5e` |
| `--border-strong` | `#cbd5e1` | `#334155` | `#8b2870` |
| `--border-focus` | `#6366f1` | `#818cf8` | `#00f0ff` |

### Тени

| Токен | Light | Dark | Cyberpunk |
|---|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.05)` | `0 1px 2px rgba(0,0,0,.4)` | `0 0 12px rgba(0,240,255,.12), 0 2px 6px rgba(0,0,0,.7)` |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,.08), 0 2px 4px -2px rgba(0,0,0,.06)` | `0 4px 6px -1px rgba(0,0,0,.5), 0 2px 4px -2px rgba(0,0,0,.4)` | `0 0 20px rgba(0,240,255,.2), 0 4px 14px rgba(0,0,0,.75)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.06)` | `0 10px 15px -3px rgba(0,0,0,.6), 0 4px 6px -4px rgba(0,0,0,.5)` | `0 0 30px rgba(255,42,133,.24), 0 10px 26px rgba(0,0,0,.8)` |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.06)` | `0 20px 25px -5px rgba(0,0,0,.7), 0 8px 10px -6px rgba(0,0,0,.6)` | `0 0 42px rgba(0,240,255,.24), 0 20px 30px rgba(0,0,0,.85)` |

### Скроллбары

| Токен | Light | Dark | Cyberpunk |
|---|---|---|---|
| `--scrollbar-track` | `#f1f5f9` | `#0e1524` | `#09061a` |
| `--scrollbar-thumb` | `#cbd5e1` | `#28374d` | `rgba(0,240,255,.42)` |
| `--scrollbar-thumb-hover` | `#94a3b8` | `#3d5170` | `#ff2a85` |

### Статусные цвета

| Токен | Light | Dark | Cyberpunk |
|---|---|---|---|
| `--color-success` | `#059669` | `#34d399` | `#00ffa3` |
| `--color-success-solid` | `#10b981` | `#10b981` (наслед.) | `#00d98b` |
| `--color-success-bg` | `rgba(16,185,129,.12)` | `rgba(52,211,153,.15)` | `rgba(0,255,163,.14)` |
| `--color-success-border` | `rgba(16,185,129,.28)` | `rgba(52,211,153,.28)` | `rgba(0,255,163,.36)` |
| `--color-warning` | `#d97706` | `#fbbf24` | `#ffe600` |
| `--color-warning-solid` | `#d97706` | `#d97706` (наслед.) | `#eab308` |
| `--color-warning-bg` | `rgba(245,158,11,.12)` | `rgba(251,191,36,.15)` | `rgba(255,230,0,.14)` |
| `--color-warning-border` | `rgba(245,158,11,.28)` | `rgba(251,191,36,.28)` | `rgba(255,230,0,.34)` |
| `--color-danger` | `#dc2626` | `#f87171` | `#ff3864` |
| `--color-danger-solid` | `#ef4444` | `#ef4444` (наслед.) | `#ff1f52` |
| `--color-danger-bg` | `rgba(239,68,68,.12)` | `rgba(248,113,113,.15)` | `rgba(255,56,100,.16)` |
| `--color-danger-border` | `rgba(239,68,68,.28)` | `rgba(248,113,113,.28)` | `rgba(255,56,100,.38)` |
| `--color-info` | `#0284c7` | `#38bdf8` | `#00f0ff` |
| `--color-info-solid` | `#0284c7` | `#0284c7` (наслед.) | `#00c4d6` |
| `--color-info-bg` | `rgba(2,132,199,.12)` | `rgba(56,189,248,.15)` | `rgba(0,240,255,.14)` |
| `--color-info-border` | `rgba(2,132,199,.28)` | `rgba(56,189,248,.28)` | `rgba(0,240,255,.36)` |

### Акцент

| Токен | Light | Dark | Cyberpunk |
|---|---|---|---|
| `--accent-primary` | `#6366f1` (indigo) | `#6366f1` (наслед.) | `#ff2a85` |
| `--accent-hover` | `#4f46e5` | `#4f46e5` (наслед.) | `#ff4fa0` |
| `--accent-soft` | `rgba(99,102,241,.15)` | `rgba(99,102,241,.15)` (наслед.) | `rgba(255,42,133,.18)` |
| `--accent-border` | `rgba(99,102,241,.3)` | `rgba(99,102,241,.3)` (наслед.) | `rgba(0,240,255,.48)` |
| `--accent-gradient` | `135deg #6366f1→#4f46e5` | (наслед.) | `135deg #ff2a85→#8b5cf6→#00e5ff` |

### Glow / анимационные хуки

| Токен | Light | Dark | Cyberpunk |
|---|---|---|---|
| `--surface-glow` | `none` | `none` (наслед.) | `0 0 18px rgba(0,240,255,.12), inset 0 1px 0 rgba(0,240,255,.16)` |
| `--accent-glow` | `none` | `none` (наслед.) | `0 0 14px rgba(255,42,133,.45), 0 0 26px rgba(0,240,255,.24)` |
| `--accent-glow-hover` | `none` | `none` (наслед.) | `0 0 22px rgba(0,240,255,.65), 0 0 36px rgba(255,42,133,.4)` |
| `--cyber-text-shadow` | `none` | `none` (наслед.) | `0 0 10px rgba(0,240,255,.45)` |
| `--cyber-pulse-anim` | `none` | `none` (наслед.) | `cyberGlowPulse 3.6s ease-in-out infinite` |
| `--cyber-surface-anim` | `none` | `none` (наслед.) | `cyberSurfaceBreath 5.5s ease-in-out infinite` |
| `--cyber-gradient-anim` | `none` | `none` (наслед.) | `cyberGradientFlow 6s ease infinite` |

В cyberpunk дополнительно: ambient-оверлей `body::after` (radial-градиенты + scanlines, анимация `cyberAmbientShift 10s`).

## Пресеты фона (`data-bg`, только Light/Dark)

Переопределяют фоны, `--border-subtle/strong` и скроллбары; остальное наследует тему.

| Пресет | Light: canvas / surface / subtle / hover | Dark: canvas / surface / subtle / hover |
|---|---|---|
| `default` | `#f8fafc / #ffffff / #f1f5f9 / #e2e8f0` | `#090d16 / #111827 / #1a2438 / #223049` |
| `midnight` | `#eef2f9 / #ffffff / #e4eaf5 / #d8e1f0` | `#030712 / #0a101f / #15203b / #1d2b4d` |
| `obsidian` | `#f5f4f1 / #fafaf8 / #ebe9e4 / #dfdcd5` | `#121110 / #1b1917 / #292522 / #36302c` |
| `nordic` | `#edf2f6 / #f8fbfd / #e2eaf0 / #d3e0ea` | `#0f172a / #162033 / #233146 / #2c3d57` |
| `forest` | `#f0f5f2 / #f8fbf9 / #e3ede7 / #d4e3da` | `#071310 / #0d1d19 / #18322c / #20423a` |

## Вариации акцента (`data-accent`)

| Акцент | primary | hover | soft | border |
|---|---|---|---|---|
| `indigo` (default) | `#6366f1` | `#4f46e5` | `rgba(99,102,241,.15)` | `rgba(99,102,241,.3)` |
| `emerald` | `#10b981` | `#059669` | `rgba(16,185,129,.16)` | `rgba(16,185,129,.32)` |
| `cyan` | `#06b6d4` | `#0891b2` | `rgba(6,182,212,.16)` | `rgba(6,182,212,.32)` |
| `violet` | `#8b5cf6` | `#7c3aed` | `rgba(139,92,246,.16)` | `rgba(139,92,246,.32)` |
| `amber` | `#f59e0b` | `#d97706` | `rgba(245,158,11,.16)` | `rgba(245,158,11,.32)` |

К cyberpunk вариации акцента не применяются (акцент зафиксирован: `#ff2a85`).

## Режимы плотности (`data-density`)

| Токен | comfortable (default) | compact |
|---|---|---|
| `--density-padding-base` | `0.75rem` | `0.5rem` |
| `--density-row-height` | `44px` | `36px` |
| `--density-header-height` | `60px` | `52px` |

## Custom-цвет фона и overrides

- `preset='custom'` + `customBgColor`: `bgSurface = base ±10/12`, `borderSubtle = base ±24` (по яркости), `accentPrimary` сохраняется.
- `themeOverrides[theme]`: точечные переопределения `bgCanvas`, `bgSurface`, `textPrimary`, `accentPrimary`, `borderSubtle` поверх пресета/акцента.

## Соглашения использования в компонентах

1. Обращение к токенам всегда с fallback: `var(--token, <dark-значение>)`.
2. Компоненты не объявляют палитру — только consume токенов; тема инжектится на уровень document/shadow (portal копирует adoptedStyleSheets view'а).
3. Статусные цвета: текст → `--color-X`, solid-фон → `--color-X-solid`, мягкая подложка → `--color-X-bg` + `--color-X-border`.
4. Glow-хуки (`--surface-glow`, `--accent-glow*`, `--cyber-*`) в Light/Dark = `none`; компоненты, использующие их, автоматически «гаснут» вне cyberpunk.

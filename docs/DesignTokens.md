# Design Tokens — система тем ProjectFlow

Дата: 21.11.2026. Источник истины: `src/index.css`. Механизм применения:
`store.applyThemeAndCustomization()` (`src/state/store.ts`).

## Как работает система

- Все токены — CSS Custom Properties, объявленные на `:root` (light по умолчанию) и переопределяемые селекторами темы. Никаких препроцессоров и Tailwind.
- Тема вешается атрибутами/классом **только на `<html>`** (`data-theme`, `data-bg`, `data-accent`, `data-density`, класс `.dark`); `<body>` атрибуты снимает, чтобы не перекрывать пресеты.
- Six active themes: **Light** (`:root`), **Dark** (`:root.dark` / `[data-theme='dark']`), **Cyberpunk** (`[data-theme='cyberpunk']`), **Matrix** (`[data-theme='matrix']`), **Barbie** (`[data-theme='barbie']`), **High Contrast** (`[data-theme='high-contrast']`). Theme selection — menu in the header (all six, `ThemeMode` union in `src/types/index.ts`).
- `store.getEffectiveBaseColors()` computes base colors with учётом пресета фона, акцента, custom-цвета и пользовательских overrides — **пресеты фона и вариации акцента применяются только Light/Dark** (`store.ts`, branch `theme === 'dark' || theme === 'light'`); базные цвета Cyberpunk/Matrix/Barbie/High Contrast зафиксированы по теме, injected inline-переменными только при наличии overrides.
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

## Таблица значений шести тем

«—» = токен не переопределяется в теме, наследует значение `:root`.

### Фоны

| Токен | Light | Dark | Cyberpunk | Matrix | Barbie | High Contrast |
|---|---|---|---|---|---|---|
| `--bg-canvas` | `#f8fafc` | `#090d16` | `#06040f` | `#020603` | `#fff1f7` | `#000000` |
| `--bg-surface` | `#ffffff` | `#111827` | `#0d0a1f` | `#050e08` | `#ffffff` | `#0a0a0a` |
| `--bg-surface-elevated` | `#ffffff` | `#162032` | `#141030` | `#09170e` | `#fff9fc` | `#141414` |
| `--bg-subtle` | `#f1f5f9` | `#1a2438` | `#1a143d` | `#0c1f13` | `#ffe4f1` | `#171717` |
| `--bg-hover` | `#e2e8f0` | `#223049` | `#241b52` | `#122c1b` | `#ffd1e7` | `#262626` |
| `--bg-active` | `#cbd5e1` | `#2b3d5c` | `#32246e` | `#183b24` | `#ffb8da` | `#333333` |

### Текст

| Токен | Light | Dark | Cyberpunk | Matrix | Barbie | High Contrast |
|---|---|---|---|---|---|---|
| `--text-primary` | `#0f172a` | `#f8fafc` | `#f4f6ff` | `#dcfce7` | `#4a0729` | `#ffffff` |
| `--text-secondary` | `#475569` | `#94a3b8` | `#b8c4f0` | `#86efac` | `#831843` | `#f1f5f9` |
| `--text-muted` | `#64748b` | `#64748b` (наслед.) | `#7c88bf` | `#4bb572` | `#9d174d` | `#d4d4d8` |
| `--text-inverse` | `#ffffff` | `#0f172a` | `#06040f` | `#020603` | `#ffffff` | `#000000` |

### Границы

| Токен | Light | Dark | Cyberpunk | Matrix | Barbie | High Contrast |
|---|---|---|---|---|---|---|
| `--border-subtle` | `#e2e8f0` | `#1e293b` | `#1e2d5e` | `#11331d` | `#fbcfe8` | `#737373` |
| `--border-strong` | `#cbd5e1` | `#334155` | `#8b2870` | `#1c5430` | `#f472b6` | `#d4d4d8` |
| `--border-focus` | `#6366f1` | `#818cf8` | `#00f0ff` | `#00ff41` | `#d61f77` | `#fde047` |

### Тени

| Токен | Light | Dark | Cyberpunk | Matrix | Barbie | High Contrast |
|---|---|---|---|---|---|---|
| `--shadow-sm` | `0 1px 2px 0 rgba(0,0,0,.05)` | `0 1px 2px 0 rgba(0,0,0,.4)` | `0 0 12px rgba(0,240,255,.12), 0 2px 6px rgba(0,0,0,.7)` | `0 0 10px rgba(0,255,65,.1), 0 2px 6px rgba(0,0,0,.8)` | `0 1px 3px rgba(214,31,119,.09), 0 1px 2px rgba(74,7,41,.04)` | `0 0 0 1px #737373` |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,.08), 0 2px 4px -2px rgba(0,0,0,.06)` | `0 4px 6px -1px rgba(0,0,0,.5), 0 2px 4px -2px rgba(0,0,0,.4)` | `0 0 20px rgba(0,240,255,.2), 0 4px 14px rgba(0,0,0,.75)` | `0 0 18px rgba(0,255,65,.16), 0 4px 14px rgba(0,0,0,.85)` | `0 4px 10px -1px rgba(214,31,119,.13), 0 2px 4px -2px rgba(74,7,41,.06)` | `0 0 0 1px #a3a3a3, 0 4px 12px rgba(0,0,0,.9)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.06)` | `0 10px 15px -3px rgba(0,0,0,.6), 0 4px 6px -4px rgba(0,0,0,.5)` | `0 0 30px rgba(255,42,133,.24), 0 10px 26px rgba(0,0,0,.8)` | `0 0 28px rgba(0,255,65,.22), 0 10px 26px rgba(0,0,0,.9)` | `0 10px 20px -3px rgba(214,31,119,.17), 0 4px 6px -4px rgba(74,7,41,.08)` | `0 0 0 2px #d4d4d8, 0 10px 20px rgba(0,0,0,.95)` |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.06)` | `0 20px 25px -5px rgba(0,0,0,.7), 0 8px 10px -6px rgba(0,0,0,.6)` | `0 0 42px rgba(0,240,255,.24), 0 20px 30px rgba(0,0,0,.85)` | `0 0 40px rgba(0,255,65,.24), 0 20px 30px rgba(0,0,0,.92)` | `0 20px 28px -5px rgba(214,31,119,.2), 0 8px 10px -6px rgba(74,7,41,.08)` | `0 0 0 2px #ffffff, 0 20px 30px rgba(0,0,0,.98)` |

### Скроллбары

| Токен | Light | Dark | Cyberpunk | Matrix | Barbie | High Contrast |
|---|---|---|---|---|---|---|
| `--scrollbar-track` | `#f1f5f9` | `#0e1524` | `#09061a` | `#030905` | `#ffe4f1` | `#000000` |
| `--scrollbar-thumb` | `#cbd5e1` | `#28374d` | `rgba(0,240,255,.42)` | `rgba(0,255,65,.36)` | `#f472b6` | `#d4d4d8` |
| `--scrollbar-thumb-hover` | `#94a3b8` | `#3d5170` | `#ff2a85` | `#00ff41` | `#d61f77` | `#fde047` |

### Статусные цвета

| Токен | Light | Dark | Cyberpunk | Matrix | Barbie | High Contrast |
|---|---|---|---|---|---|---|
| `--color-success` | `#059669` | `#34d399` | `#00ffa3` | `#00ff41` | `#047857` | `#4ade80` |
| `--color-success-solid` | `#10b981` | `#10b981` (наслед.) | `#00d98b` | `#00d936` | `#059669` | `#22c55e` |
| `--color-success-bg` | `rgba(16,185,129,.12)` | `rgba(52,211,153,.15)` | `rgba(0,255,163,.14)` | `rgba(0,255,65,.14)` | `rgba(5,150,105,.12)` | `rgba(74,222,128,.18)` |
| `--color-success-border` | `rgba(16,185,129,.28)` | `rgba(52,211,153,.28)` | `rgba(0,255,163,.36)` | `rgba(0,255,65,.36)` | `rgba(5,150,105,.32)` | `#4ade80` |
| `--color-warning` | `#d97706` | `#fbbf24` | `#ffe600` | `#facc15` | `#b45309` | `#fde047` |
| `--color-warning-solid` | `#d97706` | `#d97706` (наслед.) | `#eab308` | `#eab308` | `#d97706` | `#eab308` |
| `--color-warning-bg` | `rgba(245,158,11,.12)` | `rgba(251,191,36,.15)` | `rgba(255,230,0,.14)` | `rgba(250,204,21,.14)` | `rgba(217,119,6,.12)` | `rgba(253,224,71,.18)` |
| `--color-warning-border` | `rgba(245,158,11,.28)` | `rgba(251,191,36,.28)` | `rgba(255,230,0,.34)` | `rgba(250,204,21,.34)` | `rgba(217,119,6,.32)` | `#fde047` |
| `--color-danger` | `#dc2626` | `#f87171` | `#ff3864` | `#ff3b5c` | `#be123c` | `#ff7b7b` |
| `--color-danger-solid` | `#ef4444` | `#ef4444` (наслед.) | `#ff1f52` | `#ef2347` | `#e11d48` | `#ef4444` |
| `--color-danger-bg` | `rgba(239,68,68,.12)` | `rgba(248,113,113,.15)` | `rgba(255,56,100,.16)` | `rgba(255,59,92,.16)` | `rgba(225,29,72,.12)` | `rgba(255,123,123,.2)` |
| `--color-danger-border` | `rgba(239,68,68,.28)` | `rgba(248,113,113,.28)` | `rgba(255,56,100,.38)` | `rgba(255,59,92,.38)` | `rgba(225,29,72,.32)` | `#ff7b7b` |
| `--color-info` | `#0284c7` | `#38bdf8` | `#00f0ff` | `#2dd4bf` | `#0369a1` | `#38bdf8` |
| `--color-info-solid` | `#0284c7` | `#0284c7` (наслед.) | `#00c4d6` | `#14b8a6` | `#0284c7` | `#0ea5e9` |
| `--color-info-bg` | `rgba(2,132,199,.12)` | `rgba(56,189,248,.15)` | `rgba(0,240,255,.14)` | `rgba(45,212,191,.14)` | `rgba(2,132,199,.12)` | `rgba(56,189,248,.18)` |
| `--color-info-border` | `rgba(2,132,199,.28)` | `rgba(56,189,248,.28)` | `rgba(0,240,255,.36)` | `rgba(45,212,191,.36)` | `rgba(2,132,199,.32)` | `#38bdf8` |

### Акцент

| Токен | Light | Dark | Cyberpunk | Matrix | Barbie | High Contrast |
|---|---|---|---|---|---|---|
| `--accent-primary` | `#6366f1` (indigo) | `#6366f1` (наслед.) | `#ff2a85` | `#00ff41` | `#d61f77` | `#fde047` |
| `--accent-hover` | `#4f46e5` | `#4f46e5` (наслед.) | `#ff4fa0` | `#39ff6d` | `#be185d` | `#fef08a` |
| `--accent-soft` | `rgba(99,102,241,.15)` | `rgba(99,102,241,.15)` (наслед.) | `rgba(255,42,133,.18)` | `rgba(0,255,65,.14)` | `rgba(214,31,119,.12)` | `rgba(253,224,71,.2)` |
| `--accent-border` | `rgba(99,102,241,.3)` | `rgba(99,102,241,.3)` (наслед.) | `rgba(0,240,255,.48)` | `rgba(0,255,65,.42)` | `rgba(214,31,119,.34)` | `#fde047` |
| `--accent-gradient` | `135deg #6366f1→#4f46e5` | (наслед.) | `135deg #ff2a85→#8b5cf6→#00e5ff` | `135deg #00ff41→#059669` | `135deg #ec4899→#db2777→#c026d3` | `135deg #fde047→#facc15` |

### Glow / анимационные хуки

| Токен | Light | Dark | Cyberpunk | Matrix | Barbie | High Contrast |
|---|---|---|---|---|---|---|
| `--surface-glow` | `none` | `none` (наслед.) | `0 0 18px rgba(0,240,255,.12), inset 0 1px 0 rgba(0,240,255,.16)` | `0 0 16px rgba(0,255,65,.1), inset 0 1px 0 rgba(0,255,65,.18)` | `0 0 14px rgba(236,72,153,.08)` | `none` |
| `--accent-glow` | `none` | `none` (наслед.) | `0 0 14px rgba(255,42,133,.45), 0 0 26px rgba(0,240,255,.24)` | `0 0 14px rgba(0,255,65,.42), 0 0 26px rgba(16,185,129,.22)` | `0 4px 14px rgba(214,31,119,.32)` | `none` |
| `--accent-glow-hover` | `none` | `none` (наслед.) | `0 0 22px rgba(0,240,255,.65), 0 0 36px rgba(255,42,133,.4)` | `0 0 22px rgba(0,255,65,.68), 0 0 36px rgba(0,255,65,.3)` | `0 6px 20px rgba(214,31,119,.45)` | `none` |
| `--cyber-text-shadow` | `none` | `none` (наслед.) | `0 0 10px rgba(0,240,255,.45)` | `0 0 8px rgba(0,255,65,.42)` | `none` | `none` |
| `--cyber-pulse-anim` | `none` | `none` (наслед.) | `cyberGlowPulse 3.6s ease-in-out infinite` | `none` | `none` | `none` |
| `--cyber-surface-anim` | `none` | `none` (наслед.) | `cyberSurfaceBreath 5.5s ease-in-out infinite` | `none` | `none` | `none` |
| `--cyber-gradient-anim` | `none` | `none` (наслед.) | `cyberGradientFlow 6s ease infinite` | `none` | `none` | `none` |

В cyberpunk и matrix дополнительно: ambient-оверлей `body::after` (radial-градиенты +
scanlines, cyberpunk — анимация `cyberAmbientShift 10s`).

## Пресеты фона (`data-bg`, только Light/Dark)

Переопределяют фоны, `--border-subtle/strong` и скроллбары; остальное наследует тему.
Пресеты применяются **только Light/Dark** (`store.ts`, ветка `theme === 'dark' || theme === 'light'`).

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

Вариации акцента — CSS-селекторы `[data-accent='X']:not([data-theme='high-contrast'])`:
переопределяют акцентные токены в Light/Dark/Cyberpunk/Matrix/Barbie; в High Contrast
акцент зафиксирован (`#fde047`). Store-пересчёт акцента (`ACCENT_HEX_MAP`) выполняется
только для Light/Dark.

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

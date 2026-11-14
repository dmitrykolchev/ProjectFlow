import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { iconLayers } from '../../common/icons';
import styles from './app-design-tokens.css';
import '../../common/app-page-header/app-page-header';
import '../../common/app-section-card/app-section-card';
import '../../common/app-button/app-button';

interface TokenDef {
  name: string;
  swatch: boolean;
}

interface CategoryDef {
  titleRu: string;
  titleEn: string;
  tokens: TokenDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    titleRu: 'Фоны',
    titleEn: 'Backgrounds',
    tokens: [
      { name: 'bg-canvas', swatch: true },
      { name: 'bg-surface', swatch: true },
      { name: 'bg-surface-elevated', swatch: true },
      { name: 'bg-subtle', swatch: true },
      { name: 'bg-hover', swatch: true },
      { name: 'bg-active', swatch: true },
    ],
  },
  {
    titleRu: 'Текст',
    titleEn: 'Text',
    tokens: [
      { name: 'text-primary', swatch: true },
      { name: 'text-secondary', swatch: true },
      { name: 'text-muted', swatch: true },
      { name: 'text-inverse', swatch: true },
      { name: 'text-on-accent', swatch: true },
    ],
  },
  {
    titleRu: 'Границы',
    titleEn: 'Borders',
    tokens: [
      { name: 'border-subtle', swatch: true },
      { name: 'border-strong', swatch: true },
      { name: 'border-focus', swatch: true },
    ],
  },
  {
    titleRu: 'Акцент',
    titleEn: 'Accent',
    tokens: [
      { name: 'accent-primary', swatch: true },
      { name: 'accent-hover', swatch: true },
      { name: 'accent-soft', swatch: true },
      { name: 'accent-border', swatch: true },
    ],
  },
  {
    titleRu: 'Статусные цвета',
    titleEn: 'Status colors',
    tokens: [
      { name: 'color-success', swatch: true },
      { name: 'color-success-solid', swatch: true },
      { name: 'color-warning', swatch: true },
      { name: 'color-warning-solid', swatch: true },
      { name: 'color-danger', swatch: true },
      { name: 'color-danger-solid', swatch: true },
      { name: 'color-info', swatch: true },
      { name: 'color-info-solid', swatch: true },
    ],
  },
  {
    titleRu: 'Скроллбары',
    titleEn: 'Scrollbars',
    tokens: [
      { name: 'scrollbar-track', swatch: true },
      { name: 'scrollbar-thumb', swatch: true },
      { name: 'scrollbar-thumb-hover', swatch: true },
    ],
  },
  {
    titleRu: 'Тени',
    titleEn: 'Shadows',
    tokens: [
      { name: 'shadow-sm', swatch: false },
      { name: 'shadow-md', swatch: false },
      { name: 'shadow-lg', swatch: false },
      { name: 'shadow-xl', swatch: false },
    ],
  },
];

// Static reference values for the three themes (source of truth: src/index.css)
const THEME_TABLE: { token: string; light: string; dark: string; cyber: string }[] = [
  { token: 'bg-canvas', light: '#f8fafc', dark: '#090d16', cyber: '#06040f' },
  { token: 'bg-surface', light: '#ffffff', dark: '#111827', cyber: '#0d0a1f' },
  { token: 'bg-subtle', light: '#f1f5f9', dark: '#1a2438', cyber: '#1a143d' },
  { token: 'text-primary', light: '#0f172a', dark: '#f8fafc', cyber: '#f4f6ff' },
  { token: 'text-secondary', light: '#475569', dark: '#94a3b8', cyber: '#b8c4f0' },
  { token: 'border-subtle', light: '#e2e8f0', dark: '#1e293b', cyber: '#1e2d5e' },
  { token: 'border-focus', light: '#6366f1', dark: '#818cf8', cyber: '#00f0ff' },
  { token: 'accent-primary', light: '#6366f1', dark: '#6366f1', cyber: '#ff2a85' },
  { token: 'color-success', light: '#059669', dark: '#34d399', cyber: '#00ffa3' },
  { token: 'color-warning', light: '#d97706', dark: '#fbbf24', cyber: '#ffe600' },
  { token: 'color-danger', light: '#dc2626', dark: '#f87171', cyber: '#ff3864' },
  { token: 'color-info', light: '#0284c7', dark: '#38bdf8', cyber: '#00f0ff' },
];

@customElement('app-design-tokens')
export class AppDesignTokens extends LitElement {
  @state() private currentLang = store.customization.language;
  @state() private theme = store.customization.theme;
  @state() private values: Record<string, string> = {};

  private unsubscribe: (() => void) | null = null;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
      this.theme = store.customization.theme;
      this.readValues();
    });
    this.readValues();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private readValues() {
    const cs = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const cat of CATEGORIES) {
      for (const t of cat.tokens) {
        next[t.name] = cs.getPropertyValue(`--${t.name}`).trim();
      }
    }
    this.values = next;
  }

  render() {
    const isRu = this.currentLang === 'ru';
    return html`
      <app-page-header
        title="Design Tokens"
        subtitle="${isRu
          ? 'CSS-переменные, определяющие темы Light, Dark и Cyberpunk. Живые значения обновляются при смене темы.'
          : 'CSS custom properties powering the Light, Dark and Cyberpunk themes. Live values update when the theme changes.'}"
      >
        <span slot="icon">${iconLayers(28)}</span>
        <div slot="actions" class="theme-switch">
          <app-button
            variant="${this.theme === 'light' ? 'primary' : 'outline'}"
            size="sm"
            @click="${() => store.setTheme('light')}"
          >Light</app-button>
          <app-button
            variant="${this.theme === 'dark' ? 'primary' : 'outline'}"
            size="sm"
            @click="${() => store.setTheme('dark')}"
          >Dark</app-button>
          <app-button
            variant="${this.theme === 'cyberpunk' ? 'primary' : 'outline'}"
            size="sm"
            @click="${() => store.setTheme('cyberpunk')}"
          >Cyberpunk</app-button>
        </div>
      </app-page-header>

      <section class="token-grid">
        ${CATEGORIES.map((cat) => {
          const title = isRu ? cat.titleRu : cat.titleEn;
          return html`
            <app-section-card title="${title}">
              <ul class="token-list">
                ${cat.tokens.map((t) => html`
                  <li class="token-row">
                    ${t.swatch
                      ? html`<span class="swatch" style="background: ${this.values[t.name] || 'transparent'};"></span>`
                      : ''}
                    <code class="token-name">--${t.name}</code>
                    <code class="token-value">${this.values[t.name] || '—'}</code>
                  </li>
                `)}
              </ul>
            </app-section-card>
          `;
        })}
      </section>

      <app-section-card title="${isRu ? 'Три темы — справочные значения' : 'Three themes — reference values'}">
        <table class="theme-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Light</th>
              <th>Dark</th>
              <th>Cyberpunk</th>
            </tr>
          </thead>
          <tbody>
            ${THEME_TABLE.map((row) => html`
              <tr>
                <td><code>--${row.token}</code></td>
                <td><span class="dot" style="background: ${row.light};"></span>${row.light}</td>
                <td><span class="dot" style="background: ${row.dark};"></span>${row.dark}</td>
                <td><span class="dot" style="background: ${row.cyber};"></span>${row.cyber}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </app-section-card>

      <app-section-card title="${isRu ? 'Примеры использования' : 'Usage examples'}">
        <div class="examples">
          <div class="example">
            <p class="example-title">${isRu ? '1. Обращение к токену с fallback (соглашение компонентов)' : '1. Token access with fallback (component convention)'}</p>
            <pre><code>.badge {
  color: var(--color-success, #34d399);
  background: var(--color-success-bg, rgba(52, 211, 153, 0.15));
  border: 1px solid var(--color-success-border, rgba(52, 211, 153, 0.28));
}</code></pre>
            <div class="demo-row">
              <span class="demo-badge">${isRu ? 'Активен' : 'Active'}</span>
            </div>
          </div>

          <div class="example">
            <p class="example-title">${isRu ? '2. Поверхности и границы карточки' : '2. Card surfaces and borders'}</p>
            <pre><code>.card {
  background: var(--bg-surface, #111827);
  border: 1px solid var(--border-subtle, #1e293b);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-md);
}</code></pre>
            <div class="demo-row">
              <div class="demo-card">${isRu ? 'Карточка на текущих токенах' : 'Card on current tokens'}</div>
            </div>
          </div>

          <div class="example">
            <p class="example-title">${isRu ? '3. Плотность через --density-*' : '3. Density via --density-*'}</p>
            <pre><code>.grid-row {
  height: var(--density-row-height, 44px);
  padding: var(--density-padding-base, 0.75rem);
}
/* data-density="compact": row 36px, padding 0.5rem */</code></pre>
            <div class="demo-row">
              <div class="demo-row-line">${isRu ? 'Строка рядовой плотности' : 'Density row line'}</div>
            </div>
          </div>

          <div class="example">
            <p class="example-title">${isRu ? '4. Glow-хуки: неон только в Cyberpunk' : '4. Glow hooks: neon only in Cyberpunk'}</p>
            <pre><code>.accent-btn:hover {
  box-shadow: var(--accent-glow-hover, none);
}
/* Light/Dark: --accent-glow-hover = none → свечение гаснет */</code></pre>
            <div class="demo-row">
              <span class="demo-glow">${isRu ? 'Наведите на кнопку' : 'Hover the button'}</span>
            </div>
          </div>
        </div>
      </app-section-card>

      <app-section-card title="${isRu ? 'Общая база (все темы)' : 'Shared base (all themes)'}">
        <div class="shared-chips">
          <code>--font-sans: Plus Jakarta Sans</code>
          <code>--font-mono: JetBrains Mono</code>
          <code>--radius-sm: 6px</code>
          <code>--radius-md: 8px</code>
          <code>--radius-lg: 12px</code>
          <code>--radius-xl: 16px</code>
          <code>--transition-fast: 150ms</code>
          <code>--transition-normal: 200ms</code>
          <code>--control-height-sm/md/lg: 30/38/44px</code>
          <code>--sidebar-width: 260px</code>
        </div>
      </app-section-card>
    `;
  }
}

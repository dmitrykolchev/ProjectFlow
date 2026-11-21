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
  key:
    | 'backgrounds'
    | 'text'
    | 'borders'
    | 'accent'
    | 'statusColors'
    | 'scrollbars'
    | 'shadows'
    | 'radii'
    | 'controlHeights'
    | 'density'
    | 'transitions'
    | 'typography'
    | 'glow'
    | 'sidebar';
  tokens: TokenDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'backgrounds',
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
    key: 'text',
    tokens: [
      { name: 'text-primary', swatch: true },
      { name: 'text-secondary', swatch: true },
      { name: 'text-muted', swatch: true },
      { name: 'text-inverse', swatch: true },
      { name: 'text-on-accent', swatch: true },
    ],
  },
  {
    key: 'borders',
    tokens: [
      { name: 'border-subtle', swatch: true },
      { name: 'border-strong', swatch: true },
      { name: 'border-focus', swatch: true },
    ],
  },
  {
    key: 'accent',
    tokens: [
      { name: 'accent-primary', swatch: true },
      { name: 'accent-hover', swatch: true },
      { name: 'accent-soft', swatch: true },
      { name: 'accent-border', swatch: true },
    ],
  },
  {
    key: 'statusColors',
    tokens: [
      { name: 'color-success', swatch: true },
      { name: 'color-success-solid', swatch: true },
      { name: 'color-success-bg', swatch: true },
      { name: 'color-success-border', swatch: true },
      { name: 'color-warning', swatch: true },
      { name: 'color-warning-solid', swatch: true },
      { name: 'color-warning-bg', swatch: true },
      { name: 'color-warning-border', swatch: true },
      { name: 'color-danger', swatch: true },
      { name: 'color-danger-solid', swatch: true },
      { name: 'color-danger-bg', swatch: true },
      { name: 'color-danger-border', swatch: true },
      { name: 'color-info', swatch: true },
      { name: 'color-info-solid', swatch: true },
      { name: 'color-info-bg', swatch: true },
      { name: 'color-info-border', swatch: true },
    ],
  },
  {
    key: 'scrollbars',
    tokens: [
      { name: 'scrollbar-track', swatch: true },
      { name: 'scrollbar-thumb', swatch: true },
      { name: 'scrollbar-thumb-hover', swatch: true },
    ],
  },
  {
    key: 'shadows',
    tokens: [
      { name: 'shadow-sm', swatch: false },
      { name: 'shadow-md', swatch: false },
      { name: 'shadow-lg', swatch: false },
      { name: 'shadow-xl', swatch: false },
    ],
  },
  {
    key: 'radii',
    tokens: [
      { name: 'radius-sm', swatch: false },
      { name: 'radius-md', swatch: false },
      { name: 'radius-lg', swatch: false },
      { name: 'radius-xl', swatch: false },
    ],
  },
  {
    key: 'controlHeights',
    tokens: [
      { name: 'control-height-xs', swatch: false },
      { name: 'control-height-sm', swatch: false },
      { name: 'control-height-md', swatch: false },
      { name: 'control-height-lg', swatch: false },
    ],
  },
  {
    key: 'density',
    tokens: [
      { name: 'density-padding-base', swatch: false },
      { name: 'density-padding-compact', swatch: false },
      { name: 'density-row-height', swatch: false },
      { name: 'density-header-height', swatch: false },
    ],
  },
  {
    key: 'transitions',
    tokens: [
      { name: 'transition-fast', swatch: false },
      { name: 'transition-normal', swatch: false },
    ],
  },
  {
    key: 'typography',
    tokens: [
      { name: 'font-sans', swatch: false },
      { name: 'font-mono', swatch: false },
    ],
  },
  {
    key: 'glow',
    tokens: [
      { name: 'surface-glow', swatch: false },
      { name: 'accent-glow', swatch: false },
      { name: 'accent-glow-hover', swatch: false },
      { name: 'cyber-text-shadow', swatch: false },
      { name: 'cyber-pulse-anim', swatch: false },
      { name: 'cyber-surface-anim', swatch: false },
      { name: 'cyber-gradient-anim', swatch: false },
    ],
  },
  {
    key: 'sidebar',
    tokens: [
      { name: 'sidebar-width', swatch: false },
      { name: 'sidebar-collapsed-width', swatch: false },
    ],
  },
];

// Static reference values for the six themes (source of truth: src/index.css)
const THEME_TABLE: {
  token: string;
  light: string;
  dark: string;
  cyber: string;
  matrix: string;
  barbie: string;
  highContrast: string;
}[] = [
  { token: 'bg-canvas', light: '#f8fafc', dark: '#090d16', cyber: '#06040f', matrix: '#020603', barbie: '#fff1f7', highContrast: '#000000' },
  { token: 'bg-surface', light: '#ffffff', dark: '#111827', cyber: '#0d0a1f', matrix: '#050e08', barbie: '#ffffff', highContrast: '#0a0a0a' },
  { token: 'bg-subtle', light: '#f1f5f9', dark: '#1a2438', cyber: '#1a143d', matrix: '#0c1f13', barbie: '#ffe4f1', highContrast: '#171717' },
  { token: 'text-primary', light: '#0f172a', dark: '#f8fafc', cyber: '#f4f6ff', matrix: '#dcfce7', barbie: '#4a0729', highContrast: '#ffffff' },
  { token: 'text-secondary', light: '#475569', dark: '#94a3b8', cyber: '#b8c4f0', matrix: '#86efac', barbie: '#831843', highContrast: '#f1f5f9' },
  { token: 'border-subtle', light: '#e2e8f0', dark: '#1e293b', cyber: '#1e2d5e', matrix: '#11331d', barbie: '#fbcfe8', highContrast: '#737373' },
  { token: 'border-focus', light: '#6366f1', dark: '#818cf8', cyber: '#00f0ff', matrix: '#00ff41', barbie: '#d61f77', highContrast: '#fde047' },
  { token: 'accent-primary', light: '#6366f1', dark: '#6366f1', cyber: '#ff2a85', matrix: '#00ff41', barbie: '#d61f77', highContrast: '#fde047' },
  { token: 'color-success', light: '#059669', dark: '#34d399', cyber: '#00ffa3', matrix: '#00ff41', barbie: '#047857', highContrast: '#4ade80' },
  { token: 'color-warning', light: '#d97706', dark: '#fbbf24', cyber: '#ffe600', matrix: '#facc15', barbie: '#b45309', highContrast: '#fde047' },
  { token: 'color-danger', light: '#dc2626', dark: '#f87171', cyber: '#ff3864', matrix: '#ff3b5c', barbie: '#be123c', highContrast: '#ff7b7b' },
  { token: 'color-info', light: '#0284c7', dark: '#38bdf8', cyber: '#00f0ff', matrix: '#2dd4bf', barbie: '#0369a1', highContrast: '#38bdf8' },
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
    const tx = getTranslation(this.currentLang);
    return html`
      <app-page-header
        title="Design Tokens"
        subtitle="${tx.viewTexts.pageSubtitles.designTokens}"
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
          <app-button
            variant="${this.theme === 'matrix' ? 'primary' : 'outline'}"
            size="sm"
            @click="${() => store.setTheme('matrix')}"
          >Matrix</app-button>
          <app-button
            variant="${this.theme === 'barbie' ? 'primary' : 'outline'}"
            size="sm"
            @click="${() => store.setTheme('barbie')}"
          >Barbie</app-button>
          <app-button
            variant="${this.theme === 'high-contrast' ? 'primary' : 'outline'}"
            size="sm"
            @click="${() => store.setTheme('high-contrast')}"
          >AAA</app-button>
        </div>
      </app-page-header>

      <section class="token-grid">
        ${CATEGORIES.map((cat) => {
          const title = tx.viewTexts.designTokens.categories[cat.key];
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

      <app-section-card title="${tx.viewTexts.designTokens.sections.themeTable}">
        <div class="theme-table-wrap">
          <table class="theme-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Light</th>
                <th>Dark</th>
                <th>Cyberpunk</th>
                <th>Matrix</th>
                <th>Barbie</th>
                <th>High Contrast</th>
              </tr>
            </thead>
            <tbody>
              ${THEME_TABLE.map((row) => html`
                <tr>
                  <td><code>--${row.token}</code></td>
                  <td><span class="dot" style="background: ${row.light};"></span>${row.light}</td>
                  <td><span class="dot" style="background: ${row.dark};"></span>${row.dark}</td>
                  <td><span class="dot" style="background: ${row.cyber};"></span>${row.cyber}</td>
                  <td><span class="dot" style="background: ${row.matrix};"></span>${row.matrix}</td>
                  <td><span class="dot" style="background: ${row.barbie};"></span>${row.barbie}</td>
                  <td><span class="dot" style="background: ${row.highContrast};"></span>${row.highContrast}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      </app-section-card>

      <app-section-card title="${tx.viewTexts.designTokens.sections.examples}">
        <div class="examples">
          <div class="example">
            <p class="example-title">${tx.viewTexts.designTokens.examples.tokenFallback}</p>
            <pre><code>.badge {
  color: var(--color-success, #34d399);
  background: var(--color-success-bg, rgba(52, 211, 153, 0.15));
  border: 1px solid var(--color-success-border, rgba(52, 211, 153, 0.28));
}</code></pre>
            <div class="demo-row">
              <span class="demo-badge">${tx.viewTexts.designTokens.demos.activeBadge}</span>
            </div>
          </div>

          <div class="example">
            <p class="example-title">${tx.viewTexts.designTokens.examples.cardSurfaces}</p>
            <pre><code>.card {
  background: var(--bg-surface, #111827);
  border: 1px solid var(--border-subtle, #1e293b);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-md);
}</code></pre>
            <div class="demo-row">
              <div class="demo-card">${tx.viewTexts.designTokens.demos.demoCard}</div>
            </div>
          </div>

          <div class="example">
            <p class="example-title">${tx.viewTexts.designTokens.examples.density}</p>
            <pre><code>.grid-row {
  height: var(--density-row-height, 44px);
  padding: var(--density-padding-base, 0.75rem);
}
/* data-density="compact": row 36px, padding 0.5rem */</code></pre>
            <div class="demo-row">
              <div class="demo-row-line">${tx.viewTexts.designTokens.demos.densityRow}</div>
            </div>
          </div>

          <div class="example">
            <p class="example-title">${tx.viewTexts.designTokens.examples.glowHooks}</p>
            <pre><code>.accent-btn:hover {
  box-shadow: var(--accent-glow-hover, none);
}
${tx.viewTexts.designTokens.demos.glowCodeComment}</code></pre>
            <div class="demo-row">
              <span class="demo-glow">${tx.viewTexts.designTokens.demos.glowButton}</span>
            </div>
          </div>
        </div>
      </app-section-card>

      <app-section-card title="${tx.viewTexts.designTokens.sections.sharedBase}">
        <div class="shared-chips">
          <code>${tx.viewTexts.designTokens.chips.fontSans}</code>
          <code>${tx.viewTexts.designTokens.chips.fontMono}</code>
          <code>--radius-sm: 6px</code>
          <code>--radius-md: 8px</code>
          <code>--radius-lg: 12px</code>
          <code>--radius-xl: 16px</code>
          <code>--transition-fast: 150ms</code>
          <code>--transition-normal: 200ms</code>
          <code>--control-height-xs/sm/md/lg: 24/30/38/44px</code>
          <code>--sidebar-width: 260px</code>
        </div>
      </app-section-card>
    `;
  }
}

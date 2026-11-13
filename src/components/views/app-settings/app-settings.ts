import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { AccentColor, ActiveView, BackgroundPreset, ThemeBaseColors, ThemeMode } from '../../../types';
import { getTranslation } from '../../../i18n';
import '../../common/app-button/app-button';
import styles from './app-settings.css';

interface BasePaletteOption {
  nameRu: string;
  nameEn: string;
  colors: ThemeBaseColors;
}

const CURATED_BASE_PALETTES: Record<ThemeMode, BasePaletteOption[]> = {
  dark: [
    {
      nameRu: 'Глубокий индиго',
      nameEn: 'Deep Indigo',
      colors: { bgCanvas: '#090d16', bgSurface: '#111827', textPrimary: '#f8fafc', accentPrimary: '#6366f1', borderSubtle: '#1e293b' },
    },
    {
      nameRu: 'Изумрудная ночь',
      nameEn: 'Emerald Night',
      colors: { bgCanvas: '#06120f', bgSurface: '#0c1c18', textPrimary: '#ecfdf5', accentPrimary: '#10b981', borderSubtle: '#193830' },
    },
    {
      nameRu: 'Янтарный графит',
      nameEn: 'Amber Graphite',
      colors: { bgCanvas: '#111014', bgSurface: '#1b181f', textPrimary: '#faf8f5', accentPrimary: '#f59e0b', borderSubtle: '#2f2936' },
    },
  ],
  light: [
    {
      nameRu: 'Кристальный сланец',
      nameEn: 'Crystal Slate',
      colors: { bgCanvas: '#f8fafc', bgSurface: '#ffffff', textPrimary: '#0f172a', accentPrimary: '#6366f1', borderSubtle: '#e2e8f0' },
    },
    {
      nameRu: 'Тёплый пергамент',
      nameEn: 'Warm Ivory',
      colors: { bgCanvas: '#f6f3ec', bgSurface: '#fdfcf9', textPrimary: '#241f18', accentPrimary: '#d97706', borderSubtle: '#e3dccf' },
    },
    {
      nameRu: 'Ледяная бирюза',
      nameEn: 'Arctic Teal',
      colors: { bgCanvas: '#eef7f9', bgSurface: '#ffffff', textPrimary: '#0b2530', accentPrimary: '#0891b2', borderSubtle: '#cde3ea' },
    },
  ],
  cyberpunk: [
    {
      nameRu: 'Night City Неон',
      nameEn: 'Night City Neon',
      colors: { bgCanvas: '#06040f', bgSurface: '#0d0a1f', textPrimary: '#f4f6ff', accentPrimary: '#ff2a85', borderSubtle: '#1e2d5e' },
    },
    {
      nameRu: 'Кислотный лайм',
      nameEn: 'Acid Matrix',
      colors: { bgCanvas: '#040d09', bgSurface: '#081812', textPrimary: '#eafff3', accentPrimary: '#00ffa3', borderSubtle: '#144734' },
    },
    {
      nameRu: 'Лазерный циан',
      nameEn: 'Laser Cyan',
      colors: { bgCanvas: '#030816', bgSurface: '#081129', textPrimary: '#eefaff', accentPrimary: '#00d9ff', borderSubtle: '#173866' },
    },
  ],
};

@customElement('app-settings')
export class AppSettings extends LitElement {
  @state() private custom = { ...store.customization };
  @state() private currentLang = store.customization.language;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => {
      this.syncState();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private syncState() {
    this.custom = { ...store.customization };
    this.currentLang = store.customization.language;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const activeTheme = this.custom.theme;
    const isDark = activeTheme === 'dark';
    const isLight = activeTheme === 'light';
    const isCyberpunk = activeTheme === 'cyberpunk';
    const isRu = this.currentLang === 'ru';

    const effectiveBase = store.getEffectiveBaseColors(activeTheme);
    const hasOverrides = store.hasThemeOverrides(activeTheme) || this.custom.backgroundPreset === 'custom';

    const baseColorFields: { key: keyof ThemeBaseColors; label: string; token: string }[] = [
      { key: 'bgCanvas', label: t.settings.colorCanvas, token: '--bg-canvas' },
      { key: 'bgSurface', label: t.settings.colorSurface, token: '--bg-surface' },
      { key: 'textPrimary', label: t.settings.colorText, token: '--text-primary' },
      { key: 'accentPrimary', label: t.settings.colorAccent, token: '--accent-primary' },
      { key: 'borderSubtle', label: t.settings.colorBorder, token: '--border-subtle' },
    ];

    const accentOptions: { key: AccentColor; name: string; color: string }[] = [
      { key: 'indigo', name: 'Indigo', color: '#6366f1' },
      { key: 'emerald', name: 'Emerald', color: '#10b981' },
      { key: 'cyan', name: 'Cyan', color: '#06b6d4' },
      { key: 'violet', name: 'Violet', color: '#8b5cf6' },
      { key: 'amber', name: 'Amber', color: '#f59e0b' },
    ];

    const bgPresets: { key: BackgroundPreset; label: string; darkCanvas: string; darkSurface: string; lightCanvas: string; lightSurface: string }[] = [
      { key: 'default', label: t.settings.bgDefault, darkCanvas: '#090d16', darkSurface: '#111827', lightCanvas: '#f8fafc', lightSurface: '#ffffff' },
      { key: 'midnight', label: t.settings.bgMidnight, darkCanvas: '#030712', darkSurface: '#0a101f', lightCanvas: '#eef2f9', lightSurface: '#ffffff' },
      { key: 'obsidian', label: t.settings.bgObsidian, darkCanvas: '#121110', darkSurface: '#1b1917', lightCanvas: '#f5f4f1', lightSurface: '#fafaf8' },
      { key: 'nordic', label: t.settings.bgNordic, darkCanvas: '#0f172a', darkSurface: '#162033', lightCanvas: '#edf2f6', lightSurface: '#f8fbfd' },
      { key: 'forest', label: t.settings.bgForest, darkCanvas: '#071310', darkSurface: '#0d1d19', lightCanvas: '#f0f5f2', lightSurface: '#f8fbf9' },
    ];

    const customBgSwatches = isLight
      ? ['#f4f3ff', '#fdf2f8', '#ecfeff', '#fffbeb', '#f3f4f6']
      : ['#0d0b1a', '#140c16', '#09151c', '#18130c', '#101418'];

    const viewsList: { id: ActiveView; label: string }[] = [
      { id: 'dashboard', label: t.navigation.dashboard },
      { id: 'kanban', label: t.navigation.kanban },
      { id: 'gantt', label: t.navigation.gantt },
      { id: 'grid', label: t.navigation.grid },
      { id: 'calendar', label: t.navigation.calendar },
      { id: 'analytics', label: t.navigation.analytics },
    ];

    const curatedPalettes = CURATED_BASE_PALETTES[activeTheme];

    return html`
      <div class="settings-container">
        <div class="page-header">
          <h1 class="page-title">${t.settings.title}</h1>
          <p class="page-subtitle">${t.settings.subtitle}</p>
        </div>

        <!-- Theme Mode -->
        <div class="section-card">
          <div class="section-title">${t.settings.theme}</div>
          <div class="options-grid">
            <div
              class="option-card ${isDark ? 'is-active' : ''}"
              @click="${() => store.setTheme('dark')}"
            >
              <div class="theme-mini-strip">
                <span style="background: #090d16;"></span>
                <span style="background: #111827;"></span>
                <span style="background: #6366f1;"></span>
              </div>
              <div class="option-card-header">
                <span>${t.settings.themeDark}</span>
                ${isDark ? '✓' : ''}
              </div>
              <p class="option-card-desc">
                ${isRu
                  ? 'Глубокие темные тона для комфортной работы при слабом освещении'
                  : 'Deep dark tones for comfortable low-light focus'}
              </p>
            </div>

            <div
              class="option-card ${isLight ? 'is-active' : ''}"
              @click="${() => store.setTheme('light')}"
            >
              <div class="theme-mini-strip">
                <span style="background: #f8fafc;"></span>
                <span style="background: #ffffff;"></span>
                <span style="background: #6366f1;"></span>
              </div>
              <div class="option-card-header">
                <span>${t.settings.themeLight}</span>
                ${isLight ? '✓' : ''}
              </div>
              <p class="option-card-desc">
                ${isRu
                  ? 'Чистые контрастные светлые поверхности для дневной работы'
                  : 'Crisp high-contrast light surfaces for daytime clarity'}
              </p>
            </div>

            <div
              class="option-card is-cyberpunk ${isCyberpunk ? 'is-active' : ''}"
              @click="${() => store.setTheme('cyberpunk')}"
            >
              <div class="theme-mini-strip">
                <span style="background: #06040f;"></span>
                <span style="background: #ff2a85;"></span>
                <span style="background: #00f0ff;"></span>
              </div>
              <div class="option-card-header">
                <span>${t.settings.themeCyberpunk}</span>
                ${isCyberpunk ? '✓' : ''}
              </div>
              <p class="option-card-desc">${t.settings.themeCyberpunkDesc}</p>
            </div>
          </div>
        </div>

        <!-- Customize Active Theme via Base Colors -->
        <div class="section-card">
          <div class="section-header-row">
            <div class="section-title">${t.settings.baseColorsTitle}</div>
            ${hasOverrides
              ? html`
                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => store.resetThemeBaseColors(activeTheme)}"
                  >
                    ${t.settings.resetThemeColors}
                  </app-button>
                `
              : ''}
          </div>
          <p class="section-desc">${t.settings.baseColorsDesc}</p>

          <div class="base-colors-grid">
            ${baseColorFields.map((field) => {
              const currentHex = effectiveBase[field.key];
              return html`
                <label class="base-color-card">
                  <div class="base-color-top">
                    <input
                      type="color"
                      class="base-color-input"
                      .value="${currentHex}"
                      @input="${(e: Event) =>
                        store.setThemeBaseColor(field.key, (e.target as HTMLInputElement).value)}"
                    />
                    <span class="color-hex">${currentHex.toUpperCase()}</span>
                  </div>
                  <div>
                    <div class="base-color-label">${field.label}</div>
                    <div class="base-color-token">${field.token}</div>
                  </div>
                </label>
              `;
            })}
          </div>

          <div class="base-palettes-row">
            <span class="base-palettes-label">${t.settings.basePalettes}:</span>
            <div class="base-palettes-list">
              ${curatedPalettes.map(
                (pal) => html`
                  <button
                    type="button"
                    class="base-palette-btn"
                    @click="${() => store.applyThemeBasePreset(pal.colors)}"
                  >
                    <span class="palette-dots">
                      <span class="palette-dot" style="background: ${pal.colors.bgCanvas};"></span>
                      <span class="palette-dot" style="background: ${pal.colors.bgSurface};"></span>
                      <span class="palette-dot" style="background: ${pal.colors.accentPrimary};"></span>
                      <span class="palette-dot" style="background: ${pal.colors.textPrimary};"></span>
                    </span>
                    <span>${isRu ? pal.nameRu : pal.nameEn}</span>
                  </button>
                `
              )}
            </div>
          </div>
        </div>

        <!-- Background Theme Palette & Custom Color (Dark / Light) -->
        ${!isCyberpunk
          ? html`
              <div class="section-card">
                <div class="section-title">${t.settings.background}</div>
                <p class="section-desc">${t.settings.backgroundDesc}</p>

                <div class="bg-presets-grid">
                  ${bgPresets.map((bg) => {
                    const canvasCol = isLight ? bg.lightCanvas : bg.darkCanvas;
                    const surfaceCol = isLight ? bg.lightSurface : bg.darkSurface;
                    const active = this.custom.backgroundPreset === bg.key && !store.hasThemeOverrides(activeTheme);
                    return html`
                      <div
                        class="bg-preset-card ${active ? 'is-active' : ''}"
                        @click="${() => store.setBackgroundPreset(bg.key)}"
                      >
                        <div class="bg-preview-strip">
                          <div class="bg-preview-canvas" style="background: ${canvasCol};"></div>
                          <div class="bg-preview-surface" style="background: ${surfaceCol};"></div>
                        </div>
                        <div class="bg-preset-label">
                          <span>${bg.label}</span>
                          ${active ? html`<span style="color: var(--accent-primary);">✓</span>` : ''}
                        </div>
                      </div>
                    `;
                  })}
                </div>

                <div class="custom-bg-row">
                  <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 500;">
                    ${t.settings.customBgLabel}:
                  </span>
                  <label class="color-picker-wrap">
                    <input
                      type="color"
                      class="color-input"
                      .value="${this.custom.customBgColor || '#0c101d'}"
                      @input="${(e: Event) => store.setCustomBackgroundColor((e.target as HTMLInputElement).value)}"
                    />
                    <span class="color-hex">${(this.custom.customBgColor || '#0c101d').toUpperCase()}</span>
                  </label>

                  <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
                    ${customBgSwatches.map(
                      (hex) => html`
                        <button
                          type="button"
                          title="${hex}"
                          style="width: 28px; height: 28px; border-radius: 6px; background: ${hex}; border: 2px solid ${this.custom.backgroundPreset === 'custom' && this.custom.customBgColor === hex ? 'var(--accent-primary)' : 'var(--border-strong)'}; cursor: pointer;"
                          @click="${() => store.setCustomBackgroundColor(hex)}"
                        ></button>
                      `
                    )}
                  </div>
                </div>
              </div>
            `
          : ''}

        <!-- Accent Colors -->
        <div class="section-card">
          <div class="section-title">${t.settings.accentColor}</div>
          <div class="accent-swatches">
            ${accentOptions.map(
              (acc) => html`
                <div
                  class="accent-swatch ${this.custom.accentColor === acc.key && !this.custom.themeOverrides?.[activeTheme]?.accentPrimary ? 'is-active' : ''}"
                  style="background-color: ${acc.color}; --swatch-color: ${acc.color};"
                  @click="${() => store.setAccentColor(acc.key)}"
                  title="${acc.name}"
                >
                  ${this.custom.accentColor === acc.key && !this.custom.themeOverrides?.[activeTheme]?.accentPrimary ? '✓' : ''}
                </div>
              `
            )}
          </div>
        </div>

        <!-- Density Mode -->
        <div class="section-card">
          <div class="section-title">${t.settings.density}</div>
          <div class="options-grid">
            <div
              class="option-card ${this.custom.density === 'comfortable' ? 'is-active' : ''}"
              @click="${() => store.setDensity('comfortable')}"
            >
              <div class="option-card-header">
                <span>${t.settings.densityComfortable}</span>
                ${this.custom.density === 'comfortable' ? '✓' : ''}
              </div>
              <p class="option-card-desc">
                ${isRu
                  ? 'Стандартные просторные отступы для максимальной читаемости'
                  : 'Standard balanced spacing for comfortable reading'}
              </p>
            </div>

            <div
              class="option-card ${this.custom.density === 'compact' ? 'is-active' : ''}"
              @click="${() => store.setDensity('compact')}"
            >
              <div class="option-card-header">
                <span>${t.settings.densityCompact}</span>
                ${this.custom.density === 'compact' ? '✓' : ''}
              </div>
              <p class="option-card-desc">
                ${isRu
                  ? 'Уменьшенные отступы и строки для профессионалов и плотных таблиц'
                  : 'Tighter spacing and rows for high-density workflows'}
              </p>
            </div>
          </div>
        </div>

        <!-- Language -->
        <div class="section-card">
          <div class="section-title">${t.settings.language}</div>
          <div class="options-grid">
            <div
              class="option-card ${this.custom.language === 'ru' ? 'is-active' : ''}"
              @click="${() => store.setLanguage('ru')}"
            >
              <div class="option-card-header">
                <span>${t.settings.langRu}</span>
                ${this.custom.language === 'ru' ? '✓' : ''}
              </div>
              <p class="option-card-desc">Полная русскоязычная локализация интерфейса</p>
            </div>

            <div
              class="option-card ${this.custom.language === 'en' ? 'is-active' : ''}"
              @click="${() => store.setLanguage('en')}"
            >
              <div class="option-card-header">
                <span>${t.settings.langEn}</span>
                ${this.custom.language === 'en' ? '✓' : ''}
              </div>
              <p class="option-card-desc">Global English interface translation</p>
            </div>
          </div>
        </div>

        <!-- Default View -->
        <div class="section-card">
          <div class="section-title">${t.settings.defaultView}</div>
          <div class="options-grid">
            ${viewsList.map(
              (v) => html`
                <div
                  class="option-card ${this.custom.defaultView === v.id ? 'is-active' : ''}"
                  @click="${() => store.updateCustomization({ defaultView: v.id })}"
                >
                  <div class="option-card-header">
                    <span>${v.label}</span>
                    ${this.custom.defaultView === v.id ? '✓' : ''}
                  </div>
                </div>
              `
            )}
          </div>
        </div>

        <!-- Reset Actions -->
        <div class="actions-footer">
          <app-button variant="outline" @click="${() => store.resetCustomization()}">
            ${t.settings.resetDefaults}
          </app-button>
        </div>
      </div>
    `;
  }
}

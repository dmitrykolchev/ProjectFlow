import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { AccentColor, ActiveView, BackgroundPreset, ThemeBaseColors, ThemeMode } from '../../../types';
import { getTranslation } from '../../../i18n';
import { iconAlertTriangle, iconCheck, iconCpu, iconDashboard, iconRefreshCw, iconTable } from '../../common/icons';
import { DEFAULT_AI_ENDPOINT, fetchAvailableModels, formatAiError } from '../../../services/openai-client';
import { eventValue } from '../../common/event-value';
import { CARD_GRID_PAGE_SIZE_OPTIONS, TABLE_PAGE_SIZE_OPTIONS } from '../../common/paginate';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-page-header/app-page-header';
import '../../common/app-section-card/app-section-card';
import styles from './app-settings.css';

interface BasePaletteOption {
  nameKey:
    | 'deepIndigo'
    | 'emeraldNight'
    | 'amberGraphite'
    | 'crystalSlate'
    | 'warmIvory'
    | 'arcticTeal'
    | 'nightCityNeon'
    | 'acidLime'
    | 'laserCyan'
    | 'zionMainframe'
    | 'codeRain'
    | 'redPill';
  colors: ThemeBaseColors;
}

const CURATED_BASE_PALETTES: Record<ThemeMode, BasePaletteOption[]> = {
  dark: [
    {
      nameKey: 'deepIndigo',
      colors: { bgCanvas: '#090d16', bgSurface: '#111827', textPrimary: '#f8fafc', accentPrimary: '#6366f1', borderSubtle: '#1e293b' },
    },
    {
      nameKey: 'emeraldNight',
      colors: { bgCanvas: '#06120f', bgSurface: '#0c1c18', textPrimary: '#ecfdf5', accentPrimary: '#10b981', borderSubtle: '#193830' },
    },
    {
      nameKey: 'amberGraphite',
      colors: { bgCanvas: '#111014', bgSurface: '#1b181f', textPrimary: '#faf8f5', accentPrimary: '#f59e0b', borderSubtle: '#2f2936' },
    },
  ],
  light: [
    {
      nameKey: 'crystalSlate',
      colors: { bgCanvas: '#f8fafc', bgSurface: '#ffffff', textPrimary: '#0f172a', accentPrimary: '#6366f1', borderSubtle: '#e2e8f0' },
    },
    {
      nameKey: 'warmIvory',
      colors: { bgCanvas: '#f6f3ec', bgSurface: '#fdfcf9', textPrimary: '#241f18', accentPrimary: '#d97706', borderSubtle: '#e3dccf' },
    },
    {
      nameKey: 'arcticTeal',
      colors: { bgCanvas: '#eef7f9', bgSurface: '#ffffff', textPrimary: '#0b2530', accentPrimary: '#0891b2', borderSubtle: '#cde3ea' },
    },
  ],
  cyberpunk: [
    {
      nameKey: 'nightCityNeon',
      colors: { bgCanvas: '#06040f', bgSurface: '#0d0a1f', textPrimary: '#f4f6ff', accentPrimary: '#ff2a85', borderSubtle: '#1e2d5e' },
    },
    {
      nameKey: 'acidLime',
      colors: { bgCanvas: '#040d09', bgSurface: '#081812', textPrimary: '#eafff3', accentPrimary: '#00ffa3', borderSubtle: '#144734' },
    },
    {
      nameKey: 'laserCyan',
      colors: { bgCanvas: '#030816', bgSurface: '#081129', textPrimary: '#eefaff', accentPrimary: '#00d9ff', borderSubtle: '#173866' },
    },
  ],
  matrix: [
    {
      nameKey: 'zionMainframe',
      colors: { bgCanvas: '#020603', bgSurface: '#050e08', textPrimary: '#dcfce7', accentPrimary: '#00ff41', borderSubtle: '#11331d' },
    },
    {
      nameKey: 'codeRain',
      colors: { bgCanvas: '#030906', bgSurface: '#07160e', textPrimary: '#d1fae5', accentPrimary: '#22c55e', borderSubtle: '#134029' },
    },
    {
      nameKey: 'redPill',
      colors: { bgCanvas: '#080305', bgSurface: '#13080c', textPrimary: '#ffe4e6', accentPrimary: '#f43f5e', borderSubtle: '#451422' },
    },
  ],
};

@customElement('app-settings')
export class AppSettings extends LitElement {
  @state() private custom = { ...store.customization };
  @state() private currentLang = store.customization.language;
  @state() private aiTesting = false;
  @state() private detectedModels: string[] = [];
  @state() private aiStatusKind: 'none' | 'ok' | 'warn' | 'error' = 'none';
  @state() private aiStatusMessage = '';

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
    const isMatrix = activeTheme === 'matrix';

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
      { id: 'projects', label: t.navigation.projects },
      { id: 'kanban', label: t.navigation.kanban },
      { id: 'gantt', label: t.navigation.gantt },
      { id: 'grid', label: t.navigation.grid },
      { id: 'calendar', label: t.navigation.calendar },
      { id: 'analytics', label: t.navigation.analytics },
      { id: 'companies', label: t.navigation.companies },
      { id: 'employees', label: t.navigation.employees },
      { id: 'counterparties', label: t.navigation.counterparties },
      { id: 'contracts', label: t.navigation.contracts },
      { id: 'calculations', label: t.navigation.calculations },
      { id: 'payments', label: t.navigation.payments },
      { id: 'time-tracking', label: t.navigation.timeTracking },
      { id: 'expenses', label: t.navigation.expenses },
    ];

    const curatedPalettes = CURATED_BASE_PALETTES[activeTheme];

    return html`
      <div class="settings-container">
        <app-page-header title="${t.settings.title}" subtitle="${t.settings.subtitle}"></app-page-header>

        <!-- Theme Mode -->
        <app-section-card variant="panel" title="${t.settings.theme}">
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
                ${t.viewTexts.settings.darkDesc}
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
                ${t.viewTexts.settings.lightDesc}
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

            <div
              class="option-card is-matrix ${isMatrix ? 'is-active' : ''}"
              @click="${() => store.setTheme('matrix')}"
            >
              <div class="theme-mini-strip">
                <span style="background: #020603;"></span>
                <span style="background: #050e08;"></span>
                <span style="background: #00ff41;"></span>
              </div>
              <div class="option-card-header">
                <span>${t.settings.themeMatrix}</span>
                ${isMatrix ? '✓' : ''}
              </div>
              <p class="option-card-desc">${t.settings.themeMatrixDesc}</p>
            </div>
          </div>
        </app-section-card>

        <!-- Customize Active Theme via Base Colors -->
        <app-section-card variant="panel" title="${t.settings.baseColorsTitle}">
          ${hasOverrides
            ? html`
                <div slot="actions">
                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => store.resetThemeBaseColors(activeTheme)}"
                  >
                    ${t.settings.resetThemeColors}
                  </app-button>
                </div>
              `
            : ''}
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
                    <span>${t.viewTexts.settings.accentNames[pal.nameKey]}</span>
                  </button>
                `
              )}
            </div>
          </div>
        </app-section-card>

        <!-- Background Theme Palette & Custom Color (Dark / Light) -->
        ${!isCyberpunk && !isMatrix
          ? html`
              <app-section-card variant="panel" title="${t.settings.background}">
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
              </app-section-card>
            `
          : ''}

        <!-- Accent Colors -->
        <app-section-card variant="panel" title="${t.settings.accentColor}">
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
        </app-section-card>

        <!-- Density Mode -->
        <app-section-card variant="panel" title="${t.settings.density}">
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
                ${t.viewTexts.settings.comfortableDesc}
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
                ${t.viewTexts.settings.compactDesc}
              </p>
            </div>
          </div>
        </app-section-card>

        <!-- Language -->
        <app-section-card variant="panel" title="${t.settings.language}">
          <div class="options-grid">
            <div
              class="option-card ${this.custom.language === 'ru' ? 'is-active' : ''}"
              @click="${() => store.setLanguage('ru')}"
            >
              <div class="option-card-header">
                <span>${t.settings.langRu}</span>
                ${this.custom.language === 'ru' ? '✓' : ''}
              </div>
              <p class="option-card-desc">${t.viewTexts.settings.langRuDesc}</p>
            </div>

            <div
              class="option-card ${this.custom.language === 'en' ? 'is-active' : ''}"
              @click="${() => store.setLanguage('en')}"
            >
              <div class="option-card-header">
                <span>${t.settings.langEn}</span>
                ${this.custom.language === 'en' ? '✓' : ''}
              </div>
              <p class="option-card-desc">${t.viewTexts.settings.langEnDesc}</p>
            </div>
          </div>
        </app-section-card>

        <!-- Default View -->
        <app-section-card variant="panel" title="${t.settings.defaultView}">
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
        </app-section-card>

        <!-- Sidebar Group Expand Mode -->
        <app-section-card variant="panel" title="${t.settings.sidebarGroupMode}">
          <div class="options-grid">
            <div
              class="option-card ${this.custom.sidebarGroupMode === 'single' ? 'is-active' : ''}"
              @click="${() => store.setSidebarGroupMode('single')}"
            >
              <div class="option-card-header">
                <span>${t.settings.sidebarGroupSingle}</span>
                ${this.custom.sidebarGroupMode === 'single' ? '✓' : ''}
              </div>
              <p class="option-card-desc">${t.settings.sidebarGroupSingleDesc}</p>
            </div>

            <div
              class="option-card ${this.custom.sidebarGroupMode === 'multiple' ? 'is-active' : ''}"
              @click="${() => store.setSidebarGroupMode('multiple')}"
            >
              <div class="option-card-header">
                <span>${t.settings.sidebarGroupMultiple}</span>
                ${this.custom.sidebarGroupMode === 'multiple' ? '✓' : ''}
              </div>
              <p class="option-card-desc">${t.settings.sidebarGroupMultipleDesc}</p>
            </div>
          </div>
        </app-section-card>

        <!-- Pagination Defaults (Tables vs Card Grids) -->
        <app-section-card variant="panel" title="${t.settings.paginationTitle}">
          <p class="section-desc">${t.settings.paginationDesc}</p>
          <div class="pagination-settings-grid">
            <div class="pagination-mode-box">
              <div class="pagination-mode-head">
                <span class="pagination-mode-icon">${iconTable(15)}</span>
                <span>${t.settings.paginationTableLabel}</span>
              </div>
              <p class="pagination-mode-desc">${t.settings.paginationTableDesc}</p>
              <div class="page-size-pills">
                ${TABLE_PAGE_SIZE_OPTIONS.map(
                  (size) => html`
                    <button
                      type="button"
                      class="page-size-pill ${this.custom.tablePageSize === size ? 'is-active' : ''}"
                      @click="${() => store.setTablePageSize(size)}"
                    >
                      ${size}
                    </button>
                  `
                )}
              </div>
            </div>

            <div class="pagination-mode-box">
              <div class="pagination-mode-head">
                <span class="pagination-mode-icon">${iconDashboard(15)}</span>
                <span>${t.settings.paginationCardsLabel}</span>
              </div>
              <p class="pagination-mode-desc">${t.settings.paginationCardsDesc}</p>
              <div class="page-size-pills">
                ${CARD_GRID_PAGE_SIZE_OPTIONS.map(
                  (size) => html`
                    <button
                      type="button"
                      class="page-size-pill ${this.custom.cardGridPageSize === size ? 'is-active' : ''}"
                      @click="${() => store.setCardGridPageSize(size)}"
                    >
                      ${size}
                    </button>
                  `
                )}
              </div>
            </div>
          </div>
        </app-section-card>

        <!-- OpenAI-compatible AI Endpoint Settings (no API key fields) -->
        <app-section-card variant="panel" title="${t.viewTexts.ai.settingsTitle}">
          <span slot="icon">${iconCpu(17)}</span>
          <p class="section-desc">${t.viewTexts.ai.settingsDesc}</p>

          <div class="ai-settings-grid">
            <div class="ai-field-group">
              <app-input
                label="${t.viewTexts.ai.endpointLabel}"
                placeholder="${t.viewTexts.ai.endpointPlaceholder}"
                hint="${t.viewTexts.ai.endpointHint}"
                .value="${this.custom.aiEndpoint || DEFAULT_AI_ENDPOINT}"
                @input="${(e: CustomEvent<{ value: string }>) => {
                  store.updateCustomization({ aiEndpoint: eventValue(e) });
                  this.aiStatusKind = 'none';
                  this.aiStatusMessage = '';
                }}"
              ></app-input>
            </div>

            <div class="ai-field-group">
              <app-input
                label="${t.viewTexts.ai.modelLabel}"
                placeholder="${t.viewTexts.ai.modelPlaceholder}"
                hint="${t.viewTexts.ai.modelAutoHint}"
                .value="${this.custom.aiModel || ''}"
                @input="${(e: CustomEvent<{ value: string }>) => {
                  store.updateCustomization({ aiModel: eventValue(e) });
                }}"
              ></app-input>
            </div>
          </div>

          <div class="ai-actions-bar">
            <app-button
              size="sm"
              variant="secondary"
              ?disabled="${this.aiTesting}"
              @click="${this.handleDetectModels}"
            >
              <span slot="icon-start">${iconRefreshCw(14)}</span>
              <span>
                ${this.aiTesting
                  ? t.viewTexts.ai.testingConnection
                  : t.viewTexts.ai.detectModelsBtn}
              </span>
            </app-button>

            <app-button
              size="sm"
              variant="ghost"
              @click="${() => {
                store.updateCustomization({ aiEndpoint: DEFAULT_AI_ENDPOINT, aiModel: '' });
                this.detectedModels = [];
                this.aiStatusKind = 'none';
                this.aiStatusMessage = '';
              }}"
            >
              ${t.viewTexts.ai.resetEndpointBtn}
            </app-button>
          </div>

          ${this.detectedModels.length > 0
            ? html`
                <div class="ai-models-row">
                  <span class="ai-models-label">${t.viewTexts.ai.availableModelsLabel}</span>
                  ${this.detectedModels.map(
                    (m) => html`
                      <button
                        type="button"
                        class="ai-model-chip ${this.custom.aiModel === m ? 'is-active' : ''}"
                        @click="${() => store.updateCustomization({ aiModel: m })}"
                      >
                        ${m}
                      </button>
                    `
                  )}
                </div>
              `
            : ''}

          ${this.aiStatusKind !== 'none'
            ? html`
                <div class="ai-status-banner is-${this.aiStatusKind}">
                  <span style="flex-shrink: 0; margin-top: 1px;">
                    ${this.aiStatusKind === 'ok' ? iconCheck(15) : iconAlertTriangle(15)}
                  </span>
                  <span>${this.aiStatusMessage}</span>
                </div>
              `
            : ''}
        </app-section-card>

        <!-- Reset Actions -->
        <div class="actions-footer">
          <app-button variant="outline" @click="${() => store.resetCustomization()}">
            ${t.settings.resetDefaults}
          </app-button>
        </div>
      </div>
    `;
  }

  private async handleDetectModels() {
    const t = getTranslation(this.currentLang);
    const endpoint = this.custom.aiEndpoint || DEFAULT_AI_ENDPOINT;
    this.aiTesting = true;
    this.aiStatusKind = 'none';
    this.aiStatusMessage = '';

    try {
      const models = await fetchAvailableModels(endpoint);
      this.detectedModels = models;
      if (models.length > 0) {
        if (!this.custom.aiModel?.trim()) {
          store.updateCustomization({ aiModel: models[0] });
        }
        this.aiStatusKind = 'ok';
        this.aiStatusMessage = t.viewTexts.ai.connectionOk(models.length, this.custom.aiModel || models[0]);
      } else {
        this.aiStatusKind = 'warn';
        this.aiStatusMessage = t.viewTexts.ai.noModelsFound;
      }
    } catch (err) {
      this.detectedModels = [];
      this.aiStatusKind = 'error';
      this.aiStatusMessage = formatAiError(err, endpoint, t);
    } finally {
      this.aiTesting = false;
    }
  }
}

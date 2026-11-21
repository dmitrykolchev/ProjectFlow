import { LitElement, TemplateResult, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { createRef, ref } from 'lit/directives/ref.js';
import { getTranslation } from '../../../i18n';
import { store } from '../../../state/store';
import { SupportedLang } from '../../../types';
import { PortalHandle, portalManager } from '../app-modal-portal/app-modal-portal';
import '../app-button/app-button';
import { DeclarativeOption, OptionDataSource, optionsFromElements, resolveDataSource } from '../app-option/app-option';
import { iconCheck, iconChevronDown, iconSearch, iconX } from '../icons';
import styles from './app-entity-selector.css';

export interface EntitySelectorOption {
  value: string;
  label: string;
  code?: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  badgeColor?: string;
  avatar?: string;
  color?: string;
  keywords?: string[];
  disabled?: boolean;
  // cloned graphic content from the canonical start / end slots of <app-option>
  start?: Node[];
  end?: Node[];
}

export type EntitySelectorSize = 'sm' | 'md' | 'lg';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@customElement('app-entity-selector')
export class AppEntitySelector extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: String }) value: string = '';
  @property({ type: Array }) options: EntitySelectorOption[] = [];
  // declarative <app-option> children and data sources fill the list as well:
  // array, promise, or a function returning an array (sync or async)
  @property({ type: Object, attribute: false }) dataSource?: OptionDataSource;
  @property({ type: String }) placeholder: string = '';
  @property({ type: String, attribute: 'search-placeholder' }) searchPlaceholder: string = '';
  @property({ type: String }) size: EntitySelectorSize = 'md';
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: Boolean }) required: boolean = false;
  @property({ type: Boolean }) clearable: boolean = false;
  @property({ type: Boolean, attribute: 'show-selected-details' }) showSelectedDetails: boolean = true;
  @property({ type: Number, attribute: 'max-visible' }) maxVisible: number = 80;
  @property({ type: String }) error: string = '';
  @property({ type: String }) hint: string = '';

  @state() private currentLang: SupportedLang = store.customization.language;
  @state() private isOpen: boolean = false;
  @state() private declarativeOptions: DeclarativeOption[] = [];
  @state() private resolvedOptions: DeclarativeOption[] = [];
  private loadedSource: OptionDataSource | undefined;
  @state() private searchQuery: string = '';
  @state() private activeIndex: number = -1;
  @state() private visibleLimit: number = 80;

  @state() private panelLeft: number = 0;
  @state() private panelWidth: number = 320;
  @state() private panelTop: number | null = null;
  @state() private panelBottom: number | null = null;
  @state() private panelMaxHeight: number = 340;

  private portalHandle: PortalHandle | null = null;
  private unsubscribe?: () => void;
  private triggerRef = createRef<HTMLDivElement>();
  private searchInputRef = createRef<HTMLInputElement>();
  private optionsListRef = createRef<HTMLDivElement>();
  private shouldFocusSearchOnMount = false;
  private shouldScrollActiveIntoView = false;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.visibleLimit = this.effectiveStep;
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
    window.addEventListener('resize', this.handleReposition);
    window.addEventListener('scroll', this.handleWindowScroll, { capture: true, passive: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
    window.removeEventListener('resize', this.handleReposition);
    window.removeEventListener('scroll', this.handleWindowScroll, { capture: true });
    this.closePortal();
  }

  private get effectiveStep(): number {
    return this.maxVisible > 0 ? this.maxVisible : 80;
  }

  private handleReposition = () => {
    if (this.isOpen) {
      this.updateDropdownPosition();
    }
  };

  private handleWindowScroll = (e: Event) => {
    if (!this.isOpen) return;
    const listEl = this.optionsListRef.value;
    if (listEl && e.composedPath().includes(listEl)) return;
    this.updateDropdownPosition();
  };

  private updateDropdownPosition() {
    const trigger =
      this.triggerRef.value ||
      (this.shadowRoot?.querySelector('.selector-trigger') as HTMLElement | null);
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const maxDesired = 360;
    const desiredWidth = Math.max(rect.width, Math.min(400, window.innerWidth - 16));
    const clampedWidth = Math.min(desiredWidth, window.innerWidth - 16);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - clampedWidth - 8));

    this.panelLeft = left;
    this.panelWidth = clampedWidth;

    if (spaceBelow >= 190 || spaceBelow >= spaceAbove) {
      this.panelTop = rect.bottom + 4;
      this.panelBottom = null;
      this.panelMaxHeight = Math.max(150, Math.min(maxDesired, spaceBelow));
    } else {
      this.panelTop = null;
      this.panelBottom = window.innerHeight - rect.top + 4;
      this.panelMaxHeight = Math.max(150, Math.min(maxDesired, spaceAbove));
    }
  }

  // options from the prop, declarative <app-option> children, and the data source
  private allOptions(): EntitySelectorOption[] {
    return [...this.options, ...this.declarativeOptions, ...this.resolvedOptions];
  }

  private handleSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this.declarativeOptions = optionsFromElements(
      slot.assignedElements({ flatten: true }) as HTMLElement[]
    );
  }

  private async loadDataSource() {
    const source = this.dataSource;
    const result = await resolveDataSource(source);
    // ignore a stale response if the source changed while loading
    if (this.dataSource === source) {
      this.resolvedOptions = result;
    }
  }

  private getTokens(): string[] {
    return this.searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  private getFilteredOptions(): EntitySelectorOption[] {
    const tokens = this.getTokens();
    if (tokens.length === 0) return this.allOptions();

    const exactMatches: EntitySelectorOption[] = [];
    const prefixMatches: EntitySelectorOption[] = [];
    const otherMatches: EntitySelectorOption[] = [];
    const fullQuery = tokens.join(' ');

    for (const opt of this.allOptions()) {
      const code = (opt.code || '').toLowerCase();
      const label = opt.label.toLowerCase();
      const haystack = [
        label,
        code,
        (opt.subtitle || '').toLowerCase(),
        (opt.meta || '').toLowerCase(),
        (opt.badge || '').toLowerCase(),
        opt.value.toLowerCase(),
        ...(opt.keywords || []).map((k) => k.toLowerCase()),
      ].join(' ');

      let matchesAll = true;
      for (const token of tokens) {
        if (!haystack.includes(token)) {
          matchesAll = false;
          break;
        }
      }
      if (!matchesAll) continue;

      if (code === fullQuery || label === fullQuery) {
        exactMatches.push(opt);
      } else if (code.startsWith(tokens[0]) || label.startsWith(tokens[0])) {
        prefixMatches.push(opt);
      } else {
        otherMatches.push(opt);
      }
    }

    return [...exactMatches, ...prefixMatches, ...otherMatches];
  }

  private openDropdown(initialQuery = '') {
    if (this.disabled) return;
    this.searchQuery = initialQuery;
    this.visibleLimit = this.effectiveStep;
    this.updateDropdownPosition();

    const filtered = this.getFilteredOptions();
    const selectedIdx = filtered.findIndex((o) => o.value === this.value && !o.disabled);
    if (selectedIdx >= 0) {
      this.activeIndex = selectedIdx;
      if (selectedIdx >= this.visibleLimit) {
        this.visibleLimit = selectedIdx + 20;
      }
    } else {
      this.activeIndex = filtered.findIndex((o) => !o.disabled);
    }

    this.shouldFocusSearchOnMount = true;
    this.shouldScrollActiveIntoView = true;
    this.isOpen = true;

    if (initialQuery) {
      this.dispatchSearchChange();
    }
  }

  private closeDropdown(restoreTriggerFocus = false) {
    this.isOpen = false;
    this.searchQuery = '';
    this.activeIndex = -1;
    this.closePortal();
    if (restoreTriggerFocus) {
      requestAnimationFrame(() => this.triggerRef.value?.focus());
    }
  }

  private closePortal() {
    if (this.portalHandle) {
      this.portalHandle.close();
      this.portalHandle = null;
    }
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('dataSource') && this.dataSource !== this.loadedSource) {
      this.loadedSource = this.dataSource;
      void this.loadDataSource();
    }
    if (this.isOpen && !this.disabled) {
      const filtered = this.getFilteredOptions();
      const visibleOptions = filtered.slice(0, this.visibleLimit);
      if (this.activeIndex >= visibleOptions.length) {
        this.activeIndex = visibleOptions.findIndex((o) => !o.disabled);
      }

      const template = this.renderDropdownPanel(filtered, visibleOptions);
      if (!this.portalHandle) {
        this.portalHandle = portalManager.mountTemplate({
          kind: 'popup',
          styles,
          template,
          host: this,
          closeOnBackdrop: true,
          onClose: () => this.closeDropdown(true),
        });
      } else {
        this.portalHandle.update(template);
      }

      if (this.shouldFocusSearchOnMount) {
        this.shouldFocusSearchOnMount = false;
        requestAnimationFrame(() => {
          const input = this.searchInputRef.value;
          if (input) {
            input.focus();
            const len = input.value.length;
            input.setSelectionRange(len, len);
          }
        });
      }

      if (this.shouldScrollActiveIntoView) {
        this.shouldScrollActiveIntoView = false;
        requestAnimationFrame(() => this.scrollActiveRowIntoView());
      }
    } else {
      this.closePortal();
    }
  }

  private scrollActiveRowIntoView() {
    const listEl = this.optionsListRef.value;
    if (!listEl || this.activeIndex < 0) return;
    const activeRow = listEl.querySelector(`[data-option-index="${this.activeIndex}"]`) as HTMLElement | null;
    if (activeRow) {
      activeRow.scrollIntoView({ block: 'nearest' });
    }
  }

  private renderHighlighted(text: string, tokens: string[]): TemplateResult | string {
    if (!text || tokens.length === 0) return text;
    const uniqueTokens = Array.from(new Set(tokens)).sort((a, b) => b.length - a.length);
    const pattern = uniqueTokens.map(escapeRegExp).join('|');
    if (!pattern) return text;

    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);
    if (parts.length <= 1) return text;

    return html`${parts.map((part, idx) =>
      idx % 2 === 1 ? html`<mark class="match-hl">${part}</mark>` : part
    )}`;
  }

  private renderDropdownPanel(
    filtered: EntitySelectorOption[],
    visibleOptions: EntitySelectorOption[]
  ): TemplateResult {
    const t = getTranslation(this.currentLang);
    const tokens = this.getTokens();
    const searchPh = this.searchPlaceholder || t.entitySelector.searchPlaceholder;
    const remaining = Math.max(0, filtered.length - visibleOptions.length);
    const stepSize = Math.min(this.effectiveStep, remaining);

    const panelStyle =
      this.panelBottom !== null
        ? `left: ${this.panelLeft}px; width: ${this.panelWidth}px; bottom: ${this.panelBottom}px; top: auto; max-height: ${this.panelMaxHeight}px;`
        : `left: ${this.panelLeft}px; width: ${this.panelWidth}px; top: ${this.panelTop ?? 0}px; bottom: auto; max-height: ${this.panelMaxHeight}px;`;

    return html`
      <div class="dropdown-panel" style="${panelStyle}" @keydown="${this.handlePanelKeydown}">
        <div class="search-header">
          <span class="search-icon">${iconSearch(15)}</span>
          <input
            ${ref(this.searchInputRef)}
            type="text"
            class="search-input"
            placeholder="${searchPh}"
            .value="${this.searchQuery}"
            @input="${this.handleSearchInput}"
          />
          <span class="search-count">${filtered.length} / ${this.allOptions().length}</span>
          ${this.searchQuery
            ? html`
                <app-button
                  class="search-clear-btn"
                  size="xs"
                  variant="icon"
                  title="${t.entitySelector.resetSearch}"
                  aria-label="${t.entitySelector.resetSearch}"
                  @mousedown="${(e: MouseEvent) => e.preventDefault()}"
                  @click="${() => this.resetSearch(true)}"
                >
                  <span slot="start">${iconX(13)}</span>
                </app-button>
              `
            : ''}
        </div>

        <div class="options-list" ${ref(this.optionsListRef)} role="listbox">
          ${visibleOptions.length === 0
            ? html`
                <div class="empty-box">
                  <span>
                    ${this.allOptions().length === 0
                      ? t.entitySelector.emptyOptions
                      : t.entitySelector.noMatches}
                  </span>
                  ${this.searchQuery
                    ? html`
                        <button
                          type="button"
                          class="empty-reset-btn"
                          @mousedown="${(e: MouseEvent) => e.preventDefault()}"
                          @click="${() => this.resetSearch(true)}"
                        >
                          ${t.entitySelector.resetSearch}
                        </button>
                      `
                    : ''}
                </div>
              `
            : visibleOptions.map((opt, idx) => {
                const isSelected = opt.value === this.value;
                const isActive = idx === this.activeIndex;
                return html`
                  <div
                    role="option"
                    aria-selected="${isSelected ? 'true' : 'false'}"
                    data-option-index="${idx}"
                    class="option-row ${isSelected ? 'is-selected' : ''} ${isActive ? 'is-active' : ''} ${opt.disabled ? 'is-disabled' : ''}"
                    @mouseenter="${() => {
                      if (!opt.disabled) this.activeIndex = idx;
                    }}"
                    @mousedown="${(e: MouseEvent) => e.preventDefault()}"
                    @click="${() => {
                      if (!opt.disabled) this.selectOption(opt);
                    }}"
                  >
                    <div class="option-left">
                      ${opt.avatar
                        ? html`<span class="option-avatar">${opt.avatar}</span>`
                        : opt.color
                        ? html`<span class="dot-indicator" style="background-color: ${opt.color};"></span>`
                        : ''}
                      ${opt.start ? html`<span class="option-slot-start">${opt.start}</span>` : ''}
                      <div class="option-body">
                        <div class="option-title-line">
                          ${opt.code
                            ? html`<span class="code-tag">${this.renderHighlighted(opt.code, tokens)}</span>`
                            : ''}
                          <span class="option-label">${this.renderHighlighted(opt.label, tokens)}</span>
                        </div>
                        ${opt.subtitle
                          ? html`<div class="option-subtitle">${this.renderHighlighted(opt.subtitle, tokens)}</div>`
                          : ''}
                      </div>
                    </div>

                    <div class="option-right">
                      ${opt.meta ? html`<span class="option-meta">${opt.meta}</span>` : ''}
                      ${opt.badge
                        ? html`
                            <span class="option-badge">
                              <span
                                class="option-badge-dot"
                                style="${opt.badgeColor ? `background-color: ${opt.badgeColor};` : ''}"
                              ></span>
                              <span>${opt.badge}</span>
                            </span>
                          `
                        : ''}
                      ${opt.end ? html`<span class="option-slot-end">${opt.end}</span>` : ''}
                      ${isSelected ? html`<span class="option-check">${iconCheck(14)}</span>` : ''}
                    </div>
                  </div>
                `;
              })}
        </div>

        ${filtered.length > visibleOptions.length
          ? html`
              <div class="panel-footer">
                <span class="footer-summary">
                  ${t.entitySelector.showingCount(visibleOptions.length, filtered.length)} · ${t.entitySelector.refineHint}
                </span>
                <button
                  type="button"
                  class="load-more-btn"
                  @mousedown="${(e: MouseEvent) => e.preventDefault()}"
                  @click="${() => {
                    this.visibleLimit += this.effectiveStep;
                  }}"
                >
                  ${t.entitySelector.loadMore(stepSize)}
                </button>
              </div>
            `
          : filtered.length > 0 && this.allOptions().length > 20
          ? html`
              <div class="panel-footer">
                <span class="footer-summary">
                  ${t.entitySelector.showingCount(visibleOptions.length, filtered.length)}
                </span>
              </div>
            `
          : ''}
      </div>
    `;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const selectedOpt = this.allOptions().find((o) => o.value === this.value) || null;
    const ph = this.placeholder || t.entitySelector.placeholder;
    const showClear = this.clearable && Boolean(this.value) && !this.disabled;

    return html`
      <div class="form-group">
        ${this.label
          ? html`
              <label>
                <span>${this.label}</span>
                ${this.required ? html`<span class="required-star">*</span>` : ''}
              </label>
            `
          : ''}

        <div
          ${ref(this.triggerRef)}
          class="selector-trigger size-${this.size} ${this.isOpen ? 'is-open' : ''} ${this.disabled ? 'is-disabled' : ''} ${this.error ? 'has-error' : ''}"
          tabindex="${this.disabled ? -1 : 0}"
          role="combobox"
          aria-expanded="${this.isOpen ? 'true' : 'false'}"
          aria-haspopup="listbox"
          @click="${this.handleTriggerClick}"
          @keydown="${this.handleTriggerKeydown}"
        >
          <div class="trigger-content">
            ${selectedOpt
              ? html`
                  ${selectedOpt.avatar
                    ? html`<span class="avatar-badge">${selectedOpt.avatar}</span>`
                    : selectedOpt.color
                    ? html`<span class="dot-indicator" style="background-color: ${selectedOpt.color};"></span>`
                    : ''}
                  ${selectedOpt.code
                    ? html`<span class="code-tag">${selectedOpt.code}</span>`
                    : ''}
                  <div class="trigger-text-wrap">
                    <span class="trigger-label">${selectedOpt.label}</span>
                    ${this.showSelectedDetails && this.size !== 'sm' && selectedOpt.subtitle
                      ? html`<span class="trigger-subtitle">· ${selectedOpt.subtitle}</span>`
                      : ''}
                  </div>
                  ${this.showSelectedDetails && this.size !== 'sm' && selectedOpt.meta
                    ? html`<span class="trigger-meta">${selectedOpt.meta}</span>`
                    : ''}
                `
              : html`<span class="trigger-placeholder">${ph}</span>`}
          </div>

          <div class="trigger-actions">
            ${showClear
              ? html`
                  <app-button
                    class="clear-btn"
                    size="xs"
                    variant="icon"
                    title="${t.entitySelector.clearSelection}"
                    aria-label="${t.entitySelector.clearSelection}"
                    @click="${this.handleClearClick}"
                  >
                    <span slot="start">${iconX(12)}</span>
                  </app-button>
                `
              : ''}
            <span class="chevron">${iconChevronDown(14)}</span>
          </div>
        </div>

        ${this.error
          ? html`<span class="error-text">${this.error}</span>`
          : this.hint
          ? html`<span class="helper-text">${this.hint}</span>`
          : ''}

        <!-- declarative <app-option> children -->
        <slot @slotchange="${this.handleSlotChange}"></slot>
      </div>
    `;
  }

  private handleTriggerClick() {
    if (this.disabled) return;
    if (this.isOpen) {
      this.closeDropdown(false);
    } else {
      this.openDropdown();
    }
  }

  private handleClearClick(e: MouseEvent) {
    e.stopPropagation();
    if (this.disabled) return;
    this.value = '';
    this.dispatchChange(null);
    if (this.isOpen) {
      this.activeIndex = -1;
    }
  }

  private handleTriggerKeydown(e: KeyboardEvent) {
    if (this.disabled) return;

    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!this.isOpen) {
        this.openDropdown();
      }
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (this.clearable && this.value) {
        e.preventDefault();
        this.value = '';
        this.dispatchChange(null);
      }
      return;
    }

    // Type-ahead on focused trigger opens dropdown with initial character
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.openDropdown(e.key);
    }
  }

  private handleSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.searchQuery = val;
    this.visibleLimit = this.effectiveStep;
    const filtered = this.getFilteredOptions();
    this.activeIndex = filtered.findIndex((o) => !o.disabled);
    this.shouldScrollActiveIntoView = true;
    this.dispatchSearchChange();
  }

  private resetSearch(focusInput = false) {
    this.searchQuery = '';
    this.visibleLimit = this.effectiveStep;
    const filtered = this.getFilteredOptions();
    const selectedIdx = filtered.findIndex((o) => o.value === this.value && !o.disabled);
    this.activeIndex = selectedIdx >= 0 ? selectedIdx : filtered.findIndex((o) => !o.disabled);
    this.dispatchSearchChange();
    if (focusInput) {
      requestAnimationFrame(() => this.searchInputRef.value?.focus());
    }
  }

  private handlePanelKeydown(e: KeyboardEvent) {
    const filtered = this.getFilteredOptions();
    const visible = filtered.slice(0, this.visibleLimit);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (visible.length === 0) return;
      let next = this.activeIndex;
      for (let step = 0; step < visible.length; step++) {
        next = (next + 1 + visible.length) % visible.length;
        if (!visible[next].disabled) {
          this.activeIndex = next;
          this.shouldScrollActiveIntoView = true;
          return;
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (visible.length === 0) return;
      let prev = this.activeIndex < 0 ? 0 : this.activeIndex;
      for (let step = 0; step < visible.length; step++) {
        prev = (prev - 1 + visible.length) % visible.length;
        if (!visible[prev].disabled) {
          this.activeIndex = prev;
          this.shouldScrollActiveIntoView = true;
          return;
        }
      }
    } else if (e.key === 'Home') {
      if (visible.length > 0 && document.activeElement !== this.searchInputRef.value) {
        e.preventDefault();
        this.activeIndex = visible.findIndex((o) => !o.disabled);
        this.shouldScrollActiveIntoView = true;
      }
    } else if (e.key === 'End') {
      if (visible.length > 0 && document.activeElement !== this.searchInputRef.value) {
        e.preventDefault();
        for (let i = visible.length - 1; i >= 0; i--) {
          if (!visible[i].disabled) {
            this.activeIndex = i;
            this.shouldScrollActiveIntoView = true;
            break;
          }
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.activeIndex >= 0 && this.activeIndex < visible.length) {
        const chosen = visible[this.activeIndex];
        if (chosen && !chosen.disabled) {
          this.selectOption(chosen);
        }
      }
    } else if (e.key === 'Tab') {
      this.closeDropdown(false);
    }
  }

  private selectOption(opt: EntitySelectorOption) {
    this.value = opt.value;
    this.closeDropdown(true);
    this.dispatchChange(opt);
  }

  private dispatchChange(option: EntitySelectorOption | null) {
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value, option },
        bubbles: true,
        composed: true,
      })
    );
  }

  private dispatchSearchChange() {
    this.dispatchEvent(
      new CustomEvent('search-change', {
        detail: { query: this.searchQuery },
        bubbles: true,
        composed: true,
      })
    );
  }
}

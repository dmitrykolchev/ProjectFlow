import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { SupportedLang } from '../../../types';
import { iconChevronLeft, iconChevronRight, iconDashboard, iconTable } from '../icons';
import '../app-select/app-select';
import { SelectOption } from '../app-select/app-select';
import { eventValue } from '../event-value';
import {
  CARD_GRID_PAGE_SIZE_OPTIONS,
  PaginationLayoutMode,
  TABLE_PAGE_SIZE_OPTIONS,
} from '../paginate';
import styles from './app-pagination.css';

export type PaginationVariant = 'surface' | 'bare';

@customElement('app-pagination')
export class AppPagination extends LitElement {
  @property({ type: Number, attribute: 'total-items' }) totalItems: number = 0;
  @property({ type: Number }) page: number = 1;
  @property({ type: Number, attribute: 'page-size' }) pageSize: number = 10;
  @property({ type: Array }) pageSizeOptions?: number[];
  @property({ type: String, attribute: 'layout-mode' }) layoutMode: PaginationLayoutMode = 'table';
  @property({ type: String }) variant: PaginationVariant = 'surface';
  @property({ type: Boolean }) compact: boolean = false;
  @property({ type: Boolean, attribute: 'show-page-size' }) showPageSize: boolean = true;
  @property({ type: Boolean, attribute: 'show-summary' }) showSummary: boolean = true;
  @property({ type: String }) locale?: SupportedLang;

  @state() private currentLang: SupportedLang = store.customization.language;
  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private get effectiveOptions(): number[] {
    if (Array.isArray(this.pageSizeOptions) && this.pageSizeOptions.length > 0) {
      return this.pageSizeOptions;
    }
    const base =
      this.layoutMode === 'cards' ? [...CARD_GRID_PAGE_SIZE_OPTIONS] : [...TABLE_PAGE_SIZE_OPTIONS];
    if (this.pageSize > 0 && !base.includes(this.pageSize)) {
      return [...base, this.pageSize].sort((a, b) => a - b);
    }
    return base;
  }

  private buildPageTokens(currentPage: number, totalPages: number): (number | 'ellipsis-left' | 'ellipsis-right')[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const tokens: (number | 'ellipsis-left' | 'ellipsis-right')[] = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
      tokens.push('ellipsis-left');
    }
    for (let p = start; p <= end; p += 1) {
      tokens.push(p);
    }
    if (end < totalPages - 1) {
      tokens.push('ellipsis-right');
    }
    tokens.push(totalPages);

    return tokens;
  }

  private emitPageChange(nextPage: number, totalPages: number) {
    const clamped = Math.max(1, Math.min(nextPage, totalPages));
    if (clamped === this.page) return;
    this.page = clamped;
    this.dispatchEvent(
      new CustomEvent('page-change', {
        detail: { page: clamped },
        bubbles: true,
        composed: true,
      })
    );
  }

  private emitPageSizeChange(rawSize: string) {
    const nextSize = Math.max(1, parseInt(rawSize, 10) || 10);
    if (nextSize === this.pageSize) return;
    this.pageSize = nextSize;
    this.page = 1;
    this.dispatchEvent(
      new CustomEvent('page-size-change', {
        detail: { pageSize: nextSize, layoutMode: this.layoutMode },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.locale || this.currentLang);
    const safeSize = Math.max(1, Math.floor(Number(this.pageSize) || 10));
    const total = Math.max(0, Math.floor(Number(this.totalItems) || 0));
    const totalPages = Math.max(1, Math.ceil(total / safeSize));
    const safePage = Math.max(1, Math.min(Math.floor(Number(this.page) || 1), totalPages));

    const from = total === 0 ? 0 : (safePage - 1) * safeSize + 1;
    const to = total === 0 ? 0 : Math.min(total, safePage * safeSize);

    const tokens = this.buildPageTokens(safePage, totalPages);
    const selectOptions: SelectOption[] = this.effectiveOptions.map((n) => ({
      value: String(n),
      label: String(n),
    }));

    const perPageLabel =
      this.layoutMode === 'cards' ? t.pagination.perPageCards : t.pagination.perPageTable;

    return html`
      <nav
        class="pagination-bar ${this.variant === 'bare' ? 'is-bare' : ''} ${this.compact ? 'is-compact' : ''}"
        aria-label="${perPageLabel}"
      >
        ${this.showSummary
          ? html`
              <div class="pagination-summary">
                <span class="summary-icon" aria-hidden="true">
                  ${this.layoutMode === 'cards' ? iconDashboard(13) : iconTable(13)}
                </span>
                <span class="summary-text">
                  ${this.compact
                    ? t.pagination.showingCompact(from, to, total)
                    : t.pagination.showingRange(from, to, total)}
                </span>
              </div>
            `
          : ''}

        <div class="pagination-controls">
          ${this.showPageSize
            ? html`
                <div class="page-size-group">
                  <span class="page-size-label">${perPageLabel}</span>
                  <div class="page-size-select">
                    <app-select
                      .value="${String(safeSize)}"
                      .options="${selectOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) =>
                        this.emitPageSizeChange(eventValue(e))}"
                    ></app-select>
                  </div>
                </div>
              `
            : ''}

          <div class="pages-nav">
            <button
              type="button"
              class="page-btn nav-arrow"
              ?disabled="${safePage <= 1 || total === 0}"
              title="${t.pagination.prev}"
              aria-label="${t.pagination.prev}"
              @click="${() => this.emitPageChange(safePage - 1, totalPages)}"
            >
              ${iconChevronLeft(15)}
            </button>

            ${tokens.map((tok) =>
              typeof tok === 'number'
                ? html`
                    <button
                      type="button"
                      class="page-btn ${tok === safePage ? 'is-active' : ''}"
                      aria-label="${t.pagination.goToPage(tok)}"
                      aria-current="${tok === safePage ? 'page' : 'false'}"
                      @click="${() => this.emitPageChange(tok, totalPages)}"
                    >
                      ${tok}
                    </button>
                  `
                : html`<span class="page-ellipsis" aria-hidden="true">…</span>`
            )}

            <button
              type="button"
              class="page-btn nav-arrow"
              ?disabled="${safePage >= totalPages || total === 0}"
              title="${t.pagination.next}"
              aria-label="${t.pagination.next}"
              @click="${() => this.emitPageChange(safePage + 1, totalPages)}"
            >
              ${iconChevronRight(15)}
            </button>
          </div>
        </div>
      </nav>
    `;
  }
}

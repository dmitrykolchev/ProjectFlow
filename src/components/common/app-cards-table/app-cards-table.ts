import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../app-empty-state/app-empty-state';
import '../app-pagination/app-pagination';
import { paginateItems } from '../paginate';
import styles from './app-cards-table.css';

export interface CardsTablePageChangeDetail {
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface CardsTableSelectionChangeDetail {
  selectedIds: string[];
  selectedItems: Record<string, unknown>[];
}

export interface CardsTableCardClickDetail {
  item: Record<string, unknown>;
}

/**
 * A grid of entity cards built from a per-view template. The card content is produced by
 * the cardRender function property (row) => TemplateResult, the same pattern as the
 * cellRender of app-data-table; the card shell (surface background, border, radius, padding,
 * hover lift, selection highlight) and the grid geometry belong to the component and are
 * retuned locally through the geometry tokens (cards-min-width, cards-gap, card-padding,
 * card-gap, card-hover-border, card-hover-transform, card-hover-shadow). Pagination is
 * internal: items are sliced by page-size and app-pagination (layout-mode="cards") sits in
 * the footer below the grid whenever the grid is not empty; page-change and page-size-change
 * are emitted outward. With clickable the shell activates on click and emits card-click
 * { item }; clicks on checkboxes, buttons and links inside the card content do not activate
 * the card. With selectable the selection lives in selectedKeys keyed by key-field (default
 * 'id'), the selected items get the is-selected shell class, the selectedItems getter returns
 * the selected rows, toggleSelect(key) flips one key, and toggling emits selection-change
 * { selectedIds, selectedItems }. Empty rows render a compact app-empty-state.
 * Additive hooks with pixel-identical defaults: --cards-columns pins the grid column count
 * (default auto-fill), the wide-collapse attribute collapses to one column at viewport <= 1024px
 * (default off), and cardClass(row) appends extra shell classes per row (the is-dimmed rule reads
 * --card-dimmed-opacity, default 0.68).
 */
@customElement('app-cards-table')
export class AppCardsTable extends LitElement {
  @property({ attribute: false }) rows: Record<string, unknown>[] = [];
  @property({ attribute: false }) cardRender: (row: Record<string, unknown>) => TemplateResult = () => html``;
  @property({ type: Number, attribute: 'page-size' }) pageSize: number = 9;
  @property({ type: Number }) page: number = 1;
  @property({ type: String, attribute: 'empty-title' }) emptyTitle: string = '';
  @property({ type: String }) locale: string = 'ru-RU';
  @property({ type: Boolean }) clickable: boolean = false;
  @property({ type: Boolean, attribute: 'selectable' }) selectable: boolean = false;
  @property({ type: String, attribute: 'key-field' }) keyField: string = 'id';
  @property({ type: Array, attribute: false }) selectedKeys: string[] = [];
  // additive hook: extra shell classes per row (e.g. a completed look); default undefined keeps
  // every consumer pixel-identical
  @property({ attribute: false }) cardClass?: (row: Record<string, unknown>) => string;
  // additive hook: single-column grid collapse at viewport <= 1024px; default off
  @property({ type: Boolean, attribute: 'wide-collapse', reflect: true }) wideCollapse: boolean = false;

  @state() private currentPage: number = 1;

  static styles = styles;

  updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('page')) {
      this.currentPage = Math.max(1, this.page);
    }
  }

  private rowKey(row: Record<string, unknown>): string {
    return String(row[this.keyField]);
  }

  /** Items whose key is currently selected; the consumer reads the selection back. */
  get selectedItems(): Record<string, unknown>[] {
    return this.rows.filter((row) => this.selectedKeys.includes(this.rowKey(row)));
  }

  toggleSelect(key: string) {
    const has = this.selectedKeys.includes(key);
    this.selectedKeys = has
      ? this.selectedKeys.filter((k) => k !== key)
      : [...this.selectedKeys, key];
    this.dispatchEvent(
      new CustomEvent<CardsTableSelectionChangeDetail>('selection-change', {
        detail: { selectedIds: this.selectedKeys, selectedItems: this.selectedItems },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handlePageChange(e: CustomEvent<{ page: number }>) {
    e.stopPropagation();
    this.currentPage = e.detail.page;
    this.dispatchEvent(
      new CustomEvent<CardsTablePageChangeDetail>('page-change', {
        detail: { page: e.detail.page, pageSize: this.pageSize, totalItems: this.rows.length },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handlePageSizeChange(e: CustomEvent<{ pageSize: number }>) {
    e.stopPropagation();
    this.pageSize = e.detail.pageSize;
    this.currentPage = 1;
    this.dispatchEvent(
      new CustomEvent<CardsTablePageChangeDetail>('page-change', {
        detail: { page: 1, pageSize: this.pageSize, totalItems: this.rows.length },
        bubbles: true,
        composed: true,
      })
    );
    this.dispatchEvent(
      new CustomEvent<CardsTablePageChangeDetail>('page-size-change', {
        detail: { page: 1, pageSize: this.pageSize, totalItems: this.rows.length },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleCardClick(e: MouseEvent, row: Record<string, unknown>) {
    // clicks on interactive controls (checkboxes, buttons, links) and on the card footer
    // chrome are not card activation (the reference pins stopPropagation on the footer)
    const interactive = e.composedPath().some(
      (n) =>
        n instanceof HTMLElement &&
        ['APP-BUTTON', 'APP-CHECKBOX', 'APP-LINK', 'CARD-FOOTER'].includes(n.tagName.toUpperCase())
    );
    if (interactive) return;
    this.dispatchEvent(
      new CustomEvent<CardsTableCardClickDetail>('card-click', {
        detail: { item: row },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const slice = paginateItems(this.rows, this.currentPage, this.pageSize);

    return html`
      ${this.rows.length === 0
        ? html`
            <div class="empty-wrap">
              <app-empty-state compact title="${this.emptyTitle}"></app-empty-state>
            </div>
          `
        : html`
            <div class="cards-grid">
              ${slice.items.map(
                (row) => html`
                  <article
                    class="card-shell ${this.clickable ? 'is-clickable' : ''} ${this.selectable &&
                    this.selectedKeys.includes(this.rowKey(row))
                      ? 'is-selected'
                      : ''} ${this.cardClass ? this.cardClass(row) : ''}"
                    @click="${(e: MouseEvent) => this.handleCardClick(e, row)}"
                  >
                    ${this.cardRender(row)}
                  </article>
                `
              )}
            </div>
            <div class="cards-footer">
              <app-pagination
                total-items="${slice.totalItems}"
                page="${slice.page}"
                page-size="${slice.pageSize}"
                layout-mode="cards"
                locale="${this.locale}"
                @page-change="${this.handlePageChange}"
                @page-size-change="${this.handlePageSizeChange}"
              ></app-pagination>
            </div>
          `}
    `;
  }
}

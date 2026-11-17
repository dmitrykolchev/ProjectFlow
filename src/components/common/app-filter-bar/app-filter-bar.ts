import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import '../../common/app-input/app-input';
import '../../common/app-select/app-select';
import '../../common/app-entity-selector/app-entity-selector';
import '../../common/app-button/app-button';
import { iconSearch } from '../icons';
import type { EntitySelectorOption } from '../../common/app-entity-selector/app-entity-selector';
import styles from './app-filter-bar.css';
import { eventValue } from '../event-value';

export interface FilterDef {
  key: string;
  // option list; the entity selector fields (code, subtitle, meta, badge, avatar) are optional
  options: EntitySelectorOption[];
  // control used for the filter: plain select (default) or entity selector with search
  type?: 'select' | 'entity';
}

@customElement('app-filter-bar')
export class AppFilterBar extends LitElement {
  @property({ type: String }) searchValue: string = '';
  @property({ type: Boolean, attribute: 'search-enabled' }) searchEnabled: boolean = true;
  @property({ type: Array }) filters: FilterDef[] = [];
  @property({ type: Object }) values: Record<string, string> = {};
  @property({ type: String }) placeholder: string = '';
  @property({ type: String }) variant: 'card' | 'bare' = 'card';
  @property({ type: Boolean, attribute: 'show-reset' }) showReset: boolean = false;

  static styles = styles;

  render() {
    const t = getTranslation(store.customization.language);
    const hasActive = Object.values(this.values).some((v) => v && v !== 'all');
    return html`
      <div class="bar ${this.variant}">
        <div class="filters">
          <slot name="prefix"></slot>
          ${this.searchEnabled
            ? html`
                <div class="search">
                  <app-input
                    placeholder="${this.placeholder}"
                    .value="${this.searchValue}"
                    clearable
                    @input="${(e: CustomEvent<{ value: string }>) => this.emitSearch(eventValue(e))}"
                  >
                    <span slot="icon">${iconSearch(15)}</span>
                  </app-input>
                </div>
              `
            : ''}
          ${this.filters.map(
            (f) => html`
              <div class="select">
                ${f.type === 'entity'
                  ? html`
                      <app-entity-selector
                        .value="${this.values[f.key] ?? 'all'}"
                        .options="${f.options}"
                        @change="${(e: CustomEvent<{ value: string }>) =>
                          this.emitFilter(f.key, eventValue(e))}"
                      ></app-entity-selector>
                    `
                  : html`
                      <app-select
                        .value="${this.values[f.key] ?? 'all'}"
                        .options="${f.options}"
                        @change="${(e: CustomEvent<{ value: string }>) =>
                          this.emitFilter(f.key, eventValue(e))}"
                      ></app-select>
                    `}
              </div>
            `
          )}
          ${this.showReset && hasActive
            ? html`
                <app-button
                  size="sm"
                  variant="ghost"
                  @click="${() =>
                    this.dispatchEvent(new CustomEvent('reset', { bubbles: true, composed: true }))}"
                >
                  ${t.common.reset}
                </app-button>
              `
            : ''}
        </div>
        <div class="actions">
          <slot></slot>
        </div>
      </div>
    `;
  }

  private emitSearch(value: string) {
    this.dispatchEvent(
      new CustomEvent('search-change', { detail: { value }, bubbles: true, composed: true })
    );
  }

  private emitFilter(key: string, value: string) {
    this.dispatchEvent(
      new CustomEvent('filter-change', { detail: { key, value }, bubbles: true, composed: true })
    );
  }
}
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-search-input.css';

// canonical control scale, md default = the historical header search pixel-identical
export type SearchInputSize = 'sm' | 'md' | 'lg';

// detail of the `input` and `change` events (named event-detail interface, AGENTS.md §6)
export interface SearchInputDetail {
  value: string;
}

@customElement('app-search-input')
export class AppSearchInput extends LitElement {
  @property({ type: String }) value: string = '';
  @property({ type: String }) placeholder: string = '';
  @property({ type: String }) size: SearchInputSize = 'md';
  @property({ type: Boolean }) disabled: boolean = false;

  static styles = styles;

  render() {
    return html`
      <div class="search-wrapper size-${this.size} ${this.disabled ? 'is-disabled' : ''}">
        <span class="search-icon" aria-hidden="true">
          <slot name="icon"></slot>
        </span>
        <input
          type="text"
          class="search-input"
          placeholder="${this.placeholder}"
          .value="${this.value || ''}"
          ?disabled="${this.disabled}"
          @input="${this.handleInput}"
          @change="${this.handleChange}"
        />
      </div>
    `;
  }

  private handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(
      new CustomEvent<SearchInputDetail>('input', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
    this.dispatchEvent(
      new CustomEvent<SearchInputDetail>('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
}

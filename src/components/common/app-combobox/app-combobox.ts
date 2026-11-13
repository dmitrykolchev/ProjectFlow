import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './app-combobox.css';

@customElement('app-combobox')
export class AppCombobox extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: Array }) items: string[] = []; // available suggestions
  @property({ type: Array }) selected: string[] = []; // selected tags/values
  @property({ type: String }) placeholder: string = 'Add tag or filter...';
  @property({ type: Boolean }) allowCustom: boolean = true;

  @state() private inputValue: string = '';
  @state() private isOpen: boolean = false;

  static styles = styles;

  render() {
    const query = this.inputValue.toLowerCase().trim();
    const filteredSuggestions = this.items.filter(
      (item) => !this.selected.includes(item) && item.toLowerCase().includes(query)
    );

    return html`
      <div class="form-group">
        ${this.label ? html`<label>${this.label}</label>` : ''}
        <div class="combobox-box" @click="${this.focusInput}">
          ${this.selected.map(
            (tag) => html`
              <span class="tag-item">
                <span>${tag}</span>
                <button
                  type="button"
                  class="tag-remove"
                  @click="${(e: MouseEvent) => {
                    e.stopPropagation();
                    this.removeTag(tag);
                  }}"
                  aria-label="Remove ${tag}"
                >
                  &times;
                </button>
              </span>
            `
          )}
          <input
            id="combobox-input"
            type="text"
            placeholder="${this.selected.length === 0 ? this.placeholder : ''}"
            .value="${this.inputValue}"
            @input="${this.handleInput}"
            @focus="${() => (this.isOpen = true)}"
            @keydown="${this.handleKeydown}"
          />
        </div>

        ${this.isOpen && (filteredSuggestions.length > 0 || (this.allowCustom && query))
          ? html`
              <div class="backdrop" @click="${() => (this.isOpen = false)}"></div>
              <div class="dropdown-panel">
                ${filteredSuggestions.map(
                  (sug) => html`
                    <div class="suggestion-item" @click="${() => this.addTag(sug)}">
                      ${sug}
                    </div>
                  `
                )}
                ${this.allowCustom && query && !this.items.map((i) => i.toLowerCase()).includes(query)
                  ? html`
                      <div class="suggestion-item" @click="${() => this.addTag(this.inputValue.trim())}">
                        + Добавить "${this.inputValue.trim()}"
                      </div>
                    `
                  : ''}
              </div>
            `
          : ''}
      </div>
    `;
  }

  private focusInput() {
    const input = this.shadowRoot?.getElementById('combobox-input') as HTMLInputElement;
    if (input) input.focus();
  }

  private handleInput(e: Event) {
    this.inputValue = (e.target as HTMLInputElement).value;
    this.isOpen = true;
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (this.inputValue.trim()) {
        this.addTag(this.inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !this.inputValue && this.selected.length > 0) {
      this.removeTag(this.selected[this.selected.length - 1]);
    } else if (e.key === 'Escape') {
      this.isOpen = false;
    }
  }

  private addTag(tag: string) {
    if (!this.selected.includes(tag)) {
      this.selected = [...this.selected, tag];
      this.dispatchChange();
    }
    this.inputValue = '';
    this.isOpen = false;
  }

  private removeTag(tag: string) {
    this.selected = this.selected.filter((t) => t !== tag);
    this.dispatchChange();
  }

  private dispatchChange() {
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { selected: this.selected },
        bubbles: true,
        composed: true,
      })
    );
  }
}

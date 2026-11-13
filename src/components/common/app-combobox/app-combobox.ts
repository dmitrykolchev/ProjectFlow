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
  @state() private panelLeft: number = 0;
  @state() private panelWidth: number = 240;
  @state() private panelTop: number | null = null;
  @state() private panelBottom: number | null = null;
  @state() private panelMaxHeight: number = 180;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('pointerdown', this.handleOutsidePointerDown);
    window.addEventListener('scroll', this.handleReposition, true);
    window.addEventListener('resize', this.handleReposition);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this.handleOutsidePointerDown);
    window.removeEventListener('scroll', this.handleReposition, true);
    window.removeEventListener('resize', this.handleReposition);
  }

  private handleOutsidePointerDown = (e: PointerEvent) => {
    if (this.isOpen && !e.composedPath().includes(this)) {
      this.isOpen = false;
    }
  };

  private handleReposition = () => {
    if (this.isOpen) {
      this.updateDropdownPosition();
    }
  };

  private updateDropdownPosition() {
    const box = this.shadowRoot?.querySelector('.combobox-box') as HTMLElement | null;
    if (!box) return;

    const rect = box.getBoundingClientRect();
    const maxDesired = 180;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));

    this.panelLeft = left;
    this.panelWidth = rect.width;

    if (spaceBelow >= 130 || spaceBelow >= spaceAbove) {
      this.panelTop = rect.bottom + 4;
      this.panelBottom = null;
      this.panelMaxHeight = Math.max(96, Math.min(maxDesired, spaceBelow));
    } else {
      this.panelTop = null;
      this.panelBottom = window.innerHeight - rect.top + 4;
      this.panelMaxHeight = Math.max(96, Math.min(maxDesired, spaceAbove));
    }
  }

  private openDropdown() {
    this.updateDropdownPosition();
    this.isOpen = true;
  }

  render() {
    const query = this.inputValue.toLowerCase().trim();
    const filteredSuggestions = this.items.filter(
      (item) => !this.selected.includes(item) && item.toLowerCase().includes(query)
    );
    const hasDropdownContent =
      filteredSuggestions.length > 0 || (this.allowCustom && Boolean(query));

    const panelStyle =
      this.panelBottom !== null
        ? `left: ${this.panelLeft}px; width: ${this.panelWidth}px; bottom: ${this.panelBottom}px; top: auto; max-height: ${this.panelMaxHeight}px;`
        : `left: ${this.panelLeft}px; width: ${this.panelWidth}px; top: ${this.panelTop ?? 0}px; bottom: auto; max-height: ${this.panelMaxHeight}px;`;

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
            @focus="${() => this.openDropdown()}"
            @keydown="${this.handleKeydown}"
          />
        </div>

        ${this.isOpen && hasDropdownContent
          ? html`
              <div class="dropdown-panel" style="${panelStyle}">
                ${filteredSuggestions.map(
                  (sug) => html`
                    <div
                      class="suggestion-item"
                      @mousedown="${(e: MouseEvent) => e.preventDefault()}"
                      @click="${() => this.addTag(sug)}"
                    >
                      ${sug}
                    </div>
                  `
                )}
                ${this.allowCustom && query && !this.items.map((i) => i.toLowerCase()).includes(query)
                  ? html`
                      <div
                        class="suggestion-item"
                        @mousedown="${(e: MouseEvent) => e.preventDefault()}"
                        @click="${() => this.addTag(this.inputValue.trim())}"
                      >
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
    this.openDropdown();
  }

  private handleInput(e: Event) {
    this.inputValue = (e.target as HTMLInputElement).value;
    this.openDropdown();
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (this.inputValue.trim()) {
        this.addTag(this.inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !this.inputValue && this.selected.length > 0) {
      this.removeTag(this.selected[this.selected.length - 1]);
      requestAnimationFrame(() => this.updateDropdownPosition());
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
    if (this.isOpen) {
      requestAnimationFrame(() => this.updateDropdownPosition());
    }
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

import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { PortalHandle, portalManager } from '../app-modal-portal/app-modal-portal';
import { DeclarativeOption, OptionDataSource, optionsFromElements, resolveDataSource } from '../app-option/app-option';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import styles from './app-combobox.css';

// detail of the `change` event (named event-detail interface, AGENTS.md §6)
export interface ComboboxChangeDetail {
  selected: string[];
}

@customElement('app-combobox')
export class AppCombobox extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: Array }) items: string[] = []; // available suggestions
  // declarative <app-option> children and data sources add suggestions as well:
  // array, promise, or a function returning an array (sync or async)
  @property({ type: Object, attribute: false }) dataSource?: OptionDataSource;
  @property({ type: Array }) selected: string[] = []; // selected tags/values
  @property({ type: String }) placeholder: string = 'Add tag or filter...';
  @property({ type: Boolean }) allowCustom: boolean = true;
  // canonical control size scale (docs/ComponentApiSpecs.md, Priority E), md default = historical look
  @property({ type: String }) size: 'sm' | 'md' | 'lg' = 'md';

  @state() private inputValue: string = '';
  @state() private isOpen: boolean = false;
  @state() private declarativeItems: string[] = [];
  @state() private resolvedItems: string[] = [];
  private loadedSource: OptionDataSource | undefined;
  @state() private panelLeft: number = 0;
  @state() private panelWidth: number = 240;
  @state() private panelTop: number | null = null;
  @state() private panelBottom: number | null = null;
  @state() private panelMaxHeight: number = 180;

  private portalHandle: PortalHandle | null = null;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this.handleReposition);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.handleReposition);
    this.closePortal();
  }

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

  private closePortal() {
    if (this.portalHandle) {
      this.portalHandle.close();
      this.portalHandle = null;
    }
  }

  // suggestions from the items prop, declarative <app-option> children, and the data source
  private allItems(): string[] {
    return [...this.items, ...this.declarativeItems, ...this.resolvedItems];
  }

  private handleSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this.declarativeItems = optionsFromElements(
      slot.assignedElements({ flatten: true }) as HTMLElement[]
    ).map((opt) => opt.label);
  }

  private async loadDataSource() {
    const source = this.dataSource;
    const result = await resolveDataSource(source);
    // ignore a stale response if the source changed while loading
    if (this.dataSource === source) {
      this.resolvedItems = result.map((opt) => opt.label);
    }
  }

  private getDropdownData() {
    const query = this.inputValue.toLowerCase().trim();
    const all = this.allItems();
    const filteredSuggestions = all.filter(
      (item) => !this.selected.includes(item) && item.toLowerCase().includes(query)
    );
    const canAddCustom =
      this.allowCustom &&
      Boolean(query) &&
      !all.map((i) => i.toLowerCase()).includes(query);
    const hasDropdownContent = filteredSuggestions.length > 0 || canAddCustom;
    return { query, filteredSuggestions, canAddCustom, hasDropdownContent };
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('dataSource') && this.dataSource !== this.loadedSource) {
      this.loadedSource = this.dataSource;
      void this.loadDataSource();
    }
    const { filteredSuggestions, canAddCustom, hasDropdownContent } = this.getDropdownData();

    if (this.isOpen && hasDropdownContent) {
      const template = this.renderDropdownPanel(filteredSuggestions, canAddCustom);
      if (!this.portalHandle) {
        this.portalHandle = portalManager.mountTemplate({
          kind: 'popup',
          styles,
          template,
          host: this,
          closeOnBackdrop: true,
          onClose: () => {
            this.isOpen = false;
          },
        });
      } else {
        this.portalHandle.update(template);
      }
    } else {
      this.closePortal();
    }
  }

  private renderDropdownPanel(filteredSuggestions: string[], canAddCustom: boolean) {
    const panelStyle =
      this.panelBottom !== null
        ? `left: ${this.panelLeft}px; width: ${this.panelWidth}px; bottom: ${this.panelBottom}px; top: auto; max-height: ${this.panelMaxHeight}px;`
        : `left: ${this.panelLeft}px; width: ${this.panelWidth}px; top: ${this.panelTop ?? 0}px; bottom: auto; max-height: ${this.panelMaxHeight}px;`;

    return html`
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
        ${canAddCustom
          ? html`
              <div
                class="suggestion-item"
                @mousedown="${(e: MouseEvent) => e.preventDefault()}"
                @click="${() => this.addTag(this.inputValue.trim())}"
              >
                ${getTranslation(store.customization.language).common.addOption(this.inputValue.trim())}
              </div>
            `
          : ''}
      </div>
    `;
  }

  render() {
    return html`
      <div class="form-group">
        ${this.label ? html`<label>${this.label}</label>` : ''}
        <div class="combobox-box size-${this.size}" @click="${this.focusInput}">
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

        <!-- declarative <app-option> children -->
        <slot @slotchange="${this.handleSlotChange}"></slot>
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
      new CustomEvent<ComboboxChangeDetail>('change', {
        detail: { selected: this.selected },
        bubbles: true,
        composed: true,
      })
    );
  }
}

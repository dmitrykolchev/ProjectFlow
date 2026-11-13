import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './app-select.css';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
}

@customElement('app-select')
export class AppSelect extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: String }) value: string = '';
  @property({ type: Array }) options: SelectOption[] = [];
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: String }) placeholder: string = 'Select...';

  @state() private isOpen: boolean = false;
  @state() private panelLeft: number = 0;
  @state() private panelWidth: number = 200;
  @state() private panelTop: number | null = null;
  @state() private panelBottom: number | null = null;
  @state() private panelMaxHeight: number = 220;

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
    const trigger = this.shadowRoot?.querySelector('.select-trigger') as HTMLElement | null;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const maxDesired = 220;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));

    this.panelLeft = left;
    this.panelWidth = rect.width;

    if (spaceBelow >= 140 || spaceBelow >= spaceAbove) {
      this.panelTop = rect.bottom + 4;
      this.panelBottom = null;
      this.panelMaxHeight = Math.max(96, Math.min(maxDesired, spaceBelow));
    } else {
      this.panelTop = null;
      this.panelBottom = window.innerHeight - rect.top + 4;
      this.panelMaxHeight = Math.max(96, Math.min(maxDesired, spaceAbove));
    }
  }

  render() {
    const selectedOpt = this.options.find((o) => o.value === this.value);
    const panelStyle =
      this.panelBottom !== null
        ? `left: ${this.panelLeft}px; width: ${this.panelWidth}px; bottom: ${this.panelBottom}px; top: auto; max-height: ${this.panelMaxHeight}px;`
        : `left: ${this.panelLeft}px; width: ${this.panelWidth}px; top: ${this.panelTop ?? 0}px; bottom: auto; max-height: ${this.panelMaxHeight}px;`;

    return html`
      <div class="form-group">
        ${this.label ? html`<label>${this.label}</label>` : ''}
        <div
          class="select-trigger ${this.isOpen ? 'is-open' : ''} ${this.disabled ? 'is-disabled' : ''}"
          @click="${this.toggleOpen}"
          tabindex="${this.disabled ? -1 : 0}"
          @keydown="${this.handleKeydown}"
        >
          <div class="selected-value">
            ${selectedOpt?.color
              ? html`<span class="dot-indicator" style="background-color: ${selectedOpt.color}"></span>`
              : ''}
            <span>${selectedOpt ? selectedOpt.label : this.placeholder}</span>
          </div>
          <span class="chevron">▼</span>
        </div>

        ${this.isOpen && !this.disabled
          ? html`
              <div class="dropdown-panel" style="${panelStyle}">
                ${this.options.map(
                  (opt) => html`
                    <div
                      class="option-item ${opt.value === this.value ? 'is-selected' : ''}"
                      @click="${() => this.selectOption(opt.value)}"
                    >
                      <div class="option-left">
                        ${opt.color
                          ? html`<span class="dot-indicator" style="background-color: ${opt.color}"></span>`
                          : ''}
                        <span>${opt.label}</span>
                      </div>
                      ${opt.value === this.value ? html`<span class="check-mark">✓</span>` : ''}
                    </div>
                  `
                )}
              </div>
            `
          : ''}
      </div>
    `;
  }

  private toggleOpen() {
    if (this.disabled) return;
    if (!this.isOpen) {
      this.updateDropdownPosition();
      this.isOpen = true;
    } else {
      this.isOpen = false;
    }
  }

  private closeDropdown() {
    this.isOpen = false;
  }

  private selectOption(val: string) {
    this.value = val;
    this.isOpen = false;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggleOpen();
    } else if (e.key === 'Escape') {
      this.closeDropdown();
    }
  }
}

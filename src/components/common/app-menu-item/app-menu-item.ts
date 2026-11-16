import { LitElement, html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { MenuItem } from '../app-menu/app-menu';
import { iconCheck } from '../icons';
import styles from './app-menu-item.css';

@customElement('app-menu-item')
export class AppMenuItem extends LitElement {
  @property({ type: String }) value: string = '';
  @property({ type: String }) label: string = '';
  @property({ type: String }) shortcut: string = '';
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: Boolean, reflect: true }) danger: boolean = false;
  @property({ type: Boolean, reflect: true }) checked: boolean = false;
  @property({ type: Boolean, reflect: true }) checkable: boolean = false;
  @property({ attribute: false }) icon?: TemplateResult | string;

  @state() private hasIconSlot: boolean = false;
  @state() private hasShortcutSlot: boolean = false;

  static styles = styles;

  override focus(options?: FocusOptions) {
    const btn = this.shadowRoot?.querySelector('.menu-item') as HTMLButtonElement | null;
    btn?.focus(options);
  }

  toMenuItem(): MenuItem {
    const resolvedLabel = this.label || (this.textContent || '').trim();
    const resolvedId = this.value || this.id || resolvedLabel;
    return {
      id: resolvedId,
      label: resolvedLabel,
      icon: this.icon,
      shortcut: this.shortcut || undefined,
      disabled: this.disabled || undefined,
      danger: this.danger || undefined,
      checked: this.checkable || this.checked ? this.checked : undefined,
    };
  }

  private handleIconSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this.hasIconSlot = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private handleShortcutSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this.hasShortcutSlot = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private handleClick() {
    if (this.disabled) return;

    if (this.checkable) {
      this.checked = !this.checked;
    }

    const item = this.toMenuItem();
    this.dispatchEvent(
      new CustomEvent('select', {
        detail: {
          item,
          id: item.id,
          value: item.id,
          checked: this.checkable || this.checked ? this.checked : undefined,
          element: this,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const showCustomIcon = Boolean(this.icon) || this.hasIconSlot;
    const isCheckableItem = this.checkable || this.checked;
    const showShortcut = Boolean(this.shortcut) || this.hasShortcutSlot;

    return html`
      <button
        type="button"
        role="${isCheckableItem ? 'menuitemcheckbox' : 'menuitem'}"
        aria-checked="${isCheckableItem ? (this.checked ? 'true' : 'false') : nothing}"
        class="menu-item ${this.danger ? 'is-danger' : ''} ${this.checked ? 'is-checked' : ''}"
        ?disabled="${this.disabled}"
        @click="${this.handleClick}"
      >
        <span class="menu-item-left">
          ${showCustomIcon
            ? html`
                <span class="menu-item-icon">
                  ${this.icon ?? html`<slot name="icon" @slotchange="${this.handleIconSlotChange}"></slot>`}
                </span>
              `
            : html`
                <slot name="icon" hidden @slotchange="${this.handleIconSlotChange}"></slot>
                ${isCheckableItem
                  ? html`<span class="menu-item-icon is-check">${this.checked ? iconCheck(13) : ''}</span>`
                  : ''}
              `}
          <span class="menu-item-label">
            ${this.label || html`<slot></slot>`}
          </span>
        </span>

        ${showShortcut
          ? html`
              <span class="menu-shortcut">
                ${this.shortcut || html`<slot name="shortcut" @slotchange="${this.handleShortcutSlotChange}"></slot>`}
              </span>
            `
          : html`<slot name="shortcut" hidden @slotchange="${this.handleShortcutSlotChange}"></slot>`}
      </button>
    `;
  }
}

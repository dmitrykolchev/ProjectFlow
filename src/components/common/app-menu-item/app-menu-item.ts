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

  private handleSlotChange() {
    const sr = this.shadowRoot;
    if (!sr) return;
    const nonEmpty = (name: string) => {
      const slot = sr.querySelector(`slot[name="${name}"]`) as HTMLSlotElement | null;
      if (!slot) return false;
      return slot.assignedNodes({ flatten: true }).some(
        (n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== ''
      );
    };
    // canonical start / end slots, icon and shortcut are legacy aliases
    this.hasIconSlot = nonEmpty('start') || nonEmpty('icon');
    this.hasShortcutSlot = nonEmpty('end') || nonEmpty('shortcut');
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
                  <!-- canonical start slot; icon is a legacy alias -->
                  ${this.icon ??
                    html`<slot name="start" @slotchange="${this.handleSlotChange}">
                      <slot name="icon" @slotchange="${this.handleSlotChange}"></slot>
                    </slot>`}
                </span>
              `
            : html`
                <slot name="start" hidden @slotchange="${this.handleSlotChange}">
                  <slot name="icon" hidden @slotchange="${this.handleSlotChange}"></slot>
                </slot>
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
                <!-- canonical end slot; shortcut is a legacy alias -->
                ${this.shortcut ||
                  html`<slot name="end" @slotchange="${this.handleSlotChange}">
                    <slot name="shortcut" @slotchange="${this.handleSlotChange}"></slot>
                  </slot>`}
              </span>
            `
          : html`<slot name="end" hidden @slotchange="${this.handleSlotChange}">
              <slot name="shortcut" hidden @slotchange="${this.handleSlotChange}"></slot>
            </slot>`}
      </button>
    `;
  }
}

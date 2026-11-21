import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AppMenuItem, MenuItemSelectDetail } from '../app-menu-item/app-menu-item';
import { PortalHandle, portalManager } from '../app-modal-portal/app-modal-portal';
import { iconChevronDown } from '../icons';
import '../app-menu/app-menu';
import styles from './app-toolbar-button.css';

// detail of the `change` event (named event-detail interface, AGENTS.md §6)
export interface ToolbarButtonChangeDetail {
  pressed: boolean;
  value: string;
}

const DECLARATIVE_MENU_TAGS = new Set(['app-menu-item', 'app-menu-header', 'app-menu-divider']);

/**
 * A toolbar control for app-toolbar rows. Two types:
 * - normal: a push button; when its light DOM contains app-menu-item children
 *   it behaves as a dropdown button (portal menu, canonical select event);
 * - toggle: a stateful press button emitting the canonical change event.
 *
 * The row scale is inherited from the parent app-toolbar through custom
 * properties (--tb-height / --tb-font / --tb-icon / --tb-pad-x), so toolbar
 * and buttons always share one size; standalone use falls back to md.
 */
@customElement('app-toolbar-button')
export class AppToolbarButton extends LitElement {
  @property({ type: String, reflect: true }) type: 'normal' | 'toggle' = 'normal';
  @property({ type: Boolean, reflect: true }) pressed: boolean = false;
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: String }) value: string = '';
  @property({ type: String, attribute: 'aria-label' }) ariaLabel: string = '';

  @state() private isOpen: boolean = false;
  @state() private hasMenu: boolean = false;
  @state() private autoIconOnly: boolean = false;
  @state() private menuRight: number = 8;
  @state() private menuTop: number | null = null;
  @state() private menuBottom: number | null = null;
  @state() private menuMaxHeight: number = 280;

  private portalHandle: PortalHandle | null = null;
  private clonedMenuNodes: HTMLElement[] = [];
  private clonedToSourceItem: Map<HTMLElement, AppMenuItem> = new Map();

  static styles = styles;

  render() {
    const iconOnly = this.autoIconOnly && !this.hasMenu;
    return html`
      <button
        type="button"
        class="${this.type === 'toggle' && this.pressed ? 'is-pressed' : ''} ${iconOnly ? 'icon-only' : ''}"
        aria-haspopup="${this.hasMenu ? 'menu' : 'false'}"
        aria-expanded="${this.hasMenu ? String(this.isOpen) : 'false'}"
        aria-pressed="${this.type === 'toggle' ? String(this.pressed) : 'false'}"
        aria-label="${this.ariaLabel || nothing}"
        title="${this.ariaLabel || nothing}"
        ?disabled="${this.disabled}"
        @click="${this.handleClick}"
      >
        <!-- canonical slots: start / default / end -->
        <slot name="start" @slotchange="${this.evaluateContent}"></slot>
        ${iconOnly
          ? html`<slot name="icon-only" @slotchange="${this.evaluateContent}"><slot></slot></slot>`
          : html`<slot @slotchange="${this.evaluateContent}"></slot>`}
        <slot name="end" @slotchange="${this.evaluateContent}"></slot>
        ${this.hasMenu ? html`<span class="chevron">${iconChevronDown(14)}</span>` : ''}
      </button>
    `;
  }

  protected firstUpdated() {
    this.evaluateContent();
  }

  protected updated(changed: Map<string, unknown>) {
    if (this.isOpen && !this.disabled) {
      const template = this.renderMenuPopover();
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
    if (changed.has('disabled') && this.disabled) {
      this.isOpen = false;
    }
  }

  private evaluateContent() {
    let hasMenu = false;
    let hasIcon = false;
    let hasText = false;
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (DECLARATIVE_MENU_TAGS.has(el.tagName.toLowerCase())) {
          hasMenu = true;
          continue;
        }
        const slot = el.getAttribute('slot');
        if (slot === 'start' || slot === 'end') {
          hasIcon = true;
        } else {
          hasText = true;
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        if ((node.textContent ?? '').trim() !== '') {
          hasText = true;
        }
      }
    }
    this.hasMenu = hasMenu;
    // a button whose light DOM holds only an icon (no text) is square on its own
    this.autoIconOnly = hasIcon && !hasText;
  }

  private prepareClonedMenuNodes() {
    this.clonedMenuNodes = [];
    this.clonedToSourceItem.clear();

    const sources = Array.from(this.children).filter((el) =>
      DECLARATIVE_MENU_TAGS.has(el.tagName.toLowerCase())
    );

    for (const src of sources) {
      const clone = src.cloneNode(true) as HTMLElement;
      if (src.tagName.toLowerCase() === 'app-menu-item') {
        const srcItem = src as AppMenuItem;
        const cloneItem = clone as AppMenuItem;
        if (srcItem.icon !== undefined) {
          cloneItem.icon = srcItem.icon;
        }
        this.clonedToSourceItem.set(clone, srcItem);
      }
      this.clonedMenuNodes.push(clone);
    }
  }

  private updateMenuPosition() {
    const button = this.shadowRoot?.querySelector('button') as HTMLElement | null;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    this.menuRight = Math.max(8, Math.round(window.innerWidth - rect.right));

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
      this.menuTop = Math.round(rect.bottom + 6);
      this.menuBottom = null;
      this.menuMaxHeight = Math.max(100, Math.min(320, spaceBelow));
    } else {
      this.menuTop = null;
      this.menuBottom = Math.round(window.innerHeight - rect.top + 6);
      this.menuMaxHeight = Math.max(100, Math.min(320, spaceAbove));
    }
  }

  private renderMenuPopover() {
    const vertStyle =
      this.menuBottom !== null
        ? `bottom: ${this.menuBottom}px; top: auto;`
        : `top: ${this.menuTop ?? 0}px; bottom: auto;`;
    const popoverStyle = `right: ${this.menuRight}px; left: auto; ${vertStyle} max-height: ${this.menuMaxHeight}px;`;

    return html`
      <div class="popover-menu" style="${popoverStyle}">
        <app-menu @select="${this.handleMenuSelect}">
          ${this.clonedMenuNodes}
        </app-menu>
      </div>
    `;
  }

  private closePortal() {
    if (this.portalHandle) {
      this.portalHandle.close();
      this.portalHandle = null;
    }
    this.clonedMenuNodes = [];
  }

  private handleClick(e: MouseEvent) {
    e.stopPropagation();
    if (this.disabled) return;

    if (this.type === 'toggle') {
      this.pressed = !this.pressed;
      this.dispatchEvent(
        new CustomEvent<ToolbarButtonChangeDetail>('change', {
          detail: { pressed: this.pressed, value: this.value },
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    if (this.hasMenu) {
      if (!this.isOpen) {
        this.prepareClonedMenuNodes();
        this.updateMenuPosition();
        this.isOpen = true;
      } else {
        this.isOpen = false;
      }
    }
  }

  private handleMenuSelect(e: CustomEvent) {
    e.stopPropagation();
    const clonedEl = e.detail?.element as HTMLElement | undefined;
    if (clonedEl) {
      const sourceEl = this.clonedToSourceItem.get(clonedEl);
      if (sourceEl && sourceEl.checkable) {
        sourceEl.checked = (clonedEl as AppMenuItem).checked;
      }
    }
    this.isOpen = false;
    this.dispatchEvent(
      new CustomEvent<MenuItemSelectDetail>('select', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.closePortal();
  }
}

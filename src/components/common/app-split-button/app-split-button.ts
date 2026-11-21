import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ButtonSize } from '../app-button/app-button';
import { MenuItem } from '../app-menu/app-menu';
import type { AppMenuItem, MenuItemSelectDetail } from '../app-menu-item/app-menu-item';
import { PortalHandle, portalManager } from '../app-modal-portal/app-modal-portal';
import { iconChevronDown } from '../icons';
import '../app-menu/app-menu';
import styles from './app-split-button.css';

const DECLARATIVE_MENU_TAGS = new Set(['app-menu-item', 'app-menu-header', 'app-menu-divider']);

@customElement('app-split-button')
export class AppSplitButton extends LitElement {
  @property({ type: String }) label: string = 'Save';
  @property({ type: String }) variant: 'primary' | 'secondary' | 'outline' = 'primary';
  @property({ type: String }) size: ButtonSize = 'md';
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: Boolean, attribute: 'icon-only' }) iconOnly: boolean = false;
  @property({ type: Array }) items: MenuItem[] = [];

  @state() private isOpen: boolean = false;
  @state() private menuRight: number = 8;
  @state() private menuTop: number | null = null;
  @state() private menuBottom: number | null = null;
  @state() private menuMaxHeight: number = 280;

  private portalHandle: PortalHandle | null = null;
  private clonedMenuNodes: HTMLElement[] = [];
  private clonedToSourceItem = new WeakMap<HTMLElement, AppMenuItem>();

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
      this.updateMenuPosition();
    }
  };

  private prepareClonedMenuNodes() {
    this.clonedMenuNodes = [];
    this.clonedToSourceItem = new WeakMap();

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
    const wrapper = this.shadowRoot?.querySelector('.split-wrapper') as HTMLElement | null;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
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

  protected updated() {
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
  }

  private closePortal() {
    if (this.portalHandle) {
      this.portalHandle.close();
      this.portalHandle = null;
    }
    this.clonedMenuNodes = [];
  }

  private renderMenuPopover() {
    const vertStyle =
      this.menuBottom !== null
        ? `bottom: ${this.menuBottom}px; top: auto;`
        : `top: ${this.menuTop ?? 0}px; bottom: auto;`;
    const popoverStyle = `right: ${this.menuRight}px; left: auto; ${vertStyle} max-height: ${this.menuMaxHeight}px;`;

    return html`
      <div class="popover-menu" style="${popoverStyle}">
        <app-menu
          .items="${this.items}"
          @select="${this.handleMenuSelect}"
        >
          ${this.clonedMenuNodes}
        </app-menu>
      </div>
    `;
  }

  render() {
    return html`
      <div class="split-wrapper variant-${this.variant} size-${this.size}">
        <button
          type="button"
          class="split-main ${this.iconOnly ? 'icon-only' : ''}"
          ?disabled="${this.disabled}"
          @click="${this.handlePrimaryClick}"
        >
          <!-- canonical slots: start / end for graphic elements; icon-start is a legacy alias -->
          <slot name="start">
            <slot name="icon-start"></slot>
          </slot>
          ${this.iconOnly ? '' : html`<span>${this.label}</span>`}
          <slot name="end"></slot>
        </button>

        <button
          type="button"
          class="split-toggle"
          aria-haspopup="menu"
          aria-expanded="${this.isOpen}"
          aria-label="More options"
          ?disabled="${this.disabled}"
          @click="${this.toggleMenu}"
        >
          ${iconChevronDown(14)}
        </button>
        <slot class="menu-slot-source" hidden></slot>
      </div>
    `;
  }

  private handlePrimaryClick(e: MouseEvent) {
    e.stopPropagation();
    if (this.disabled) return;
    this.isOpen = false;
    this.dispatchEvent(
      new CustomEvent('primary-click', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private toggleMenu(e: MouseEvent) {
    e.stopPropagation();
    if (this.disabled) return;
    if (!this.isOpen) {
      this.prepareClonedMenuNodes();
      this.updateMenuPosition();
      this.isOpen = true;
    } else {
      this.isOpen = false;
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
}

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { iconCheck } from '../icons';
import type { AppMenuItem } from '../app-menu-item/app-menu-item';
import '../app-menu-item/app-menu-item';
import '../app-menu-header/app-menu-header';
import '../app-menu-divider/app-menu-divider';
import styles from './app-menu.css';

export interface MenuItem {
  id: string;
  label?: string;
  icon?: TemplateResult | string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  header?: string;
  checked?: boolean;
}

// detail of the `select` event (named event-detail interface, AGENTS.md §6)
export interface MenuSelectDetail {
  item: MenuItem;
  id: string;
}

@customElement('app-menu')
export class AppMenu extends LitElement {
  @property({ type: Array }) items: MenuItem[] = [];

  static styles = styles;

  render() {
    return html`
      <div class="menu-surface" role="menu" @keydown="${this.handleKeyDown}">
        ${this.items.map((item) => {
          if (item.divider) {
            return html`<div class="menu-divider" role="separator"></div>`;
          }
          if (item.header) {
            return html`<div class="menu-header">${item.header}</div>`;
          }
          return html`
            <button
              type="button"
              role="menuitem"
              class="menu-item ${item.danger ? 'is-danger' : ''} ${item.checked ? 'is-checked' : ''}"
              ?disabled="${item.disabled}"
              @click="${() => this.selectItem(item)}"
            >
              <span class="menu-item-left">
                <span class="menu-item-icon">
                  ${item.icon
                    ? item.icon
                    : item.checked !== undefined && item.checked
                    ? iconCheck(13)
                    : ''}
                </span>
                <span class="menu-item-label">${item.label || ''}</span>
              </span>
              ${item.shortcut ? html`<span class="menu-shortcut">${item.shortcut}</span>` : ''}
            </button>
          `;
        })}
        <slot></slot>
      </div>
    `;
  }

  private getFocusableTargets(): HTMLElement[] {
    const shadowItems = Array.from(
      this.shadowRoot?.querySelectorAll('.menu-surface > button.menu-item:not(:disabled)') ?? []
    ) as HTMLElement[];

    const slot = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
    const slottedItems = (slot?.assignedElements({ flatten: true }) ?? []).filter((el) => {
      if (el.tagName.toLowerCase() !== 'app-menu-item') return false;
      const item = el as AppMenuItem;
      return !item.disabled && !item.hidden;
    }) as HTMLElement[];

    return [...shadowItems, ...slottedItems];
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const targets = this.getFocusableTargets();
    if (targets.length === 0) return;

    e.preventDefault();

    const root = this.getRootNode() as Document | ShadowRoot;
    const activeShadowEl = this.shadowRoot?.activeElement as HTMLElement | null;
    const activeHostEl = root.activeElement as HTMLElement | null;
    const currentIndex = targets.findIndex((el) => el === activeShadowEl || el === activeHostEl);

    let nextIndex = 0;
    if (e.key === 'ArrowDown') {
      nextIndex = currentIndex >= 0 ? (currentIndex + 1) % targets.length : 0;
    } else if (e.key === 'ArrowUp') {
      nextIndex = currentIndex >= 0 ? (currentIndex - 1 + targets.length) % targets.length : targets.length - 1;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = targets.length - 1;
    }

    targets[nextIndex]?.focus();
  }

  private selectItem(item: MenuItem) {
    if (item.disabled) return;
    this.dispatchEvent(
      new CustomEvent<MenuSelectDetail>('select', {
        detail: { item, id: item.id },
        bubbles: true,
        composed: true,
      })
    );
  }
}

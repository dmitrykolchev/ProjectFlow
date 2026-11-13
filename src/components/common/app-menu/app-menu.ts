import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { iconCheck } from '../icons';
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

@customElement('app-menu')
export class AppMenu extends LitElement {
  @property({ type: Array }) items: MenuItem[] = [];

  static styles = styles;

  render() {
    return html`
      <div class="menu-surface" role="menu">
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
                ${item.icon
                  ? html`<span class="menu-item-icon">${item.icon}</span>`
                  : item.checked !== undefined
                  ? html`<span class="menu-item-icon" style="width: 14px;">${item.checked ? iconCheck(13) : ''}</span>`
                  : ''}
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

  private selectItem(item: MenuItem) {
    if (item.disabled) return;
    this.dispatchEvent(
      new CustomEvent('select', {
        detail: { item, id: item.id },
        bubbles: true,
        composed: true,
      })
    );
  }
}

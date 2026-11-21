import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { iconChevronDown } from '../../common/icons';
import styles from './app-sidebar-group.css';

// detail of the `sidebar-group-toggle` event (named event-detail interface, AGENTS.md §6)
export interface SidebarGroupToggleDetail {
  groupId: string;
  expanded: boolean;
}

@customElement('app-sidebar-group')
export class AppSidebarGroup extends LitElement {
  @property({ type: String, attribute: 'group-id' }) groupId: string = '';
  @property({ type: String }) label: string = '';
  @property({ type: Boolean, reflect: true }) expanded: boolean = true;
  @property({ type: Boolean, reflect: true }) collapsed: boolean = false;
  @property({ type: Boolean, attribute: 'has-active' }) hasActive: boolean = false;

  static styles = styles;

  render() {
    return html`
      <div class="group-wrapper">
        <div class="rail-divider" aria-hidden="true"></div>

        <button
          type="button"
          class="group-header ${this.expanded ? 'is-expanded' : ''} ${this.hasActive ? 'has-active' : ''}"
          aria-expanded="${this.expanded ? 'true' : 'false'}"
          @click="${this.handleToggle}"
        >
          <span class="group-label-wrap">
            <span class="group-label">${this.label}</span>
            ${!this.expanded && this.hasActive
              ? html`<span class="active-dot" aria-hidden="true"></span>`
              : ''}
          </span>
          <span class="group-chevron" aria-hidden="true">
            ${iconChevronDown(14)}
          </span>
        </button>

        <div class="group-collapse ${this.expanded ? 'is-expanded' : ''}">
          <div class="group-collapse-inner">
            <div class="group-items">
              <slot></slot>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private handleToggle() {
    const nextExpanded = !this.expanded;
    this.expanded = nextExpanded;
    this.dispatchEvent(
      new CustomEvent<SidebarGroupToggleDetail>('sidebar-group-toggle', {
        detail: {
          groupId: this.groupId || this.label,
          expanded: nextExpanded,
        },
        bubbles: true,
        composed: true,
      })
    );
  }
}

import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import styles from './app-sidebar.css';
import {
  iconMoon,
  iconSun,
  iconChevronLeft,
  iconChevronRight,
} from '../../common/icons';
import { SidebarItem } from '../sidebar-item/sidebar-item';
import '../sidebar-item/sidebar-item';

@customElement('app-sidebar')
export class AppSidebar extends LitElement {
  @property({ type: Boolean, reflect: true }) collapsed: boolean = store.customization.sidebarCollapsed;
  @property({ type: String }) activeValue: string = '';

  @state() private theme = store.customization.theme;
  @state() private currentLang = store.customization.language;
  @state() private selectedProjectId = store.selectedProjectId;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => {
      this.syncState();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private syncState() {
    this.collapsed = store.customization.sidebarCollapsed;
    this.theme = store.customization.theme;
    this.currentLang = store.customization.language;
    this.selectedProjectId = store.selectedProjectId;
    this.syncSlottedItems();
  }

  updated() {
    this.syncSlottedItems();
  }

  private syncSlottedItems() {
    const slot = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
    if (!slot) return;
    const assigned = slot.assignedElements({ flatten: true });
    for (const el of assigned) {
      if (el.tagName.toLowerCase() === 'sidebar-item') {
        const item = el as SidebarItem;
        item.collapsed = this.collapsed;
        if (this.activeValue) {
          item.active = item.value === this.activeValue;
        }
      }
    }
  }

  render() {
    const t = getTranslation(this.currentLang);

    return html`
      <div class="sidebar-wrapper">
        <div class="sidebar-header">
          <div class="brand">
            <div class="brand-mark">PF</div>
            ${!this.collapsed ? html`<span>${t.common.appName}</span>` : ''}
          </div>
          <button
            class="collapse-btn"
            @click="${() => store.toggleSidebar()}"
            title="${this.collapsed ? 'Expand' : 'Collapse'}"
            aria-label="Toggle Sidebar"
          >
            ${this.collapsed ? iconChevronRight(16) : iconChevronLeft(16)}
          </button>
        </div>

        ${!this.collapsed
          ? html`
              <div class="project-selector">
                <select
                  class="project-dropdown"
                  @change="${(e: Event) => store.selectProject((e.target as HTMLSelectElement).value)}"
                >
                  <option value="all" ?selected="${this.selectedProjectId === 'all'}">
                    ${t.common.all} ${t.navigation.projects.toLowerCase()}
                  </option>
                  ${store.projects.map(
                    (p) => html`
                      <option value="${p.id}" ?selected="${this.selectedProjectId === p.id}">
                        ${p.key} - ${p.name}
                      </option>
                    `
                  )}
                </select>
              </div>
            `
          : ''}

        <nav class="nav-list">
          <slot @slotchange="${this.syncSlottedItems}"></slot>
        </nav>

        <div class="sidebar-footer">
          <div class="quick-controls">
            <button
              class="quick-btn"
              @click="${() => store.toggleTheme()}"
              title="Переключить тему (Dark / Light)"
            >
              ${this.theme === 'dark' ? iconSun(14) : iconMoon(14)}
              ${!this.collapsed ? html`<span>${this.theme === 'dark' ? 'Light' : 'Dark'}</span>` : ''}
            </button>
            <button
              class="quick-btn"
              @click="${() => store.setLanguage(this.currentLang === 'ru' ? 'en' : 'ru')}"
              title="Сменить язык (RU / EN)"
            >
              ${!this.collapsed ? html`<span>${this.currentLang.toUpperCase()}</span>` : html`<span>${this.currentLang.toUpperCase()}</span>`}
            </button>
          </div>

          ${!this.collapsed
            ? html`
                <div class="user-profile">
                  <div class="avatar-circle">AM</div>
                  <div class="user-info">
                    <span class="user-name">Александр М.</span>
                    <span class="user-role">Lead Architect</span>
                  </div>
                </div>
              `
            : html`
                <div class="user-profile" style="justify-content: center;">
                  <div class="avatar-circle">AM</div>
                </div>
              `}
        </div>
      </div>
    `;
  }
}

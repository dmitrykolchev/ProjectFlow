import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { SidebarGroupMode } from '../../../types';
import { getTranslation } from '../../../i18n';
import { presenceFromStatus } from '../../../domain/presence-tokens';
import { mapProjectOptions } from '../../common/entity-selector-options';
import '../../common/app-persona/app-persona';
import '../../common/app-entity-selector/app-entity-selector';
import styles from './app-sidebar.css';
import {
  iconMoon,
  iconSun,
  iconChevronLeft,
  iconChevronRight,
  iconContrast,
  iconHeart,
  iconTerminal,
  iconZap,
  iconLogOut,
} from '../../common/icons';
import { SidebarItem } from '../sidebar-item/sidebar-item';
import { SidebarGroup } from '../sidebar-group/sidebar-group';
import '../sidebar-item/sidebar-item';
import '../sidebar-group/sidebar-group';

@customElement('app-sidebar')
export class AppSidebar extends LitElement {
  @property({ type: Boolean, reflect: true }) collapsed: boolean = store.customization.sidebarCollapsed;
  @property({ type: String }) activeValue: string = '';
  @property({ type: String, attribute: 'group-mode' }) groupMode: SidebarGroupMode = store.customization.sidebarGroupMode;
  @property({ type: Boolean }) standalone: boolean = false;

  @state() private theme = store.customization.theme;
  @state() private currentLang = store.customization.language;
  @state() private selectedProjectId = store.selectedProjectId;
  @state() private expandedGroups: string[] = [...store.customization.sidebarExpandedGroups];
  @state() private standaloneInitialized = false;

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
    this.theme = store.customization.theme;
    this.currentLang = store.customization.language;
    this.selectedProjectId = store.selectedProjectId;
    if (!this.standalone) {
      this.collapsed = store.customization.sidebarCollapsed;
      this.groupMode = store.customization.sidebarGroupMode;
      this.expandedGroups = [...store.customization.sidebarExpandedGroups];
    }
    this.syncSlottedItems();
  }

  updated() {
    this.syncSlottedItems();
  }

  private getSlottedGroups(): SidebarGroup[] {
    const slot = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
    if (!slot) return [];
    return slot
      .assignedElements({ flatten: true })
      .filter((el) => el.tagName.toLowerCase() === 'sidebar-group') as SidebarGroup[];
  }

  private handleSlotChange() {
    if (this.standalone && !this.standaloneInitialized) {
      const groups = this.getSlottedGroups();
      if (groups.length > 0) {
        const initiallyExpanded = groups
          .filter((g) => g.expanded)
          .map((g) => g.groupId || g.label);
        if (this.groupMode === 'single') {
          this.expandedGroups = initiallyExpanded.length > 0
            ? [initiallyExpanded[0]]
            : [groups[0].groupId || groups[0].label];
        } else {
          this.expandedGroups = initiallyExpanded;
        }
        this.standaloneInitialized = true;
      }
    }
    this.syncSlottedItems();
  }

  private syncSlottedItems() {
    const slot = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
    if (!slot) return;
    const assigned = slot.assignedElements({ flatten: true });
    for (const el of assigned) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'sidebar-item') {
        const item = el as SidebarItem;
        item.collapsed = this.collapsed;
        if (this.activeValue) {
          item.active = item.value === this.activeValue;
        }
      } else if (tag === 'sidebar-group') {
        const group = el as SidebarGroup;
        const gid = group.groupId || group.label;
        group.collapsed = this.collapsed;
        group.expanded = this.expandedGroups.includes(gid);

        let groupHasActive = false;
        const childItems = group.querySelectorAll('sidebar-item');
        childItems.forEach((child) => {
          const item = child as SidebarItem;
          item.collapsed = this.collapsed;
          if (this.activeValue) {
            const isItemActive = item.value === this.activeValue;
            item.active = isItemActive;
            if (isItemActive) groupHasActive = true;
          } else if (item.active) {
            groupHasActive = true;
          }
        });
        group.hasActive = groupHasActive;
      }
    }
  }

  private handleGroupToggle(e: CustomEvent<{ groupId: string; expanded: boolean }>) {
    e.stopPropagation();
    const { groupId, expanded } = e.detail;

    if (this.standalone) {
      if (this.groupMode === 'single') {
        this.expandedGroups = expanded ? [groupId] : [];
      } else {
        const set = new Set(this.expandedGroups);
        if (expanded) {
          set.add(groupId);
        } else {
          set.delete(groupId);
        }
        this.expandedGroups = Array.from(set);
      }
      this.syncSlottedItems();
      return;
    }

    store.toggleSidebarGroup(groupId, expanded);
  }

  private handleCollapseSidebar() {
    if (this.standalone) {
      this.collapsed = !this.collapsed;
      this.syncSlottedItems();
      return;
    }
    store.toggleSidebar();
  }

  render() {
    const t = getTranslation(this.currentLang);

    return html`
      <button
        type="button"
        class="collapse-btn"
        @click="${this.handleCollapseSidebar}"
        title="${this.collapsed ? 'Expand' : 'Collapse'}"
        aria-label="Toggle Sidebar"
      >
        ${this.collapsed ? iconChevronRight(14) : iconChevronLeft(14)}
      </button>

      <div class="sidebar-wrapper">
        <div class="sidebar-header">
          <div class="brand">
            <div class="brand-mark">PF</div>
            ${!this.collapsed ? html`<span class="brand-text">${t.common.appName}</span>` : ''}
          </div>
        </div>

        ${!this.collapsed
          ? html`
              <div class="project-selector">
                <app-entity-selector
                  size="sm"
                  .options="${[
                    { value: 'all', label: `${t.common.all} ${t.navigation.projects.toLowerCase()}` },
                    ...mapProjectOptions(store.projects, t),
                  ]}"
                  .value="${this.selectedProjectId}"
                  @change="${(e: CustomEvent) => store.selectProject(e.detail.value)}"
                ></app-entity-selector>
              </div>
            `
          : ''}

        <nav class="nav-list" @sidebar-group-toggle="${this.handleGroupToggle}">
          <slot @slotchange="${this.handleSlotChange}"></slot>
        </nav>

        <div class="sidebar-footer">
          <div class="quick-controls">
            <button
              class="quick-btn"
              @click="${() => store.toggleTheme()}"
              title="${t.viewTexts.sidebar.themeToggleTitle}"
            >
              ${this.theme === 'high-contrast'
                ? iconContrast(14)
                : this.theme === 'barbie'
                ? iconHeart(14)
                : this.theme === 'matrix'
                ? iconTerminal(14)
                : this.theme === 'cyberpunk'
                ? iconZap(14)
                : this.theme === 'dark'
                ? iconSun(14)
                : iconMoon(14)}
              ${!this.collapsed
                ? html`<span>${this.theme === 'high-contrast'
                    ? 'AAA'
                    : this.theme === 'barbie'
                    ? 'Barbie'
                    : this.theme === 'matrix'
                    ? 'Matrix'
                    : this.theme === 'cyberpunk'
                    ? 'Cyber'
                    : this.theme === 'dark'
                    ? 'Dark'
                    : 'Light'}</span>`
                : ''}
            </button>
            <button
              class="quick-btn"
              @click="${() =>
                store.setLanguage(getTranslation(this.currentLang).common.otherLang as 'en' | 'ru')}"
              title="${t.viewTexts.sidebar.langToggleTitle}"
            >
              ${!this.collapsed ? html`<span>${this.currentLang.toUpperCase()}</span>` : html`<span>${this.currentLang.toUpperCase()}</span>`}
            </button>
          </div>

          ${(() => {
            const currentUser = store.users.find((u) => u.id === store.currentUserId) || store.users[0];
            if (!currentUser) return '';
            return !this.collapsed
              ? html`
                  <div class="user-footer-row">
                    <div
                      class="user-profile is-clickable"
                      title="${t.viewTexts.sidebar.profileOpenTitle}"
                      @click="${() => store.setActiveView('profile-settings')}"
                    >
                      <app-persona
                        size="32"
                        .initials="${currentUser.avatar}"
                        .presence="${presenceFromStatus(currentUser.status)}"
                        .primaryText="${currentUser.name}"
                        .secondaryText="${currentUser.role}"
                        .color="${'var(--bg-hover, #223049)'}"
                        .interactive="${false}"
                      ></app-persona>
                    </div>
                    <button
                      type="button"
                      class="logout-btn"
                      title="${t.viewTexts.sidebar.logoutTitle}"
                      aria-label="${t.viewTexts.sidebar.logoutTitle}"
                      @click="${(e: Event) => {
                        e.stopPropagation();
                        store.logout();
                      }}"
                    >
                      ${iconLogOut(15)}
                    </button>
                  </div>
                `
              : html`
                  <div class="user-footer-collapsed">
                    <div
                      class="user-profile is-clickable"
                      style="justify-content: center;"
                      title="${t.viewTexts.sidebar.profileOpenTitle}"
                      @click="${() => store.setActiveView('profile-settings')}"
                    >
                      <app-persona
                        size="32"
                        .initials="${currentUser.avatar}"
                        .presence="${presenceFromStatus(currentUser.status)}"
                        .color="${'var(--bg-hover, #223049)'}"
                        .interactive="${false}"
                      ></app-persona>
                    </div>
                    <button
                      type="button"
                      class="logout-btn"
                      title="${t.viewTexts.sidebar.logoutTitle}"
                      aria-label="${t.viewTexts.sidebar.logoutTitle}"
                      @click="${(e: Event) => {
                        e.stopPropagation();
                        store.logout();
                      }}"
                    >
                      ${iconLogOut(15)}
                    </button>
                  </div>
                `;
          })()}
        </div>
      </div>
    `;
  }
}

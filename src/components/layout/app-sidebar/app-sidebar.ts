import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { SidebarGroupMode } from '../../../types';
import { getTranslation } from '../../../i18n';
import '../../common/app-avatar/app-avatar';
import styles from './app-sidebar.css';
import {
  iconMoon,
  iconSun,
  iconChevronLeft,
  iconChevronRight,
  iconZap,
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

  private handleModeChange(mode: SidebarGroupMode) {
    if (this.groupMode === mode) return;

    if (this.standalone) {
      this.groupMode = mode;
      if (mode === 'single' && this.expandedGroups.length > 1) {
        const groups = this.getSlottedGroups();
        const activeGroup = groups.find((g) => g.hasActive);
        const activeId = activeGroup ? activeGroup.groupId || activeGroup.label : this.expandedGroups[0];
        this.expandedGroups = activeId ? [activeId] : [];
      } else if (mode === 'single' && this.expandedGroups.length === 0) {
        const groups = this.getSlottedGroups();
        if (groups.length > 0) {
          this.expandedGroups = [groups[0].groupId || groups[0].label];
        }
      }
      this.syncSlottedItems();
      return;
    }

    store.setSidebarGroupMode(mode);
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
    const hasGroups = this.getSlottedGroups().length > 0 || !this.standalone;

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

        ${!this.collapsed && hasGroups
          ? html`
              <div class="nav-mode-bar">
                <span class="nav-mode-label">${t.navigation.groupsLabel}</span>
                <div class="nav-mode-switch" role="group" aria-label="${t.navigation.groupsLabel}">
                  <button
                    type="button"
                    class="nav-mode-btn ${this.groupMode === 'single' ? 'is-active' : ''}"
                    title="${t.navigation.groupModeSingleTitle}"
                    @click="${() => this.handleModeChange('single')}"
                  >
                    ${t.navigation.groupModeSingle}
                  </button>
                  <button
                    type="button"
                    class="nav-mode-btn ${this.groupMode === 'multiple' ? 'is-active' : ''}"
                    title="${t.navigation.groupModeMultipleTitle}"
                    @click="${() => this.handleModeChange('multiple')}"
                  >
                    ${t.navigation.groupModeMultiple}
                  </button>
                </div>
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
              ${this.theme === 'cyberpunk' ? iconZap(14) : this.theme === 'dark' ? iconSun(14) : iconMoon(14)}
              ${!this.collapsed
                ? html`<span>${this.theme === 'cyberpunk' ? 'Cyber' : this.theme === 'dark' ? 'Dark' : 'Light'}</span>`
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
                  <div class="user-profile">
                    <app-avatar size="md" initials="${currentUser.avatar}" title="${currentUser.name}" color="var(--bg-hover, #223049)"></app-avatar>
                    <div class="user-info">
                      <span class="user-name">${currentUser.name}</span>
                      <span class="user-role">${currentUser.role}</span>
                    </div>
                  </div>
                `
              : html`
                  <div class="user-profile" style="justify-content: center;">
                    <app-avatar size="md" initials="${currentUser.avatar}" title="${currentUser.name}" color="var(--bg-hover, #223049)"></app-avatar>
                  </div>
                `;
          })()}
        </div>
      </div>
    `;
  }
}

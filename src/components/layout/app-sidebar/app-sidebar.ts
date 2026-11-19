import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { SidebarGroupMode, PresenceStatus } from '../../../types';
import { getTranslation } from '../../../i18n';
import { effectivePresence, presenceLabel } from '../../../domain/presence-tokens';
import { PortalHandle, portalManager } from '../../common/app-modal-portal/app-modal-portal';
import { MenuItem } from '../../common/app-menu/app-menu';
import '../../common/app-presence-icon/app-presence-icon';
import { mapProjectOptions } from '../../common/entity-selector-options';
import '../../common/app-persona/app-persona';
import '../../common/app-menu/app-menu';
import '../../common/app-entity-selector/app-entity-selector';
import styles from './app-sidebar.css';
import {
  iconChevronLeft,
  iconChevronRight,
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
    this.closePresenceMenu();
  }

  private portalHandle: PortalHandle | null = null;

  private closePresenceMenu() {
    if (this.portalHandle) {
      this.portalHandle.close();
      this.portalHandle = null;
    }
  }

  /** The footer persona opens its menu: manual presence selection + the profile entry. */
  private openPresenceMenu() {
    if (this.portalHandle) {
      this.closePresenceMenu();
      return;
    }
    const t = getTranslation(this.currentLang);
    const currentUser = store.users.find((u) => u.id === store.currentUserId) || store.users[0];
    if (!currentUser) return;
    const anchor = this.shadowRoot?.querySelector('.user-persona') as HTMLElement | null;
    if (!anchor) return;

    const current = effectivePresence(currentUser);
    const options: PresenceStatus[] = ['available', 'online', 'away', 'busy', 'ooo', 'offline'];
    const items: MenuItem[] = [
      { id: 'presence-header', header: t.viewTexts.sidebar.presenceHeader },
      ...options.map((p) => ({
        id: `presence-${p}`,
        label: presenceLabel(p, this.currentLang, t),
        checked: p === current,
        // The icon renders inside app-menu's shadow root as a slotted element; it owns
        // its styles, so no inline geometry is needed (12px dot, explicit 8px glyph).
        // aria-hidden: the row text already carries the label, the icon is decoration.
        icon: html`<app-presence-icon
          size="12"
          glyph="8"
          presence="${p}"
          aria-hidden="true"
        ></app-presence-icon>`,
      })),
      { id: 'profile-divider', divider: true },
      { id: 'profile', label: t.viewTexts.sidebar.profileMenuItem },
    ];

    const rect = anchor.getBoundingClientRect();
    const minW = Math.max(200, Math.round(rect.width));
    const left = Math.max(8, Math.min(Math.round(rect.left), window.innerWidth - minW - 8));
    const spaceAbove = rect.top - 12;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const above = spaceAbove >= spaceBelow;
    const vert = above
      ? `bottom: ${Math.round(window.innerHeight - rect.top + 6)}px; top: auto;`
      : `top: ${Math.round(rect.bottom + 6)}px; bottom: auto;`;
    const maxH = Math.max(100, Math.min(320, above ? spaceAbove : spaceBelow));

    this.portalHandle = portalManager.mountTemplate({
      kind: 'popup',
      styles,
      template: html`
        <div
          class="popover-menu"
          style="left: ${left}px; right: auto; ${vert} min-width: ${minW}px; max-height: ${maxH}px;"
        >
          <app-menu .items="${items}" @select="${this.handlePresenceMenuSelect}"></app-menu>
        </div>
      `,
      host: this,
      closeOnBackdrop: true,
      onClose: () => {
        this.portalHandle = null;
      },
    });
  }

  private handlePresenceMenuSelect(e: CustomEvent) {
    e.stopPropagation();
    const id = String((e.detail as { id?: string })?.id || '');
    this.closePresenceMenu();
    if (id === 'profile') {
      store.setActiveView('profile-settings');
      return;
    }
    if (id.startsWith('presence-')) {
      store.setUserPresence(store.currentUserId, id.slice('presence-'.length) as PresenceStatus);
    }
  }

  private syncState() {
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
          ${(() => {
            const currentUser = store.users.find((u) => u.id === store.currentUserId) || store.users[0];
            if (!currentUser) return '';
            return !this.collapsed
              ? html`
                  <div class="user-footer-row">
                    <app-persona
                      class="user-persona"
                      size="32"
                      .initials="${currentUser.avatar}"
                      .presence="${effectivePresence(currentUser)}"
                      .primaryText="${currentUser.name}"
                      .secondaryText="${currentUser.role}"
                      .color="${'var(--bg-hover, #223049)'}"
                      @click="${() => this.openPresenceMenu()}"
                    ></app-persona>
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
                    <app-persona
                      class="user-persona"
                      size="32"
                      .initials="${currentUser.avatar}"
                      .presence="${effectivePresence(currentUser)}"
                      .color="${'var(--bg-hover, #223049)'}"
                      @click="${() => this.openPresenceMenu()}"
                    ></app-persona>
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

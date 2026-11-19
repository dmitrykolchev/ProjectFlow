import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { presenceFromStatus } from '../../../domain/presence-tokens';
import {
  Project,
  ProjectChatChannel,
  ProjectChatMessage,
  ProjectRole,
  Task,
  User,
} from '../../../types';
import {
  iconArchive,
  iconChevronDown,
  iconChevronRight,
  iconCornerUpLeft,
  iconEdit,
  iconFolder,
  iconHash,
  iconMessageSquare,
  iconPin,
  iconPlus,
  iconRefreshCw,
  iconSearch,
  iconSend,
  iconTrash,
  iconUsers,
  iconX,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-textarea/app-textarea';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-select/app-select';
import '../../common/app-modal/app-modal';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-persona/app-persona';
import styles from './app-project-chat.css';
import { eventValue } from '../../common/event-value';

const QUICK_REACTIONS = ['👍', '✅', '🔥', '👏', '👀'];

@customElement('app-project-chat')
export class AppProjectChat extends LitElement {
  @state() private projects: Project[] = store.projects;
  @state() private channels: ProjectChatChannel[] = store.chatChannels;
  @state() private users: User[] = store.users;
  @state() private tasks: Task[] = store.tasks;
  @state() private messages: ProjectChatMessage[] = store.chatMessages;
  @state() private activeProjectId: string =
    store.chatProjectId || store.projects[0]?.id || '';
  @state() private activeChannelId: string = store.chatChannelId || '';
  @state() private currentUserId: string = store.currentUserId || store.users[0]?.id || '';
  @state() private currentLang = store.customization.language;

  @state() private collapsedProjectIds: string[] = [];
  @state() private showArchived = false;
  @state() private channelSearch = '';
  @state() private messageSearch = '';
  @state() private draftText = '';
  @state() private taskRefId = '';
  @state() private replyToId: string | null = null;
  @state() private showMembersPane = true;
  @state() private showPinnedExpanded = true;

  @state() private editingMsgId: string | null = null;
  @state() private editingMsgText = '';
  @state() private deletingMessage: ProjectChatMessage | null = null;

  @state() private channelModalOpen = false;
  @state() private editingChannelId: string | null = null;
  @state() private formChannelProjectId = '';
  @state() private formChannelName = '';
  @state() private formChannelSlug = '';
  @state() private slugManuallyEdited = false;
  @state() private formChannelDesc = '';
  @state() private formChannelError = '';

  @state() private archivingChannelTarget: ProjectChatChannel | null = null;
  @state() private deletingChannelTarget: ProjectChatChannel | null = null;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => this.syncState());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private syncState() {
    this.projects = store.projects;
    this.channels = store.chatChannels;
    this.users = store.users;
    this.tasks = store.tasks;
    this.messages = store.chatMessages;
    this.currentLang = store.customization.language;
    this.currentUserId = store.currentUserId || this.users[0]?.id || '';

    const candidateProject = store.chatProjectId || this.activeProjectId;
    if (candidateProject && this.projects.some((p) => p.id === candidateProject)) {
      this.activeProjectId = candidateProject;
    } else {
      this.activeProjectId = this.projects[0]?.id || '';
    }

    const projectChannels = this.activeProjectId
      ? store.getProjectChatChannels(this.activeProjectId, true)
      : [];
    const candidateChannel = store.chatChannelId || this.activeChannelId;
    if (candidateChannel && projectChannels.some((c) => c.id === candidateChannel)) {
      this.activeChannelId = candidateChannel;
    } else {
      const nextCh =
        projectChannels.find((c) => !c.archived && c.isDefault) ||
        projectChannels.find((c) => !c.archived) ||
        projectChannels[0];
      this.activeChannelId = nextCh?.id || '';
    }
  }

  firstUpdated() {
    this.scrollToBottom();
  }

  private handleSelectChannel(channel: ProjectChatChannel) {
    this.activeProjectId = channel.projectId;
    this.activeChannelId = channel.id;
    store.selectChatChannel(channel.id);
    this.replyToId = null;
    this.taskRefId = '';
    this.editingMsgId = null;
    this.scrollToBottom();
  }

  private handleSelectProjectFallback(projectId: string) {
    this.activeProjectId = projectId;
    const ch = store.getDefaultChatChannel(projectId);
    this.activeChannelId = ch?.id || '';
    store.chatProjectId = projectId;
    store.chatChannelId = this.activeChannelId;
    if (this.collapsedProjectIds.includes(projectId)) {
      this.collapsedProjectIds = this.collapsedProjectIds.filter((id) => id !== projectId);
    }
    this.replyToId = null;
    this.taskRefId = '';
    this.editingMsgId = null;
    this.scrollToBottom();
  }

  private toggleProjectCollapse(projectId: string) {
    if (this.collapsedProjectIds.includes(projectId)) {
      this.collapsedProjectIds = this.collapsedProjectIds.filter((id) => id !== projectId);
    } else {
      this.collapsedProjectIds = [...this.collapsedProjectIds, projectId];
    }
  }

  private openCreateChannelModal(projectId: string) {
    if (!store.isUserProjectMember(projectId, this.currentUserId)) return;
    this.editingChannelId = null;
    this.formChannelProjectId = projectId;
    this.formChannelName = '';
    this.formChannelSlug = '';
    this.slugManuallyEdited = false;
    this.formChannelDesc = '';
    this.formChannelError = '';
    this.channelModalOpen = true;
  }

  private openEditChannelModal(channel: ProjectChatChannel) {
    if (!store.isUserProjectMember(channel.projectId, this.currentUserId)) return;
    this.editingChannelId = channel.id;
    this.formChannelProjectId = channel.projectId;
    this.formChannelName = channel.name;
    this.formChannelSlug = channel.slug;
    this.slugManuallyEdited = true;
    this.formChannelDesc = channel.description || '';
    this.formChannelError = '';
    this.channelModalOpen = true;
  }

  private closeChannelModal() {
    this.channelModalOpen = false;
    this.editingChannelId = null;
    this.formChannelError = '';
  }

  private handleSaveChannel() {
    const t = getTranslation(this.currentLang);
    const trimmedName = this.formChannelName.trim();
    if (!trimmedName) {
      this.formChannelError = t.common.required;
      return;
    }

    const projectId = this.formChannelProjectId || this.activeProjectId;
    if (!store.isUserProjectMember(projectId, this.currentUserId)) {
      this.formChannelError = t.viewTexts.projectChat.nonMemberHint;
      return;
    }

    const desiredSlug = store.slugifyChannelName(
      this.formChannelSlug.trim() || trimmedName
    );
    const duplicate = this.channels.some(
      (c) =>
        c.projectId === projectId &&
        c.id !== this.editingChannelId &&
        c.slug.toLowerCase() === desiredSlug.toLowerCase()
    );
    if (duplicate && this.slugManuallyEdited) {
      this.formChannelError = t.viewTexts.projectChat.duplicateSlugError;
      return;
    }

    if (this.editingChannelId) {
      const ok = store.updateChatChannel(
        this.editingChannelId,
        {
          name: trimmedName,
          slug: desiredSlug,
          description: this.formChannelDesc.trim(),
        },
        this.currentUserId
      );
      if (!ok) {
        this.formChannelError = t.viewTexts.projectChat.nonMemberHint;
        return;
      }
      this.closeChannelModal();
      return;
    }

    const created = store.addChatChannel({
      projectId,
      name: trimmedName,
      slug: desiredSlug,
      description: this.formChannelDesc.trim(),
      createdById: this.currentUserId,
    });
    if (!created) {
      this.formChannelError = t.viewTexts.projectChat.nonMemberHint;
      return;
    }

    this.collapsedProjectIds = this.collapsedProjectIds.filter((id) => id !== projectId);
    this.activeProjectId = created.projectId;
    this.activeChannelId = created.id;
    this.closeChannelModal();
    this.scrollToBottom();
  }

  private scrollToBottom() {
    this.updateComplete.then(() => {
      requestAnimationFrame(() => {
        const container = this.shadowRoot?.querySelector('.messages-scroll');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    });
  }

  private formatMessageTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(getTranslation(this.currentLang).common.locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatShortDay(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    const t = getTranslation(this.currentLang);
    if (sameDay(d, today)) return t.projectChat.today;
    if (sameDay(d, yesterday)) return t.projectChat.yesterday;
    return d.toLocaleDateString(t.common.locale, {
      day: 'numeric',
      month: 'long',
    });
  }

  private getDateKey(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private getMemberRoleLabel(project: Project, userId: string): string | null {
    const t = getTranslation(this.currentLang);
    const membership = (project.members || []).find((m) => m.userId === userId);
    if (!membership) return null;
    return t.projectRoles[membership.role];
  }

  render() {
    const t = getTranslation(this.currentLang);
    const activeProject =
      this.projects.find((p) => p.id === this.activeProjectId) || this.projects[0] || null;

    if (!activeProject) {
      return html`
        <app-empty-state title="${t.viewTexts.projectChat.emptyNoProject}">
          <span slot="icon">${iconMessageSquare(48)}</span>
        </app-empty-state>
      `;
    }

    const activeProjectChannels = store.getProjectChatChannels(activeProject.id, true);
    const activeChannel =
      activeProjectChannels.find((c) => c.id === this.activeChannelId) ||
      activeProjectChannels.find((c) => !c.archived && c.isDefault) ||
      activeProjectChannels.find((c) => !c.archived) ||
      activeProjectChannels[0] ||
      null;

    const isMemberOfActive = store.isUserProjectMember(activeProject.id, this.currentUserId);
    const isArchivedChannel = Boolean(activeChannel?.archived);
    const effectiveShowArchived = this.showArchived || isArchivedChannel;
    const archivedTotalCount = this.channels.filter((c) => c.archived).length;
    const activeChannelsTotalCount = this.channels.filter((c) => !c.archived).length;

    const chQuery = this.channelSearch.trim().toLowerCase();
    const projectTree = this.projects
      .map((proj) => {
        const allProjChannels = store.getProjectChatChannels(proj.id, true);
        const visibleByArchive = effectiveShowArchived
          ? allProjChannels
          : allProjChannels.filter((c) => !c.archived || c.id === activeChannel?.id);

        const projMatches =
          !chQuery ||
          proj.name.toLowerCase().includes(chQuery) ||
          proj.key.toLowerCase().includes(chQuery);

        const matchedChannels = projMatches
          ? visibleByArchive
          : visibleByArchive.filter(
              (c) =>
                c.name.toLowerCase().includes(chQuery) ||
                c.slug.toLowerCase().includes(chQuery) ||
                (c.description || '').toLowerCase().includes(chQuery)
            );

        return {
          proj,
          allProjChannels,
          matchedChannels,
          projMatches,
        };
      })
      .filter((entry) => entry.projMatches || entry.matchedChannels.length > 0);

    const channelMessages = activeChannel
      ? this.messages
          .filter((m) => m.projectId === activeProject.id && m.channelId === activeChannel.id)
          .sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0))
      : [];

    const msgQuery = this.messageSearch.trim().toLowerCase();
    const filteredMessages = msgQuery
      ? channelMessages.filter((m) => {
          const sender = this.users.find((u) => u.id === m.senderId);
          return (
            m.text.toLowerCase().includes(msgQuery) ||
            (m.taskRefId || '').toLowerCase().includes(msgQuery) ||
            (sender?.name || '').toLowerCase().includes(msgQuery)
          );
        })
      : channelMessages;

    const pinnedMessages = channelMessages.filter((m) => m.pinned);

    const projectTasks = this.tasks.filter((tk) => tk.projectId === activeProject.id);
    const taskRefOptions = [
      { value: '', label: t.projectChat.noTaskRef },
      ...projectTasks.slice(0, 50).map((tk) => ({
        value: tk.id,
        label: `${tk.id} · ${tk.title}`,
      })),
    ];

    const userSwitchOptions = this.users.map((u) => ({
      value: u.id,
      label: `${u.name} (${u.role})`,
    }));

    const mobileProjectOptions = this.projects.map((p) => ({
      value: p.id,
      label: `[${p.key}] ${p.name}`,
      color: p.color,
    }));

    const mobileChannelOptions = activeProjectChannels.map((c) => ({
      value: c.id,
      label: `#${c.name}${c.archived ? ` (${t.viewTexts.projectChat.archivedBadge})` : ''}`,
    }));

    const replyTarget = this.replyToId
      ? channelMessages.find((m) => m.id === this.replyToId) || null
      : null;
    const replyTargetAuthor = replyTarget
      ? this.users.find((u) => u.id === replyTarget.senderId)
      : null;

    const uniqueMemberMap = new Map<
      string,
      { user: User; roles: ProjectRole[]; allocation: number }
    >();
    for (const m of activeProject.members || []) {
      const user = this.users.find((u) => u.id === m.userId);
      if (!user) continue;
      const existing = uniqueMemberMap.get(user.id);
      if (existing) {
        if (!existing.roles.includes(m.role)) existing.roles.push(m.role);
        existing.allocation = Math.min(100, existing.allocation + m.allocation);
      } else {
        uniqueMemberMap.set(user.id, { user, roles: [m.role], allocation: m.allocation });
      }
    }
    const participantList = Array.from(uniqueMemberMap.values());

    const groupedByDate: { dateKey: string; label: string; items: ProjectChatMessage[] }[] = [];
    for (const msg of filteredMessages) {
      const dateKey = this.getDateKey(msg.createdAt);
      let group = groupedByDate[groupedByDate.length - 1];
      if (!group || group.dateKey !== dateKey) {
        group = {
          dateKey,
          label: this.formatShortDay(msg.createdAt),
          items: [],
        };
        groupedByDate.push(group);
      }
      group.items.push(msg);
    }

    const memberProjectOptions = this.projects
      .filter((p) => store.isUserProjectMember(p.id, this.currentUserId))
      .map((p) => ({
        value: p.id,
        label: `[${p.key}] ${p.name}`,
        color: p.color,
      }));

    const archiveDialogProject = this.archivingChannelTarget
      ? this.projects.find((p) => p.id === this.archivingChannelTarget!.projectId)
      : null;
    const deleteDialogProject = this.deletingChannelTarget
      ? this.projects.find((p) => p.id === this.deletingChannelTarget!.projectId)
      : null;
    const deletingChannelMsgCount = this.deletingChannelTarget
      ? this.messages.filter((m) => m.channelId === this.deletingChannelTarget!.id).length
      : 0;

    return html`
      <div class="chat-shell ${this.showMembersPane ? '' : 'members-hidden'}">
        <!-- Left Projects & Channels Sidebar -->
        <aside class="channels-pane">
          <div class="pane-top">
            <div class="pane-title-row">
              <h2 class="pane-heading">
                ${iconMessageSquare(16)}
                <span>${t.projectChat.channels}</span>
              </h2>
              <app-button
                variant="primary"
                size="xs"
                ?disabled="${!isMemberOfActive}"
                title="${isMemberOfActive
                  ? t.viewTexts.projectChat.newChannelBtn
                  : t.viewTexts.projectChat.nonMemberHint}"
                @click="${() => this.openCreateChannelModal(activeProject.id)}"
              >
                <span slot="icon-start">${iconPlus(13)}</span>
                <span>${t.viewTexts.projectChat.newChannelBtn}</span>
              </app-button>
            </div>

            <app-input
              size="sm"
              placeholder="${t.projectChat.searchChannels}"
              .value="${this.channelSearch}"
              clearable
              @input="${(e: CustomEvent<{ value: string }>) => (this.channelSearch = eventValue(e))}"
            >
              <span slot="icon">${iconSearch(14)}</span>
            </app-input>

            <div class="sidebar-filter-row">
              <span class="sidebar-summary-count">
                ${this.projects.length} / ${activeChannelsTotalCount} ${t.viewTexts.projectChat.channelsSuffix}
              </span>
              ${archivedTotalCount > 0
                ? html`
                    <button
                      type="button"
                      class="archive-toggle-btn ${this.showArchived ? 'is-on' : ''}"
                      @click="${() => (this.showArchived = !this.showArchived)}"
                    >
                      ${iconArchive(12)}
                      <span>
                        ${this.showArchived
                          ? t.viewTexts.projectChat.hideArchivedLabel
                          : t.viewTexts.projectChat.showArchivedLabel(archivedTotalCount)}
                      </span>
                    </button>
                  `
                : ''}
            </div>
          </div>

          <div class="channels-scroll">
            ${projectTree.map(({ proj, matchedChannels }) => {
              const isCollapsed = !chQuery && this.collapsedProjectIds.includes(proj.id);
              const isProjMember = store.isUserProjectMember(proj.id, this.currentUserId);
              const isProjCurrent = proj.id === activeProject.id;

              return html`
                <div class="project-group">
                  <div class="project-group-header ${isProjCurrent ? 'is-current' : ''}">
                    <button
                      type="button"
                      class="project-toggle-btn"
                      @click="${() => this.toggleProjectCollapse(proj.id)}"
                    >
                      <span class="project-chevron">
                        ${isCollapsed ? iconChevronRight(13) : iconChevronDown(13)}
                      </span>
                      <span class="proj-dot" style="background: ${proj.color};"></span>
                      <span class="proj-key">${proj.key}</span>
                      <span class="project-title-text">${proj.name}</span>
                      <span class="project-ch-count">${matchedChannels.length}</span>
                    </button>

                    <button
                      type="button"
                      class="project-add-ch-btn"
                      ?disabled="${!isProjMember}"
                      title="${isProjMember
                        ? t.viewTexts.projectChat.newChannelBtn
                        : t.viewTexts.projectChat.nonMemberHint}"
                      @click="${(e: MouseEvent) => {
                        e.stopPropagation();
                        this.openCreateChannelModal(proj.id);
                      }}"
                    >
                      ${iconPlus(13)}
                    </button>
                  </div>

                  ${!isCollapsed
                    ? html`
                        <div class="project-channels-list">
                          ${matchedChannels.length === 0
                            ? html`<div class="project-empty-ch">${t.viewTexts.projectChat.emptyNoChannels}</div>`
                            : matchedChannels.map((ch) => {
                                const chMsgs = this.messages
                                  .filter((m) => m.projectId === proj.id && m.channelId === ch.id)
                                  .sort(
                                    (a, b) =>
                                      (Date.parse(a.createdAt) || 0) -
                                      (Date.parse(b.createdAt) || 0)
                                  );
                                const lastMsg = chMsgs[chMsgs.length - 1];
                                const lastSender = lastMsg
                                  ? this.users.find((u) => u.id === lastMsg.senderId)
                                  : null;
                                const isChActive = activeChannel?.id === ch.id;

                                return html`
                                  <button
                                    type="button"
                                    class="channel-item ${isChActive ? 'is-active' : ''} ${ch.archived ? 'is-archived' : ''}"
                                    @click="${() => this.handleSelectChannel(ch)}"
                                  >
                                    <div class="channel-top-line">
                                      <div class="channel-ident">
                                        <span class="channel-hash">
                                          ${ch.archived ? iconArchive(13) : iconHash(13)}
                                        </span>
                                        <span class="channel-name">${ch.name}</span>
                                        ${ch.archived
                                          ? html`
                                              <app-badge variant="warning" appearance="soft" size="sm">
                                                ${t.viewTexts.projectChat.archivedBadge}
                                              </app-badge>
                                            `
                                          : ''}
                                      </div>
                                      <span class="channel-count">${chMsgs.length}</span>
                                    </div>
                                    <div class="channel-preview">
                                      <span class="channel-snippet">
                                        ${lastMsg
                                          ? `${lastSender?.name.split(' ')[0] || ''}: ${lastMsg.text}`
                                          : ch.description || t.viewTexts.projectChat.noMessages}
                                      </span>
                                      ${lastMsg
                                        ? html`<span class="channel-time">${this.formatMessageTime(lastMsg.createdAt)}</span>`
                                        : ''}
                                    </div>
                                  </button>
                                `;
                              })}
                        </div>
                      `
                    : ''}
                </div>
              `;
            })}
          </div>

          <div class="acting-as-box">
            <app-select
              size="sm"
              label="${t.projectChat.actingAs}"
              .value="${this.currentUserId}"
              .options="${userSwitchOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => store.setCurrentUser(eventValue(e))}"
            ></app-select>
            <div class="membership-status-row">
              <app-badge
                variant="${isMemberOfActive ? 'success' : 'warning'}"
                appearance="soft"
                size="sm"
                dot
              >
                ${isMemberOfActive
                  ? t.viewTexts.projectChat.memberBadge
                  : t.viewTexts.projectChat.nonMemberBadge}
              </app-badge>
            </div>
            ${!isMemberOfActive
              ? html`<p class="non-member-hint">${t.viewTexts.projectChat.nonMemberHint}</p>`
              : ''}
          </div>
        </aside>

        <!-- Center Stream & Composer -->
        <section class="chat-main">
          <header class="chat-header">
            <div class="chat-header-left">
              <div class="mobile-channel-switch">
                <div class="mobile-select-item">
                  <app-select
                    size="sm"
                    placeholder="${t.viewTexts.projectChat.mobileProjectLabel}"
                    .value="${activeProject.id}"
                    .options="${mobileProjectOptions}"
                    @change="${(e: CustomEvent<{ value: string }>) =>
                      this.handleSelectProjectFallback(eventValue(e))}"
                  ></app-select>
                </div>
                ${mobileChannelOptions.length > 0
                  ? html`
                      <div class="mobile-select-item">
                        <app-select
                          size="sm"
                          placeholder="${t.viewTexts.projectChat.mobileChannelLabel}"
                          .value="${activeChannel?.id || ''}"
                          .options="${mobileChannelOptions}"
                          @change="${(e: CustomEvent<{ value: string }>) => {
                            const nextCh = this.channels.find((c) => c.id === eventValue(e));
                            if (nextCh) this.handleSelectChannel(nextCh);
                          }}"
                        ></app-select>
                      </div>
                    `
                  : ''}
              </div>

              <span
                class="proj-dot"
                style="background: ${activeProject.color}; width: 11px; height: 11px;"
              ></span>
              <div class="channel-header-info">
                <div class="channel-title-row">
                  <span class="proj-key">${activeProject.key}</span>
                  <h1 class="channel-title">
                    ${activeChannel
                      ? html`
                          <span class="title-hash">
                            ${activeChannel.archived ? iconArchive(16) : iconHash(16)}
                          </span>
                          <span>${activeChannel.name}</span>
                        `
                      : activeProject.name}
                  </h1>
                  ${activeChannel?.isDefault
                    ? html`
                        <app-badge variant="primary" appearance="soft" size="sm">
                          ${t.viewTexts.projectChat.defaultChannelBadge}
                        </app-badge>
                      `
                    : ''}
                  ${activeChannel?.archived
                    ? html`
                        <app-badge variant="warning" appearance="soft" size="sm">
                          ${t.viewTexts.projectChat.archivedBadge}
                        </app-badge>
                      `
                    : ''}
                  <app-badge variant="neutral" appearance="soft" size="sm">
                    ${channelMessages.length} ${t.viewTexts.projectChat.msgsSuffix}
                  </app-badge>
                </div>
                <div class="channel-subtitle">
                  ${activeChannel?.description || activeProject.description || t.projectChat.subtitle}
                </div>
              </div>
            </div>

            <div class="chat-header-actions">
              <div class="header-search">
                <app-input
                  size="sm"
                  placeholder="${t.projectChat.searchMessages}"
                  .value="${this.messageSearch}"
                  clearable
                  @input="${(e: CustomEvent<{ value: string }>) => (this.messageSearch = eventValue(e))}"
                >
                  <span slot="icon">${iconSearch(14)}</span>
                </app-input>
              </div>

              ${activeChannel
                ? html`
                    <div class="channel-mgmt-group">
                      <app-button
                        size="sm"
                        variant="outline"
                        action="edit"
                        icon-only
                        ?disabled="${!isMemberOfActive}"
                        title="${isMemberOfActive
                          ? t.viewTexts.projectChat.editChannelTooltip
                          : t.viewTexts.projectChat.nonMemberHint}"
                        @click="${() => this.openEditChannelModal(activeChannel)}"
                      >
                        ${iconEdit(14)}
                      </app-button>

                      ${activeChannel.archived
                        ? html`
                            <app-button
                              size="sm"
                              variant="outline"
                              icon-only
                              ?disabled="${!isMemberOfActive}"
                              title="${isMemberOfActive
                                ? t.viewTexts.projectChat.restoreChannelTooltip
                                : t.viewTexts.projectChat.nonMemberHint}"
                              @click="${() =>
                                store.archiveChatChannel(activeChannel.id, false, this.currentUserId)}"
                            >
                              ${iconRefreshCw(14)}
                            </app-button>
                          `
                        : html`
                            <app-button
                              size="sm"
                              variant="outline"
                              icon-only
                              ?disabled="${!isMemberOfActive}"
                              title="${isMemberOfActive
                                ? t.viewTexts.projectChat.archiveChannelTooltip
                                : t.viewTexts.projectChat.nonMemberHint}"
                              @click="${() => (this.archivingChannelTarget = activeChannel)}"
                            >
                              ${iconArchive(14)}
                            </app-button>
                          `}

                      <app-button
                        size="sm"
                        variant="outline"
                        action="delete"
                        icon-only
                        ?disabled="${!isMemberOfActive}"
                        title="${isMemberOfActive
                          ? t.viewTexts.projectChat.deleteChannelTooltip
                          : t.viewTexts.projectChat.nonMemberHint}"
                        @click="${() => (this.deletingChannelTarget = activeChannel)}"
                      >
                        ${iconTrash(14)}
                      </app-button>
                    </div>
                  `
                : ''}

              <app-button
                size="sm"
                variant="outline"
                @click="${() => store.openProjectDetail(activeProject.id)}"
              >
                <span slot="icon-start">${iconFolder(14)}</span>
                <span>${t.projectChat.openProject}</span>
              </app-button>

              <app-button
                size="sm"
                variant="${this.showMembersPane ? 'secondary' : 'outline'}"
                @click="${() => (this.showMembersPane = !this.showMembersPane)}"
              >
                <span slot="icon-start">${iconUsers(14)}</span>
                <span>${participantList.length}</span>
              </app-button>
            </div>
          </header>

          ${activeChannel?.archived
            ? html`
                <div class="archived-channel-banner">
                  <div class="archived-banner-left">
                    <span class="archived-banner-icon">${iconArchive(16)}</span>
                    <div class="archived-banner-text">
                      <span class="archived-banner-title">
                        ${t.viewTexts.projectChat.archivedBannerTitle}
                      </span>
                      <span class="archived-banner-desc">
                        ${t.viewTexts.projectChat.archivedBannerText}
                      </span>
                    </div>
                  </div>
                  ${isMemberOfActive
                    ? html`
                        <app-button
                          size="sm"
                          variant="outline"
                          @click="${() =>
                            store.archiveChatChannel(activeChannel.id, false, this.currentUserId)}"
                        >
                          <span slot="icon-start">${iconRefreshCw(14)}</span>
                          <span>${t.viewTexts.projectChat.restoreChannelTooltip}</span>
                        </app-button>
                      `
                    : ''}
                </div>
              `
            : ''}

          ${pinnedMessages.length > 0
            ? html`
                <div class="pinned-banner">
                  <div class="pinned-toggle-row">
                    <button
                      type="button"
                      class="pinned-toggle-btn"
                      @click="${() => (this.showPinnedExpanded = !this.showPinnedExpanded)}"
                    >
                      ${iconPin(13)}
                      <span>${t.projectChat.pinnedMessages} (${pinnedMessages.length})</span>
                    </button>
                  </div>
                  ${this.showPinnedExpanded
                    ? html`
                        <div class="pinned-list">
                          ${pinnedMessages.map((pm) => {
                            const pAuthor = this.users.find((u) => u.id === pm.senderId);
                            return html`
                              <div class="pinned-item">
                                <div class="pinned-item-text">
                                  <span class="pinned-item-author">${pAuthor?.name || pm.senderId}:</span>
                                  <span>${pm.text}</span>
                                </div>
                                ${!isArchivedChannel
                                  ? html`
                                      <button
                                        type="button"
                                        class="msg-action-btn"
                                        title="${t.projectChat.unpin}"
                                        @click="${() => store.togglePinChatMessage(pm.id)}"
                                      >
                                        ${iconX(12)}
                                      </button>
                                    `
                                  : ''}
                              </div>
                            `;
                          })}
                        </div>
                      `
                    : ''}
                </div>
              `
            : ''}

          <div class="messages-scroll">
            ${!activeChannel
              ? html`
                  <app-empty-state title="${t.viewTexts.projectChat.emptyNoChannels}">
                    <span slot="icon">${iconHash(44)}</span>
                    ${isMemberOfActive
                      ? html`
                          <app-button
                            slot="action"
                            variant="primary"
                            @click="${() => this.openCreateChannelModal(activeProject.id)}"
                          >
                            <span slot="icon-start">${iconPlus(15)}</span>
                            <span>${t.viewTexts.projectChat.createFirstChannelBtn}</span>
                          </app-button>
                        `
                      : ''}
                  </app-empty-state>
                `
              : groupedByDate.length === 0
              ? html`
                  <app-empty-state title="${t.projectChat.emptyChannel}">
                    <span slot="icon">${iconMessageSquare(48)}</span>
                  </app-empty-state>
                `
              : groupedByDate.map(
                  (group) => html`
                    <div class="date-divider"><span>${group.label}</span></div>
                    ${group.items.map((msg) =>
                      this.renderMessage(
                        msg,
                        activeProject,
                        channelMessages,
                        isArchivedChannel,
                        t
                      )
                    )}
                  `
                )}
          </div>

          ${activeChannel
            ? html`
                <footer class="composer-dock">
                  ${isArchivedChannel
                    ? html`
                        <div class="archived-composer-bar">
                          <span class="archived-composer-msg">
                            ${iconArchive(15)}
                            <span>${t.viewTexts.projectChat.archivedComposerNotice}</span>
                          </span>
                          ${isMemberOfActive
                            ? html`
                                <app-button
                                  size="sm"
                                  variant="secondary"
                                  @click="${() =>
                                    store.archiveChatChannel(
                                      activeChannel.id,
                                      false,
                                      this.currentUserId
                                    )}"
                                >
                                  <span slot="icon-start">${iconRefreshCw(14)}</span>
                                  <span>${t.viewTexts.projectChat.restoreChannelTooltip}</span>
                                </app-button>
                              `
                            : ''}
                        </div>
                      `
                    : html`
                        ${replyTarget
                          ? html`
                              <div class="reply-banner">
                                <div class="reply-banner-info">
                                  ${t.projectChat.replyingTo}
                                  <strong>${replyTargetAuthor?.name || replyTarget.senderId}</strong>:
                                  ${replyTarget.text}
                                </div>
                                <button
                                  type="button"
                                  class="msg-action-btn"
                                  title="${t.projectChat.cancelReply}"
                                  @click="${() => (this.replyToId = null)}"
                                >
                                  ${iconX(13)}
                                </button>
                              </div>
                            `
                          : ''}

                        <div class="composer-controls-row">
                          <div class="task-attach-select">
                            <app-select
                              size="sm"
                              .value="${this.taskRefId}"
                              .options="${taskRefOptions}"
                              @change="${(e: CustomEvent<{ value: string }>) =>
                                (this.taskRefId = eventValue(e))}"
                            ></app-select>
                          </div>
                          <span class="sending-as-label">
                            ${t.viewTexts.projectChat.sendingAsLabel}
                            <strong>
                              ${this.users.find((u) => u.id === this.currentUserId)?.name || '—'}
                            </strong>
                          </span>
                        </div>

                        <div class="composer-input-row">
                          <textarea
                            class="composer-textarea"
                            placeholder="${t.projectChat.placeholder}"
                            .value="${this.draftText}"
                            @input="${(e: InputEvent) =>
                              (this.draftText = (e.target as HTMLTextAreaElement).value)}"
                            @keydown="${(e: KeyboardEvent) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                this.handleSendMessage(activeProject.id, activeChannel.id);
                              }
                            }}"
                          ></textarea>
                          <app-button
                            variant="primary"
                            size="md"
                            ?disabled="${!this.draftText.trim()}"
                            @click="${() =>
                              this.handleSendMessage(activeProject.id, activeChannel.id)}"
                          >
                            <span slot="icon-start">${iconSend(15)}</span>
                            <span>${t.projectChat.send}</span>
                          </app-button>
                        </div>
                      `}
                </footer>
              `
            : ''}
        </section>

        <!-- Right Participants Sidebar -->
        ${this.showMembersPane
          ? html`
              <aside class="members-pane">
                <div class="pane-top">
                  <div class="pane-title-row">
                    <h2 class="pane-heading">
                      ${iconUsers(16)}
                      <span>${t.projectChat.participants}</span>
                    </h2>
                    <span class="count-pill">${participantList.length}</span>
                  </div>
                </div>

                <div class="members-scroll">
                  ${participantList.length === 0
                    ? html`
                        <app-empty-state compact title="${t.viewTexts.projectChat.emptyNoMembers}"></app-empty-state>
                      `
                    : participantList.map((entry) => {
                        const rolesText = entry.roles.map((r) => t.projectRoles[r]).join(', ');
                        return html`
                          <div class="member-item">
                            <app-persona
                              class="member-persona"
                              size="32"
                              .initials="${entry.user.avatar}"
                              .presence="${presenceFromStatus(entry.user.status)}"
                              .primaryText="${entry.user.name}"
                              .secondaryText="${rolesText}"
                              @click="${() => store.openEmployeeDetail(entry.user.id)}"
                            ></app-persona>
                            <span class="member-alloc">${entry.allocation}%</span>
                          </div>
                        `;
                      })}
                </div>
              </aside>
            `
          : ''}
      </div>

      <!-- Create / Edit Channel Modal -->
      <app-modal
        ?open="${this.channelModalOpen}"
        size="md"
        title="${this.editingChannelId
          ? t.viewTexts.projectChat.editChannelTitle
          : t.viewTexts.projectChat.createChannelTitle}"
        .headerIcon="${iconHash(18)}"
        @close="${() => this.closeChannelModal()}"
      >
        <app-form-grid .columns="${1}">
          <app-select
            label="${t.viewTexts.projectChat.channelProjectLabel}"
            .value="${this.formChannelProjectId}"
            .options="${this.editingChannelId ? mobileProjectOptions : memberProjectOptions}"
            ?disabled="${Boolean(this.editingChannelId)}"
            @change="${(e: CustomEvent<{ value: string }>) => {
              this.formChannelProjectId = eventValue(e);
              this.formChannelError = '';
            }}"
          ></app-select>

          <app-input
            required
            label="${t.viewTexts.projectChat.channelNameLabel}"
            placeholder="${t.viewTexts.projectChat.channelNamePlaceholder}"
            .value="${this.formChannelName}"
            @input="${(e: CustomEvent<{ value: string }>) => {
              this.formChannelName = eventValue(e);
              this.formChannelError = '';
              if (!this.slugManuallyEdited) {
                this.formChannelSlug = store.slugifyChannelName(this.formChannelName);
              }
            }}"
          ></app-input>

          <app-input
            label="${t.viewTexts.projectChat.channelSlugLabel}"
            placeholder="${t.viewTexts.projectChat.channelSlugPlaceholder}"
            .value="${this.formChannelSlug}"
            @input="${(e: CustomEvent<{ value: string }>) => {
              this.slugManuallyEdited = true;
              this.formChannelSlug = eventValue(e);
              this.formChannelError = '';
            }}"
          ></app-input>

          <app-textarea
            .rows="${3}"
            label="${t.viewTexts.projectChat.channelDescLabel}"
            placeholder="${t.viewTexts.projectChat.channelDescPlaceholder}"
            .value="${this.formChannelDesc}"
            @input="${(e: CustomEvent<{ value: string }>) => {
              this.formChannelDesc = eventValue(e);
            }}"
          ></app-textarea>

          ${this.formChannelError
            ? html`<div class="modal-form-error">${this.formChannelError}</div>`
            : ''}
        </app-form-grid>

        <div slot="footer" class="modal-footer-actions">
          <app-button variant="ghost" @click="${() => this.closeChannelModal()}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSaveChannel()}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>

      <!-- Archive Channel Confirm Dialog -->
      <app-confirm-dialog
        .open="${Boolean(this.archivingChannelTarget)}"
        variant="warning"
        size="sm"
        title="${t.viewTexts.confirmDialogs.channelArchive.title}"
        .action="${this.archivingChannelTarget
          ? t.viewTexts.confirmDialogs.channelArchive.action(
              this.archivingChannelTarget.name,
              archiveDialogProject?.name || ''
            )
          : ''}"
        result="${t.viewTexts.confirmDialogs.channelArchive.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.viewTexts.projectChat.archiveChannelTooltip}"
        @cancel="${() => (this.archivingChannelTarget = null)}"
        @confirm="${() => {
          if (this.archivingChannelTarget) {
            store.archiveChatChannel(
              this.archivingChannelTarget.id,
              true,
              this.currentUserId
            );
            this.archivingChannelTarget = null;
          }
        }}"
      ></app-confirm-dialog>

      <!-- Delete Channel Confirm Dialog -->
      <app-confirm-dialog
        .open="${Boolean(this.deletingChannelTarget)}"
        variant="danger"
        icon="trash"
        size="sm"
        title="${t.viewTexts.confirmDialogs.channelDelete.title}"
        .action="${this.deletingChannelTarget
          ? t.viewTexts.confirmDialogs.channelDelete.action(
              this.deletingChannelTarget.name,
              deleteDialogProject?.name || ''
            )
          : ''}"
        .result="${t.viewTexts.confirmDialogs.channelDelete.result(deletingChannelMsgCount)}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingChannelTarget = null)}"
        @confirm="${() => {
          if (this.deletingChannelTarget) {
            store.deleteChatChannel(this.deletingChannelTarget.id, this.currentUserId);
            this.deletingChannelTarget = null;
          }
        }}"
      ></app-confirm-dialog>

      <!-- Delete Message Confirm Dialog -->
      <app-confirm-dialog
        .open="${Boolean(this.deletingMessage)}"
        variant="danger"
        icon="trash"
        size="sm"
        title="${t.viewTexts.confirmDialogs.messageDelete.title}"
        action="${t.viewTexts.confirmDialogs.messageDelete.action}"
        result="${t.viewTexts.confirmDialogs.messageDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingMessage = null)}"
        @confirm="${() => {
          if (this.deletingMessage) {
            store.deleteChatMessage(this.deletingMessage.id);
            this.deletingMessage = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private renderMessage(
    msg: ProjectChatMessage,
    activeProject: Project,
    channelMessages: ProjectChatMessage[],
    isArchivedChannel: boolean,
    t: ReturnType<typeof getTranslation>
  ) {
    const sender = this.users.find((u) => u.id === msg.senderId);
    const roleLabel = this.getMemberRoleLabel(activeProject, msg.senderId);
    const replyParent = msg.replyToId
      ? channelMessages.find((m) => m.id === msg.replyToId) || null
      : null;
    const replyParentSender = replyParent
      ? this.users.find((u) => u.id === replyParent.senderId)
      : null;
    const taskRef = msg.taskRefId
      ? this.tasks.find((tk) => tk.id === msg.taskRefId) || null
      : null;
    const isMine = msg.senderId === this.currentUserId;
    const isEditing = !isArchivedChannel && this.editingMsgId === msg.id;

    return html`
      <article class="msg-row ${msg.pinned ? 'is-pinned' : ''}">
        <app-persona
          class="msg-author"
          size="40"
          .initials="${sender?.avatar || '?'}"
          .presence="${presenceFromStatus(sender?.status)}"
          .primaryText="${sender?.name || msg.senderId}"
          .secondaryText="${roleLabel || ''}"
          @click="${() => sender && store.openEmployeeDetail(sender.id)}"
        ></app-persona>

        <div class="msg-content">
          <div class="msg-meta-bar">
            <div class="msg-author-group">
              <span class="msg-time">${this.formatMessageTime(msg.createdAt)}</span>
              ${msg.editedAt ? html`<span class="edited-mark">(${t.projectChat.edited})</span>` : ''}
              ${msg.pinned
                ? html`<span class="pin-indicator">${iconPin(11)} ${t.viewTexts.projectChat.pinnedShort}</span>`
                : ''}
            </div>

            ${!isArchivedChannel
              ? html`
                  <div class="msg-actions">
                    ${QUICK_REACTIONS.slice(0, 3).map(
                      (emoji) => html`
                        <button
                          type="button"
                          class="msg-action-btn"
                          title="${emoji}"
                          @click="${() =>
                            store.toggleChatReaction(msg.id, emoji, this.currentUserId)}"
                        >
                          ${emoji}
                        </button>
                      `
                    )}
                    <button
                      type="button"
                      class="msg-action-btn"
                      title="${t.projectChat.reply}"
                      @click="${() => (this.replyToId = msg.id)}"
                    >
                      ${iconCornerUpLeft(13)}
                    </button>
                    <button
                      type="button"
                      class="msg-action-btn ${msg.pinned ? 'is-active' : ''}"
                      title="${msg.pinned ? t.projectChat.unpin : t.projectChat.pin}"
                      @click="${() => store.togglePinChatMessage(msg.id)}"
                    >
                      ${iconPin(13)}
                    </button>
                    ${isMine
                      ? html`
                          <button
                            type="button"
                            class="msg-action-btn"
                            title="${t.projectChat.edit}"
                            @click="${() => {
                              this.editingMsgId = msg.id;
                              this.editingMsgText = msg.text;
                            }}"
                          >
                            ${iconEdit(13)}
                          </button>
                          <button
                            type="button"
                            class="msg-action-btn danger"
                            title="${t.projectChat.delete}"
                            @click="${() => (this.deletingMessage = msg)}"
                          >
                            ${iconTrash(13)}
                          </button>
                        `
                      : ''}
                  </div>
                `
              : ''}
          </div>

          ${replyParent
            ? html`
                <div class="reply-quote">
                  <span class="reply-quote-author">${replyParentSender?.name || replyParent.senderId}</span>
                  <span class="reply-quote-text">${replyParent.text}</span>
                </div>
              `
            : ''}

          ${taskRef
            ? html`
                <button
                  type="button"
                  class="task-ref-btn"
                  @click="${() => store.openTaskDetail(taskRef.id)}"
                >
                  <span class="task-ref-key">${taskRef.id}</span>
                  <span>${taskRef.title}</span>
                </button>
              `
            : ''}

          ${isEditing
            ? html`
                <div class="inline-edit-box">
                  <textarea
                    class="inline-edit-textarea"
                    .value="${this.editingMsgText}"
                    @input="${(e: InputEvent) =>
                      (this.editingMsgText = (e.target as HTMLTextAreaElement).value)}"
                  ></textarea>
                  <div class="inline-edit-actions">
                    <app-button
                      size="sm"
                      variant="primary"
                      @click="${() => this.handleSaveEdit(msg.id)}"
                    >
                      ${t.projectChat.saveEdit}
                    </app-button>
                    <app-button
                      size="sm"
                      variant="ghost"
                      @click="${() => {
                        this.editingMsgId = null;
                        this.editingMsgText = '';
                      }}"
                    >
                      ${t.projectChat.cancelEdit}
                    </app-button>
                  </div>
                </div>
              `
            : html`<p class="msg-text">${msg.text}</p>`}

          ${(msg.reactions || []).length > 0
            ? html`
                <div class="reactions-row">
                  ${(msg.reactions || []).map((reaction) => {
                    const isMineReacted = reaction.userIds.includes(this.currentUserId);
                    return html`
                      <button
                        type="button"
                        class="reaction-chip ${isMineReacted ? 'is-mine' : ''}"
                        ?disabled="${isArchivedChannel}"
                        @click="${() =>
                          !isArchivedChannel &&
                          store.toggleChatReaction(msg.id, reaction.emoji, this.currentUserId)}"
                      >
                        <span>${reaction.emoji}</span>
                        <span class="reaction-count">${reaction.userIds.length}</span>
                      </button>
                    `;
                  })}
                </div>
              `
            : ''}
        </div>
      </article>
    `;
  }

  private handleSendMessage(projectId: string, channelId: string) {
    const trimmed = this.draftText.trim();
    if (!trimmed) return;
    store.addChatMessage({
      projectId,
      channelId,
      senderId: this.currentUserId,
      text: trimmed,
      replyToId: this.replyToId || undefined,
      taskRefId: this.taskRefId || undefined,
    });
    this.draftText = '';
    this.replyToId = null;
    this.taskRefId = '';
    this.scrollToBottom();
  }

  private handleSaveEdit(msgId: string) {
    if (!this.editingMsgText.trim()) return;
    store.updateChatMessage(msgId, this.editingMsgText);
    this.editingMsgId = null;
    this.editingMsgText = '';
  }
}
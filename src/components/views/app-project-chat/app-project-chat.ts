import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { Project, ProjectChatMessage, ProjectRole, Task, User } from '../../../types';
import {
  iconCornerUpLeft,
  iconEdit,
  iconFolder,
  iconMessageSquare,
  iconPin,
  iconSearch,
  iconSend,
  iconTrash,
  iconUsers,
  iconX,
} from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-select/app-select';
import '../../common/app-modal/app-modal';
import '../../common/app-empty-state/app-empty-state';
import styles from './app-project-chat.css';
import { eventValue } from '../../common/event-value';

const QUICK_REACTIONS = ['👍', '✅', '🔥', '👏', '👀'];

const ROLE_COLORS: Record<ProjectRole, string> = {
  pm: '#f59e0b',
  tech_lead: '#8b5cf6',
  architect: '#ec4899',
  developer: '#6366f1',
  designer: '#06b6d4',
  qa: '#10b981',
  analyst: '#3b82f6',
  devops: '#f97316',
};

@customElement('app-project-chat')
export class AppProjectChat extends LitElement {
  @state() private projects: Project[] = store.projects;
  @state() private users: User[] = store.users;
  @state() private tasks: Task[] = store.tasks;
  @state() private messages: ProjectChatMessage[] = store.chatMessages;
  @state() private activeProjectId: string =
    store.chatProjectId || store.projects[0]?.id || '';
  @state() private currentUserId: string = store.currentUserId || store.users[0]?.id || '';
  @state() private currentLang = store.customization.language;

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
    this.users = store.users;
    this.tasks = store.tasks;
    this.messages = store.chatMessages;
    this.currentLang = store.customization.language;
    this.currentUserId = store.currentUserId || this.users[0]?.id || '';

    const candidate = store.chatProjectId || this.activeProjectId;
    if (candidate && this.projects.some((p) => p.id === candidate)) {
      this.activeProjectId = candidate;
    } else {
      this.activeProjectId = this.projects[0]?.id || '';
    }
  }

  firstUpdated() {
    this.scrollToBottom();
  }

  private selectChannel(projectId: string) {
    this.activeProjectId = projectId;
    store.chatProjectId = projectId;
    this.replyToId = null;
    this.taskRefId = '';
    this.editingMsgId = null;
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
    return d.toLocaleTimeString(this.currentLang === 'ru' ? 'ru-RU' : 'en-US', {
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
    return d.toLocaleDateString(this.currentLang === 'ru' ? 'ru-RU' : 'en-US', {
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

  private getMemberRoleColor(project: Project, userId: string): string {
    const membership = (project.members || []).find((m) => m.userId === userId);
    return membership ? ROLE_COLORS[membership.role] : '#64748b';
  }

  render() {
    const t = getTranslation(this.currentLang);
    const isRu = this.currentLang === 'ru';
    const activeProject =
      this.projects.find((p) => p.id === this.activeProjectId) || this.projects[0] || null;

    if (!activeProject) {
      return html`
        <app-empty-state title="${isRu ? 'Создайте хотя бы один проект, чтобы начать переписку' : 'Create a project to start chatting'}">
          <span slot="icon">${iconMessageSquare(48)}</span>
        </app-empty-state>
      `;
    }

    const chQuery = this.channelSearch.trim().toLowerCase();
    const visibleProjects = this.projects.filter((p) => {
      if (!chQuery) return true;
      return (
        p.name.toLowerCase().includes(chQuery) ||
        p.key.toLowerCase().includes(chQuery)
      );
    });

    const projectMessages = this.messages
      .filter((m) => m.projectId === activeProject.id)
      .sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0));

    const msgQuery = this.messageSearch.trim().toLowerCase();
    const filteredMessages = msgQuery
      ? projectMessages.filter((m) => {
          const sender = this.users.find((u) => u.id === m.senderId);
          return (
            m.text.toLowerCase().includes(msgQuery) ||
            (m.taskRefId || '').toLowerCase().includes(msgQuery) ||
            (sender?.name || '').toLowerCase().includes(msgQuery)
          );
        })
      : projectMessages;

    const pinnedMessages = projectMessages.filter((m) => m.pinned);

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

    const channelSwitchOptions = this.projects.map((p) => ({
      value: p.id,
      label: `[${p.key}] ${p.name}`,
      color: p.color,
    }));

    const replyTarget = this.replyToId
      ? projectMessages.find((m) => m.id === this.replyToId) || null
      : null;
    const replyTargetAuthor = replyTarget
      ? this.users.find((u) => u.id === replyTarget.senderId)
      : null;

    // Deduplicate project members by userId for participants sidebar while preserving roles
    const uniqueMemberMap = new Map<string, { user: User; roles: ProjectRole[]; allocation: number }>();
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

    // Group filtered messages by date
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

    return html`
      <div class="chat-shell ${this.showMembersPane ? '' : 'members-hidden'}">
        <!-- Left Channels Sidebar -->
        <aside class="channels-pane">
          <div class="pane-top">
            <div class="pane-title-row">
              <h2 class="pane-heading">
                ${iconMessageSquare(16)}
                <span>${t.projectChat.channels}</span>
              </h2>
              <span class="count-pill">${this.projects.length}</span>
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
          </div>

          <div class="channels-scroll">
            ${visibleProjects.map((proj) => {
              const msgs = this.messages
                .filter((m) => m.projectId === proj.id)
                .sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0));
              const lastMsg = msgs[msgs.length - 1];
              const lastSender = lastMsg
                ? this.users.find((u) => u.id === lastMsg.senderId)
                : null;
              const isActive = proj.id === activeProject.id;

              return html`
                <button
                  type="button"
                  class="channel-item ${isActive ? 'is-active' : ''}"
                  @click="${() => this.selectChannel(proj.id)}"
                >
                  <div class="channel-top-line">
                    <div class="channel-ident">
                      <span class="proj-dot" style="background: ${proj.color};"></span>
                      <span class="proj-key">${proj.key}</span>
                      <span class="channel-name">${proj.name}</span>
                    </div>
                    <span class="channel-count">${msgs.length}</span>
                  </div>
                  <div class="channel-preview">
                    <span class="channel-snippet">
                      ${lastMsg
                        ? `${lastSender?.name.split(' ')[0] || ''}: ${lastMsg.text}`
                        : isRu
                        ? 'Нет сообщений'
                        : 'No messages'}
                    </span>
                    ${lastMsg
                      ? html`<span class="channel-time">${this.formatMessageTime(lastMsg.createdAt)}</span>`
                      : ''}
                  </div>
                </button>
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
          </div>
        </aside>

        <!-- Center Stream & Composer -->
        <section class="chat-main">
          <header class="chat-header">
            <div class="chat-header-left">
              <div class="mobile-channel-switch">
                <app-select
                  size="sm"
                  .value="${activeProject.id}"
                  .options="${channelSwitchOptions}"
                  @change="${(e: CustomEvent<{ value: string }>) =>
                    this.selectChannel(eventValue(e))}"
                ></app-select>
              </div>

              <span class="proj-dot" style="background: ${activeProject.color}; width: 11px; height: 11px;"></span>
              <div class="channel-header-info">
                <div class="channel-title-row">
                  <span class="proj-key">${activeProject.key}</span>
                  <h1 class="channel-title">${activeProject.name}</h1>
                  <app-badge variant="default" appearance="soft" size="sm">
                    ${projectMessages.length} ${isRu ? 'сообщ.' : 'msgs'}
                  </app-badge>
                </div>
                <div class="channel-subtitle">
                  ${activeProject.description || t.projectChat.subtitle}
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
                                <button
                                  type="button"
                                  class="msg-action-btn"
                                  title="${t.projectChat.unpin}"
                                  @click="${() => store.togglePinChatMessage(pm.id)}"
                                >
                                  ${iconX(12)}
                                </button>
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
            ${groupedByDate.length === 0
              ? html`
                  <app-empty-state title="${t.projectChat.emptyChannel}">
                    <span slot="icon">${iconMessageSquare(48)}</span>
                  </app-empty-state>
                `
              : groupedByDate.map(
                  (group) => html`
                    <div class="date-divider"><span>${group.label}</span></div>
                    ${group.items.map((msg) => this.renderMessage(msg, activeProject, projectMessages, t, isRu))}
                  `
                )}
          </div>

          <footer class="composer-dock">
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
                  @change="${(e: CustomEvent<{ value: string }>) => (this.taskRefId = eventValue(e))}"
                ></app-select>
              </div>
              <span style="font-size: 0.75rem; color: var(--text-muted);">
                ${isRu ? 'Пишет:' : 'Sending as:'}
                <strong style="color: var(--text-secondary);">
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
                    this.handleSendMessage(activeProject.id);
                  }
                }}"
              ></textarea>
              <app-button
                variant="primary"
                size="md"
                ?disabled="${!this.draftText.trim()}"
                @click="${() => this.handleSendMessage(activeProject.id)}"
              >
                <span slot="icon-start">${iconSend(15)}</span>
                <span>${t.projectChat.send}</span>
              </app-button>
            </div>
          </footer>
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
                        <app-empty-state compact title="${isRu ? 'Участники не назначены' : 'No assigned members'}"></app-empty-state>
                      `
                    : participantList.map((entry) => {
                        const statusClass = entry.user.status || 'active';
                        const rolesText = entry.roles.map((r) => t.projectRoles[r]).join(', ');
                        return html`
                          <button
                            type="button"
                            class="member-item"
                            title="${t.employeeDetail.openEmployee}"
                            @click="${() => store.openEmployeeDetail(entry.user.id)}"
                          >
                            <div class="member-avatar-wrap">
                              <div class="member-avatar">${entry.user.avatar}</div>
                              <span class="status-dot ${statusClass}"></span>
                            </div>
                            <div class="member-meta">
                              <span class="member-name">${entry.user.name}</span>
                              <span class="member-role">${rolesText}</span>
                            </div>
                            <span class="member-alloc">${entry.allocation}%</span>
                          </button>
                        `;
                      })}
                </div>
              </aside>
            `
          : ''}
      </div>

      <app-confirm-dialog
        .open="${Boolean(this.deletingMessage)}"
        size="sm"
        title="${isRu ? 'Удалить сообщение?' : 'Delete message?'}"
        action="${isRu
          ? 'Сообщение будет удалено из истории чата.'
          : 'The message will be deleted from the chat history.'}"
        result="${isRu
          ? 'Сообщение исчезнет у всех участников чата.'
          : 'The message will disappear for all chat participants.'}"
        .actionLabel="${isRu ? 'Выполняемое действие:' : 'Action performed:'}"
        .resultLabel="${isRu ? 'Ожидаемый результат:' : 'Expected result:'}"
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
    projectMessages: ProjectChatMessage[],
    t: ReturnType<typeof getTranslation>,
    isRu: boolean
  ) {
    const sender = this.users.find((u) => u.id === msg.senderId);
    const roleLabel = this.getMemberRoleLabel(activeProject, msg.senderId);
    const roleColor = this.getMemberRoleColor(activeProject, msg.senderId);
    const replyParent = msg.replyToId
      ? projectMessages.find((m) => m.id === msg.replyToId) || null
      : null;
    const replyParentSender = replyParent
      ? this.users.find((u) => u.id === replyParent.senderId)
      : null;
    const taskRef = msg.taskRefId
      ? this.tasks.find((tk) => tk.id === msg.taskRefId) || null
      : null;
    const isMine = msg.senderId === this.currentUserId;
    const isEditing = this.editingMsgId === msg.id;

    return html`
      <article class="msg-row ${msg.pinned ? 'is-pinned' : ''}">
        <button
          type="button"
          class="msg-avatar"
          title="${sender?.name || ''}"
          @click="${() => sender && store.openEmployeeDetail(sender.id)}"
        >
          ${sender?.avatar || '?'}
        </button>

        <div class="msg-content">
          <div class="msg-meta-bar">
            <div class="msg-author-group">
              <button
                type="button"
                class="author-btn"
                @click="${() => sender && store.openEmployeeDetail(sender.id)}"
              >
                ${sender?.name || msg.senderId}
              </button>
              ${roleLabel
                ? html`
                    <span class="role-tag" style="border-left: 2px solid ${roleColor};">
                      ${roleLabel}
                    </span>
                  `
                : ''}
              <span class="msg-time">${this.formatMessageTime(msg.createdAt)}</span>
              ${msg.editedAt ? html`<span class="edited-mark">(${t.projectChat.edited})</span>` : ''}
              ${msg.pinned
                ? html`<span class="pin-indicator">${iconPin(11)} ${isRu ? 'Закреп.' : 'Pinned'}</span>`
                : ''}
            </div>

            <div class="msg-actions">
              ${QUICK_REACTIONS.slice(0, 3).map(
                (emoji) => html`
                  <button
                    type="button"
                    class="msg-action-btn"
                    title="${emoji}"
                    @click="${() => store.toggleChatReaction(msg.id, emoji, this.currentUserId)}"
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
                        @click="${() =>
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

  private handleSendMessage(projectId: string) {
    const trimmed = this.draftText.trim();
    if (!trimmed) return;
    store.addChatMessage({
      projectId,
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
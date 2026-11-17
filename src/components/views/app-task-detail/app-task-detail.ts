import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  ActivityLogItem,
  AnalysisSummary,
  Expense,
  ExpenseCategory,
  ProjectChatMessage,
  Task,
  TaskAiClarificationMessage,
  TaskPriority,
  TaskStatus,
  TimeEntry,
  TimeEntryCategory,
} from '../../../types';
import {
  iconActivity,
  iconBookOpen,
  iconChevronLeft,
  iconClock,
  iconCornerUpLeft,
  iconEdit,
  iconFolder,
  iconLayers,
  iconMessageSquare,
  iconPin,
  iconPlus,
  iconSend,
  iconTrash,
  iconWallet,
  iconX,
} from '../../common/icons';
import { mapKnowledgeOptions, mapRequirementOptions } from '../../common/entity-selector-options';
import '../../common/app-badge/app-badge';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-date-input/app-date-input';
import '../../common/app-input/app-input';
import '../../common/app-modal/app-modal';
import '../../common/app-number-input/app-number-input';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-select/app-select';
import '../../common/app-switch/app-switch';
import '../../common/app-textarea/app-textarea';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-entity-selector/app-entity-selector';
import '../../common/app-progress-bar/app-progress-bar';
import '../../common/app-section-card/app-section-card';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-task-ai-panel/app-task-ai-panel';
import '../../common/app-entity-emblem/app-entity-emblem';
import styles from './app-task-detail.css';
import { eventValue } from '../../common/event-value';

type DetailTab = 'timeline' | 'time' | 'expenses' | 'discussions';
type TimelineFilter = 'all' | 'time' | 'expense' | 'discussion' | 'audit';

interface HistoryEvent {
  id: string;
  kind: Exclude<TimelineFilter, 'all'>;
  timestampMs: number;
  timestampLabel: string;
  actorName: string;
  actorId?: string;
  kindLabel: string;
  body: string;
  metaParts: { label: string; highlight?: boolean }[];
}

const FX_TO_RUB: Record<'RUB' | 'USD' | 'EUR', number> = {
  RUB: 1,
  USD: 96,
  EUR: 104,
};

const QUICK_REACTIONS = ['👍', '✅', '🔥', '👏', '👀'];

@customElement('app-task-detail')
export class AppTaskDetail extends LitElement {
  @state() private tasks: Task[] = store.tasks;
  @state() private detailTaskId: string = store.detailTaskId || store.tasks[0]?.id || '';
  @state() private currentLang = store.customization.language;
  @state() private activeTab: DetailTab = 'timeline';
  @state() private timelineFilter: TimelineFilter = 'all';
  @state() private sortOrder: 'newest' | 'oldest' = 'newest';

  // Quick Time Log Form
  @state() private timeUserId: string = store.currentUserId || store.users[0]?.id || '';
  @state() private timeDate: string = new Date().toISOString().slice(0, 10);
  @state() private timeHours: number = 2;
  @state() private timeCategory: TimeEntryCategory = 'development';
  @state() private timeBillable: boolean = true;
  @state() private timeDesc: string = '';

  // Quick Expense Form
  @state() private expTitle: string = '';
  @state() private expUserId: string = store.currentUserId || store.users[0]?.id || '';
  @state() private expDate: string = new Date().toISOString().slice(0, 10);
  @state() private expCategory: ExpenseCategory = 'software';
  @state() private expAmount: number = 12000;
  @state() private expCurrency: 'RUB' | 'USD' | 'EUR' = 'RUB';
  @state() private expVendor: string = '';
  @state() private expBillable: boolean = true;
  @state() private expNotes: string = '';

  // Discussion Form
  @state() private commentText: string = '';
  @state() private commentAuthorId: string = store.currentUserId || store.users[0]?.id || '';
  @state() private replyToId: string | null = null;
  @state() private editingMsgId: string | null = null;
  @state() private editingMsgText: string = '';

  // Subtasks
  @state() private newSubtaskTitle: string = '';
  @state() private confirmDeleteOpen: boolean = false;
  @state() private storeVersion = 0;

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
    this.tasks = store.tasks;
    this.currentLang = store.customization.language;
    this.storeVersion += 1;

    const candidate = store.detailTaskId || this.detailTaskId;
    if (candidate && this.tasks.some((tk) => tk.id === candidate)) {
      this.detailTaskId = candidate;
    } else {
      this.detailTaskId = this.tasks[0]?.id || '';
    }

    if (!store.users.some((u) => u.id === this.timeUserId)) {
      this.timeUserId = store.users[0]?.id || '';
    }
    if (!store.users.some((u) => u.id === this.expUserId)) {
      this.expUserId = store.users[0]?.id || '';
    }
    if (!store.users.some((u) => u.id === this.commentAuthorId)) {
      this.commentAuthorId = store.users[0]?.id || '';
    }
  }

  private formatDateTime(iso: string): string {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return iso;
    const d = new Date(ms);
    return d.toLocaleString(getTranslation(this.currentLang).common.locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private buildTimeline(
    task: Task,
    timeEntries: TimeEntry[],
    expenses: Expense[],
    discussions: ProjectChatMessage[],
    activityItems: ActivityLogItem[]
  ): HistoryEvent[] {
    const t = getTranslation(this.currentLang);
    const usersMap = new Map(store.users.map((u) => [u.id, u]));
    const events: HistoryEvent[] = [];

    // 1. Task creation event
    const createdMs = Date.parse(task.createdAt) || Date.parse(`${task.startDate}T09:00:00Z`) || Date.now();
    events.push({
      id: `created-${task.id}`,
      kind: 'audit',
      timestampMs: createdMs,
      timestampLabel: this.formatDateTime(new Date(createdMs).toISOString()),
      actorName: usersMap.get(task.assigneeId)?.name || (t.viewTexts.taskDetail.systemActor),
      actorId: task.assigneeId,
      kindLabel: t.taskDetail.createdEvent,
      body: `${task.id} · ${task.title}`,
      metaParts: [
        { label: `${t.taskModal.estimatedHours}: ${task.estimatedHours} ${t.common.hours}` },
        { label: `${t.grid.columns.dates}: ${task.startDate} → ${task.dueDate}` },
      ],
    });

    // 2. Time entries
    for (const te of timeEntries) {
      const user = usersMap.get(te.userId);
      const rate = user?.hourlyRate ?? 3600;
      const cost = Math.round(te.hours * rate);
      const ms = Date.parse(te.createdAt) || Date.parse(`${te.date}T18:00:00Z`) || Date.now();
      events.push({
        id: `tl-te-${te.id}`,
        kind: 'time',
        timestampMs: ms,
        timestampLabel: this.formatDateTime(new Date(ms).toISOString()),
        actorName: user?.name || te.userId,
        actorId: te.userId,
        kindLabel: t.taskDetail.timeLoggedEvent,
        body: te.description || t.timeTracking.categories[te.category],
        metaParts: [
          { label: `+${te.hours.toFixed(1)} ${t.common.hours}`, highlight: true },
          { label: t.timeTracking.categories[te.category] },
          { label: te.billable ? (t.viewTexts.timeTracking.billableSwitch) : (t.viewTexts.taskDetail.nonBillableLabel) },
          { label: `${cost.toLocaleString(t.common.locale)} ₽` },
          { label: t.timeTracking.statuses[te.status] },
        ],
      });
    }

    // 3. Expenses
    for (const ex of expenses) {
      const user = usersMap.get(ex.userId);
      const sym = ex.currency === 'USD' ? '$' : ex.currency === 'EUR' ? '€' : '₽';
      const ms = Date.parse(ex.createdAt) || Date.parse(`${ex.date}T14:00:00Z`) || Date.now();
      events.push({
        id: `tl-ex-${ex.id}`,
        kind: 'expense',
        timestampMs: ms,
        timestampLabel: this.formatDateTime(new Date(ms).toISOString()),
        actorName: user?.name || ex.userId,
        actorId: ex.userId,
        kindLabel: t.taskDetail.expenseAddedEvent,
        body: `${ex.title}${ex.notes ? ` — ${ex.notes}` : ''}`,
        metaParts: [
          { label: `${ex.amount.toLocaleString(t.common.locale)} ${sym}`, highlight: true },
          { label: t.expenses.categories[ex.category] },
          ...(ex.vendor ? [{ label: ex.vendor }] : []),
          { label: t.expenses.statuses[ex.status] },
        ],
      });
    }

    // 4. Discussions
    for (const msg of discussions) {
      const user = usersMap.get(msg.senderId);
      const ms = Date.parse(msg.createdAt) || Date.now();
      events.push({
        id: `tl-msg-${msg.id}`,
        kind: 'discussion',
        timestampMs: ms,
        timestampLabel: this.formatDateTime(msg.createdAt),
        actorName: user?.name || msg.senderId,
        actorId: msg.senderId,
        kindLabel: t.taskDetail.discussionEvent,
        body: msg.text,
        metaParts: [
          ...(msg.pinned ? [{ label: t.viewTexts.taskDetail.pinnedLabel, highlight: true }] : []),
          ...(msg.editedAt ? [{ label: t.projectChat.edited }] : []),
        ],
      });
    }

    // 5. Audit items (status changes / updates not duplicated as raw create)
    for (const log of activityItems) {
      if (log.targetType === 'time_entry' || log.targetType === 'expense' || log.targetType === 'chat') {
        continue; // Already represented richly above
      }
      const ms = Date.parse(log.timestamp) || Date.now();
      events.push({
        id: `tl-act-${log.id}`,
        kind: 'audit',
        timestampMs: ms,
        timestampLabel: this.formatDateTime(log.timestamp),
        actorName: log.userName,
        actorId: log.userId,
        kindLabel: t.taskDetail.auditEvent,
        body: log.details,
        metaParts: [{ label: log.action }],
      });
    }

    const filtered =
      this.timelineFilter === 'all'
        ? events
        : events.filter((ev) => ev.kind === this.timelineFilter);

    return filtered.sort((a, b) =>
      this.sortOrder === 'newest' ? b.timestampMs - a.timestampMs : a.timestampMs - b.timestampMs
    );
  }

  private renderKindIcon(kind: HistoryEvent['kind']) {
    switch (kind) {
      case 'time':
        return iconClock(15);
      case 'expense':
        return iconWallet(15);
      case 'discussion':
        return iconMessageSquare(15);
      default:
        return iconActivity(15);
    }
  }

  render() {
    void this.storeVersion;
    const t = getTranslation(this.currentLang);
    const task = this.tasks.find((tk) => tk.id === this.detailTaskId) || null;

    if (!task) {
      return html`
        <div class="page-shell">
          <app-empty-state title="${t.viewTexts.taskDetail.emptyNotFound}">
            <app-button slot="action" variant="primary" @click="${() => store.setActiveView('kanban')}">
              <span slot="icon-start">${iconChevronLeft(16)}</span>
              <span>${t.taskDetail.backToBoard}</span>
            </app-button>
          </app-empty-state>
        </div>
      `;
    }

    const project = store.projects.find((p) => p.id === task.projectId) || null;
    const assignee = store.users.find((u) => u.id === task.assigneeId) || null;
    const timeEntries = store.timeEntries
      .filter((te) => te.taskId === task.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const expenses = store.expenses
      .filter((ex) => ex.taskId === task.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const discussions = store.chatMessages
      .filter((m) => m.taskRefId === task.id)
      .sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0));
    const activityItems = store.activityLog.filter(
      (log) =>
        log.targetId === task.id ||
        log.targetTitle === task.title ||
        log.targetTitle.startsWith(`${task.id} `)
    );

    const timeline = this.buildTimeline(task, timeEntries, expenses, discussions, activityItems);

    const usersMap = new Map(store.users.map((u) => [u.id, u]));
    const totalHours = timeEntries.reduce((s, e) => s + e.hours, 0);
    const billableHours = timeEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);
    const internalHours = Math.max(0, totalHours - billableHours);

    const laborCostRub = timeEntries.reduce((s, e) => {
      const rate = usersMap.get(e.userId)?.hourlyRate ?? 3600;
      return s + e.hours * rate;
    }, 0);

    const activeExpenses = expenses.filter((e) => e.status !== 'rejected');
    const directExpensesRub = activeExpenses.reduce(
      (s, e) => s + e.amount * (FX_TO_RUB[e.currency] ?? 1),
      0
    );
    const totalCostRub = laborCostRub + directExpensesRub;

    const doneSubtasks = task.subtasks.filter((s) => s.completed).length;
    const subtaskPct =
      task.subtasks.length > 0
        ? Math.round((doneSubtasks / task.subtasks.length) * 100)
        : task.status === 'done'
        ? 100
        : 0;

    const taskSwitchOptions = this.tasks.slice(0, 80).map((tk) => ({
      value: tk.id,
      label: `[${tk.id}] ${tk.title}`,
    }));

    const statusOptions = [
      { value: 'backlog', label: t.status.backlog, color: '#64748b' },
      { value: 'todo', label: t.status.todo, color: '#0284c7' },
      { value: 'in_progress', label: t.status.in_progress, color: '#f59e0b' },
      { value: 'review', label: t.status.review, color: '#8b5cf6' },
      { value: 'done', label: t.status.done, color: '#10b981' },
    ];

    const priorityOptions = [
      { value: 'low', label: t.priority.low, color: '#64748b' },
      { value: 'medium', label: t.priority.medium, color: '#0284c7' },
      { value: 'high', label: t.priority.high, color: '#f59e0b' },
      { value: 'urgent', label: t.priority.urgent, color: '#ef4444' },
    ];

    const assigneeOptions = [
      { value: '', label: t.taskModal.unassigned },
      ...store.users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` })),
    ];

    return html`
      <div class="page-shell">
        <!-- Top Bar -->
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              size="sm"
              variant="outline"
              @click="${() => store.setActiveView('kanban')}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${t.taskDetail.backToBoard}</span>
            </app-button>

            ${project
              ? html`
                  <app-button
                    size="sm"
                    variant="ghost"
                    @click="${() => store.openProjectDetail(project.id)}"
                  >
                    <span slot="icon-start">${iconFolder(15)}</span>
                    <span>${project.key}</span>
                  </app-button>
                `
              : ''}

            <div class="task-switcher">
              <app-select
                size="sm"
                .value="${task.id}"
                .options="${taskSwitchOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  store.openTaskDetail(eventValue(e))}"
              ></app-select>
            </div>
          </div>

          <div class="nav-actions">
            <app-button
              size="sm"
              variant="outline"
              @click="${() => store.openProjectChat(task.projectId)}"
            >
              <span slot="icon-start">${iconMessageSquare(15)}</span>
              <span>${t.taskDetail.openInChat}</span>
            </app-button>

            <app-button
              size="sm"
              variant="secondary"
              @click="${() => store.openEditTaskModal(task)}"
            >
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.taskDetail.openFullModal}</span>
            </app-button>

            <app-button
              action="delete"
              size="xs"
              variant="icon"
              title="${t.common.delete}"
              @click="${() => (this.confirmDeleteOpen = true)}"
            >
              <span slot="start">${iconTrash(15)}</span>
            </app-button>
          </div>
        </div>

        <!-- Hero Task Overview -->
        <section class="hero-card">
          <div class="hero-main">
            <div class="hero-identity">
              <app-entity-emblem entity="task" size="lg"></app-entity-emblem>
              <div class="hero-title-group">
                <div class="hero-top-meta">
                  <app-entity-emblem entity="task" variant="pill" size="sm"></app-entity-emblem>
                  <span class="task-id-mono">${task.id}</span>
                  ${project
                    ? html`
                        <span aria-hidden="true">·</span>
                        <app-link
                          class="link-btn"
                          size="md"
                          variant="primary"
                          @click="${() => store.openProjectDetail(project.id)}"
                        >
                          ${project.name}
                        </app-link>
                      `
                    : ''}
                  ${task.tags.length > 0
                    ? html`
                        <span aria-hidden="true">·</span>
                        <span>${task.tags.join(' / ')}</span>
                      `
                    : ''}
                  ${assignee
                    ? html`
                        <span aria-hidden="true">·</span>
                        <app-link
                          class="link-btn"
                          size="md"
                          variant="primary"
                          @click="${() => store.openEmployeeDetail(assignee.id)}"
                        >
                          ${assignee.name}
                        </app-link>
                      `
                    : ''}
                </div>

                <div class="hero-title-row">
                  <h1 class="task-title">${task.title}</h1>
                </div>

                ${task.description ? html`<p class="task-desc">${task.description}</p>` : ''}
              </div>
            </div>

            <div class="inline-controls-strip">
              <div class="control-cell">
                <span class="control-label">${t.taskModal.statusLabel}</span>
                <app-select
                  size="sm"
                  .value="${task.status}"
                  .options="${statusOptions}"
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    const nextStatus = eventValue(e) as TaskStatus;
                    if (nextStatus !== task.status) {
                      store.moveTaskStatus(task.id, nextStatus);
                    }
                  }}"
                ></app-select>
              </div>

              <div class="control-cell">
                <span class="control-label">${t.taskModal.priorityLabel}</span>
                <app-select
                  size="sm"
                  .value="${task.priority}"
                  .options="${priorityOptions}"
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    const nextPriority = eventValue(e) as TaskPriority;
                    if (nextPriority !== task.priority) {
                      store.updateTask({ ...task, priority: nextPriority });
                    }
                  }}"
                ></app-select>
              </div>

              <div class="control-cell">
                <span class="control-label">${t.taskModal.assigneeLabel}</span>
                <app-select
                  size="sm"
                  .value="${task.assigneeId}"
                  .options="${assigneeOptions}"
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    const nextAssignee = eventValue(e);
                    if (nextAssignee !== task.assigneeId) {
                      store.updateTask({ ...task, assigneeId: nextAssignee });
                    }
                  }}"
                ></app-select>
              </div>

              <div class="control-cell">
                <span class="control-label">${t.grid.columns.dates}</span>
                <div class="dates-display">${task.startDate} → ${task.dueDate}</div>
              </div>
            </div>
          </div>

          <!-- 4-Cell Unboxed KPI Summary Strip -->
          <div class="kpi-strip">
            <div class="kpi-cell">
              <span class="kpi-label">${t.taskDetail.subtasksTitle}</span>
              <div class="kpi-value-row">
                <span class="kpi-val">${subtaskPct}%</span>
                <span class="kpi-sub">${doneSubtasks}/${task.subtasks.length} ${t.viewTexts.taskDetail.stepsSuffix}</span>
              </div>
            </div>

            <div class="kpi-cell">
              <span class="kpi-label">${t.taskDetail.tabTime}</span>
              <div class="kpi-value-row">
                <span class="kpi-val">${totalHours.toFixed(1)} ${t.common.hours}</span>
                <span class="kpi-sub">
                  ${t.viewTexts.dashboard.planSuffix} ${task.estimatedHours} ${t.common.hours} · ${Math.round(laborCostRub).toLocaleString(t.common.locale)} ₽
                </span>
              </div>
            </div>

            <div class="kpi-cell">
              <span class="kpi-label">${t.taskDetail.tabExpenses}</span>
              <div class="kpi-value-row">
                <span class="kpi-val">${Math.round(directExpensesRub).toLocaleString(t.common.locale)} ₽</span>
                <span class="kpi-sub">${expenses.length} ${t.viewTexts.taskDetail.recordsSuffix}</span>
              </div>
            </div>

            <div class="kpi-cell">
              <span class="kpi-label">${t.taskDetail.tabDiscussions}</span>
              <div class="kpi-value-row">
                <span class="kpi-val">${discussions.length}</span>
                <span class="kpi-sub">${timeline.length} ${t.viewTexts.taskDetail.eventsSuffix}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Main Workspace Grid -->
        <div class="detail-grid">
          <!-- Primary Column: History, Time, Expenses, Discussions -->
          <div class="main-column">
            <app-section-card variant="tabbed">
              <div slot="header-left">
                <app-segmented-switch
                  size="sm"
                  .value="${this.activeTab}"
                  .options="${[
                    { value: 'timeline', label: `${t.taskDetail.tabTimeline} (${timeline.length})` },
                    { value: 'time', label: `${t.taskDetail.tabTime} (${timeEntries.length})` },
                    { value: 'expenses', label: `${t.taskDetail.tabExpenses} (${expenses.length})` },
                    { value: 'discussions', label: `${t.taskDetail.tabDiscussions} (${discussions.length})` },
                  ]}"
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    this.activeTab = eventValue(e) as DetailTab;
                  }}"
                ></app-segmented-switch>
              </div>

              ${this.activeTab === 'timeline'
                ? this.renderTimelineTab(t, timeline)
                : this.activeTab === 'time'
                ? this.renderTimeTab(t, task, timeEntries)
                : this.activeTab === 'expenses'
                ? this.renderExpensesTab(t, task, expenses)
                : this.renderDiscussionsTab(t, task, discussions)}
            </app-section-card>

            <app-task-ai-panel
              .task="${task}"
              .analyses="${task.aiAnalyses || []}"
              .clarifications="${task.aiClarifications || []}"
              .timeSummary="${timeEntries
                .slice(0, 6)
                .map((te) => `${te.date}: ${te.hours}h (${te.category}) - ${te.description}`)
                .join('; ')}"
              .expenseSummary="${activeExpenses
                .slice(0, 5)
                .map((ex) => `${ex.title}: ${ex.amount} ${ex.currency}`)
                .join('; ')}"
              .discussionsSummary="${discussions
                .slice(-5)
                .map((m) => m.text)
                .join(' | ')}"
              @apply-description="${(e: CustomEvent<{ description: string; mode: 'replace' | 'append' }>) => {
                const { description, mode } = e.detail;
                const nextDescription =
                  mode === 'append' && task.description.trim()
                    ? `${task.description.trim()}\n\n${description}`
                    : description;
                store.updateTask({ ...task, description: nextDescription });
                store.addNotification('success', t.viewTexts.ai.taskSectionTitle, t.viewTexts.ai.descAppliedToast);
              }}"
              @analyses-update="${(e: CustomEvent<{ analyses: AnalysisSummary[] }>) => {
                store.updateTask({ ...task, aiAnalyses: e.detail.analyses });
              }}"
              @clarification-update="${(e: CustomEvent<{ messages: TaskAiClarificationMessage[] }>) => {
                store.updateTask({ ...task, aiClarifications: e.detail.messages });
              }}"
              @add-subtask="${(e: CustomEvent<{ title: string }>) => {
                const title = e.detail?.title?.trim();
                if (!title) return;
                store.updateTask({
                  ...task,
                  subtasks: [
                    ...task.subtasks,
                    { id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, title, completed: false },
                  ],
                });
              }}"
            ></app-task-ai-panel>
          </div>

          <!-- Right Sidebar: Subtasks & Cost Summary -->
          <aside class="side-column">
            <app-section-card variant="tabbed" title="${t.taskDetail.subtasksTitle}">
              <span slot="actions" class="mono-num" style="font-size: 0.8rem; color: var(--text-secondary);">
                ${doneSubtasks}/${task.subtasks.length} (${subtaskPct}%)
              </span>

                <app-progress-bar value="${subtaskPct}"></app-progress-bar>

                ${task.subtasks.length === 0
                  ? html`<div style="font-size: 0.8125rem; color: var(--text-muted);">${t.common.empty}</div>`
                  : html`
                      <div class="subtask-list">
                        ${task.subtasks.map(
                          (sub) => html`
                            <div class="subtask-item ${sub.completed ? 'is-done' : ''}">
                              <app-checkbox
                                ?checked="${sub.completed}"
                                @change="${() => this.toggleSubtask(task, sub.id)}"
                              >
                                <span class="subtask-title">${sub.title}</span>
                              </app-checkbox>
                              <button
                                type="button"
                                class="mini-action-btn"
                                title="${t.common.delete}"
                                @click="${() => this.removeSubtask(task, sub.id)}"
                              >
                                ${iconX(13)}
                              </button>
                            </div>
                          `
                        )}
                      </div>
                    `}

                <div class="subtask-add-row">
                  <app-input
                    size="sm"
                    placeholder="${t.taskDetail.addSubtaskPlaceholder}"
                    .value="${this.newSubtaskTitle}"
                    @input="${(e: CustomEvent<{ value: string }>) => (this.newSubtaskTitle = eventValue(e))}"
                    @keydown="${(e: KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        this.addSubtask(task);
                      }
                    }}"
                  ></app-input>
                  <app-button
                    size="sm"
                    variant="secondary"
                    ?disabled="${!this.newSubtaskTitle.trim()}"
                    @click="${() => this.addSubtask(task)}"
                  >
                    <span slot="icon-start">${iconPlus(14)}</span>
                    <span>${t.common.add}</span>
                  </app-button>
                </div>
            </app-section-card>

            <app-section-card variant="tabbed" title="${t.taskDetail.costSummaryTitle}">
                <div class="cost-list">
                  <div class="cost-row">
                    <span class="cost-label">${t.taskModal.estimatedHours}</span>
                    <span class="cost-val">${task.estimatedHours} ${t.common.hours}</span>
                  </div>
                  <div class="cost-row">
                    <span class="cost-label">${t.taskDetail.billableHours}</span>
                    <span class="cost-val">${billableHours.toFixed(1)} ${t.common.hours}</span>
                  </div>
                  <div class="cost-row">
                    <span class="cost-label">${t.taskDetail.internalHours}</span>
                    <span class="cost-val">${internalHours.toFixed(1)} ${t.common.hours}</span>
                  </div>
                  <div class="cost-row">
                    <span class="cost-label">${t.taskDetail.laborCost}</span>
                    <span class="cost-val">${Math.round(laborCostRub).toLocaleString(t.common.locale)} ₽</span>
                  </div>
                  <div class="cost-row">
                    <span class="cost-label">${t.taskDetail.directExpenses}</span>
                    <span class="cost-val">${Math.round(directExpensesRub).toLocaleString(t.common.locale)} ₽</span>
                  </div>
                  <div class="cost-row total-row">
                    <span>${t.taskDetail.totalCost}</span>
                    <span class="cost-val">${Math.round(totalCostRub).toLocaleString(t.common.locale)} ₽</span>
                  </div>
                </div>
            </app-section-card>

            ${this.renderTraceabilitySidebarCard(task, t)}
          </aside>
        </div>
      </div>

      <app-modal
        ?open="${this.confirmDeleteOpen}"
        size="sm"
        @close="${() => (this.confirmDeleteOpen = false)}"
      >
        <span slot="title">${t.common.delete}</span>
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">
          ${t.common.confirmDelete} (${task.id} · ${task.title})
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.confirmDeleteOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              this.confirmDeleteOpen = false;
              store.deleteTask(task.id);
              store.setActiveView('kanban');
            }}"
          >
            ${t.common.delete}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderTimelineTab(t: ReturnType<typeof getTranslation>, timeline: HistoryEvent[]) {
    return html`
      <div class="timeline-toolbar">
        <app-segmented-switch
          size="sm"
          .value="${this.timelineFilter}"
          .options="${[
            { value: 'all', label: t.taskDetail.filterAll },
            { value: 'time', label: t.taskDetail.filterTime },
            { value: 'expense', label: t.taskDetail.filterExpenses },
            { value: 'discussion', label: t.taskDetail.filterDiscussions },
            { value: 'audit', label: t.taskDetail.filterChanges },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.timelineFilter = eventValue(e) as TimelineFilter;
          }}"
        ></app-segmented-switch>

        <app-segmented-switch
          size="sm"
          .value="${this.sortOrder}"
          .options="${[
            { value: 'newest', label: t.taskDetail.sortNewest },
            { value: 'oldest', label: t.taskDetail.sortChronological },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.sortOrder = eventValue(e) as 'newest' | 'oldest';
          }}"
        ></app-segmented-switch>
      </div>

      ${timeline.length === 0
        ? html`<app-empty-state compact title="${t.taskDetail.noHistory}"></app-empty-state>`
        : html`
            <div class="timeline-list">
              ${timeline.map(
                (ev) => html`
                  <div class="timeline-item">
                    <div class="tl-icon-col">
                      <div class="tl-node kind-${ev.kind}">${this.renderKindIcon(ev.kind)}</div>
                    </div>
                    <div class="tl-content">
                      <div class="tl-head">
                        <div class="tl-title-wrap">
                          <span class="tl-actor">${ev.actorName}</span>
                          <span aria-hidden="true" style="color: var(--text-muted);">·</span>
                          <span class="tl-kind-label">${ev.kindLabel}</span>
                        </div>
                        <span class="tl-time">${ev.timestampLabel}</span>
                      </div>
                      <div class="tl-body">${ev.body}</div>
                      ${ev.metaParts.length > 0
                        ? html`
                            <div class="tl-meta-line">
                              ${ev.metaParts.map(
                                (part, idx) => html`
                                  ${idx > 0 ? html`<span aria-hidden="true">·</span>` : ''}
                                  <span class="${part.highlight ? 'tl-highlight' : ''}">${part.label}</span>
                                `
                              )}
                            </div>
                          `
                        : ''}
                    </div>
                  </div>
                `
              )}
            </div>
          `}
    `;
  }

  private renderTimeTab(t: ReturnType<typeof getTranslation>, task: Task, timeEntries: TimeEntry[]) {
    const userOptions = store.users.map((u) => ({ value: u.id, label: `${u.name}` }));
    const catOptions = (Object.keys(t.timeTracking.categories) as TimeEntryCategory[]).map((cat) => ({
      value: cat,
      label: t.timeTracking.categories[cat],
    }));

    return html`
      <!-- Inline Log Time Form -->
      <div class="inline-form-box">
        <div class="inline-form-title">${t.taskDetail.logTimeTitle}</div>
        <div class="form-row-3">
          <app-select
            size="sm"
            label="${t.taskDetail.fieldEmployee}"
            .value="${this.timeUserId}"
            .options="${userOptions}"
            @change="${(e: CustomEvent<{ value: string }>) => (this.timeUserId = eventValue(e))}"
          ></app-select>

          <app-date-input
            size="sm"
            label="${t.taskDetail.fieldDate}"
            .value="${this.timeDate}"
            @change="${(e: CustomEvent<{ value: string }>) => (this.timeDate = eventValue(e))}"
          ></app-date-input>

          <app-number-input
            size="sm"
            label="${t.taskDetail.fieldHours}"
            .value="${this.timeHours}"
            min="0.25"
            max="24"
            step="0.5"
            unit="${t.common.hours}"
            @change="${(e: CustomEvent<{ value: number }>) => (this.timeHours = eventValue(e))}"
          ></app-number-input>
        </div>

        <div class="form-row-2">
          <app-select
            size="sm"
            label="${t.taskDetail.fieldCategory}"
            .value="${this.timeCategory}"
            .options="${catOptions}"
            @change="${(e: CustomEvent<{ value: string }>) =>
              (this.timeCategory = eventValue(e) as TimeEntryCategory)}"
          ></app-select>

          <app-input
            size="sm"
            label="${t.taskDetail.fieldDescription}"
            placeholder="${t.viewTexts.taskDetail.workPlaceholder}"
            .value="${this.timeDesc}"
            @input="${(e: CustomEvent<{ value: string }>) => (this.timeDesc = eventValue(e))}"
          ></app-input>
        </div>

        <div class="form-actions-row">
          <app-switch
            label="${t.taskDetail.fieldBillable}"
            ?checked="${this.timeBillable}"
            @change="${(e: CustomEvent<{ checked: boolean }>) => (this.timeBillable = e.detail.checked)}"
          ></app-switch>

          <app-button
            size="sm"
            variant="primary"
            ?disabled="${this.timeHours <= 0}"
            @click="${() => this.handleAddTimeEntry(task)}"
          >
            <span slot="icon-start">${iconPlus(14)}</span>
            <span>${t.taskDetail.logTimeTitle}</span>
          </app-button>
        </div>
      </div>

      ${timeEntries.length === 0
        ? html`<app-empty-state compact title="${t.taskDetail.noTimeEntries}"></app-empty-state>`
        : html`
            <div class="records-table-wrap">
              <table class="records-table">
                <thead>
                  <tr>
                    <th>${t.taskDetail.fieldDate}</th>
                    <th>${t.taskDetail.fieldEmployee}</th>
                    <th>${t.taskDetail.fieldDescription}</th>
                    <th class="num-col">${t.taskDetail.fieldHours}</th>
                    <th class="num-col">${t.viewTexts.taskDetail.thCost}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${timeEntries.map((te) => {
                    const user = store.users.find((u) => u.id === te.userId);
                    const rate = user?.hourlyRate ?? 3600;
                    const cost = Math.round(te.hours * rate);
                    return html`
                      <tr>
                        <td class="num-col" style="text-align: left;">${te.date}</td>
                        <td>
                          ${user
                            ? html`
                                <app-link
                                  class="link-btn text-primary-link"
                                  size="md"
                                  variant="primary"
                                  @click="${() => store.openEmployeeDetail(user.id)}"
                                >
                                  ${user.name}
                                </app-link>
                              `
                            : te.userId}
                        </td>
                        <td>
                          <div>${te.description || t.timeTracking.categories[te.category]}</div>
                          <div class="sub-line">
                            ${t.timeTracking.categories[te.category]} · ${te.billable ? 'Billable' : 'Internal'} · ${t.timeTracking.statuses[te.status]}
                          </div>
                        </td>
                        <td class="num-col"><strong>${te.hours.toFixed(1)} ${t.common.hours}</strong></td>
                        <td class="num-col">${cost.toLocaleString(t.common.locale)} ₽</td>
                        <td style="text-align: right;">
                          <button
                            type="button"
                            class="mini-action-btn"
                            title="${t.common.delete}"
                            @click="${() => store.deleteTimeEntry(te.id)}"
                          >
                            ${iconTrash(14)}
                          </button>
                        </td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
            </div>
          `}
    `;
  }

  private renderExpensesTab(t: ReturnType<typeof getTranslation>, task: Task, expenses: Expense[]) {
    const catOptions = (Object.keys(t.expenses.categories) as ExpenseCategory[]).map((cat) => ({
      value: cat,
      label: t.expenses.categories[cat],
    }));
    const currencyOptions = [
      { value: 'RUB', label: 'RUB (₽)' },
      { value: 'USD', label: 'USD ($)' },
      { value: 'EUR', label: 'EUR (€)' },
    ];

    return html`
      <!-- Inline Add Expense Form -->
      <div class="inline-form-box">
        <div class="inline-form-title">${t.taskDetail.addExpenseTitle}</div>
        <div class="form-row-2">
          <app-input
            size="sm"
            label="${t.taskDetail.fieldExpenseTitle}"
            placeholder="${t.viewTexts.taskDetail.expensePlaceholder}"
            .value="${this.expTitle}"
            @input="${(e: CustomEvent<{ value: string }>) => (this.expTitle = eventValue(e))}"
          ></app-input>

          <app-select
            size="sm"
            label="${t.taskDetail.fieldCategory}"
            .value="${this.expCategory}"
            .options="${catOptions}"
            @change="${(e: CustomEvent<{ value: string }>) =>
              (this.expCategory = eventValue(e) as ExpenseCategory)}"
          ></app-select>
        </div>

        <div class="form-row-3">
          <app-number-input
            size="sm"
            label="${t.taskDetail.fieldAmount}"
            .value="${this.expAmount}"
            min="0"
            max="100000000"
            step="500"
            @change="${(e: CustomEvent<{ value: number }>) => (this.expAmount = eventValue(e))}"
          ></app-number-input>

          <app-select
            size="sm"
            label="${t.taskDetail.fieldCurrency}"
            .value="${this.expCurrency}"
            .options="${currencyOptions}"
            @change="${(e: CustomEvent<{ value: string }>) =>
              (this.expCurrency = eventValue(e) as 'RUB' | 'USD' | 'EUR')}"
          ></app-select>

          <app-input
            size="sm"
            label="${t.taskDetail.fieldVendor}"
            placeholder="Yandex Cloud, JetBrains..."
            .value="${this.expVendor}"
            @input="${(e: CustomEvent<{ value: string }>) => (this.expVendor = eventValue(e))}"
          ></app-input>
        </div>

        <div class="form-actions-row">
          <app-switch
            label="${t.taskDetail.fieldBillable}"
            ?checked="${this.expBillable}"
            @change="${(e: CustomEvent<{ checked: boolean }>) => (this.expBillable = e.detail.checked)}"
          ></app-switch>

          <app-button
            size="sm"
            variant="primary"
            ?disabled="${!this.expTitle.trim()}"
            @click="${() => this.handleAddExpense(task)}"
          >
            <span slot="icon-start">${iconPlus(14)}</span>
            <span>${t.taskDetail.addExpenseTitle}</span>
          </app-button>
        </div>
      </div>

      ${expenses.length === 0
        ? html`<app-empty-state compact title="${t.taskDetail.noExpenses}"></app-empty-state>`
        : html`
            <div class="records-table-wrap">
              <table class="records-table">
                <thead>
                  <tr>
                    <th>${t.taskDetail.fieldDate}</th>
                    <th>${t.taskDetail.fieldExpenseTitle}</th>
                    <th>${t.taskDetail.fieldStatus}</th>
                    <th class="num-col">${t.taskDetail.fieldAmount}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${expenses.map((exp) => {
                    const sym = exp.currency === 'USD' ? '$' : exp.currency === 'EUR' ? '€' : '₽';
                    const author = store.users.find((u) => u.id === exp.userId);
                    return html`
                      <tr>
                        <td class="num-col" style="text-align: left;">${exp.date}</td>
                        <td>
                          <div>${exp.title}</div>
                          <div class="sub-line">
                            ${t.expenses.categories[exp.category]}${exp.vendor ? ` · ${exp.vendor}` : ''}${author ? ` · ${author.name}` : ''}
                          </div>
                        </td>
                        <td>
                          <span style="color: ${exp.status === 'approved' || exp.status === 'reimbursed' ? 'var(--color-success)' : exp.status === 'rejected' ? 'var(--color-danger)' : 'var(--color-warning)'}; font-weight: 600;">
                            ${t.expenses.statuses[exp.status]}
                          </span>
                        </td>
                        <td class="num-col"><strong>${exp.amount.toLocaleString(t.common.locale)} ${sym}</strong></td>
                        <td style="text-align: right;">
                          <button
                            type="button"
                            class="mini-action-btn"
                            title="${t.common.delete}"
                            @click="${() => store.deleteExpense(exp.id)}"
                          >
                            ${iconTrash(14)}
                          </button>
                        </td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
            </div>
          `}
    `;
  }

  private renderDiscussionsTab(
    t: ReturnType<typeof getTranslation>,
    task: Task,
    discussions: ProjectChatMessage[]
  ) {
    const userOptions = store.users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }));
    const replyTarget = this.replyToId ? discussions.find((m) => m.id === this.replyToId) || null : null;
    const replyAuthor = replyTarget ? store.users.find((u) => u.id === replyTarget.senderId) : null;

    return html`
      ${discussions.length === 0
        ? html`<app-empty-state compact title="${t.taskDetail.noDiscussions}"></app-empty-state>`
        : html`
            <div class="discussion-feed">
              ${discussions.map((msg) => {
                const sender = store.users.find((u) => u.id === msg.senderId);
                const parent = msg.replyToId ? discussions.find((x) => x.id === msg.replyToId) : null;
                const parentAuthor = parent ? store.users.find((u) => u.id === parent.senderId) : null;
                const isEditing = this.editingMsgId === msg.id;

                return html`
                  <div class="msg-card">
                    <div class="msg-head">
                      <div class="msg-author-wrap">
                        <span class="avatar-sm">${sender?.avatar || '?'}</span>
                        <span class="msg-author">${sender?.name || msg.senderId}</span>
                        <span aria-hidden="true" style="color: var(--text-muted);">·</span>
                        <span class="msg-time">${this.formatDateTime(msg.createdAt)}</span>
                        ${msg.editedAt ? html`<span class="msg-time">(${t.projectChat.edited})</span>` : ''}
                      </div>

                      <div class="msg-actions">
                        <button
                          type="button"
                          class="mini-action-btn"
                          title="${t.projectChat.reply}"
                          @click="${() => (this.replyToId = msg.id)}"
                        >
                          ${iconCornerUpLeft(13)}
                        </button>
                        <button
                          type="button"
                          class="mini-action-btn ${msg.pinned ? 'active' : ''}"
                          title="${msg.pinned ? t.projectChat.unpin : t.projectChat.pin}"
                          @click="${() => store.togglePinChatMessage(msg.id)}"
                        >
                          ${iconPin(13)}
                        </button>
                        <button
                          type="button"
                          class="mini-action-btn"
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
                          class="mini-action-btn"
                          title="${t.projectChat.delete}"
                          @click="${() => store.deleteChatMessage(msg.id)}"
                        >
                          ${iconTrash(13)}
                        </button>
                      </div>
                    </div>

                    ${parent
                      ? html`
                          <div class="reply-quote">
                            <strong>${parentAuthor?.name || parent.senderId}:</strong> ${parent.text.slice(0, 90)}
                          </div>
                        `
                      : ''}

                    ${isEditing
                      ? html`
                          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <app-textarea
                              rows="2"
                              .value="${this.editingMsgText}"
                              @input="${(e: CustomEvent<{ value: string }>) =>
                                (this.editingMsgText = eventValue(e))}"
                            ></app-textarea>
                            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                              <app-button
                                size="sm"
                                variant="ghost"
                                @click="${() => (this.editingMsgId = null)}"
                              >
                                ${t.projectChat.cancelEdit}
                              </app-button>
                              <app-button
                                size="sm"
                                variant="primary"
                                @click="${() => {
                                  store.updateChatMessage(msg.id, this.editingMsgText);
                                  this.editingMsgId = null;
                                }}"
                              >
                                ${t.projectChat.saveEdit}
                              </app-button>
                            </div>
                          </div>
                        `
                      : html`<div class="msg-text">${msg.text}</div>`}

                    <div class="reactions-row">
                      ${(msg.reactions || []).map((r) => {
                        const isMine = r.userIds.includes(this.commentAuthorId);
                        return html`
                          <button
                            type="button"
                            class="reaction-btn ${isMine ? 'is-mine' : ''}"
                            @click="${() => store.toggleChatReaction(msg.id, r.emoji, this.commentAuthorId)}"
                          >
                            <span>${r.emoji}</span>
                            <span>${r.userIds.length}</span>
                          </button>
                        `;
                      })}
                      ${QUICK_REACTIONS.filter((em) => !(msg.reactions || []).some((r) => r.emoji === em))
                        .slice(0, 3)
                        .map(
                          (em) => html`
                            <button
                              type="button"
                              class="reaction-btn"
                              @click="${() => store.toggleChatReaction(msg.id, em, this.commentAuthorId)}"
                            >
                              ${em}
                            </button>
                          `
                        )}
                    </div>
                  </div>
                `;
              })}
            </div>
          `}

      <!-- Comment Composer -->
      <div class="composer-box">
        ${replyTarget
          ? html`
              <div class="composer-reply-banner">
                <span>
                  ${t.projectChat.replyingTo} <strong>${replyAuthor?.name || replyTarget.senderId}</strong>:
                  ${replyTarget.text.slice(0, 70)}
                </span>
                <button
                  type="button"
                  class="mini-action-btn"
                  @click="${() => (this.replyToId = null)}"
                >
                  ${iconX(13)}
                </button>
              </div>
            `
          : ''}

        <app-textarea
          rows="2"
          placeholder="${t.taskDetail.discussionPlaceholder}"
          .value="${this.commentText}"
          @input="${(e: CustomEvent<{ value: string }>) => (this.commentText = eventValue(e))}"
          @keydown="${(e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              this.handleSendComment(task);
            }
          }}"
        ></app-textarea>

        <div class="composer-controls">
          <div style="width: 240px; max-width: 100%;">
            <app-select
              size="sm"
              label="${t.projectChat.actingAs}"
              .value="${this.commentAuthorId}"
              .options="${userOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.commentAuthorId = eventValue(e))}"
            ></app-select>
          </div>

          <app-button
            size="sm"
            variant="primary"
            ?disabled="${!this.commentText.trim()}"
            @click="${() => this.handleSendComment(task)}"
          >
            <span slot="icon-start">${iconSend(14)}</span>
            <span>${t.taskDetail.sendComment}</span>
          </app-button>
        </div>
      </div>
    `;
  }

  private handleAddTimeEntry(task: Task) {
    if (this.timeHours <= 0) return;
    store.addTimeEntry({
      taskId: task.id,
      projectId: task.projectId,
      userId: this.timeUserId || task.assigneeId || store.users[0]?.id || 'user-1',
      date: this.timeDate || new Date().toISOString().slice(0, 10),
      hours: this.timeHours,
      billable: this.timeBillable,
      category: this.timeCategory,
      status: 'logged',
      description: this.timeDesc.trim(),
    });
    this.timeDesc = '';
  }

  private handleAddExpense(task: Task) {
    if (!this.expTitle.trim()) return;
    store.addExpense({
      projectId: task.projectId,
      taskId: task.id,
      userId: this.expUserId || task.assigneeId || store.users[0]?.id || 'user-1',
      date: this.expDate || new Date().toISOString().slice(0, 10),
      title: this.expTitle.trim(),
      category: this.expCategory,
      amount: Math.max(0, Number(this.expAmount) || 0),
      currency: this.expCurrency,
      billable: this.expBillable,
      status: 'pending',
      vendor: this.expVendor.trim() || undefined,
      notes: this.expNotes.trim() || getTranslation(this.currentLang).viewTexts.taskDetail.taskExpenseNote(task.id),
    });
    this.expTitle = '';
    this.expVendor = '';
    this.expNotes = '';
  }

  private handleSendComment(task: Task) {
    if (!this.commentText.trim()) return;
    store.addChatMessage({
      projectId: task.projectId,
      senderId: this.commentAuthorId,
      text: this.commentText.trim(),
      replyToId: this.replyToId || undefined,
      taskRefId: task.id,
    });
    this.commentText = '';
    this.replyToId = null;
  }

  private toggleSubtask(task: Task, subtaskId: string) {
    const next = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    store.updateTask({ ...task, subtasks: next });
  }

  private addSubtask(task: Task) {
    const title = this.newSubtaskTitle.trim();
    if (!title) return;
    const next = [
      ...task.subtasks,
      { id: `sub-${Date.now()}`, title, completed: false },
    ];
    store.updateTask({ ...task, subtasks: next });
    this.newSubtaskTitle = '';
  }

  private removeSubtask(task: Task, subtaskId: string) {
    const next = task.subtasks.filter((s) => s.id !== subtaskId);
    store.updateTask({ ...task, subtasks: next });
  }

  private renderTraceabilitySidebarCard(
    task: Task,
    t: ReturnType<typeof getTranslation>
  ) {
    const linkedReqs = store.requirements.filter(
      (r) =>
        (task.requirementIds || []).includes(r.id) ||
        (r.linkedTaskIds || []).includes(task.id)
    );
    const linkedKbIds = new Set(task.knowledgeArticleIds || []);
    const linkedKbs = store.knowledgeArticles.filter(
      (a) => linkedKbIds.has(a.id) || (a.linkedTaskIds || []).includes(task.id)
    );

    const availableReqOptions = mapRequirementOptions(
      store.requirements.filter(
        (r) => r.projectId === task.projectId && !linkedReqs.some((lr) => lr.id === r.id)
      ),
      t
    );
    const availableKbOptions = mapKnowledgeOptions(
      store.knowledgeArticles.filter((a) => !linkedKbs.some((la) => la.id === a.id)),
      t
    );

    return html`
      <app-section-card
        variant="tabbed"
        title="${t.viewTexts.taskDetail.requirementsSectionTitle}"
      >
        <span slot="icon">${iconLayers(16)}</span>
        <div slot="actions" style="display: flex; align-items: center; gap: 0.4rem;">
          <app-link
            class="link-btn kb-icon-link"
            size="md"
            variant="primary"
            title="${t.navigation.knowledgeBase}"
            @click="${() => store.openKnowledgeBase({ scope: 'project', projectId: task.projectId })}"
          >
            <span slot="start">${iconBookOpen(14)}</span>
          </app-link>
        </div>

        <div class="trace-sidebar-block">
          <div class="trace-subhead">${t.viewTexts.taskDetail.linkedRequirementsLabel} (${linkedReqs.length})</div>
          ${linkedReqs.length === 0
            ? html`<div class="trace-empty">${t.viewTexts.taskDetail.noRequirementsLinked}</div>`
            : html`
                <div class="trace-link-list">
                  ${linkedReqs.map(
                    (req) => html`
                      <div class="trace-link-item">
                        <button
                          type="button"
                          class="trace-link-main"
                          @click="${() => store.openRequirementDetail(req.id)}"
                        >
                          <span class="trace-code ${req.type === 'non_functional' ? 'is-nfr' : ''}">${req.code}</span>
                          <span class="trace-name" title="${req.title}">${req.title}</span>
                        </button>
                        <app-status-chip
                          domain="requirement"
                          status="${req.status}"
                          appearance="soft"
                          size="sm"
                        ></app-status-chip>
                        <button
                          type="button"
                          class="mini-action-btn"
                          title="${t.common.delete}"
                          @click="${() => this.unlinkRequirement(task, req.id)}"
                        >
                          ${iconX(12)}
                        </button>
                      </div>
                    `
                  )}
                </div>
              `}
          ${availableReqOptions.length > 0
            ? html`
                <app-entity-selector
                  size="sm"
                  placeholder="${t.viewTexts.taskDetail.attachRequirementPlaceholder}"
                  .options="${availableReqOptions}"
                  value=""
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    const id = eventValue(e);
                    if (id) this.linkRequirement(task, id);
                  }}"
                ></app-entity-selector>
              `
            : ''}
        </div>

        <div class="trace-sidebar-block">
          <div class="trace-subhead">${t.viewTexts.taskDetail.linkedKnowledgeLabel} (${linkedKbs.length})</div>
          ${linkedKbs.length > 0
            ? html`
                <div class="trace-link-list">
                  ${linkedKbs.map(
                    (art) => html`
                      <div class="trace-link-item">
                        <button
                          type="button"
                          class="trace-link-main"
                          @click="${() =>
                            store.openKnowledgeBase({
                              scope: art.scope,
                              projectId: art.projectId || 'all',
                              companyId: art.companyId || 'all',
                              articleId: art.id,
                            })}"
                        >
                          ${iconBookOpen(13)}
                          <span class="trace-name" title="${art.title}">${art.title}</span>
                        </button>
                        <button
                          type="button"
                          class="mini-action-btn"
                          title="${t.common.delete}"
                          @click="${() => this.unlinkKnowledge(task, art.id)}"
                        >
                          ${iconX(12)}
                        </button>
                      </div>
                    `
                  )}
                </div>
              `
            : ''}
          ${availableKbOptions.length > 0
            ? html`
                <app-entity-selector
                  size="sm"
                  placeholder="${t.viewTexts.taskDetail.attachKnowledgePlaceholder}"
                  .options="${availableKbOptions}"
                  value=""
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    const id = eventValue(e);
                    if (id) this.linkKnowledge(task, id);
                  }}"
                ></app-entity-selector>
              `
            : ''}
        </div>
      </app-section-card>
    `;
  }

  private linkRequirement(task: Task, reqId: string) {
    const nextReqIds = Array.from(new Set([...(task.requirementIds || []), reqId]));
    store.updateTask({ ...task, requirementIds: nextReqIds });
    const req = store.requirements.find((r) => r.id === reqId);
    if (req && !(req.linkedTaskIds || []).includes(task.id)) {
      store.updateRequirement({
        ...req,
        linkedTaskIds: [...(req.linkedTaskIds || []), task.id],
      });
    }
  }

  private unlinkRequirement(task: Task, reqId: string) {
    const nextReqIds = (task.requirementIds || []).filter((id) => id !== reqId);
    store.updateTask({ ...task, requirementIds: nextReqIds });
    const req = store.requirements.find((r) => r.id === reqId);
    if (req && (req.linkedTaskIds || []).includes(task.id)) {
      store.updateRequirement({
        ...req,
        linkedTaskIds: (req.linkedTaskIds || []).filter((id) => id !== task.id),
      });
    }
  }

  private linkKnowledge(task: Task, kbId: string) {
    const nextKbIds = Array.from(new Set([...(task.knowledgeArticleIds || []), kbId]));
    store.updateTask({ ...task, knowledgeArticleIds: nextKbIds });
  }

  private unlinkKnowledge(task: Task, kbId: string) {
    const nextKbIds = (task.knowledgeArticleIds || []).filter((id) => id !== kbId);
    store.updateTask({ ...task, knowledgeArticleIds: nextKbIds });
    const art = store.knowledgeArticles.find((a) => a.id === kbId);
    if (art && (art.linkedTaskIds || []).includes(task.id)) {
      store.updateKnowledgeArticle({
        ...art,
        linkedTaskIds: (art.linkedTaskIds || []).filter((id) => id !== task.id),
      });
    }
  }
}
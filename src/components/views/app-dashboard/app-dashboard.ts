import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { ActivityLogItem, Project, Task } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-dashboard.css';
import {
  iconAnalytics,
  iconCheck,
  iconClock,
  iconKanban,
  iconPlus,
  iconTable,
  iconCalendar,
} from '../../common/icons';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../dashboard/app-chart-card/app-chart-card';
import '../../dashboard/app-project-progress/app-project-progress';
import '../../dashboard/app-project-overview/app-project-overview';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-split-button/app-split-button';
import '../../common/app-badge/app-badge';

@customElement('app-dashboard')
export class AppDashboard extends LitElement {
  @state() private tasks: Task[] = [];
  @state() private projects: Project[] = [];
  @state() private activityLog: ActivityLogItem[] = [];
  @state() private currentLang = store.customization.language;
  @state() private timeframe: '7d' | '30d' | 'quarter' = '30d';
  @state() private overviewProjectId: string = 'all';

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
    this.tasks = store.getFilteredTasks();
    this.projects = store.projects;
    this.activityLog = store.activityLog;
    this.currentLang = store.customization.language;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const total = this.tasks.length;
    const done = this.tasks.filter((x) => x.status === 'done').length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    const urgentCount = this.tasks.filter((x) => x.priority === 'urgent' && x.status !== 'done').length;
    const loggedHours = this.tasks.reduce((sum, x) => sum + x.loggedHours, 0);
    const estimatedHours = this.tasks.reduce((sum, x) => sum + x.estimatedHours, 0);

    const statusData = [
      { label: t.status.backlog, value: this.tasks.filter((x) => x.status === 'backlog').length, color: '#64748b' },
      { label: t.status.todo, value: this.tasks.filter((x) => x.status === 'todo').length, color: '#0284c7' },
      { label: t.status.in_progress, value: this.tasks.filter((x) => x.status === 'in_progress').length, color: '#f59e0b' },
      { label: t.status.review, value: this.tasks.filter((x) => x.status === 'review').length, color: '#8b5cf6' },
      { label: t.status.done, value: done, color: '#10b981' },
    ];

    const priorityData = [
      { label: t.priority.urgent, value: this.tasks.filter((x) => x.priority === 'urgent').length, color: '#ef4444' },
      { label: t.priority.high, value: this.tasks.filter((x) => x.priority === 'high').length, color: '#f59e0b' },
      { label: t.priority.medium, value: this.tasks.filter((x) => x.priority === 'medium').length, color: '#0284c7' },
      { label: t.priority.low, value: this.tasks.filter((x) => x.priority === 'low').length, color: '#64748b' },
    ];

    const isRu = this.currentLang === 'ru';
    const velocityData =
      this.timeframe === '7d'
        ? [
            { label: isRu ? 'Пн' : 'Mon', value: 2 },
            { label: isRu ? 'Вт' : 'Tue', value: 4 },
            { label: isRu ? 'Ср' : 'Wed', value: 3 },
            { label: isRu ? 'Чт' : 'Thu', value: 6 },
            { label: isRu ? 'Пт' : 'Fri', value: 5 },
            { label: isRu ? 'Сб' : 'Sat', value: 3 },
            { label: isRu ? 'Вс' : 'Sun', value: 7 },
          ]
        : this.timeframe === '30d'
        ? [
            { label: isRu ? 'Н1' : 'W1', value: 12 },
            { label: isRu ? 'Н2' : 'W2', value: 18 },
            { label: isRu ? 'Н3' : 'W3', value: 15 },
            { label: isRu ? 'Н4' : 'W4', value: 22 },
          ]
        : [
            { label: isRu ? 'Сен' : 'Sep', value: 42 },
            { label: isRu ? 'Окт' : 'Oct', value: 58 },
            { label: isRu ? 'Ноя' : 'Nov', value: 64 },
          ];

    const upcoming = [...this.tasks]
      .filter((x) => x.status !== 'done')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);

    const recentLogs = this.activityLog.slice(0, 4);

    return html`
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div class="header-copy">
            <h1 class="dash-title">${t.dashboard.title}</h1>
            <p class="dash-subtitle">${t.dashboard.subtitle}</p>
          </div>

          <div class="header-controls">
            <app-segmented-switch
              size="sm"
              .value="${this.timeframe}"
              .options="${[
                { value: '7d', label: t.dashboard.period7d },
                { value: '30d', label: t.dashboard.period30d },
                { value: 'quarter', label: t.dashboard.periodQuarter },
              ]}"
              @change="${(e: CustomEvent) => {
                this.timeframe = e.detail.value;
              }}"
            ></app-segmented-switch>

            <app-split-button
              label="${t.common.create}"
              variant="primary"
              size="sm"
              .items="${[
                { id: 'kanban', label: t.dashboard.openKanban, icon: iconKanban() },
                { id: 'grid', label: t.dashboard.openGrid, icon: iconTable() },
                { id: 'calendar', label: t.navigation.calendar, icon: iconCalendar() },
              ]}"
              @primary-click="${() => store.openCreateTaskModal()}"
              @select="${(e: CustomEvent) => {
                const view = e.detail.id;
                if (view === 'kanban' || view === 'grid' || view === 'calendar') {
                  store.setActiveView(view);
                }
              }}"
            >
              <span slot="icon-start">${iconPlus(14)}</span>
            </app-split-button>
          </div>
        </div>

        <!-- 4-Column KPI Strip -->
        <div class="kpi-strip">
          <app-metric-card
            label="${t.dashboard.totalTasks}"
            value="${String(total)}"
            delta="+12%"
            trend="up"
            subtitle="${t.dashboard.vsLastPeriod}"
            .sparkline="${[8, 11, 10, 14, 16, 15, total]}"
            clickable
            @click="${() => store.setActiveView('grid')}"
          >
            <span slot="icon">${iconAnalytics()}</span>
          </app-metric-card>

          <app-metric-card
            label="${t.dashboard.completionRate}"
            value="${rate}%"
            delta="${done} ${t.dashboard.of} ${total}"
            trend="up"
            subtitle="${t.dashboard.tasksDone}"
            accentColor="#10b981"
            .sparkline="${[20, 28, 35, 42, 48, rate]}"
            clickable
            @click="${() => store.setActiveView('kanban')}"
          >
            <span slot="icon">${iconCheck(16)}</span>
          </app-metric-card>

          <app-metric-card
            label="${t.dashboard.hoursLogged}"
            value="${loggedHours} ${t.common.hours}"
            delta="${estimatedHours} ${t.common.hours} ${isRu ? 'план' : 'est.'}"
            trend="neutral"
            subtitle="${isRu ? 'ёмкость спринта' : 'sprint capacity'}"
            accentColor="#06b6d4"
            .sparkline="${[30, 44, 60, 75, 90, loggedHours]}"
          >
            <span slot="icon">${iconClock(16)}</span>
          </app-metric-card>

          <app-metric-card
            label="${t.dashboard.urgentItems}"
            value="${String(urgentCount)}"
            delta="${urgentCount > 0 ? (isRu ? 'Внимание' : 'Focus') : (isRu ? 'Чисто' : 'Clear')}"
            trend="${urgentCount > 2 ? 'down' : 'neutral'}"
            subtitle="${t.analytics.urgentTasks}"
            accentColor="#ef4444"
          ></app-metric-card>
        </div>

        <!-- D3 Project Overview Section -->
        <app-project-overview
          projectId="${this.overviewProjectId}"
          @project-change="${(e: CustomEvent<{ projectId: string }>) => {
            this.overviewProjectId = e.detail.projectId;
          }}"
        ></app-project-overview>

        <!-- Main Content Grid -->
        <div class="main-grid">
          <div class="column-stack">
            <app-chart-card
              title="${isRu ? 'Темп команды' : 'Team Velocity'} · ${t.dashboard.statusOverview}"
              subtitle="${t.dashboard.subtitle}"
              type="line"
              .data="${velocityData}"
            ></app-chart-card>

            <app-chart-card
              title="${t.dashboard.statusOverview}"
              type="bar"
              .data="${statusData}"
            ></app-chart-card>

            <app-project-progress
              title="${t.dashboard.activeProjects}"
              .projects="${this.projects}"
              .tasks="${this.tasks}"
              lang="${this.currentLang}"
            ></app-project-progress>
          </div>

          <div class="column-stack">
            <app-chart-card
              title="${t.dashboard.prioritySplit}"
              type="donut"
              centerLabel="${t.kanban.itemsCount}"
              .data="${priorityData}"
            ></app-chart-card>

            <!-- Upcoming Deadlines -->
            <div class="panel-card">
              <div class="panel-header">
                <span class="panel-title">${t.dashboard.upcomingDeadlines}</span>
                <app-badge size="sm" variant="neutral">${upcoming.length}</app-badge>
              </div>

              ${upcoming.length === 0
                ? html`<div style="font-size: 0.8125rem; color: var(--text-muted);">${t.dashboard.noDeadlines}</div>`
                : html`
                    <div class="deadline-list">
                      ${upcoming.map((task) => {
                        const priVariant =
                          task.priority === 'urgent'
                            ? 'danger'
                            : task.priority === 'high'
                            ? 'warning'
                            : 'neutral';
                        return html`
                          <div class="deadline-item" @click="${() => store.openTaskDetail(task.id)}">
                            <div class="deadline-left">
                              <span class="deadline-title">${task.title}</span>
                              <div class="deadline-meta">
                                <span class="tabular-nums">${task.id}</span>
                                <span aria-hidden="true">·</span>
                                <span class="tabular-nums">${task.dueDate}</span>
                              </div>
                            </div>
                            <app-badge size="sm" variant="${priVariant}">
                              ${(t.priority as Record<string, string>)[task.priority] || task.priority}
                            </app-badge>
                          </div>
                        `;
                      })}
                    </div>
                  `}
            </div>

            <!-- Recent Activity -->
            <div class="panel-card">
              <div class="panel-header">
                <span class="panel-title">${t.dashboard.recentActivity}</span>
                <app-button size="sm" variant="ghost" @click="${() => store.toggleActivityPanel()}">
                  ${t.common.details}
                </app-button>
              </div>

              <div class="activity-list">
                ${recentLogs.map(
                  (log) => html`
                    <div class="activity-item">
                      <span class="activity-title">${log.targetTitle}</span>
                      <span class="activity-details">${log.userName} · ${log.details}</span>
                    </div>
                  `
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

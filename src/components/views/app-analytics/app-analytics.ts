import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Task } from '../../../types';
import { getTranslation } from '../../../i18n';
import '../../common/app-avatar/app-avatar';
import styles from './app-analytics.css';

@customElement('app-analytics')
export class AppAnalytics extends LitElement {
  @state() private tasks: Task[] = [];
  @state() private currentLang = store.customization.language;

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
    this.currentLang = store.customization.language;
  }

  render() {
    const t = getTranslation(this.currentLang);

    const total = this.tasks.length;
    const completed = this.tasks.filter((x) => x.status === 'done').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const urgent = this.tasks.filter((x) => x.priority === 'urgent').length;
    const estimatedHoursTotal = this.tasks.reduce((sum, x) => sum + x.estimatedHours, 0);
    const loggedHoursTotal = this.tasks.reduce((sum, x) => sum + x.loggedHours, 0);

    const statusCounts = {
      backlog: this.tasks.filter((x) => x.status === 'backlog').length,
      todo: this.tasks.filter((x) => x.status === 'todo').length,
      in_progress: this.tasks.filter((x) => x.status === 'in_progress').length,
      review: this.tasks.filter((x) => x.status === 'review').length,
      done: completed,
    };

    const statusColors = {
      backlog: '#64748b',
      todo: '#0284c7',
      in_progress: '#f59e0b',
      review: '#8b5cf6',
      done: '#10b981',
    };

    const priorityCounts = {
      urgent,
      high: this.tasks.filter((x) => x.priority === 'high').length,
      medium: this.tasks.filter((x) => x.priority === 'medium').length,
      low: this.tasks.filter((x) => x.priority === 'low').length,
    };

    const priorityColors = {
      urgent: '#ef4444',
      high: '#f59e0b',
      medium: '#0284c7',
      low: '#64748b',
    };

    return html`
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">${t.analytics.totalTasks}</span>
          <span class="kpi-value">${total}</span>
          <span class="kpi-sub">${store.projects.length} активных проекта</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${t.analytics.completedTasks}</span>
          <span class="kpi-value" style="color: var(--color-success, #10b981);">${completed}</span>
          <span class="kpi-sub">${rate}% от общего объема</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${t.analytics.urgentTasks}</span>
          <span class="kpi-value" style="color: var(--color-danger, #ef4444);">${urgent}</span>
          <span class="kpi-sub">Требуют немедленного внимания</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${t.analytics.totalEstimatedHours}</span>
          <span class="kpi-value">${estimatedHoursTotal} ч.</span>
          <span class="kpi-sub">Залогировано: ${loggedHoursTotal} ч.</span>
        </div>
      </div>

      <div class="charts-grid">
        <div class="section-card">
          <div class="section-header">${t.analytics.statusDistribution}</div>
          ${Object.entries(statusCounts).map(([statusKey, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const label = (t.status as Record<string, string>)[statusKey] || statusKey;
            const color = (statusColors as Record<string, string>)[statusKey] || '#64748b';

            return html`
              <div class="bar-row">
                <div class="bar-meta">
                  <span>${label}</span>
                  <span class="tabular-nums">${count} (${pct}%)</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
                </div>
              </div>
            `;
          })}
        </div>

        <div class="section-card">
          <div class="section-header">${t.analytics.priorityBreakdown}</div>
          ${Object.entries(priorityCounts).map(([priKey, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const label = (t.priority as Record<string, string>)[priKey] || priKey;
            const color = (priorityColors as Record<string, string>)[priKey] || '#64748b';

            return html`
              <div class="bar-row">
                <div class="bar-meta">
                  <span>${label}</span>
                  <span class="tabular-nums">${count} (${pct}%)</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
                </div>
              </div>
            `;
          })}
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">${t.analytics.teamWorkload}</div>
        <table class="team-table">
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>Роль</th>
              <th>Задач</th>
              <th>Оценка</th>
              <th>Залогировано</th>
            </tr>
          </thead>
          <tbody>
            ${store.users.map((user) => {
              const userTasks = this.tasks.filter((task) => task.assigneeId === user.id);
              const est = userTasks.reduce((s, x) => s + x.estimatedHours, 0);
              const log = userTasks.reduce((s, x) => s + x.loggedHours, 0);

              return html`
                <tr>
                  <td>
                    <div class="member-cell">
                      <app-avatar size="sm" initials="${user.avatar}" title="${user.name}"></app-avatar>
                      <span>${user.name}</span>
                    </div>
                  </td>
                  <td><span style="color: var(--text-muted, #64748b);">${user.role}</span></td>
                  <td><strong class="tabular-nums">${userTasks.length}</strong></td>
                  <td><span class="tabular-nums">${est} ч.</span></td>
                  <td><span class="tabular-nums">${log} ч.</span></td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
    `;
  }
}

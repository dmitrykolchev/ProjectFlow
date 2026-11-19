import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Task } from '../../../types';
import { getTranslation } from '../../../i18n';
import { presenceFromStatus } from '../../../domain/presence-tokens';
import '../../common/app-persona/app-persona';
import '../../common/app-section-card/app-section-card';
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
          <span class="kpi-sub">${t.analytics.kpiActiveProjects(store.projects.length)}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${t.analytics.completedTasks}</span>
          <span class="kpi-value" style="color: var(--color-success, #10b981);">${completed}</span>
          <span class="kpi-sub">${t.analytics.kpiCompletedRate(rate)}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${t.analytics.urgentTasks}</span>
          <span class="kpi-value" style="color: var(--color-danger, #ef4444);">${urgent}</span>
          <span class="kpi-sub">${t.analytics.kpiUrgentSub}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">${t.analytics.totalEstimatedHours}</span>
          <span class="kpi-value">${estimatedHoursTotal}${t.analytics.hoursSuffix}</span>
          <span class="kpi-sub">${t.analytics.kpiLogged(loggedHoursTotal)}</span>
        </div>
      </div>

      <div class="charts-grid">
        <app-section-card variant="plain" title="${t.analytics.statusDistribution}">
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
        </app-section-card>

        <app-section-card variant="plain" title="${t.analytics.priorityBreakdown}">
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
        </app-section-card>
      </div>

      <app-section-card variant="plain" title="${t.analytics.teamWorkload}">
        <table class="team-table">
          <thead>
            <tr>
              <th>${t.analytics.thEmployee}</th>
              <th>${t.analytics.thRole}</th>
              <th>${t.analytics.thTasks}</th>
              <th>${t.analytics.thEstimate}</th>
              <th>${t.analytics.thLogged}</th>
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
                    <app-persona
                      size="32"
                      .initials="${user.avatar}"
                      .presence="${presenceFromStatus(user.status)}"
                      .primaryText="${user.name}"
                      @click="${() => store.openEmployeeDetail(user.id)}"
                    ></app-persona>
                  </td>
                  <td><span style="color: var(--text-muted, #64748b);">${user.role}</span></td>
                  <td><strong class="tabular-nums">${userTasks.length}</strong></td>
                  <td><span class="tabular-nums">${est}${t.analytics.hoursSuffix}</span></td>
                  <td><span class="tabular-nums">${log}${t.analytics.hoursSuffix}</span></td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </app-section-card>
    `;
  }
}

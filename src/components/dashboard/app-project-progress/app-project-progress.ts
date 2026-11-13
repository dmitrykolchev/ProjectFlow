import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Project, Task } from '../../../types';
import { getTranslation } from '../../../i18n';
import { store } from '../../../state/store';
import styles from './app-project-progress.css';

@customElement('app-project-progress')
export class AppProjectProgress extends LitElement {
  @property({ type: String }) title: string = '';
  @property({ type: Array }) projects: Project[] = [];
  @property({ type: Array }) tasks: Task[] = [];
  @property({ type: String }) lang: 'ru' | 'en' = 'ru';

  static styles = styles;

  render() {
    const t = getTranslation(this.lang);

    return html`
      <div class="progress-card">
        <div class="card-header">
          <span class="card-title">${this.title || t.dashboard.activeProjects}</span>
          <slot name="actions"></slot>
        </div>

        <div class="project-list">
          ${this.projects.map((p) => {
            const projTasks = this.tasks.filter((task) => task.projectId === p.id);
            const doneCount = projTasks.filter((task) => task.status === 'done').length;
            const computedPct =
              projTasks.length > 0 ? Math.round((doneCount / projTasks.length) * 100) : p.progress;

            return html`
              <div class="project-row" @click="${() => this.selectProject(p.id)}">
                <div class="project-top">
                  <div class="project-info">
                    <span class="project-key">${p.key}</span>
                    <span aria-hidden="true" style="color: var(--text-muted);">·</span>
                    <span class="project-name">${p.name}</span>
                  </div>
                  <div class="project-meta">
                    <span class="tabular-nums">${doneCount}/${projTasks.length}</span>
                    <span aria-hidden="true">·</span>
                    <span class="pct-num">${computedPct}%</span>
                  </div>
                </div>
                <div class="track">
                  <div class="fill" style="width: ${computedPct}%; background: ${p.color};"></div>
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private selectProject(projectId: string) {
    store.selectProject(projectId);
    store.setActiveView('kanban');
  }
}

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Task, TaskPriority, TaskStatus } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-kanban.css';
import { iconClock, iconPlus } from '../../common/icons';
import '../../common/app-button/app-button';

const COLUMNS: { id: TaskStatus; color: string }[] = [
  { id: 'backlog', color: '#64748b' },
  { id: 'todo', color: '#0284c7' },
  { id: 'in_progress', color: '#f59e0b' },
  { id: 'review', color: '#8b5cf6' },
  { id: 'done', color: '#10b981' },
];

@customElement('app-kanban')
export class AppKanban extends LitElement {
  @state() private tasks: Task[] = [];
  @state() private currentLang = store.customization.language;
  @state() private draggedTaskId: string | null = null;
  @state() private dragOverColumn: TaskStatus | null = null;

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

    return html`
      <div class="toolbar">
        <div class="filter-group">
          <select
            class="filter-select"
            .value="${store.filterPriority}"
            @change="${(e: Event) => store.setFilterPriority((e.target as HTMLSelectElement).value)}"
          >
            <option value="all">⚡ ${t.common.all} приоритеты</option>
            <option value="urgent">Срочный (Urgent)</option>
            <option value="high">Высокий (High)</option>
            <option value="medium">Средний (Medium)</option>
            <option value="low">Низкий (Low)</option>
          </select>

          <select
            class="filter-select"
            .value="${store.filterAssignee}"
            @change="${(e: Event) => store.setFilterAssignee((e.target as HTMLSelectElement).value)}"
          >
            <option value="all">👤 ${t.common.all} исполнители</option>
            ${store.users.map((u) => html`<option value="${u.id}">${u.name}</option>`)}
          </select>

          ${store.filterPriority !== 'all' || store.filterAssignee !== 'all' || store.searchQuery
            ? html`
                <app-button
                  size="sm"
                  variant="ghost"
                  @click="${() => store.resetFilters()}"
                >
                  ${t.common.reset}
                </app-button>
              `
            : ''}
        </div>

        <div>
          <span style="font-size: 0.8125rem; color: var(--text-muted, #64748b);">
            ${t.common.total}: <strong class="tabular-nums" style="color: var(--text-primary, #f8fafc);">${this.tasks.length}</strong> ${t.kanban.itemsCount}
          </span>
        </div>
      </div>

      <div class="board-container">
        ${COLUMNS.map((col) => {
          const colTasks = this.tasks.filter((task) => task.status === col.id);
          const colName = (t.status as Record<string, string>)[col.id] || col.id;

          return html`
            <div
              class="column ${this.dragOverColumn === col.id ? 'drag-over' : ''}"
              @dragover="${(e: DragEvent) => this.handleDragOver(e, col.id)}"
              @dragleave="${this.handleDragLeave}"
              @drop="${(e: DragEvent) => this.handleDrop(e, col.id)}"
            >
              <div class="column-header">
                <div class="column-title-group">
                  <span class="status-indicator" style="background-color: ${col.color};"></span>
                  <span class="column-name">${colName}</span>
                  <span class="column-count">${colTasks.length}</span>
                </div>
                <button
                  class="add-task-quick-btn"
                  @click="${() => store.openCreateTaskModal({ status: col.id })}"
                  title="${t.kanban.addTask}"
                >
                  ${iconPlus(16)}
                </button>
              </div>

              <div class="card-list">
                ${colTasks.length === 0
                  ? html`<div class="empty-column-msg">${t.kanban.emptyColumn}</div>`
                  : colTasks.map((task) => {
                      const assignee = store.users.find((u) => u.id === task.assigneeId);
                      const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
                      const progressPct =
                        task.subtasks.length > 0 ? (completedSubtasks / task.subtasks.length) * 100 : task.status === 'done' ? 100 : 0;

                      return html`
                        <div
                          class="task-card ${this.draggedTaskId === task.id ? 'dragging' : ''}"
                          draggable="true"
                          @dragstart="${(e: DragEvent) => this.handleDragStart(e, task.id)}"
                          @dragend="${this.handleDragEnd}"
                          @click="${() => store.openTaskDetail(task.id)}"
                        >
                          <div class="card-header">
                            <span class="card-key">${task.id}</span>
                            <span class="priority-indicator priority-${task.priority}">
                              ${(t.priority as Record<string, string>)[task.priority] || task.priority}
                            </span>
                          </div>

                          <div class="card-title">${task.title}</div>

                          ${task.description ? html`<div class="card-desc">${task.description}</div>` : ''}

                          ${task.tags.length > 0
                            ? html`
                                <div class="card-tags">
                                  ${task.tags.map((tag) => html`<span class="tag-badge">${tag}</span>`)}
                                </div>
                              `
                            : ''}

                          ${task.subtasks.length > 0
                            ? html`
                                <div class="progress-bar-container" title="Подзадачи: ${completedSubtasks}/${task.subtasks.length}">
                                  <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
                                </div>
                              `
                            : ''}

                          <div class="card-footer">
                            <span class="date-info">
                              ${iconClock(12)}
                              <span>${task.dueDate.slice(5)}</span>
                            </span>
                            <div class="assignee-avatar" title="${assignee ? assignee.name : 'Unassigned'}">
                              ${assignee ? assignee.avatar : '?'}
                            </div>
                          </div>
                        </div>
                      `;
                    })}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private handleDragStart(e: DragEvent, taskId: string) {
    this.draggedTaskId = taskId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', taskId);
    }
  }

  private handleDragEnd() {
    this.draggedTaskId = null;
    this.dragOverColumn = null;
  }

  private handleDragOver(e: DragEvent, colId: TaskStatus) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    this.dragOverColumn = colId;
  }

  private handleDragLeave() {
    this.dragOverColumn = null;
  }

  private handleDrop(e: DragEvent, colId: TaskStatus) {
    e.preventDefault();
    this.dragOverColumn = null;
    const taskId = e.dataTransfer?.getData('text/plain') || this.draggedTaskId;
    if (taskId) {
      store.moveTaskStatus(taskId, colId);
    }
  }
}

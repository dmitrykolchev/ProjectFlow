import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Task, TaskPriority, TaskStatus } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-task-modal.css';
import '../app-modal/app-modal';
import '../app-button/app-button';
import '../app-input/app-input';
import '../app-textarea/app-textarea';
import '../app-select/app-select';
import '../app-date-input/app-date-input';
import '../app-number-input/app-number-input';
import '../app-combobox/app-combobox';

@customElement('app-task-modal')
export class AppTaskModal extends LitElement {
  @state() private isOpen: boolean = false;
  @state() private editingTask: Task | null = null;
  @state() private currentLang = store.customization.language;

  // Form fields
  @state() private taskTitle: string = '';
  @state() private description: string = '';
  @state() private projectId: string = '';
  @state() private status: TaskStatus = 'todo';
  @state() private priority: TaskPriority = 'medium';
  @state() private assigneeId: string = '';
  @state() private startDate: string = '';
  @state() private dueDate: string = '';
  @state() private estimatedHours: number = 8;
  @state() private loggedHours: number = 0;
  @state() private tags: string[] = [];
  @state() private subtasks: { id: string; title: string; completed: boolean }[] = [];
  @state() private newSubtaskText: string = '';
  @state() private errors: Record<string, string> = {};

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
    this.currentLang = store.customization.language;
    const wasOpen = this.isOpen;
    this.isOpen = store.isTaskModalOpen;

    if (this.isOpen && !wasOpen) {
      if (store.editingTask) {
        this.editingTask = store.editingTask;
        this.taskTitle = this.editingTask.title;
        this.description = this.editingTask.description;
        this.projectId = this.editingTask.projectId;
        this.status = this.editingTask.status;
        this.priority = this.editingTask.priority;
        this.assigneeId = this.editingTask.assigneeId;
        this.startDate = this.editingTask.startDate;
        this.dueDate = this.editingTask.dueDate;
        this.estimatedHours = this.editingTask.estimatedHours;
        this.loggedHours = this.editingTask.loggedHours;
        this.tags = [...this.editingTask.tags];
        this.subtasks = [...this.editingTask.subtasks];
      } else {
        this.editingTask = null;
        this.taskTitle = '';
        this.description = '';
        this.projectId = store.selectedProjectId !== 'all' ? store.selectedProjectId : (store.projects[0]?.id || '');
        this.status = store.newTaskDefaultStatus;
        this.priority = 'medium';
        this.assigneeId = store.users[0]?.id || '';
        this.startDate = store.newTaskDefaultDate || new Date().toISOString().slice(0, 10);
        const due = new Date();
        due.setDate(due.getDate() + 5);
        this.dueDate = due.toISOString().slice(0, 10);
        this.estimatedHours = 16;
        this.loggedHours = 0;
        this.tags = ['Dev'];
        this.subtasks = [];
      }
      this.errors = {};
    }
  }

  render() {
    const t = getTranslation(this.currentLang);

    const projectOptions = store.projects.map((p) => ({
      value: p.id,
      label: `${p.key} - ${p.name}`,
      color: p.color,
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

    const availableTags = ['Dev', 'Frontend', 'Backend', 'Design', 'Architecture', 'Security', 'Performance', 'QA', 'API'];

    return html`
      <app-modal
        ?open="${this.isOpen}"
        size="lg"
        @close="${() => store.closeTaskModal()}"
      >
        <span slot="title">
          ${this.editingTask ? t.taskModal.editTitle : t.taskModal.createTitle}
        </span>

        <div class="form-grid">
          <div class="col-span-2">
            <app-input
              label="${t.taskModal.titleLabel}"
              placeholder="${t.taskModal.titlePlaceholder}"
              .value="${this.taskTitle}"
              required
              error="${this.errors.title || ''}"
              @input="${(e: CustomEvent) => (this.taskTitle = e.detail.value)}"
            ></app-input>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.taskModal.descLabel}"
              placeholder="${t.taskModal.descPlaceholder}"
              .value="${this.description}"
              rows="3"
              @input="${(e: CustomEvent) => (this.description = e.detail.value)}"
            ></app-textarea>
          </div>

          <div>
            <app-select
              label="${t.taskModal.projectLabel}"
              .value="${this.projectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent) => (this.projectId = e.detail.value)}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.taskModal.assigneeLabel}"
              .value="${this.assigneeId}"
              .options="${assigneeOptions}"
              @change="${(e: CustomEvent) => (this.assigneeId = e.detail.value)}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.taskModal.statusLabel}"
              .value="${this.status}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent) => (this.status = e.detail.value as TaskStatus)}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.taskModal.priorityLabel}"
              .value="${this.priority}"
              .options="${priorityOptions}"
              @change="${(e: CustomEvent) => (this.priority = e.detail.value as TaskPriority)}"
            ></app-select>
          </div>

          <div>
            <app-date-input
              label="${t.taskModal.startDate}"
              .value="${this.startDate}"
              @change="${(e: CustomEvent) => (this.startDate = e.detail.value)}"
            ></app-date-input>
          </div>

          <div>
            <app-date-input
              label="${t.taskModal.dueDate}"
              .value="${this.dueDate}"
              @change="${(e: CustomEvent) => (this.dueDate = e.detail.value)}"
            ></app-date-input>
          </div>

          <div>
            <app-number-input
              label="${t.taskModal.estimatedHours}"
              .value="${this.estimatedHours}"
              min="1"
              max="200"
              unit="ч"
              @change="${(e: CustomEvent) => (this.estimatedHours = e.detail.value)}"
            ></app-number-input>
          </div>

          <div>
            <app-number-input
              label="${t.taskModal.loggedHours}"
              .value="${this.loggedHours}"
              min="0"
              max="200"
              unit="ч"
              @change="${(e: CustomEvent) => (this.loggedHours = e.detail.value)}"
            ></app-number-input>
          </div>

          <div class="col-span-2">
            <app-combobox
              label="${t.taskModal.tagsLabel}"
              .items="${availableTags}"
              .selected="${this.tags}"
              @change="${(e: CustomEvent) => (this.tags = e.detail.selected)}"
            ></app-combobox>
          </div>

          <div class="col-span-2 subtasks-section">
            <div class="section-title">${t.taskModal.subtasksLabel} (${this.subtasks.filter((s) => s.completed).length}/${this.subtasks.length})</div>
            <div class="subtask-list">
              ${this.subtasks.map(
                (sub) => html`
                  <div class="subtask-item">
                    <input
                      type="checkbox"
                      ?checked="${sub.completed}"
                      @change="${() => this.toggleSubtask(sub.id)}"
                    />
                    <span class="subtask-title ${sub.completed ? 'is-done' : ''}">${sub.title}</span>
                    <button
                      type="button"
                      class="subtask-remove"
                      @click="${() => this.removeSubtask(sub.id)}"
                    >
                      &times;
                    </button>
                  </div>
                `
              )}
            </div>
            <div class="add-subtask-row">
              <input
                type="text"
                class="add-subtask-input"
                placeholder="${t.taskModal.subtaskPlaceholder}"
                .value="${this.newSubtaskText}"
                @input="${(e: Event) => (this.newSubtaskText = (e.target as HTMLInputElement).value)}"
                @keydown="${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addSubtask();
                  }
                }}"
              />
              <app-button size="sm" variant="secondary" @click="${this.addSubtask}">
                ${t.taskModal.addSubtask}
              </app-button>
            </div>
          </div>
        </div>

        <div slot="footer">
          ${this.editingTask
            ? html`
                <app-button
                  variant="danger"
                  @click="${this.handleDelete}"
                  style="margin-right: auto;"
                >
                  ${t.common.delete}
                </app-button>
              `
            : ''}
          <app-button variant="ghost" @click="${() => store.closeTaskModal()}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${this.handleSave}">
            ${this.editingTask ? t.common.save : t.common.create}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private addSubtask() {
    if (!this.newSubtaskText.trim()) return;
    this.subtasks = [
      ...this.subtasks,
      {
        id: `sub-${Date.now()}`,
        title: this.newSubtaskText.trim(),
        completed: false,
      },
    ];
    this.newSubtaskText = '';
  }

  private toggleSubtask(id: string) {
    this.subtasks = this.subtasks.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
  }

  private removeSubtask(id: string) {
    this.subtasks = this.subtasks.filter((s) => s.id !== id);
  }

  private handleSave() {
    if (!this.taskTitle.trim()) {
      this.errors = { title: getTranslation(this.currentLang).common.required };
      return;
    }

    if (this.editingTask) {
      store.updateTask({
        ...this.editingTask,
        title: this.taskTitle.trim(),
        description: this.description.trim(),
        projectId: this.projectId,
        status: this.status,
        priority: this.priority,
        assigneeId: this.assigneeId,
        startDate: this.startDate,
        dueDate: this.dueDate,
        estimatedHours: this.estimatedHours,
        loggedHours: this.loggedHours,
        tags: this.tags,
        subtasks: this.subtasks,
      });
    } else {
      store.addTask({
        title: this.taskTitle.trim(),
        description: this.description.trim(),
        projectId: this.projectId,
        status: this.status,
        priority: this.priority,
        assigneeId: this.assigneeId,
        startDate: this.startDate,
        dueDate: this.dueDate,
        estimatedHours: this.estimatedHours,
        loggedHours: this.loggedHours,
        tags: this.tags,
        subtasks: this.subtasks,
      });
    }

    store.closeTaskModal();
  }

  private handleDelete() {
    if (!this.editingTask) return;
    if (confirm(getTranslation(this.currentLang).common.confirmDelete)) {
      store.deleteTask(this.editingTask.id);
      store.closeTaskModal();
    }
  }
}

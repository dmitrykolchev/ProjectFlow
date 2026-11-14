import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { store } from '../../../state/store';
import { Expense, ExpenseCategory, Task, TaskPriority, TaskStatus, TimeEntry, TimeEntryCategory } from '../../../types';
import { getTranslation } from '../../../i18n';
import { iconArrowUpRight, iconChevronDown, iconChevronUp, iconClock, iconGripVertical, iconPlus, iconTrash, iconWallet, iconX } from '../icons';
import styles from './app-task-modal.css';
import '../app-modal/app-modal';
import '../app-confirm-dialog/app-confirm-dialog';
import '../app-badge/app-badge';
import '../app-button/app-button';
import '../app-input/app-input';
import '../app-textarea/app-textarea';
import '../app-select/app-select';
import '../app-date-input/app-date-input';
import '../app-number-input/app-number-input';
import '../app-combobox/app-combobox';
import '../app-checkbox/app-checkbox';

@customElement('app-task-modal')
export class AppTaskModal extends LitElement {
  @state() private isOpen: boolean = false;
  @state() private editingTask: Task | null = null;
  @state() private confirmDeleteOpen = false;
  @state() private confirmRemoveSubtaskId: string | null = null;
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
  @state() private draggedSubtaskId: string | null = null;
  @state() private dropTargetSubtaskId: string | null = null;
  @state() private dropSubtaskPosition: 'before' | 'after' = 'before';

  // Quick Time Entry & Task Expense inline state
  @state() private taskTimeEntries: TimeEntry[] = [];
  @state() private taskExpenses: Expense[] = [];
  @state() private quickTimeHours: number = 1.5;
  @state() private quickTimeCategory: TimeEntryCategory = 'development';
  @state() private quickTimeDesc: string = '';
  @state() private quickExpenseTitle: string = '';
  @state() private quickExpenseAmount: number = 5000;
  @state() private quickExpenseCategory: ExpenseCategory = 'software';

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
      this.draggedSubtaskId = null;
      this.dropTargetSubtaskId = null;
      this.quickTimeHours = 1.5;
      this.quickTimeCategory = 'development';
      this.quickTimeDesc = '';
      this.quickExpenseTitle = '';
      this.quickExpenseAmount = 5000;
      this.quickExpenseCategory = 'software';
    }

    if (this.isOpen && this.editingTask) {
      const taskId = this.editingTask.id;
      this.taskTimeEntries = store.timeEntries.filter((te) => te.taskId === taskId);
      this.taskExpenses = store.expenses.filter((ex) => ex.taskId === taskId);
    } else if (!this.isOpen) {
      this.taskTimeEntries = [];
      this.taskExpenses = [];
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
              @input="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.taskTitle = String(v); }}"
            ></app-input>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.taskModal.descLabel}"
              placeholder="${t.taskModal.descPlaceholder}"
              .value="${this.description}"
              rows="3"
              @input="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.description = String(v); }}"
            ></app-textarea>
          </div>

          <div>
            <app-select
              label="${t.taskModal.projectLabel}"
              .value="${this.projectId}"
              .options="${projectOptions}"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.projectId = String(v); }}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.taskModal.assigneeLabel}"
              .value="${this.assigneeId}"
              .options="${assigneeOptions}"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.assigneeId = String(v); }}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.taskModal.statusLabel}"
              .value="${this.status}"
              .options="${statusOptions}"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.status = String(v) as TaskStatus; }}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.taskModal.priorityLabel}"
              .value="${this.priority}"
              .options="${priorityOptions}"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.priority = String(v) as TaskPriority; }}"
            ></app-select>
          </div>

          <div>
            <app-date-input
              label="${t.taskModal.startDate}"
              .value="${this.startDate}"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.startDate = String(v); }}"
            ></app-date-input>
          </div>

          <div>
            <app-date-input
              label="${t.taskModal.dueDate}"
              .value="${this.dueDate}"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.dueDate = String(v); }}"
            ></app-date-input>
          </div>

          <div>
            <app-number-input
              label="${t.taskModal.estimatedHours}"
              .value="${this.estimatedHours}"
              min="1"
              max="200"
              unit="${t.viewTexts.timeTracking.hoursUnit}"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.estimatedHours = Number(v); }}"
            ></app-number-input>
          </div>

          <div>
            <app-number-input
              label="${t.taskModal.loggedHours}"
              .value="${this.loggedHours}"
              min="0"
              max="200"
              unit="${t.viewTexts.timeTracking.hoursUnit}"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.loggedHours = Number(v); }}"
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
              ${repeat(
                this.subtasks,
                (sub) => sub.id,
                (sub, index) => {
                  const isDragging = this.draggedSubtaskId === sub.id;
                  const isDropTarget =
                    this.dropTargetSubtaskId === sub.id && this.draggedSubtaskId !== sub.id;
                  const dropClass = isDropTarget
                    ? this.dropSubtaskPosition === 'after'
                      ? 'is-drop-after'
                      : 'is-drop-before'
                    : '';

                  return html`
                    <div
                      class="subtask-item ${isDragging ? 'is-dragging' : ''} ${dropClass}"
                      draggable="true"
                      @dragstart="${(e: DragEvent) => this.handleSubtaskDragStart(e, sub.id)}"
                      @dragover="${(e: DragEvent) => this.handleSubtaskDragOver(e, sub.id)}"
                      @dragleave="${() => this.handleSubtaskDragLeave(sub.id)}"
                      @drop="${(e: DragEvent) => this.handleSubtaskDrop(e, sub.id)}"
                      @dragend="${this.handleSubtaskDragEnd}"
                    >
                      <span class="subtask-drag-handle" title="${t.taskModal.dragSubtask}">
                        ${iconGripVertical(14)}
                      </span>
                      <span class="subtask-order">${index + 1}.</span>
                      <app-checkbox
                        ?checked="${sub.completed}"
                        @change="${() => this.toggleSubtask(sub.id)}"
                      ></app-checkbox>
                      <span class="subtask-title ${sub.completed ? 'is-done' : ''}">${sub.title}</span>
                      <div class="subtask-actions">
                        <button
                          type="button"
                          class="subtask-action-btn"
                          ?disabled="${index === 0}"
                          @click="${() => this.moveSubtask(index, -1)}"
                          title="${t.taskModal.moveSubtaskUp}"
                          aria-label="${t.taskModal.moveSubtaskUp}"
                        >
                          ${iconChevronUp(14)}
                        </button>
                        <button
                          type="button"
                          class="subtask-action-btn"
                          ?disabled="${index === this.subtasks.length - 1}"
                          @click="${() => this.moveSubtask(index, 1)}"
                          title="${t.taskModal.moveSubtaskDown}"
                          aria-label="${t.taskModal.moveSubtaskDown}"
                        >
                          ${iconChevronDown(14)}
                        </button>
                        <button
                          type="button"
                          class="subtask-action-btn subtask-remove"
                          @click="${() => this.requestRemoveSubtask(sub.id)}"
                          title="${t.taskModal.removeSubtask}"
                          aria-label="${t.taskModal.removeSubtask}"
                        >
                          ${iconX(14)}
                        </button>
                      </div>
                    </div>
                  `;
                }
              )}
            </div>
            <div class="add-subtask-row">
              <app-input
                class="add-subtask-input-field"
                placeholder="${t.taskModal.subtaskPlaceholder}"
                .value="${this.newSubtaskText}"
                @input="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.newSubtaskText = String(v); }}"
                @keydown="${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addSubtask();
                  }
                }}"
              ></app-input>
              <app-button size="md" variant="secondary" @click="${this.addSubtask}">
                ${t.taskModal.addSubtask}
              </app-button>
            </div>
          </div>

          ${this.editingTask ? this.renderTaskReportsAndExpenses(t) : ''}
        </div>

        <div slot="footer">
          ${this.editingTask
            ? html`
                <app-button
                  variant="danger"
                  @click="${this.handleDelete}"
                >
                  ${t.common.delete}
                </app-button>
                <app-button
                  variant="outline"
                  style="margin-right: auto;"
                  @click="${() => {
                    const id = this.editingTask?.id;
                    if (!id) return;
                    store.closeTaskModal();
                    store.openTaskDetail(id);
                  }}"
                >
                  <span slot="icon-start">${iconArrowUpRight(14)}</span>
                  <span>${t.taskDetail.openFullPage}</span>
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
      <app-confirm-dialog
        .open="${this.confirmDeleteOpen}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.taskDelete.title}"
        action="${t.viewTexts.confirmDialogs.taskDelete.action(this.editingTask?.title || '')}"
        result="${t.viewTexts.confirmDialogs.taskDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmDeleteOpen = false)}"
        @confirm="${() => this.doDelete()}"
      ></app-confirm-dialog>
      <app-confirm-dialog
        .open="${Boolean(this.confirmRemoveSubtaskId)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.subtaskDelete.title}"
        action="${t.viewTexts.confirmDialogs.subtaskDelete.action(
          (this.subtasks.find((s) => s.id === this.confirmRemoveSubtaskId) || { title: '' }).title
        )}"
        result="${t.viewTexts.confirmDialogs.subtaskDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.confirmRemoveSubtaskId = null)}"
        @confirm="${() => this.doRemoveSubtask()}"
      ></app-confirm-dialog>
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

  private requestRemoveSubtask(id: string) {
    this.confirmRemoveSubtaskId = id;
  }

  private doRemoveSubtask() {
    const id = this.confirmRemoveSubtaskId;
    if (id) {
      this.subtasks = this.subtasks.filter((s) => s.id !== id);
    }
    this.confirmRemoveSubtaskId = null;
  }

  private moveSubtask(index: number, delta: -1 | 1) {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= this.subtasks.length) return;
    const next = [...this.subtasks];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    this.subtasks = next;
  }

  private handleSubtaskDragStart(e: DragEvent, id: string) {
    this.draggedSubtaskId = id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    }
  }

  private handleSubtaskDragOver(e: DragEvent, targetId: string) {
    if (!this.draggedSubtaskId) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (this.draggedSubtaskId === targetId) {
      this.dropTargetSubtaskId = null;
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    this.dropTargetSubtaskId = targetId;
    this.dropSubtaskPosition = pos;
  }

  private handleSubtaskDragLeave(targetId: string) {
    if (this.dropTargetSubtaskId === targetId) {
      this.dropTargetSubtaskId = null;
    }
  }

  private handleSubtaskDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = this.draggedSubtaskId || e.dataTransfer?.getData('text/plain') || null;
    const position = this.dropSubtaskPosition;
    this.draggedSubtaskId = null;
    this.dropTargetSubtaskId = null;

    if (!sourceId || sourceId === targetId) return;

    const next = [...this.subtasks];
    const fromIndex = next.findIndex((s) => s.id === sourceId);
    if (fromIndex === -1) return;
    const [moved] = next.splice(fromIndex, 1);
    let insertIndex = next.findIndex((s) => s.id === targetId);
    if (insertIndex === -1) {
      next.push(moved);
    } else {
      if (position === 'after') {
        insertIndex += 1;
      }
      next.splice(insertIndex, 0, moved);
    }
    this.subtasks = next;
  }

  private handleSubtaskDragEnd() {
    this.draggedSubtaskId = null;
    this.dropTargetSubtaskId = null;
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

  private readVal(e: Event): string | number | undefined {
    const detail = (e as CustomEvent).detail;
    if (detail && typeof detail.value === 'string' || (detail && typeof detail.value === 'number')) {
      return detail.value;
    }
    const target = e.composedPath()[0] as HTMLInputElement | null;
    return target && typeof target.value === 'string' ? target.value : undefined;
  }

  private handleDelete() {
    if (!this.editingTask) return;
    this.confirmDeleteOpen = true;
  }

  private doDelete() {
    if (!this.editingTask) return;
    store.deleteTask(this.editingTask.id);
    this.confirmDeleteOpen = false;
    store.closeTaskModal();
  }

  private renderTaskReportsAndExpenses(t: ReturnType<typeof getTranslation>) {
    const totalEntryHours = this.taskTimeEntries.reduce((s, e) => s + e.hours, 0);
    const totalExpenseRub = this.taskExpenses
      .filter((e) => e.status !== 'rejected')
      .reduce((s, e) => s + (e.currency === 'USD' ? e.amount * 96 : e.currency === 'EUR' ? e.amount * 104 : e.amount), 0);

    const timeCatOptions = [
      { value: 'development', label: t.timeTracking.categories.development },
      { value: 'design', label: t.timeTracking.categories.design },
      { value: 'testing', label: t.timeTracking.categories.testing },
      { value: 'research', label: t.timeTracking.categories.research },
      { value: 'devops', label: t.timeTracking.categories.devops },
      { value: 'meeting', label: t.timeTracking.categories.meeting },
      { value: 'management', label: t.timeTracking.categories.management },
    ];

    const expenseCatOptions = [
      { value: 'infrastructure', label: t.expenses.categories.infrastructure },
      { value: 'software', label: t.expenses.categories.software },
      { value: 'contractors', label: t.expenses.categories.contractors },
      { value: 'equipment', label: t.expenses.categories.equipment },
      { value: 'travel', label: t.expenses.categories.travel },
      { value: 'marketing', label: t.expenses.categories.marketing },
      { value: 'other', label: t.expenses.categories.other },
    ];

    return html`
      <!-- Time Entries Section -->
      <div class="col-span-2 task-records-section">
        <div class="records-head">
          <span class="records-title">
            ${iconClock(14)}
            <span>${t.viewTexts.taskModal.timeReportsSection} (${this.taskTimeEntries.length})</span>
          </span>
          <span class="records-total">${totalEntryHours.toFixed(1)}${t.viewTexts.timeTracking.hoursSuffix}</span>
        </div>

        ${this.taskTimeEntries.length === 0
          ? html`<div class="records-empty">${t.viewTexts.taskModal.noTimeEntries}</div>`
          : html`
              <div class="record-list">
                ${this.taskTimeEntries.map((entry) => {
                  const user = store.users.find((u) => u.id === entry.userId);
                  return html`
                    <div class="record-row">
                      <div class="record-main">
                        <div class="record-primary">${entry.description || t.timeTracking.categories[entry.category]}</div>
                        <div class="record-meta">
                          ${entry.date} · ${user?.name || entry.userId} · ${t.timeTracking.categories[entry.category]}
                        </div>
                      </div>
                      <div class="record-right">
                        <span class="record-val">${entry.hours.toFixed(1)}${t.viewTexts.timeTracking.hoursSuffix}</span>
                        <button
                          type="button"
                          class="subtask-action-btn subtask-remove"
                          title="${t.common.delete}"
                          @click="${() => this.handleDeleteQuickTime(entry)}"
                        >
                          ${iconTrash(13)}
                        </button>
                      </div>
                    </div>
                  `;
                })}
              </div>
            `}

        <div class="inline-mini-form">
          <div>
            <app-number-input
              size="sm"
              label="${t.viewTexts.taskModal.hoursLabel}"
              .value="${this.quickTimeHours}"
              min="0.25"
              max="24"
              step="0.5"
              unit="${t.viewTexts.timeTracking.hoursUnit}"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.quickTimeHours = Number(v); }}"
            ></app-number-input>
          </div>
          <div>
            <app-select
              size="sm"
              label="${t.viewTexts.taskModal.categoryLabel}"
              .value="${this.quickTimeCategory}"
              .options="${timeCatOptions}"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.quickTimeCategory = String(v) as TimeEntryCategory; }}"
            ></app-select>
          </div>
          <div>
            <app-input
              size="sm"
              label="${t.viewTexts.taskModal.commentLabel}"
              placeholder="${t.viewTexts.taskModal.commentPlaceholder}"
              .value="${this.quickTimeDesc}"
              @input="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.quickTimeDesc = String(v); }}"
            ></app-input>
          </div>
          <app-button
            size="sm"
            variant="secondary"
            ?disabled="${this.quickTimeHours <= 0}"
            @click="${this.handleAddQuickTime}"
          >
            <span slot="icon-start">${iconPlus(13)}</span>
            <span>${t.viewTexts.taskModal.logButton}</span>
          </app-button>
        </div>
      </div>

      <!-- Task Expenses Section -->
      <div class="col-span-2 task-records-section">
        <div class="records-head">
          <span class="records-title">
            ${iconWallet(14)}
            <span>${t.viewTexts.taskModal.expensesSection} (${this.taskExpenses.length})</span>
          </span>
          <span class="records-total">${Math.round(totalExpenseRub).toLocaleString('ru-RU')} ₽</span>
        </div>

        ${this.taskExpenses.length === 0
          ? html`<div class="records-empty">${t.viewTexts.taskModal.noExpenses}</div>`
          : html`
              <div class="record-list">
                ${this.taskExpenses.map((exp) => {
                  const sym = exp.currency === 'USD' ? '$' : exp.currency === 'EUR' ? '€' : '₽';
                  return html`
                    <div class="record-row">
                      <div class="record-main">
                        <div class="record-primary">${exp.title}</div>
                        <div class="record-meta">
                          ${exp.date} · ${t.expenses.categories[exp.category]} · ${t.expenses.statuses[exp.status]}
                        </div>
                      </div>
                      <div class="record-right">
                        <span class="record-val">${exp.amount.toLocaleString('ru-RU')} ${sym}</span>
                        <button
                          type="button"
                          class="subtask-action-btn subtask-remove"
                          title="${t.common.delete}"
                          @click="${() => store.deleteExpense(exp.id)}"
                        >
                          ${iconTrash(13)}
                        </button>
                      </div>
                    </div>
                  `;
                })}
              </div>
            `}

        <div class="inline-mini-form expense-mini">
          <div>
            <app-input
              size="sm"
              label="${t.viewTexts.taskModal.expenseTitleLabel}"
              placeholder="${t.viewTexts.taskModal.expenseTitlePlaceholder}"
              .value="${this.quickExpenseTitle}"
              @input="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.quickExpenseTitle = String(v); }}"
            ></app-input>
          </div>
          <div>
            <app-number-input
              size="sm"
              label="${t.viewTexts.taskModal.amountLabel}"
              .value="${this.quickExpenseAmount}"
              min="0"
              step="500"
              unit="₽"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.quickExpenseAmount = Number(v); }}"
            ></app-number-input>
          </div>
          <div>
            <app-select
              size="sm"
              label="${t.viewTexts.taskModal.categoryLabel}"
              .value="${this.quickExpenseCategory}"
              .options="${expenseCatOptions}"
              @change="${(e: Event) => { const v = this.readVal(e); if (v !== undefined) this.quickExpenseCategory = String(v) as ExpenseCategory; }}"
            ></app-select>
          </div>
          <app-button
            size="sm"
            variant="secondary"
            ?disabled="${!this.quickExpenseTitle.trim()}"
            @click="${this.handleAddQuickExpense}"
          >
            <span slot="icon-start">${iconPlus(13)}</span>
            <span>${t.viewTexts.taskModal.expenseButton}</span>
          </app-button>
        </div>
      </div>
    `;
  }

  private handleAddQuickTime() {
    if (!this.editingTask || this.quickTimeHours <= 0) return;
    const entry = store.addTimeEntry({
      taskId: this.editingTask.id,
      projectId: this.projectId || this.editingTask.projectId,
      userId: this.assigneeId || store.users[0]?.id || 'user-1',
      date: new Date().toISOString().slice(0, 10),
      hours: this.quickTimeHours,
      billable: true,
      category: this.quickTimeCategory,
      status: 'logged',
      description: this.quickTimeDesc.trim(),
    });
    this.loggedHours = Math.max(0, Math.round((this.loggedHours + entry.hours) * 100) / 100);
    this.quickTimeDesc = '';
  }

  private handleDeleteQuickTime(entry: TimeEntry) {
    store.deleteTimeEntry(entry.id);
    this.loggedHours = Math.max(0, Math.round((this.loggedHours - entry.hours) * 100) / 100);
  }

  private handleAddQuickExpense() {
    if (!this.editingTask || !this.quickExpenseTitle.trim()) return;
    store.addExpense({
      projectId: this.projectId || this.editingTask.projectId,
      taskId: this.editingTask.id,
      userId: this.assigneeId || store.users[0]?.id || 'user-1',
      date: new Date().toISOString().slice(0, 10),
      title: this.quickExpenseTitle.trim(),
      category: this.quickExpenseCategory,
      amount: Math.max(0, Number(this.quickExpenseAmount) || 0),
      currency: 'RUB',
      billable: true,
      status: 'pending',
      notes: `Привязано к задаче ${this.editingTask.id}`,
    });
    this.quickExpenseTitle = '';
  }
}

import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Task } from '../../../types';
import { getTranslation } from '../../../i18n';
import { iconChevronLeft, iconChevronRight, iconPlus } from '../../common/icons';
import '../../common/app-button/app-button';
import styles from './app-calendar.css';

const TODAY_STR = '2026-11-11';

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@customElement('app-calendar')
export class AppCalendar extends LitElement {
  @state() private tasks: Task[] = [];
  @state() private currentLang = store.customization.language;
  @state() private viewMode: 'month' | 'week' | 'day' = 'month';
  @state() private weekDaysCount: 5 | 7 = 7;
  @state() private currentYear: number = 2026;
  @state() private currentMonth: number = 10; // 0-indexed: 10 = November
  @state() private currentDay: number = 11;

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

  private getPriorityColor(priority: Task['priority']): string {
    switch (priority) {
      case 'urgent':
        return '#ef4444';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#0284c7';
      default:
        return '#64748b';
    }
  }

  private getWeekDays(): { date: Date; dateStr: string; weekdayIdx: number; dayNum: number; isWeekend: boolean; isToday: boolean }[] {
    const anchor = new Date(this.currentYear, this.currentMonth, this.currentDay);
    const monOffset = (anchor.getDay() + 6) % 7; // 0 = Monday
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - monOffset);

    const days = [];
    for (let i = 0; i < this.weekDaysCount; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatDateStr(d);
      const dayOfWeek = d.getDay();
      days.push({
        date: d,
        dateStr,
        weekdayIdx: i,
        dayNum: d.getDate(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dateStr === TODAY_STR,
      });
    }
    return days;
  }

  private getPeriodLabel(t: ReturnType<typeof getTranslation>): string {
    const monthName = t.calendar.months[this.currentMonth] || '';
    if (this.viewMode === 'month') {
      return `${monthName} ${this.currentYear}`;
    }

    if (this.viewMode === 'week') {
      const days = this.getWeekDays();
      const first = days[0].date;
      const last = days[days.length - 1].date;
      const mFirst = (t.calendar.months[first.getMonth()] || '').slice(0, 3);
      const mLast = (t.calendar.months[last.getMonth()] || '').slice(0, 3);
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()}–${last.getDate()} ${mLast} ${last.getFullYear()}`;
      }
      return `${first.getDate()} ${mFirst} – ${last.getDate()} ${mLast} ${last.getFullYear()}`;
    }

    const d = new Date(this.currentYear, this.currentMonth, this.currentDay);
    const weekdayIdx = (d.getDay() + 6) % 7;
    const weekdayFull = t.calendar.weekdaysFull[weekdayIdx] || '';
    return `${weekdayFull}, ${this.currentDay} ${monthName} ${this.currentYear}`;
  }

  render() {
    const t = getTranslation(this.currentLang);

    return html`
      <div class="calendar-toolbar">
        <div class="nav-controls">
          <app-button size="sm" variant="outline" @click="${this.goToday}">
            ${t.calendar.today}
          </app-button>
          <button
            class="mode-btn"
            style="padding: 0.4rem 0.5rem; background: var(--bg-subtle, #1a2438); border: 1px solid var(--border-subtle, #334155);"
            @click="${this.prevPeriod}"
            aria-label="Previous"
          >
            ${iconChevronLeft(14)}
          </button>
          <button
            class="mode-btn"
            style="padding: 0.4rem 0.5rem; background: var(--bg-subtle, #1a2438); border: 1px solid var(--border-subtle, #334155);"
            @click="${this.nextPeriod}"
            aria-label="Next"
          >
            ${iconChevronRight(14)}
          </button>
          <span class="period-title">${this.getPeriodLabel(t)}</span>
        </div>

        <div class="toolbar-right">
          ${this.viewMode === 'week'
            ? html`
                <div class="view-mode-selector">
                  <button
                    class="mode-btn ${this.weekDaysCount === 7 ? 'is-active' : ''}"
                    @click="${() => (this.weekDaysCount = 7)}"
                  >
                    ${t.viewTexts.calendar.sevenDays}
                  </button>
                  <button
                    class="mode-btn ${this.weekDaysCount === 5 ? 'is-active' : ''}"
                    @click="${() => (this.weekDaysCount = 5)}"
                  >
                    ${t.viewTexts.calendar.fiveDays}
                  </button>
                </div>
              `
            : ''}

          <div class="view-mode-selector">
            <button
              class="mode-btn ${this.viewMode === 'month' ? 'is-active' : ''}"
              @click="${() => (this.viewMode = 'month')}"
            >
              ${t.calendar.month}
            </button>
            <button
              class="mode-btn ${this.viewMode === 'week' ? 'is-active' : ''}"
              @click="${() => (this.viewMode = 'week')}"
            >
              ${t.calendar.week}
            </button>
            <button
              class="mode-btn ${this.viewMode === 'day' ? 'is-active' : ''}"
              @click="${() => (this.viewMode = 'day')}"
            >
              ${t.calendar.day}
            </button>
          </div>
        </div>
      </div>

      <div class="calendar-viewport">
        ${this.viewMode === 'month'
          ? this.renderMonthView(t)
          : this.viewMode === 'week'
          ? this.renderWeekView(t)
          : this.renderDayView(t)}
      </div>
    `;
  }

  private renderMonthView(t: ReturnType<typeof getTranslation>) {
    const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);
    const lastDayOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);

    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = lastDayOfMonth.getDate();

    const cells: { dateStr: string; dayNum: number; otherMonth: boolean; isToday: boolean }[] = [];

    const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const m = this.currentMonth === 0 ? 12 : this.currentMonth;
      const y = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum, otherMonth: true, isToday: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isToday = dateStr === TODAY_STR;
      cells.push({ dateStr, dayNum: i, otherMonth: false, isToday });
    }

    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    const rowCount = totalCells / 7;
    for (let i = 1; i <= remaining; i++) {
      const m = this.currentMonth === 11 ? 1 : this.currentMonth + 2;
      const y = this.currentMonth === 11 ? this.currentYear + 1 : this.currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: i, otherMonth: true, isToday: false });
    }

    const maxVisibleTasks = rowCount === 6 ? 2 : 3;

    return html`
      <div class="month-grid">
        <div class="weekdays-header">
          ${t.calendar.weekdaysShort.map((w) => html`<div class="weekday-cell">${w}</div>`)}
        </div>
        <div class="days-matrix rows-${rowCount}">
          ${cells.map((cell) => {
            const dayTasks = this.tasks.filter((task) => task.startDate <= cell.dateStr && task.dueDate >= cell.dateStr);
            const extraCount = dayTasks.length - maxVisibleTasks;

            return html`
              <div
                class="day-cell ${cell.otherMonth ? 'other-month' : ''} ${cell.isToday ? 'is-today' : ''}"
                @click="${() => store.openCreateTaskModal({ date: cell.dateStr })}"
              >
                <div class="cell-top">
                  <span class="cell-number">${cell.dayNum}</span>
                  ${extraCount > 0
                    ? html`<span class="cell-more">+${extraCount}</span>`
                    : ''}
                </div>
                <div class="tasks-in-cell">
                  ${dayTasks.slice(0, maxVisibleTasks).map((task) => {
                    const priorityColor = this.getPriorityColor(task.priority);

                    return html`
                      <div
                        class="calendar-task-pill"
                        @click="${(e: MouseEvent) => {
                          e.stopPropagation();
                          store.openEditTaskModal(task);
                        }}"
                        title="${task.title}"
                      >
                        <span class="pill-dot" style="background: ${priorityColor};"></span>
                        <span class="pill-title">${task.title}</span>
                      </div>
                    `;
                  })}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private renderWeekView(t: ReturnType<typeof getTranslation>) {
    const days = this.getWeekDays();

    return html`
      <div class="week-columns-grid cols-${this.weekDaysCount}">
        ${days.map((d) => {
          const dayTasks = this.tasks.filter(
            (task) => task.startDate <= d.dateStr && task.dueDate >= d.dateStr
          );
          const weekdayLabel = t.calendar.weekdaysShort[d.weekdayIdx] || '';

          return html`
            <div class="week-day-col ${d.isWeekend ? 'is-weekend' : ''} ${d.isToday ? 'is-today' : ''}">
              <div class="week-col-header">
                <div class="week-col-date">
                  <span class="week-day-name">${weekdayLabel}</span>
                  <span class="week-day-num">${d.dayNum}</span>
                </div>
                <div class="week-col-actions">
                  ${dayTasks.length > 0
                    ? html`<span class="week-count">${dayTasks.length}</span>`
                    : ''}
                  <button
                    type="button"
                    class="week-add-btn"
                    title="${t.common.add}"
                    @click="${() => store.openCreateTaskModal({ date: d.dateStr })}"
                  >
                    ${iconPlus(13)}
                  </button>
                </div>
              </div>

              <div
                class="week-col-body"
                @click="${() => store.openCreateTaskModal({ date: d.dateStr })}"
              >
                ${dayTasks.length === 0
                  ? html`<div class="week-empty-hint">${t.calendar.noEventsToday}</div>`
                  : dayTasks.map((task) => {
                      const priorityColor = this.getPriorityColor(task.priority);
                      const assignee = store.users.find((u) => u.id === task.assigneeId);

                      return html`
                        <div
                          class="week-task-card"
                          @click="${(e: MouseEvent) => {
                            e.stopPropagation();
                            store.openEditTaskModal(task);
                          }}"
                          title="${task.title}"
                        >
                          <div class="week-task-top">
                            <span class="week-task-id">${task.id}</span>
                            <span class="pill-dot" style="background: ${priorityColor};"></span>
                          </div>
                          <div class="week-task-title">${task.title}</div>
                          <div class="week-task-footer">
                            <span>${assignee ? assignee.avatar : '—'}</span>
                            <span class="tabular-nums">${task.dueDate.slice(5)}</span>
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

  private renderDayView(t: ReturnType<typeof getTranslation>) {
    const activeDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
    const activeDateStr = formatDateStr(activeDate);
    const dayTasks = this.tasks.filter(
      (task) => task.startDate <= activeDateStr && task.dueDate >= activeDateStr
    );

    return html`
      <div class="linear-view-container">
        <div class="linear-card">
          <div class="linear-date-header">
            <span>${this.getPeriodLabel(t)}</span>
            <app-button
              size="sm"
              variant="primary"
              @click="${() => store.openCreateTaskModal({ date: activeDateStr })}"
            >
              <span slot="icon-start">${iconPlus(14)}</span>
              <span>${t.taskModal.createTitle}</span>
            </app-button>
          </div>

          ${dayTasks.length === 0
            ? html`<div style="font-size: 0.875rem; color: var(--text-muted, #64748b); padding: 2rem 0; text-align: center;">${t.calendar.noEventsToday}</div>`
            : dayTasks.map(
                (task) => html`
                  <div class="linear-task-item" @click="${() => store.openEditTaskModal(task)}">
                    <div>
                      <span class="tabular-nums" style="font-weight: 600; margin-right: 0.5rem;">${task.id}</span>
                      <span>${task.title}</span>
                    </div>
                    <span class="tabular-nums" style="font-size: 0.75rem; color: var(--text-muted, #64748b);">
                      ${task.estimatedHours} ${t.common.hours}
                    </span>
                  </div>
                `
              )}
        </div>
      </div>
    `;
  }

  private goToday() {
    this.currentYear = 2026;
    this.currentMonth = 10;
    this.currentDay = 11;
  }

  private prevPeriod() {
    if (this.viewMode === 'month') {
      if (this.currentMonth === 0) {
        this.currentMonth = 11;
        this.currentYear -= 1;
      } else {
        this.currentMonth -= 1;
      }
      this.currentDay = 1;
      return;
    }

    const d = new Date(this.currentYear, this.currentMonth, this.currentDay);
    d.setDate(d.getDate() - (this.viewMode === 'week' ? 7 : 1));
    this.currentYear = d.getFullYear();
    this.currentMonth = d.getMonth();
    this.currentDay = d.getDate();
  }

  private nextPeriod() {
    if (this.viewMode === 'month') {
      if (this.currentMonth === 11) {
        this.currentMonth = 0;
        this.currentYear += 1;
      } else {
        this.currentMonth += 1;
      }
      this.currentDay = 1;
      return;
    }

    const d = new Date(this.currentYear, this.currentMonth, this.currentDay);
    d.setDate(d.getDate() + (this.viewMode === 'week' ? 7 : 1));
    this.currentYear = d.getFullYear();
    this.currentMonth = d.getMonth();
    this.currentDay = d.getDate();
  }
}

import { LitElement, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { SupportedLang, Task, TaskPriority, TaskStatus } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-gantt.css';
import '../../common/app-button/app-button';

const DAY_MS = 1000 * 60 * 60 * 24;
const TODAY_STR = '2026-11-11';
const SIDEBAR_WIDTH = 280;
const ROW_HEIGHT = 44;
const ROW_OVERSCAN = 6;
const COL_OVERSCAN = 6;

interface TimelineColumn {
  startMs: number;
  endMs: number;
  widthPx: number;
  labelTop: string;
  labelBottom: string;
  isWeekend: boolean;
  isToday: boolean;
}

interface ComputedTaskItem {
  task: Task;
  barLeft: number;
  barWidth: number;
  progressPct: number;
  priorityColor: string;
}

interface TimelineModel {
  cols: TimelineColumn[];
  colOffsets: number[];
  totalWidth: number;
  todayTimelinePx: number;
  items: ComputedTaskItem[];
}

function parseUtcDateMs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y || 2026, (m || 1) - 1, d || 1);
}

function formatUtcDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getIsoWeekNumber(utcMs: number): number {
  const d = new Date(utcMs);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
}

let cachedLargeSchedule: Task[] | null = null;

export function generateLargeGanttSchedule(count = 2000): Task[] {
  if (count === 2000 && cachedLargeSchedule) {
    return cachedLargeSchedule;
  }

  const baseStartMs = Date.UTC(2025, 0, 6); // 2025-01-06
  const horizonDays = 1090; // ~3 years through late 2027
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
  const workstreams = [
    'Core Platform',
    'API Gateway',
    'Design System',
    'Mobile Client',
    'Data Pipeline',
    'Security Audit',
    'Cloud Infra',
    'Analytics Engine',
  ];
  const actions = [
    'Architecture',
    'Implementation',
    'Integration',
    'Load Testing',
    'Migration',
    'Rollout',
    'Optimization',
    'Hardening',
  ];

  const tasks: Task[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const waveOffset = Math.floor((i * horizonDays) / count);
    const jitter = (i * 37) % 28;
    const startOffsetDays = Math.min(horizonDays - 20, Math.max(0, waveOffset + jitter - 10));
    const durationDays = 5 + ((i * 19) % 95);
    const startMs = baseStartMs + startOffsetDays * DAY_MS;
    const dueMs = startMs + durationDays * DAY_MS;

    const status = statuses[i % statuses.length];
    const priority = priorities[(i * 3) % priorities.length];
    const stream = workstreams[i % workstreams.length];
    const action = actions[(i >> 3) % actions.length];
    const completed = status === 'done' ? 3 : status === 'review' ? 2 : status === 'in_progress' ? 1 : 0;

    tasks[i] = {
      id: `VRT-${String(i + 1).padStart(4, '0')}`,
      projectId: `proj-${(i % 4) + 1}`,
      title: `${stream}: ${action} #${i + 1}`,
      description: `Scheduled virtual work package ${i + 1} (${durationDays}d)`,
      status,
      priority,
      assigneeId: `u-${(i % 5) + 1}`,
      startDate: formatUtcDate(startMs),
      dueDate: formatUtcDate(dueMs),
      estimatedHours: durationDays * 4,
      loggedHours: Math.round(durationDays * completed * 1.2),
      tags: [stream.toLowerCase().replace(/\s+/g, '-')],
      subtasks: [
        { id: `vs-${i}-1`, title: 'Spec', completed: completed >= 1 },
        { id: `vs-${i}-2`, title: 'Build', completed: completed >= 2 },
        { id: `vs-${i}-3`, title: 'Verify', completed: completed >= 3 },
      ],
      order: i,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-11-11T00:00:00.000Z',
    };
  }

  if (count === 2000) {
    cachedLargeSchedule = tasks;
  }
  return tasks;
}

@customElement('app-gantt')
export class AppGantt extends LitElement {
  @property({ type: Boolean }) virtual: boolean = true;
  @property({ type: Array }) tasksData?: Task[];
  @property({ type: String, attribute: 'dataset-mode' }) datasetMode: 'project' | 'large' = 'project';

  @state() private storeTasks: Task[] = [];
  @state() private currentLang: SupportedLang = store.customization.language;
  @state() private searchQuery: string = store.searchQuery;
  @state() private timeScale: 'day' | 'week' | 'month' = 'day';

  @state() private visStartRow: number = 0;
  @state() private visEndRow: number = 30;
  @state() private visStartCol: number = 0;
  @state() private visEndCol: number = 35;

  private unsubscribe?: () => void;
  private resizeObserver?: ResizeObserver;
  private rafId: number | null = null;
  private currentScrollTop: number = 0;
  private currentScrollLeft: number = 0;
  private viewportWidth: number = 1200;
  private viewportHeight: number = 600;

  private cachedModelKey: string = '';
  private cachedModelRefTasks?: Task[];
  private cachedModel: TimelineModel | null = null;

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
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  firstUpdated() {
    const viewport = this.shadowRoot?.querySelector('.gantt-scroll-viewport') as HTMLElement | null;
    if (viewport) {
      this.viewportWidth = viewport.clientWidth || 1200;
      this.viewportHeight = viewport.clientHeight || 600;
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.viewportWidth = entry.contentRect.width || 1200;
          this.viewportHeight = entry.contentRect.height || 600;
          this.recomputeWindow();
        }
      });
      this.resizeObserver.observe(viewport);
      this.recomputeWindow();
    }
  }

  updated(changedProps: PropertyValues) {
    if (
      changedProps.has('timeScale') ||
      changedProps.has('datasetMode') ||
      changedProps.has('virtual') ||
      changedProps.has('tasksData') ||
      changedProps.has('searchQuery') ||
      changedProps.has('storeTasks')
    ) {
      const viewport = this.shadowRoot?.querySelector('.gantt-scroll-viewport') as HTMLElement | null;
      if (viewport) {
        if (changedProps.has('datasetMode')) {
          viewport.scrollTop = 0;
          viewport.scrollLeft = 0;
          this.currentScrollTop = 0;
          this.currentScrollLeft = 0;
        } else {
          this.currentScrollTop = viewport.scrollTop;
          this.currentScrollLeft = viewport.scrollLeft;
        }
      }
      this.recomputeWindow();
    }
  }

  private syncState() {
    this.storeTasks = store.getFilteredTasks();
    this.currentLang = store.customization.language;
    this.searchQuery = store.searchQuery;
  }

  private getActiveTasks(): Task[] {
    if (this.tasksData) {
      return this.tasksData;
    }
    if (this.datasetMode === 'large') {
      const large = generateLargeGanttSchedule(2000);
      const q = this.searchQuery.trim().toLowerCase();
      if (!q) return large;
      return large.filter(
        (task) =>
          task.title.toLowerCase().includes(q) ||
          task.id.toLowerCase().includes(q) ||
          task.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return this.storeTasks;
  }

  private buildColumns(tasks: Task[], t: ReturnType<typeof getTranslation>): TimelineColumn[] {
    const todayMs = parseUtcDateMs(TODAY_STR);
    let minTaskMs = todayMs;
    let maxTaskMs = todayMs;

    if (tasks.length > 0) {
      minTaskMs = Infinity;
      maxTaskMs = -Infinity;
      for (let i = 0; i < tasks.length; i++) {
        const s = parseUtcDateMs(tasks[i].startDate);
        const e = parseUtcDateMs(tasks[i].dueDate);
        if (Number.isFinite(s) && s < minTaskMs) minTaskMs = s;
        if (Number.isFinite(e) && e > maxTaskMs) maxTaskMs = e;
      }
      if (!Number.isFinite(minTaskMs)) minTaskMs = todayMs;
      if (!Number.isFinite(maxTaskMs)) maxTaskMs = todayMs;
      if (this.datasetMode === 'project' && !this.tasksData) {
        minTaskMs = Math.min(minTaskMs, todayMs);
        maxTaskMs = Math.max(maxTaskMs, todayMs);
      }
    }

    const shortMonthsRu = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const shortMonthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const shortMonths = this.currentLang === 'ru' ? shortMonthsRu : shortMonthsEn;

    if (this.timeScale === 'day') {
      const defaultFloor = this.datasetMode === 'project' && !this.tasksData ? parseUtcDateMs('2026-11-01') : minTaskMs;
      const startMs = Math.min(minTaskMs - 2 * DAY_MS, defaultFloor);
      const minEndMs = startMs + 32 * DAY_MS;
      const endMs = Math.max(minEndMs, maxTaskMs + 5 * DAY_MS);
      const totalDays = Math.min(4000, Math.ceil((endMs - startMs) / DAY_MS));
      const cellWidth = 48;

      const cols: TimelineColumn[] = new Array(totalDays);
      for (let i = 0; i < totalDays; i++) {
        const colStart = startMs + i * DAY_MS;
        const d = new Date(colStart);
        const utcDay = d.getUTCDay();
        const mondayIdx = (utcDay + 6) % 7;
        const dayNum = d.getUTCDate();
        const monthIdx = d.getUTCMonth();
        const monthShort = shortMonths[monthIdx];
        const yearShort = String(d.getUTCFullYear()).slice(-2);

        cols[i] = {
          startMs: colStart,
          endMs: colStart + DAY_MS,
          widthPx: cellWidth,
          labelTop:
            (dayNum === 1 && monthIdx === 0) || i === 0
              ? `${dayNum} ${monthShort} '${yearShort}`
              : dayNum === 1
              ? `${dayNum} ${monthShort}`
              : String(dayNum),
          labelBottom: t.calendar.weekdaysShort[mondayIdx] || '',
          isWeekend: utcDay === 0 || utcDay === 6,
          isToday: colStart === todayMs,
        };
      }
      return cols;
    }

    if (this.timeScale === 'week') {
      const minDate = new Date(minTaskMs);
      const dayOfWeek = (minDate.getUTCDay() + 6) % 7; // 0 = Mon
      const firstMondayMs = minTaskMs - dayOfWeek * DAY_MS;
      const minWeeks = 10;
      const neededWeeks = Math.ceil((maxTaskMs - firstMondayMs) / (7 * DAY_MS)) + 2;
      const totalWeeks = Math.min(600, Math.max(minWeeks, neededWeeks));
      const cellWidth = 140;

      const cols: TimelineColumn[] = new Array(totalWeeks);
      const weekPrefix = this.currentLang === 'ru' ? 'Нед' : 'W';
      for (let w = 0; w < totalWeeks; w++) {
        const colStart = firstMondayMs + w * 7 * DAY_MS;
        const colEnd = colStart + 7 * DAY_MS;
        const startD = new Date(colStart);
        const endD = new Date(colEnd - DAY_MS);
        const weekNum = getIsoWeekNumber(colStart);

        const startLabel = `${startD.getUTCDate()} ${shortMonths[startD.getUTCMonth()]}`;
        const endLabel = `${endD.getUTCDate()} ${shortMonths[endD.getUTCMonth()]}`;
        const weekYear = String(startD.getUTCFullYear()).slice(-2);

        cols[w] = {
          startMs: colStart,
          endMs: colEnd,
          widthPx: cellWidth,
          labelTop: `${weekPrefix} ${weekNum} '${weekYear}`,
          labelBottom: `${startLabel} – ${endLabel}`,
          isWeekend: false,
          isToday: todayMs >= colStart && todayMs < colEnd,
        };
      }
      return cols;
    }

    // Month scale
    const minD = new Date(minTaskMs);
    const maxD = new Date(maxTaskMs);
    const startYear = minD.getUTCFullYear();
    const startMonth = minD.getUTCMonth();
    const diffMonths =
      (maxD.getUTCFullYear() - startYear) * 12 + (maxD.getUTCMonth() - startMonth) + 2;
    const totalMonths = Math.min(240, Math.max(5, diffMonths));
    const cellWidth = 210;

    const cols: TimelineColumn[] = new Array(totalMonths);
    for (let m = 0; m < totalMonths; m++) {
      const colStart = Date.UTC(startYear, startMonth + m, 1);
      const colEnd = Date.UTC(startYear, startMonth + m + 1, 1);
      const d = new Date(colStart);
      const monthName = t.calendar.months[d.getUTCMonth()] || '';
      const year = d.getUTCFullYear();
      const daysInMonth = Math.round((colEnd - colStart) / DAY_MS);

      cols[m] = {
        startMs: colStart,
        endMs: colEnd,
        widthPx: cellWidth,
        labelTop: `${monthName} ${year}`,
        labelBottom: `${daysInMonth} ${t.common.days}`,
        isWeekend: false,
        isToday: todayMs >= colStart && todayMs < colEnd,
      };
    }
    return cols;
  }

  private dateToPxBinary(ms: number, cols: TimelineColumn[], colOffsets: number[]): number {
    const len = cols.length;
    if (len === 0) return 0;
    if (ms <= cols[0].startMs) return 0;
    if (ms >= cols[len - 1].endMs) return colOffsets[len];

    let lo = 0;
    let hi = len - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const col = cols[mid];
      if (ms < col.startMs) {
        hi = mid - 1;
      } else if (ms >= col.endMs) {
        lo = mid + 1;
      } else {
        const fraction = (ms - col.startMs) / (col.endMs - col.startMs);
        return colOffsets[mid] + fraction * col.widthPx;
      }
    }
    return colOffsets[len];
  }

  private getTimelineModel(tasks: Task[], t: ReturnType<typeof getTranslation>): TimelineModel {
    const key = `${this.timeScale}|${this.currentLang}|${this.datasetMode}|${this.searchQuery}|${tasks.length}`;
    if (this.cachedModel && this.cachedModelKey === key && this.cachedModelRefTasks === tasks) {
      return this.cachedModel;
    }

    const cols = this.buildColumns(tasks, t);
    const colOffsets = new Array<number>(cols.length + 1);
    colOffsets[0] = 0;
    for (let i = 0; i < cols.length; i++) {
      colOffsets[i + 1] = colOffsets[i] + cols[i].widthPx;
    }
    const totalWidth = colOffsets[cols.length];

    const todayMs = parseUtcDateMs(TODAY_STR);
    const windowStart = cols[0]?.startMs ?? todayMs;
    const windowEnd = cols[cols.length - 1]?.endMs ?? todayMs;
    const todayInRange = todayMs >= windowStart && todayMs < windowEnd;
    const todayTimelinePx = todayInRange ? this.dateToPxBinary(todayMs + DAY_MS / 2, cols, colOffsets) : -1;

    const items: ComputedTaskItem[] = new Array(tasks.length);
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskStartMs = parseUtcDateMs(task.startDate);
      const taskEndMs = parseUtcDateMs(task.dueDate);
      const barLeft = this.dateToPxBinary(taskStartMs, cols, colOffsets);
      const barRight = this.dateToPxBinary(Math.max(taskStartMs + DAY_MS, taskEndMs + DAY_MS), cols, colOffsets);
      const barWidth = Math.max(24, barRight - barLeft);

      const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
      const progressPct =
        task.subtasks.length > 0
          ? (completedSubtasks / task.subtasks.length) * 100
          : task.status === 'done'
          ? 100
          : 0;

      const priorityColor =
        task.priority === 'urgent'
          ? '#ef4444'
          : task.priority === 'high'
          ? '#f59e0b'
          : task.priority === 'medium'
          ? '#0284c7'
          : '#64748b';

      items[i] = {
        task,
        barLeft,
        barWidth,
        progressPct,
        priorityColor,
      };
    }

    this.cachedModelKey = key;
    this.cachedModelRefTasks = tasks;
    this.cachedModel = { cols, colOffsets, totalWidth, todayTimelinePx, items };
    return this.cachedModel;
  }

  private findFirstColIndex(px: number, colOffsets: number[], colCount: number): number {
    let lo = 0;
    let hi = colCount;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (colOffsets[mid + 1] <= px) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  private findLastColIndex(px: number, colOffsets: number[], colCount: number): number {
    let lo = 0;
    let hi = colCount;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (colOffsets[mid] < px) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  private recomputeWindow() {
    const t = getTranslation(this.currentLang);
    const tasks = this.getActiveTasks();
    const model = this.getTimelineModel(tasks, t);

    if (!this.virtual) {
      this.visStartRow = 0;
      this.visEndRow = model.items.length;
      this.visStartCol = 0;
      this.visEndCol = model.cols.length;
      return;
    }

    const totalRows = model.items.length;
    const rawStartRow = Math.floor(this.currentScrollTop / ROW_HEIGHT);
    const rawEndRow = Math.ceil((this.currentScrollTop + this.viewportHeight) / ROW_HEIGHT);
    const nextStartRow = Math.max(0, rawStartRow - ROW_OVERSCAN);
    const nextEndRow = Math.min(totalRows, rawEndRow + ROW_OVERSCAN);

    const totalCols = model.cols.length;
    const timelineViewportWidth = Math.max(200, this.viewportWidth - SIDEBAR_WIDTH);
    const rawStartCol = this.findFirstColIndex(this.currentScrollLeft, model.colOffsets, totalCols);
    const rawEndCol = this.findLastColIndex(
      this.currentScrollLeft + timelineViewportWidth,
      model.colOffsets,
      totalCols
    );
    const nextStartCol = Math.max(0, rawStartCol - COL_OVERSCAN);
    const nextEndCol = Math.min(totalCols, rawEndCol + COL_OVERSCAN);

    if (
      nextStartRow !== this.visStartRow ||
      nextEndRow !== this.visEndRow ||
      nextStartCol !== this.visStartCol ||
      nextEndCol !== this.visEndCol
    ) {
      this.visStartRow = nextStartRow;
      this.visEndRow = nextEndRow;
      this.visStartCol = nextStartCol;
      this.visEndCol = nextEndCol;
    }
  }

  private handleViewportScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    this.currentScrollTop = target.scrollTop;
    this.currentScrollLeft = target.scrollLeft;

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.recomputeWindow();
      });
    }
  };

  private scrollToToday(todayTimelinePx: number) {
    const viewport = this.shadowRoot?.querySelector('.gantt-scroll-viewport') as HTMLElement | null;
    if (!viewport || todayTimelinePx < 0) return;
    const targetLeft = Math.max(0, todayTimelinePx - (viewport.clientWidth - SIDEBAR_WIDTH) / 2);
    viewport.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }

  render() {
    const t = getTranslation(this.currentLang);
    const isRu = this.currentLang === 'ru';
    const tasks = this.getActiveTasks();
    const model = this.getTimelineModel(tasks, t);
    const { cols, colOffsets, totalWidth, todayTimelinePx, items } = model;

    const totalRows = items.length;
    const totalCols = cols.length;

    const startRow = this.virtual ? Math.min(this.visStartRow, totalRows) : 0;
    const endRow = this.virtual ? Math.min(Math.max(startRow, this.visEndRow), totalRows) : totalRows;
    const startCol = this.virtual ? Math.min(this.visStartCol, totalCols) : 0;
    const endCol = this.virtual ? Math.min(Math.max(startCol, this.visEndCol), totalCols) : totalCols;

    const visibleCols = cols.slice(startCol, endCol);
    const visibleItems = items.slice(startRow, endRow);

    const topSpacerPx = startRow * ROW_HEIGHT;
    const totalRowsHeight = totalRows * ROW_HEIGHT;
    const leftSpacerPx = colOffsets[startCol] || 0;
    const visWindowLeftPx = colOffsets[startCol] || 0;
    const visWindowRightPx = colOffsets[endCol] ?? totalWidth;
    const todayLeft = todayTimelinePx >= 0 ? SIDEBAR_WIDTH + todayTimelinePx : -1;

    return html`
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="scale-selector">
            <button
              type="button"
              class="scale-btn ${this.timeScale === 'day' ? 'is-active' : ''}"
              @click="${() => (this.timeScale = 'day')}"
            >
              ${t.gantt.day}
            </button>
            <button
              type="button"
              class="scale-btn ${this.timeScale === 'week' ? 'is-active' : ''}"
              @click="${() => (this.timeScale = 'week')}"
            >
              ${t.gantt.week}
            </button>
            <button
              type="button"
              class="scale-btn ${this.timeScale === 'month' ? 'is-active' : ''}"
              @click="${() => (this.timeScale = 'month')}"
            >
              ${t.gantt.month}
            </button>
          </div>

          ${!this.tasksData
            ? html`
                <div class="scale-selector">
                  <button
                    type="button"
                    class="scale-btn ${this.datasetMode === 'project' ? 'is-active' : ''}"
                    @click="${() => (this.datasetMode = 'project')}"
                  >
                    ${isRu ? 'Проект' : 'Project'}
                  </button>
                  <button
                    type="button"
                    class="scale-btn ${this.datasetMode === 'large' ? 'is-active' : ''}"
                    @click="${() => (this.datasetMode = 'large')}"
                  >
                    ${isRu ? '2 000 задач · 3 года' : '2,000 tasks · 3 yrs'}
                  </button>
                </div>
              `
            : ''}
        </div>

        <div class="toolbar-actions">
          ${todayTimelinePx >= 0
            ? html`
                <button
                  type="button"
                  class="today-btn"
                  @click="${() => this.scrollToToday(todayTimelinePx)}"
                >
                  ${t.gantt.today}
                </button>
              `
            : ''}
          <span class="toolbar-meta">
            ${t.gantt.taskSchedule}:
            <strong class="tabular-nums">${totalRows.toLocaleString()}</strong>
            <span class="meta-sep">·</span>
            <span class="tabular-nums">${totalCols.toLocaleString()}</span>
            ${this.timeScale === 'day'
              ? isRu
                ? 'дн.'
                : 'd'
              : this.timeScale === 'week'
              ? isRu
                ? 'нед.'
                : 'w'
              : isRu
              ? 'мес.'
              : 'mo'}
          </span>
        </div>
      </div>

      <div class="gantt-scroll-viewport" @scroll="${this.handleViewportScroll}">
        <div class="gantt-canvas" style="width: ${SIDEBAR_WIDTH + totalWidth}px;">
          <!-- Sticky Top Header -->
          <div class="gantt-header-row">
            <div class="sidebar-header-cell">
              <span>${t.grid.columns.title}</span>
            </div>
            <div class="timeline-header-cells" style="width: ${totalWidth}px;">
              ${leftSpacerPx > 0
                ? html`<div class="virtual-col-spacer" style="width: ${leftSpacerPx}px;"></div>`
                : ''}
              ${visibleCols.map(
                (col) => html`
                  <div
                    class="timeline-cell ${col.isWeekend ? 'is-weekend' : ''} ${col.isToday ? 'is-today' : ''}"
                    style="width: ${col.widthPx}px;"
                  >
                    <span class="day-num">${col.labelTop}</span>
                    ${col.labelBottom ? html`<span class="day-name">${col.labelBottom}</span>` : ''}
                  </div>
                `
              )}
            </div>
          </div>

          <!-- 2D Virtualized Body -->
          <div class="gantt-body" style="height: ${totalRowsHeight}px;">
            <!-- Shared Virtualized Column Gridlines Layer -->
            <div class="gantt-grid-bg-layer" style="width: ${totalWidth}px;">
              ${leftSpacerPx > 0
                ? html`<div class="virtual-col-spacer" style="width: ${leftSpacerPx}px;"></div>`
                : ''}
              ${visibleCols.map(
                (col) => html`
                  <div
                    class="grid-column-bg ${col.isWeekend ? 'is-weekend' : ''} ${col.isToday ? 'is-today' : ''}"
                    style="width: ${col.widthPx}px;"
                  ></div>
                `
              )}
            </div>

            ${todayLeft >= 0
              ? html`<div class="today-marker-line" style="left: ${todayLeft}px;"></div>`
              : ''}

            ${topSpacerPx > 0
              ? html`<div class="virtual-row-spacer" style="height: ${topSpacerPx}px;"></div>`
              : ''}

            ${visibleItems.map((item) => {
              const barRight = item.barLeft + item.barWidth;
              const isBarVisible =
                barRight >= visWindowLeftPx - 120 && item.barLeft <= visWindowRightPx + 120;

              return html`
                <div class="gantt-body-row">
                  <div class="sidebar-row" @click="${() => store.openEditTaskModal(item.task)}">
                    <span class="row-title" title="${item.task.title}">${item.task.title}</span>
                    <span class="row-key">${item.task.id}</span>
                  </div>

                  <div class="timeline-row-track" style="width: ${totalWidth}px;">
                    ${isBarVisible
                      ? html`
                          <div
                            class="gantt-bar"
                            style="left: ${item.barLeft}px; width: ${item.barWidth}px; background-color: ${item.priorityColor};"
                            @click="${() => store.openEditTaskModal(item.task)}"
                            title="${item.task.title} (${item.task.startDate} – ${item.task.dueDate})"
                          >
                            <div class="gantt-bar-fill" style="width: ${item.progressPct}%;"></div>
                            <span class="bar-text">${item.task.title}</span>
                          </div>
                        `
                      : ''}
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }
}

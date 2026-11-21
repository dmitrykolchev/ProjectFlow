import { LitElement, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import * as d3 from 'd3';
import 'd3-transition';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  Expense,
  ExpenseCategory,
  Project,
  SupportedLang,
  Task,
  TaskStatus,
  TimeEntry,
  TimeEntryCategory,
  User,
} from '../../../types';
import { iconAlertTriangle, iconArrowUpRight, iconClock, iconPlus, iconWallet } from '../../common/icons';
import '../../common/app-select/app-select';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-button/app-button';
import styles from './app-project-overview.css';

// detail of the `project-change` and `open-project` events (AGENTS.md §6)
export interface ProjectOverviewProjectDetail {
  projectId: string;
}
import { eventValue } from '../../common/event-value';

type HoursGroupMode = 'timeline' | 'category' | 'team';

interface TooltipPayload {
  title: string;
  rows: { label: string; value: string }[];
}

const FX_TO_RUB: Record<'RUB' | 'USD' | 'EUR', number> = {
  RUB: 1,
  USD: 96,
  EUR: 104,
};

const TASK_STAGE_COLORS: Record<TaskStatus, string> = {
  backlog: '#64748b',
  todo: '#0284c7',
  in_progress: '#6366f1',
  review: '#f59e0b',
  done: '#10b981',
};

const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  infrastructure: '#06b6d4',
  software: '#8b5cf6',
  contractors: '#f59e0b',
  travel: '#ec4899',
  equipment: '#3b82f6',
  marketing: '#10b981',
  other: '#64748b',
};

@customElement('app-project-overview')
export class AppProjectOverview extends LitElement {
  /** 'all' for portfolio comparison or a specific project id */
  @property({ type: String }) projectId: string = 'all';
  @property({ type: Boolean }) hideProjectSelector: boolean = false;
  @property({ type: String }) locale?: SupportedLang;

  /** Optional standalone data overrides (useful for Storybook or isolated embeds) */
  @property({ type: Array }) projects?: Project[];
  @property({ type: Array }) tasks?: Task[];
  @property({ type: Array }) timeEntries?: TimeEntry[];
  @property({ type: Array }) expenses?: Expense[];
  @property({ type: Array }) users?: User[];

  @state() private hoursMode: HoursGroupMode = 'timeline';
  @state() private storeVersion = 0;

  @state() private progressTooltip: TooltipPayload | null = null;
  @state() private progressTooltipPos = { x: 0, y: 0 };

  @state() private hoursTooltip: TooltipPayload | null = null;
  @state() private hoursTooltipPos = { x: 0, y: 0 };

  @state() private budgetTooltip: TooltipPayload | null = null;
  @state() private budgetTooltipPos = { x: 0, y: 0 };

  private get progressCanvas(): HTMLDivElement | null {
    return this.shadowRoot?.querySelector<HTMLDivElement>('.progress-d3-canvas') ?? null;
  }

  private get hoursCanvas(): HTMLDivElement | null {
    return this.shadowRoot?.querySelector<HTMLDivElement>('.hours-d3-canvas') ?? null;
  }

  private get budgetBulletCanvas(): HTMLDivElement | null {
    return this.shadowRoot?.querySelector<HTMLDivElement>('.budget-bullet-canvas') ?? null;
  }

  private get budgetBarsCanvas(): HTMLDivElement | null {
    return this.shadowRoot?.querySelector<HTMLDivElement>('.budget-bars-canvas') ?? null;
  }

  private unsubscribe?: () => void;
  private resizeObserver?: ResizeObserver;
  private resizeRaf?: number;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = store.subscribe(() => {
      this.storeVersion += 1;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
  }

  protected firstUpdated() {
    this.setupResizeObserver();
    this.renderAllCharts();
  }

  protected updated(changed: PropertyValues) {
    if (
      changed.has('projectId') ||
      changed.has('hoursMode') ||
      changed.has('locale') ||
      changed.has('projects') ||
      changed.has('tasks') ||
      changed.has('timeEntries') ||
      changed.has('expenses') ||
      changed.has('users') ||
      changed.has('storeVersion')
    ) {
      this.renderAllCharts();
    }
  }

  private setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = requestAnimationFrame(() => {
        this.renderAllCharts();
      });
    });
    const shell = this.shadowRoot?.querySelector('.overview-shell');
    if (shell) {
      this.resizeObserver.observe(shell);
    }
  }

  private get effectiveLang(): SupportedLang {
    return this.locale || store.customization.language;
  }

  private get allProjects(): Project[] {
    return this.projects ?? store.projects;
  }

  private get allTasks(): Task[] {
    return this.tasks ?? store.tasks;
  }

  private get allTimeEntries(): TimeEntry[] {
    return this.timeEntries ?? store.timeEntries;
  }

  private get allExpenses(): Expense[] {
    return this.expenses ?? store.expenses;
  }

  private get allUsers(): User[] {
    return this.users ?? store.users;
  }

  private get activeProject(): Project | null {
    if (!this.projectId || this.projectId === 'all') return null;
    return this.allProjects.find((p) => p.id === this.projectId) || null;
  }

  private get scopedProjects(): Project[] {
    const proj = this.activeProject;
    return proj ? [proj] : this.allProjects;
  }

  private get scopedTasks(): Task[] {
    const proj = this.activeProject;
    return proj ? this.allTasks.filter((t) => t.projectId === proj.id) : this.allTasks;
  }

  private get scopedTimeEntries(): TimeEntry[] {
    const proj = this.activeProject;
    return proj ? this.allTimeEntries.filter((e) => e.projectId === proj.id) : this.allTimeEntries;
  }

  private get scopedExpenses(): Expense[] {
    const proj = this.activeProject;
    return proj
      ? this.allExpenses.filter((e) => e.projectId === proj.id && e.status !== 'rejected')
      : this.allExpenses.filter((e) => e.status !== 'rejected');
  }

  private resolveCssVar(name: string, fallback: string): string {
    const val = getComputedStyle(this).getPropertyValue(name).trim();
    return val || fallback;
  }

  private get prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private formatRub(value: number): string {
    const rounded = Math.round(value);
    return `${rounded.toLocaleString(getTranslation(this.effectiveLang).viewTexts.projectOverview.numberLocale)} ₽`;
  }

  private formatShortRub(value: number): string {
    const tx = getTranslation(this.effectiveLang).viewTexts.projectOverview;
    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, '')} ${tx.millionsSuffix}`;
    }
    if (abs >= 1_000) {
      return `${Math.round(value / 1_000)} ${tx.thousandsSuffix}`;
    }
    return `${Math.round(value)} ₽`;
  }

  private computeMetrics() {
    const projects = this.scopedProjects;
    const tasks = this.scopedTasks;
    const timeEntries = this.scopedTimeEntries;
    const expenses = this.scopedExpenses;
    const usersMap = new Map(this.allUsers.map((u) => [u.id, u]));

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === 'done').length;
    const taskCompletionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const proj = this.activeProject;
    const progressPct = proj
      ? proj.progress
      : projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
      : taskCompletionPct;

    const loggedHours = timeEntries.reduce((s, e) => s + e.hours, 0);
    const billableHours = timeEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);
    const nonBillableHours = Math.max(0, loggedHours - billableHours);
    const billableSharePct = loggedHours > 0 ? Math.round((billableHours / loggedHours) * 100) : 0;
    const estimatedHours = tasks.reduce((s, t) => s + t.estimatedHours, 0);

    let laborBillableCost = 0;
    let laborInternalCost = 0;
    for (const entry of timeEntries) {
      const rate = usersMap.get(entry.userId)?.hourlyRate ?? 3600;
      const cost = entry.hours * rate;
      if (entry.billable) laborBillableCost += cost;
      else laborInternalCost += cost;
    }
    const laborCost = laborBillableCost + laborInternalCost;

    let directExpenses = 0;
    const expenseByCategory = new Map<ExpenseCategory, number>();
    for (const exp of expenses) {
      const rub = exp.amount * (FX_TO_RUB[exp.currency] ?? 1);
      directExpenses += rub;
      expenseByCategory.set(exp.category, (expenseByCategory.get(exp.category) ?? 0) + rub);
    }

    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
    const totalUtilized = laborCost + directExpenses;
    const utilizationPct = totalBudget > 0 ? (totalUtilized / totalBudget) * 100 : 0;
    const remainingBudget = totalBudget - totalUtilized;

    return {
      totalTasks,
      doneTasks,
      taskCompletionPct,
      progressPct,
      loggedHours,
      billableHours,
      nonBillableHours,
      billableSharePct,
      estimatedHours,
      laborBillableCost,
      laborInternalCost,
      laborCost,
      directExpenses,
      expenseByCategory,
      totalBudget,
      totalUtilized,
      utilizationPct,
      remainingBudget,
    };
  }

  private renderAllCharts() {
    this.renderProgressChart();
    this.renderHoursChart();
    this.renderBudgetCharts();
  }

  private positionTooltip(
    host: HTMLElement,
    event: MouseEvent,
    setter: (pos: { x: number; y: number }) => void
  ) {
    const container =
      (host.closest('.progress-donut-wrap, .chart-stage') as HTMLElement | null) || host;
    const rect = container.getBoundingClientRect();
    const rawX = event.clientX - rect.left + 12;
    const rawY = event.clientY - rect.top - 12;
    const maxX = Math.max(8, rect.width - 195);
    const maxY = Math.max(8, rect.height - 84);
    setter({
      x: Math.min(Math.max(8, rawX), maxX),
      y: Math.min(Math.max(8, rawY), maxY),
    });
  }

  // =========================================================================
  // 1. D3 PROJECT PROGRESS CHART
  // =========================================================================
  private renderProgressChart() {
    const host = this.progressCanvas;
    if (!host) return;
    d3.select(host).selectAll('*').remove();

    const t = getTranslation(this.effectiveLang);
    const tasks = this.scopedTasks;
    const activeProj = this.activeProject;
    const animMs = this.prefersReducedMotion ? 0 : 320;
    const surfaceBg = this.resolveCssVar('--bg-surface', '#111827');
    const subtleBg = this.resolveCssVar('--bg-subtle', '#1a2438');
    const textPrimary = this.resolveCssVar('--text-primary', '#f8fafc');
    const textMuted = this.resolveCssVar('--text-muted', '#64748b');

    if (activeProj) {
      if (tasks.length === 0) return;

      const stageOrder: TaskStatus[] = ['done', 'review', 'in_progress', 'todo', 'backlog'];
      const stageData = stageOrder
        .map((status) => ({
          status,
          label: t.status[status],
          count: tasks.filter((tk) => tk.status === status).length,
          color: TASK_STAGE_COLORS[status],
        }))
        .filter((d) => d.count > 0);

      const total = tasks.length;
      const size = 196;
      const outerR = 84;
      const innerR = 59;

      const svg = d3
        .select(host)
        .append('svg')
        .attr('viewBox', `0 0 ${size} ${size}`)
        .attr('width', size)
        .attr('height', size)
        .style('margin', '0 auto')
        .attr('role', 'img')
        .attr('aria-label', t.projectOverview.progressTitle);

      const g = svg.append('g').attr('transform', `translate(${size / 2}, ${size / 2})`);

      // Background track ring
      g.append('circle')
        .attr('r', (outerR + innerR) / 2)
        .attr('fill', 'none')
        .attr('stroke', subtleBg)
        .attr('stroke-width', outerR - innerR);

      const pie = d3
        .pie<(typeof stageData)[number]>()
        .value((d) => d.count)
        .sort(null)
        .padAngle(0.03);

      const arc = d3
        .arc<d3.PieArcDatum<(typeof stageData)[number]>>()
        .innerRadius(innerR)
        .outerRadius(outerR)
        .cornerRadius(4);

      const hoverArc = d3
        .arc<d3.PieArcDatum<(typeof stageData)[number]>>()
        .innerRadius(innerR - 2)
        .outerRadius(outerR + 4)
        .cornerRadius(4);

      const arcs = g
        .selectAll('path.stage-arc')
        .data(pie(stageData))
        .join('path')
        .attr('class', 'stage-arc')
        .attr('fill', (d) => d.data.color)
        .attr('stroke', surfaceBg)
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent, d) => {
          d3.select(event.currentTarget as SVGPathElement)
            .transition()
            .duration(120)
            .attr('d', hoverArc(d) || '');
          const pct = Math.round((d.data.count / total) * 100);
          this.progressTooltip = {
            title: d.data.label,
            rows: [
              { label: t.kanban.itemsCount, value: `${d.data.count} / ${total}` },
              { label: '%', value: `${pct}%` },
            ],
          };
          this.positionTooltip(host, event, (pos) => (this.progressTooltipPos = pos));
        })
        .on('mousemove', (event: MouseEvent) => {
          this.positionTooltip(host, event, (pos) => (this.progressTooltipPos = pos));
        })
        .on('mouseleave', (event: MouseEvent, d) => {
          d3.select(event.currentTarget as SVGPathElement)
            .transition()
            .duration(120)
            .attr('d', arc(d) || '');
          this.progressTooltip = null;
        });

      if (animMs > 0) {
        arcs
          .transition()
          .duration(animMs)
          .attrTween('d', (d) => {
            const interp = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
            return (tick: number) => arc(interp(tick)) || '';
          });
      } else {
        arcs.attr('d', (d) => arc(d) || '');
      }
      return;
    }

    // Portfolio mode: D3 horizontal progress bars across projects
    const projects = this.scopedProjects;
    if (projects.length === 0) return;

    const width = Math.max(280, host.clientWidth || 340);
    const rowH = 38;
    const margin = { top: 6, right: 44, bottom: 8, left: 6 };
    const height = margin.top + margin.bottom + projects.length * rowH;

    const rows = projects.map((p) => {
      const pTasks = tasks.filter((tk) => tk.projectId === p.id);
      const done = pTasks.filter((tk) => tk.status === 'done').length;
      const pct = p.progress;
      return { project: p, done, total: pTasks.length, pct };
    });

    const svg = d3
      .select(host)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', t.projectOverview.progressTitle);

    const innerW = Math.max(120, width - margin.left - margin.right);
    const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
    const y = d3
      .scaleBand()
      .domain(rows.map((r) => r.project.id))
      .range([margin.top, height - margin.bottom])
      .paddingInner(0.32);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, 0)`);
    const bandGroups = g
      .selectAll('g.proj-bar-row')
      .data(rows)
      .join('g')
      .attr('class', 'proj-bar-row')
      .style('cursor', 'pointer')
      .on('click', (_event: MouseEvent, d) => {
        this.selectProjectScope(d.project.id);
      })
      .on('mouseenter', (event: MouseEvent, d) => {
        this.progressTooltip = {
          title: `[${d.project.key}] ${d.project.name}`,
          rows: [
            { label: t.projectOverview.progressTitle, value: `${d.pct}%` },
            { label: t.projectOverview.tasksDone, value: `${d.done} / ${d.total}` },
            { label: t.projectOverview.dueDate, value: d.project.dueDate },
          ],
        };
        this.positionTooltip(host, event, (pos) => (this.progressTooltipPos = pos));
      })
      .on('mousemove', (event: MouseEvent) => {
        this.positionTooltip(host, event, (pos) => (this.progressTooltipPos = pos));
      })
      .on('mouseleave', () => {
        this.progressTooltip = null;
      });

    // Project labels above track
    bandGroups
      .append('text')
      .attr('x', 0)
      .attr('y', (d) => (y(d.project.id) ?? 0) - 4)
      .attr('fill', textPrimary)
      .style('font-size', '11.5px')
      .style('font-weight', '600')
      .text((d) => {
        const label = `${d.project.key} · ${d.project.name}`;
        return label.length > 34 ? `${label.slice(0, 32)}…` : label;
      });

    // Track background
    bandGroups
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => (y(d.project.id) ?? 0) + 4)
      .attr('width', innerW)
      .attr('height', 10)
      .attr('rx', 5)
      .attr('fill', subtleBg);

    // Fill bar
    const fills = bandGroups
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => (y(d.project.id) ?? 0) + 4)
      .attr('height', 10)
      .attr('rx', 5)
      .attr('fill', (d) => d.project.color || '#6366f1')
      .attr('width', animMs > 0 ? 0 : (d) => x(d.pct));

    if (animMs > 0) {
      fills
        .transition()
        .duration(animMs)
        .attr('width', (d) => x(d.pct));
    }

    // Percentage label on right
    bandGroups
      .append('text')
      .attr('x', innerW + 8)
      .attr('y', (d) => (y(d.project.id) ?? 0) + 12)
      .attr('fill', textMuted)
      .style('font-size', '11.5px')
      .style('font-weight', '600')
      .style('font-family', 'var(--font-mono, monospace)')
      .text((d) => `${d.pct}%`);
  }

  // =========================================================================
  // 2. D3 HOURS LOGGED CHART
  // =========================================================================
  private renderHoursChart() {
    const host = this.hoursCanvas;
    if (!host) return;
    d3.select(host).selectAll('*').remove();

    const entries = this.scopedTimeEntries;
    if (entries.length === 0) return;

    const t = getTranslation(this.effectiveLang);
    const animMs = this.prefersReducedMotion ? 0 : 280;
    const accentPrimary = this.resolveCssVar('--accent-primary', '#6366f1');
    const accentSecondary = this.resolveCssVar('--text-muted', '#64748b');
    const warningColor = this.resolveCssVar('--color-warning', '#f59e0b');
    const textPrimary = this.resolveCssVar('--text-primary', '#f8fafc');
    const usersMap = new Map(this.allUsers.map((u) => [u.id, u]));

    const width = Math.max(300, host.clientWidth || 380);

    if (this.hoursMode === 'timeline') {
      const byDate = new Map<string, { date: string; billable: number; nonBillable: number }>();
      for (const e of entries) {
        const cur = byDate.get(e.date) ?? { date: e.date, billable: 0, nonBillable: 0 };
        if (e.billable) cur.billable += e.hours;
        else cur.nonBillable += e.hours;
        byDate.set(e.date, cur);
      }

      const data = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
      const height = 224;
      const margin = { top: 14, right: 12, bottom: 30, left: 34 };
      const innerW = Math.max(140, width - margin.left - margin.right);
      const innerH = height - margin.top - margin.bottom;

      const maxVal = Math.max(
        d3.max(data, (d) => d.billable + d.nonBillable) ?? 8,
        4
      );
      const avgHours =
        data.length > 0
          ? data.reduce((s, d) => s + d.billable + d.nonBillable, 0) / data.length
          : 0;

      const x = d3
        .scaleBand()
        .domain(data.map((d) => d.date))
        .range([0, innerW])
        .padding(0.32);

      const y = d3.scaleLinear().domain([0, maxVal * 1.18]).nice().range([innerH, 0]);

      const svg = d3
        .select(host)
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('width', '100%')
        .attr('height', height)
        .attr('role', 'img')
        .attr('aria-label', t.projectOverview.hoursTitle);

      const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

      // Horizontal grid lines
      g.selectAll('line.grid-line')
        .data(y.ticks(4))
        .join('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', (d) => y(d))
        .attr('y2', (d) => y(d));

      // Stacked series
      const stackGen = d3
        .stack<{ date: string; billable: number; nonBillable: number }>()
        .keys(['billable', 'nonBillable']);

      const series = stackGen(data);
      const colorMap: Record<string, string> = {
        billable: accentPrimary,
        nonBillable: accentSecondary,
      };

      const barGroups = g
        .selectAll('g.hours-series')
        .data(series)
        .join('g')
        .attr('class', 'hours-series')
        .attr('fill', (d) => colorMap[d.key] || accentPrimary);

      const rects = barGroups
        .selectAll('rect')
        .data((d) => d.map((item) => ({ ...item, key: d.key })))
        .join('rect')
        .attr('x', (d) => x(d.data.date) ?? 0)
        .attr('width', Math.max(6, x.bandwidth()))
        .attr('rx', 3)
        .attr('y', animMs > 0 ? innerH : (d) => y(d[1]))
        .attr('height', animMs > 0 ? 0 : (d) => Math.max(0, y(d[0]) - y(d[1])))
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent, d) => {
          const total = d.data.billable + d.data.nonBillable;
          this.hoursTooltip = {
            title: d.data.date,
            rows: [
              { label: t.projectOverview.billableHours, value: `${d.data.billable.toFixed(1)} ${t.common.hours}` },
              { label: t.projectOverview.nonBillableHours, value: `${d.data.nonBillable.toFixed(1)} ${t.common.hours}` },
              { label: t.common.total, value: `${total.toFixed(1)} ${t.common.hours}` },
            ],
          };
          this.positionTooltip(host, event, (pos) => (this.hoursTooltipPos = pos));
        })
        .on('mousemove', (event: MouseEvent) => {
          this.positionTooltip(host, event, (pos) => (this.hoursTooltipPos = pos));
        })
        .on('mouseleave', () => {
          this.hoursTooltip = null;
        });

      if (animMs > 0) {
        rects
          .transition()
          .duration(animMs)
          .attr('y', (d) => y(d[1]))
          .attr('height', (d) => Math.max(0, y(d[0]) - y(d[1])));
      }

      // Average reference line using d3.line
      if (data.length > 1) {
        const avgLine = d3
          .line<{ date: string }>()
          .x((d) => (x(d.date) ?? 0) + x.bandwidth() / 2)
          .y(() => y(avgHours));

        g.append('path')
          .datum(data)
          .attr('fill', 'none')
          .attr('stroke', warningColor)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4 3')
          .attr('d', avgLine);
      }

      // Axes
      const xAxis = d3.axisBottom(x).tickFormat((val) => val.slice(5));
      const yAxis = d3.axisLeft(y).ticks(4).tickFormat((d) => `${d}${t.common.hours}`);

      g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0, ${innerH})`)
        .call(xAxis)
        .selectAll('text')
        .style('text-anchor', 'middle');

      g.append('g').attr('class', 'axis').call(yAxis);
      return;
    }

    // Horizontal stacked bar view for 'category' or 'team'
    interface GroupedRow {
      key: string;
      label: string;
      billable: number;
      nonBillable: number;
      total: number;
    }

    const bucket = new Map<string, GroupedRow>();
    for (const e of entries) {
      const groupKey = this.hoursMode === 'category' ? e.category : e.userId;
      const groupLabel =
        this.hoursMode === 'category'
          ? t.timeTracking.categories[e.category as TimeEntryCategory] || e.category
          : usersMap.get(e.userId)?.name || e.userId;
      const cur = bucket.get(groupKey) ?? {
        key: groupKey,
        label: groupLabel,
        billable: 0,
        nonBillable: 0,
        total: 0,
      };
      if (e.billable) cur.billable += e.hours;
      else cur.nonBillable += e.hours;
      cur.total = cur.billable + cur.nonBillable;
      bucket.set(groupKey, cur);
    }

    const rows = Array.from(bucket.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);

    const rowH = 30;
    const margin = { top: 8, right: 48, bottom: 18, left: 108 };
    const height = Math.max(160, margin.top + margin.bottom + rows.length * rowH);
    const innerW = Math.max(100, width - margin.left - margin.right);
    const innerH = height - margin.top - margin.bottom;

    const maxTotal = Math.max(d3.max(rows, (r) => r.total) ?? 1, 1);
    const x = d3.scaleLinear().domain([0, maxTotal * 1.12]).range([0, innerW]);
    const y = d3
      .scaleBand()
      .domain(rows.map((r) => r.key))
      .range([0, innerH])
      .padding(0.32);

    const svg = d3
      .select(host)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', t.projectOverview.hoursTitle);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const stackGen = d3.stack<GroupedRow>().keys(['billable', 'nonBillable']);
    const series = stackGen(rows);
    const colorMap: Record<string, string> = {
      billable: accentPrimary,
      nonBillable: accentSecondary,
    };

    const barGroups = g
      .selectAll('g.horiz-series')
      .data(series)
      .join('g')
      .attr('fill', (d) => colorMap[d.key] || accentPrimary);

    const rects = barGroups
      .selectAll('rect')
      .data((d) => d.map((item) => ({ ...item, key: d.key })))
      .join('rect')
      .attr('y', (d) => y(d.data.key) ?? 0)
      .attr('height', Math.max(8, y.bandwidth()))
      .attr('rx', 3)
      .attr('x', (d) => x(d[0]))
      .attr('width', animMs > 0 ? 0 : (d) => Math.max(0, x(d[1]) - x(d[0])))
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d) => {
        this.hoursTooltip = {
          title: d.data.label,
          rows: [
            { label: t.projectOverview.billableHours, value: `${d.data.billable.toFixed(1)} ${t.common.hours}` },
            { label: t.projectOverview.nonBillableHours, value: `${d.data.nonBillable.toFixed(1)} ${t.common.hours}` },
            { label: t.common.total, value: `${d.data.total.toFixed(1)} ${t.common.hours}` },
          ],
        };
        this.positionTooltip(host, event, (pos) => (this.hoursTooltipPos = pos));
      })
      .on('mousemove', (event: MouseEvent) => {
        this.positionTooltip(host, event, (pos) => (this.hoursTooltipPos = pos));
      })
      .on('mouseleave', () => {
        this.hoursTooltip = null;
      });

    if (animMs > 0) {
      rects
        .transition()
        .duration(animMs)
        .attr('width', (d) => Math.max(0, x(d[1]) - x(d[0])));
    }

    // Left category/member labels
    g.selectAll('text.row-label')
      .data(rows)
      .join('text')
      .attr('class', 'row-label')
      .attr('x', -8)
      .attr('y', (d) => (y(d.key) ?? 0) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('fill', textPrimary)
      .style('font-size', '11.5px')
      .text((d) => (d.label.length > 14 ? `${d.label.slice(0, 12)}…` : d.label));

    // Right values
    g.selectAll('text.row-val')
      .data(rows)
      .join('text')
      .attr('class', 'row-val')
      .attr('x', (d) => x(d.total) + 6)
      .attr('y', (d) => (y(d.key) ?? 0) + y.bandwidth() / 2 + 4)
      .attr('fill', accentSecondary)
      .style('font-size', '11px')
      .style('font-family', 'var(--font-mono, monospace)')
      .text((d) => `${d.total.toFixed(1)} ${t.common.hours}`);
  }

  // =========================================================================
  // 3. D3 BUDGET UTILIZATION CHARTS (Bullet Gauge + Cost Breakdown)
  // =========================================================================
  private renderBudgetCharts() {
    this.renderBudgetBullet();
    this.renderBudgetDrivers();
  }

  private renderBudgetBullet() {
    const host = this.budgetBulletCanvas;
    if (!host) return;
    d3.select(host).selectAll('*').remove();

    const m = this.computeMetrics();
    if (m.totalBudget <= 0) return;

    const t = getTranslation(this.effectiveLang);
    const animMs = this.prefersReducedMotion ? 0 : 320;
    const accentPrimary = this.resolveCssVar('--accent-primary', '#6366f1');
    const successColor = this.resolveCssVar('--color-success', '#10b981');
    const warningColor = this.resolveCssVar('--color-warning', '#f59e0b');
    const dangerColor = this.resolveCssVar('--color-danger', '#ef4444');
    const subtleBg = this.resolveCssVar('--bg-subtle', '#1a2438');
    const textPrimary = this.resolveCssVar('--text-primary', '#f8fafc');
    const textMuted = this.resolveCssVar('--text-muted', '#64748b');

    const width = Math.max(280, host.clientWidth || 350);
    const height = 74;
    const margin = { top: 18, right: 12, bottom: 22, left: 6 };
    const innerW = Math.max(120, width - margin.left - margin.right);

    const maxDomain = Math.max(m.totalBudget * 1.15, m.totalUtilized * 1.05);
    const x = d3.scaleLinear().domain([0, maxDomain]).range([0, innerW]);

    const svg = d3
      .select(host)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', t.projectOverview.budgetTitle);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);
    const barH = 22;

    // Qualitative utilization bands (0–70% nominal, 70–90% warning, 90–100%+ high)
    const bands = [
      { from: 0, to: m.totalBudget * 0.7, fill: subtleBg, opacity: 1 },
      { from: m.totalBudget * 0.7, to: m.totalBudget * 0.9, fill: warningColor, opacity: 0.16 },
      { from: m.totalBudget * 0.9, to: maxDomain, fill: dangerColor, opacity: 0.18 },
    ];

    g.selectAll('rect.bullet-band')
      .data(bands)
      .join('rect')
      .attr('class', 'bullet-band')
      .attr('x', (d) => x(d.from))
      .attr('y', 4)
      .attr('width', (d) => Math.max(0, x(d.to) - x(d.from)))
      .attr('height', barH)
      .attr('fill', (d) => d.fill)
      .attr('opacity', (d) => d.opacity);

    const segments = [
      {
        label: t.projectOverview.laborCost,
        start: 0,
        end: m.laborCost,
        color: accentPrimary,
      },
      {
        label: t.projectOverview.directExpenses,
        start: m.laborCost,
        end: m.laborCost + m.directExpenses,
        color: m.utilizationPct > 100 ? dangerColor : successColor,
      },
    ];

    const segRects = g
      .selectAll('rect.bullet-seg')
      .data(segments)
      .join('rect')
      .attr('class', 'bullet-seg')
      .attr('x', (d) => x(d.start))
      .attr('y', 8)
      .attr('height', barH - 8)
      .attr('rx', 2)
      .attr('fill', (d) => d.color)
      .attr('width', animMs > 0 ? 0 : (d) => Math.max(0, x(d.end) - x(d.start)))
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent) => {
        this.budgetTooltip = {
          title: t.projectOverview.budgetTitle,
          rows: [
            { label: t.projectOverview.budgetTotal, value: this.formatRub(m.totalBudget) },
            { label: t.projectOverview.laborCost, value: this.formatRub(m.laborCost) },
            { label: t.projectOverview.directExpenses, value: this.formatRub(m.directExpenses) },
            { label: t.projectOverview.utilizedTotal, value: `${m.utilizationPct.toFixed(1)}%` },
          ],
        };
        this.positionTooltip(host, event, (pos) => (this.budgetTooltipPos = pos));
      })
      .on('mousemove', (event: MouseEvent) => {
        this.positionTooltip(host, event, (pos) => (this.budgetTooltipPos = pos));
      })
      .on('mouseleave', () => {
        this.budgetTooltip = null;
      });

    if (animMs > 0) {
      segRects
        .transition()
        .duration(animMs)
        .attr('width', (d) => Math.max(0, x(d.end) - x(d.start)));
    }

    // 100% Budget Cap Marker Line
    const capX = x(m.totalBudget);
    g.append('line')
      .attr('x1', capX)
      .attr('x2', capX)
      .attr('y1', 0)
      .attr('y2', barH + 8)
      .attr('stroke', textPrimary)
      .attr('stroke-width', 2);

    g.append('text')
      .attr('x', Math.min(capX, innerW - 32))
      .attr('y', -4)
      .attr('text-anchor', 'middle')
      .attr('fill', textPrimary)
      .style('font-size', '10.5px')
      .style('font-weight', '600')
      .style('font-family', 'var(--font-mono, monospace)')
      .text(this.formatShortRub(m.totalBudget));

    // Bottom Axis
    const tickValues = [0, m.totalBudget * 0.5, m.totalBudget];
    const axis = d3
      .axisBottom(x)
      .tickValues(tickValues)
      .tickFormat((val) => {
        const num = Number(val);
        if (num === 0) return '0%';
        const pct = Math.round((num / m.totalBudget) * 100);
        return `${pct}%`;
      });

    g.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, ${barH + 8})`)
      .call(axis)
      .selectAll('text')
      .attr('fill', textMuted);
  }

  private renderBudgetDrivers() {
    const host = this.budgetBarsCanvas;
    if (!host) return;
    d3.select(host).selectAll('*').remove();

    const m = this.computeMetrics();
    const t = getTranslation(this.effectiveLang);
    const animMs = this.prefersReducedMotion ? 0 : 260;
    const accentPrimary = this.resolveCssVar('--accent-primary', '#6366f1');
    const textPrimary = this.resolveCssVar('--text-primary', '#f8fafc');
    const textMuted = this.resolveCssVar('--text-muted', '#64748b');
    const subtleBg = this.resolveCssVar('--bg-subtle', '#1a2438');

    const drivers: { key: string; label: string; amount: number; color: string }[] = [];
    if (m.laborBillableCost > 0) {
      drivers.push({
        key: 'labor_billable',
        label: t.projectOverview.laborBillable,
        amount: m.laborBillableCost,
        color: accentPrimary,
      });
    }
    if (m.laborInternalCost > 0) {
      drivers.push({
        key: 'labor_internal',
        label: t.projectOverview.laborInternal,
        amount: m.laborInternalCost,
        color: '#64748b',
      });
    }
    for (const [cat, amount] of m.expenseByCategory.entries()) {
      if (amount > 0) {
        drivers.push({
          key: `exp_${cat}`,
          label: t.expenses.categories[cat] || cat,
          amount,
          color: EXPENSE_CATEGORY_COLORS[cat] || '#10b981',
        });
      }
    }

    drivers.sort((a, b) => b.amount - a.amount);
    if (drivers.length === 0) return;

    const topDrivers = drivers.slice(0, 5);
    const width = Math.max(280, host.clientWidth || 350);
    const rowH = 26;
    const margin = { top: 4, right: 78, bottom: 4, left: 108 };
    const height = margin.top + margin.bottom + topDrivers.length * rowH;
    const innerW = Math.max(80, width - margin.left - margin.right);
    const innerH = height - margin.top - margin.bottom;

    const maxAmount = Math.max(d3.max(topDrivers, (d) => d.amount) ?? 1, 1);
    const x = d3.scaleLinear().domain([0, maxAmount]).range([0, innerW]);
    const y = d3
      .scaleBand()
      .domain(topDrivers.map((d) => d.key))
      .range([0, innerH])
      .padding(0.32);

    const svg = d3
      .select(host)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', t.projectOverview.budgetTitle);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    g.selectAll('rect.driver-track')
      .data(topDrivers)
      .join('rect')
      .attr('class', 'driver-track')
      .attr('x', 0)
      .attr('y', (d) => y(d.key) ?? 0)
      .attr('width', innerW)
      .attr('height', Math.max(8, y.bandwidth()))
      .attr('rx', 3)
      .attr('fill', subtleBg);

    const bars = g
      .selectAll('rect.driver-fill')
      .data(topDrivers)
      .join('rect')
      .attr('class', 'driver-fill')
      .attr('x', 0)
      .attr('y', (d) => y(d.key) ?? 0)
      .attr('height', Math.max(8, y.bandwidth()))
      .attr('rx', 3)
      .attr('fill', (d) => d.color)
      .attr('width', animMs > 0 ? 0 : (d) => x(d.amount))
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d) => {
        const share = m.totalBudget > 0 ? `${((d.amount / m.totalBudget) * 100).toFixed(1)}%` : '—';
        this.budgetTooltip = {
          title: d.label,
          rows: [
            { label: t.projectOverview.utilizedTotal, value: this.formatRub(d.amount) },
            { label: t.projectOverview.budgetTotal, value: share },
          ],
        };
        this.positionTooltip(host, event, (pos) => (this.budgetTooltipPos = pos));
      })
      .on('mousemove', (event: MouseEvent) => {
        this.positionTooltip(host, event, (pos) => (this.budgetTooltipPos = pos));
      })
      .on('mouseleave', () => {
        this.budgetTooltip = null;
      });

    if (animMs > 0) {
      bars
        .transition()
        .duration(animMs)
        .attr('width', (d) => x(d.amount));
    }

    g.selectAll('text.driver-label')
      .data(topDrivers)
      .join('text')
      .attr('x', -8)
      .attr('y', (d) => (y(d.key) ?? 0) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('fill', textPrimary)
      .style('font-size', '11px')
      .text((d) => (d.label.length > 15 ? `${d.label.slice(0, 13)}…` : d.label));

    g.selectAll('text.driver-val')
      .data(topDrivers)
      .join('text')
      .attr('x', innerW + 8)
      .attr('y', (d) => (y(d.key) ?? 0) + y.bandwidth() / 2 + 4)
      .attr('fill', textMuted)
      .style('font-size', '11px')
      .style('font-family', 'var(--font-mono, monospace)')
      .text((d) => this.formatShortRub(d.amount));
  }

  private selectProjectScope(nextId: string) {
    this.projectId = nextId;
    this.dispatchEvent(
      new CustomEvent<ProjectOverviewProjectDetail>('project-change', {
        detail: { projectId: nextId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleOpenProject() {
    const proj = this.activeProject;
    if (!proj) return;
    this.dispatchEvent(
      new CustomEvent<ProjectOverviewProjectDetail>('open-project', {
        detail: { projectId: proj.id },
        bubbles: true,
        composed: true,
      })
    );
    store.openProjectDetail(proj.id);
  }

  private renderTooltip(data: TooltipPayload | null, pos: { x: number; y: number }) {
    if (!data) return '';
    return html`
      <div
        class="d3-tooltip is-visible"
        style="left: ${pos.x}px; top: ${pos.y}px;"
      >
        <div class="tt-title">${data.title}</div>
        ${data.rows.map(
          (r) => html`
            <div class="tt-row">
              <span>${r.label}</span>
              <span class="tt-val">${r.value}</span>
            </div>
          `
        )}
      </div>
    `;
  }

  render() {
    const lang = this.effectiveLang;
    const t = getTranslation(lang);
    const activeProj = this.activeProject;
    const projects = this.allProjects;
    const tasks = this.scopedTasks;
    const timeEntries = this.scopedTimeEntries;
    const m = this.computeMetrics();

    const projectOptions = [
      { value: 'all', label: t.projectOverview.allProjects },
      ...projects.map((p) => ({
        value: p.id,
        label: `[${p.key}] ${p.name}`,
        color: p.color,
      })),
    ];

    const stageOrder: TaskStatus[] = ['done', 'review', 'in_progress', 'todo', 'backlog'];
    const stageRows = stageOrder.map((status) => ({
      status,
      label: t.status[status],
      count: tasks.filter((tk) => tk.status === status).length,
      color: TASK_STAGE_COLORS[status],
    }));

    const utilStatusClass =
      m.utilizationPct >= 95 ? 'critical' : m.utilizationPct >= 75 ? 'warning' : 'nominal';
    const utilStatusLabel =
      m.utilizationPct >= 95
        ? t.projectOverview.statusCritical
        : m.utilizationPct >= 75
        ? t.projectOverview.statusWarning
        : t.projectOverview.statusNominal;

    const accentPrimary = '#6366f1';

    return html`
      <section class="overview-shell" aria-label="${t.projectOverview.title}">
        <!-- Top Header Bar -->
        <div class="overview-header">
          <div class="header-copy">
            <div class="header-title-row">
              <h2 class="overview-title">
                ${activeProj ? `${t.projectOverview.title} · ${activeProj.name}` : t.projectOverview.portfolioTitle}
              </h2>
            </div>
            <div class="overview-scope-meta">
              <span>${t.projectOverview.subtitle}</span>
              ${activeProj
                ? html`
                    <span aria-hidden="true">·</span>
                    <span class="mono-num">${activeProj.key}</span>
                    <span aria-hidden="true">·</span>
                    <span class="mono-num">${t.projectOverview.dueDate}: ${activeProj.dueDate}</span>
                  `
                : html`
                    <span aria-hidden="true">·</span>
                    <span class="mono-num">${projects.length} ${t.navigation.projects.toLowerCase()}</span>
                  `}
            </div>
          </div>

          <div class="header-controls">
            ${!this.hideProjectSelector
              ? html`
                  <div class="project-select-wrap">
                    <app-select
                      size="sm"
                      .value="${this.projectId || 'all'}"
                      .options="${projectOptions}"
                      @change="${(e: CustomEvent<{ value: string }>) =>
                        this.selectProjectScope(eventValue(e))}"
                    ></app-select>
                  </div>
                `
              : ''}

            ${activeProj && !this.hideProjectSelector
              ? html`
                  <app-button
                    size="sm"
                    variant="outline"
                    @click="${() => this.handleOpenProject()}"
                  >
                    <span>${t.projectOverview.openProject}</span>
                    <span slot="icon-end">${iconArrowUpRight(14)}</span>
                  </app-button>
                `
              : ''}
          </div>
        </div>

        <!-- 4-Column Tabular Summary Strip -->
        <div class="summary-strip">
          <div class="summary-cell">
            <span class="summary-label">${t.projectOverview.progressTitle}</span>
            <div class="summary-value-row">
              <span class="summary-value">${m.progressPct}%</span>
              <span class="summary-sub">${m.doneTasks}/${m.totalTasks} ${t.projectOverview.tasksDone}</span>
            </div>
          </div>

          <div class="summary-cell">
            <span class="summary-label">${t.projectOverview.loggedTotal}</span>
            <div class="summary-value-row">
              <span class="summary-value">${m.loggedHours.toFixed(1)} ${t.common.hours}</span>
              <span class="summary-sub">${t.projectOverview.estimatedTotal}: ${m.estimatedHours} ${t.common.hours}</span>
            </div>
          </div>

          <div class="summary-cell">
            <span class="summary-label">${t.projectOverview.billableShare}</span>
            <div class="summary-value-row">
              <span class="summary-value">${m.billableSharePct}%</span>
              <span class="summary-sub">${m.billableHours.toFixed(1)} / ${m.loggedHours.toFixed(1)} ${t.common.hours}</span>
            </div>
          </div>

          <div class="summary-cell">
            <span class="summary-label">${t.projectOverview.budgetTitle}</span>
            <div class="summary-value-row">
              <span class="summary-value">
                ${m.totalBudget > 0 ? `${m.utilizationPct.toFixed(1)}%` : '—'}
              </span>
              <span class="summary-sub">
                ${m.totalBudget > 0
                  ? `${this.formatShortRub(m.totalUtilized)} / ${this.formatShortRub(m.totalBudget)}`
                  : t.projectOverview.noBudget}
              </span>
            </div>
          </div>
        </div>

        <!-- 3-Column D3 Charts Grid -->
        <div class="charts-grid">
          <!-- Column 1: Project Progress -->
          <div class="chart-panel">
            <div class="panel-head">
              <div class="panel-title-wrap">
                <h3 class="panel-title">${t.projectOverview.progressTitle}</h3>
                <div class="panel-meta">
                  <span>${m.doneTasks} / ${m.totalTasks} ${t.projectOverview.tasksDone}</span>
                  ${activeProj
                    ? html`<span aria-hidden="true">·</span><span>${t.projectOverview.dueDate} ${activeProj.dueDate}</span>`
                    : ''}
                </div>
              </div>
            </div>

            <div class="chart-stage">
              ${activeProj && tasks.length === 0
                ? html`
                    <div class="chart-empty">
                      <span>${t.projectOverview.noTasks}</span>
                      <app-button size="sm" variant="outline" @click="${() => store.openCreateTaskModal()}">
                        <span slot="icon-start">${iconPlus(14)}</span>
                        <span>${t.projectOverview.createTaskAction}</span>
                      </app-button>
                    </div>
                  `
                : activeProj
                ? html`
                    <div class="progress-donut-wrap">
                      <div class="d3-canvas progress-d3-canvas"></div>
                      <div class="donut-center-readout">
                        <span class="donut-pct">${m.progressPct}%</span>
                        <span class="donut-sub">${m.doneTasks}/${m.totalTasks}</span>
                      </div>
                      ${this.renderTooltip(this.progressTooltip, this.progressTooltipPos)}
                    </div>
                    <div class="legend-list">
                      ${stageRows.map((row) => {
                        const pct = m.totalTasks > 0 ? Math.round((row.count / m.totalTasks) * 100) : 0;
                        return html`
                          <div class="legend-row">
                            <div class="legend-left">
                              <span class="legend-swatch" style="background: ${row.color};"></span>
                              <span class="legend-label">${row.label}</span>
                            </div>
                            <span class="legend-val">${row.count} · ${pct}%</span>
                          </div>
                        `;
                      })}
                    </div>
                  `
                : html`
                    <div class="d3-canvas progress-d3-canvas"></div>
                    ${this.renderTooltip(this.progressTooltip, this.progressTooltipPos)}
                  `}
            </div>
          </div>

          <!-- Column 2: Hours Logged -->
          <div class="chart-panel">
            <div class="panel-head">
              <div class="panel-title-wrap">
                <h3 class="panel-title">${t.projectOverview.hoursTitle}</h3>
                <div class="panel-meta">
                  <span>${t.projectOverview.loggedTotal}: ${m.loggedHours.toFixed(1)} ${t.common.hours}</span>
                  <span aria-hidden="true">·</span>
                  <span>${t.projectOverview.billableShare}: ${m.billableSharePct}%</span>
                </div>
              </div>

              <div class="panel-actions">
                <app-segmented-switch
                  size="sm"
                  .value="${this.hoursMode}"
                  .options="${[
                    { value: 'timeline', label: t.projectOverview.modeTimeline },
                    { value: 'category', label: t.projectOverview.modeCategory },
                    { value: 'team', label: t.projectOverview.modeTeam },
                  ]}"
                  @change="${(e: CustomEvent<{ value: string }>) => {
                    this.hoursMode = eventValue(e) as HoursGroupMode;
                  }}"
                ></app-segmented-switch>
              </div>
            </div>

            <div class="chart-stage">
              ${timeEntries.length === 0
                ? html`
                    <div class="chart-empty">
                      <span>${t.projectOverview.noHours}</span>
                      <app-button size="sm" variant="outline" @click="${() => store.setActiveView('time-tracking')}">
                        <span slot="icon-start">${iconClock(14)}</span>
                        <span>${t.projectOverview.logTime}</span>
                      </app-button>
                    </div>
                  `
                : html`
                    <div class="inline-legend">
                      <span class="inline-legend-item">
                        <span class="legend-swatch" style="background: var(--accent-primary, ${accentPrimary});"></span>
                        <span>${t.projectOverview.billableHours} (${m.billableHours.toFixed(1)} ${t.common.hours})</span>
                      </span>
                      <span class="inline-legend-item">
                        <span class="legend-swatch" style="background: var(--text-muted, #64748b);"></span>
                        <span>${t.projectOverview.nonBillableHours} (${m.nonBillableHours.toFixed(1)} ${t.common.hours})</span>
                      </span>
                    </div>
                    <div class="d3-canvas hours-d3-canvas"></div>
                    ${this.renderTooltip(this.hoursTooltip, this.hoursTooltipPos)}
                  `}
            </div>
          </div>

          <!-- Column 3: Budget Utilization -->
          <div class="chart-panel">
            <div class="panel-head">
              <div class="panel-title-wrap">
                <h3 class="panel-title">${t.projectOverview.budgetTitle}</h3>
                <div class="panel-meta">
                  <span>${t.projectOverview.utilizedTotal}: ${this.formatShortRub(m.totalUtilized)}</span>
                  <span aria-hidden="true">·</span>
                  <span>${t.projectOverview.budgetTotal}: ${m.totalBudget > 0 ? this.formatShortRub(m.totalBudget) : '—'}</span>
                </div>
              </div>
            </div>

            <div class="chart-stage">
              ${m.totalBudget <= 0 && m.totalUtilized <= 0
                ? html`
                    <div class="chart-empty">
                      <span>${t.projectOverview.noBudget}</span>
                      <app-button size="sm" variant="outline" @click="${() => store.setActiveView('expenses')}">
                        <span slot="icon-start">${iconWallet(14)}</span>
                        <span>${t.projectOverview.addExpense}</span>
                      </app-button>
                    </div>
                  `
                : html`
                    ${m.totalBudget > 0
                      ? html`
                          <div class="budget-status-line">
                            <span class="status-label ${utilStatusClass}">
                              ${m.utilizationPct >= 75 ? iconAlertTriangle(14) : ''}
                              <span>${utilStatusLabel} · ${m.utilizationPct.toFixed(1)}%</span>
                            </span>
                            <span class="mono-num" style="color: var(--text-secondary);">
                              ${m.remainingBudget >= 0
                                ? `${t.projectOverview.remainingBudget}: ${this.formatShortRub(m.remainingBudget)}`
                                : `${t.projectOverview.overrunBudget}: ${this.formatShortRub(Math.abs(m.remainingBudget))}`}
                            </span>
                          </div>

                          <div class="d3-canvas budget-bullet-canvas"></div>
                        `
                      : ''}

                    <div class="budget-breakdown-grid">
                      <div class="breakdown-item">
                        <span class="breakdown-label">${t.projectOverview.laborCost}</span>
                        <span class="breakdown-val">${this.formatRub(m.laborCost)}</span>
                      </div>
                      <div class="breakdown-item">
                        <span class="breakdown-label">${t.projectOverview.directExpenses}</span>
                        <span class="breakdown-val">${this.formatRub(m.directExpenses)}</span>
                      </div>
                    </div>

                    ${m.totalUtilized > 0
                      ? html`<div class="d3-canvas budget-bars-canvas"></div>`
                      : html`<div class="chart-empty" style="min-height: 90px;">${t.projectOverview.noExpenses}</div>`}

                    ${this.renderTooltip(this.budgetTooltip, this.budgetTooltipPos)}
                  `}
            </div>
          </div>
        </div>
      </section>
    `;
  }
}
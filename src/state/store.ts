import {
  ActiveView,
  ActivityLogItem,
  BackgroundPreset,
  NotificationItem,
  Project,
  Task,
  TaskStatus,
  User,
  UserCustomization,
} from '../types';
import { initialProjects, initialTasks, initialUsers } from './mock-data';

const STORAGE_KEY_CUSTOMIZATION = 'projectflow_customization_v1';
const STORAGE_KEY_TASKS = 'projectflow_tasks_v2';
const STORAGE_KEY_PROJECTS = 'projectflow_projects_v2';
const STORAGE_KEY_LOGS = 'projectflow_activity_v1';

const defaultCustomization: UserCustomization = {
  theme: 'dark',
  density: 'comfortable',
  accentColor: 'indigo',
  backgroundPreset: 'default',
  customBgColor: '#0c101d',
  language: 'ru',
  sidebarCollapsed: false,
  defaultView: 'dashboard',
  showActivityPanel: false,
  gridColumns: {
    id: true,
    title: true,
    status: true,
    priority: true,
    assignee: true,
    dates: true,
    progress: true,
    tags: true,
  },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function adjustHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(rgb.r + amount).toString(16).padStart(2, '0');
  const g = clamp(rgb.g + amount).toString(16).padStart(2, '0');
  const b = clamp(rgb.b + amount).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

const CUSTOM_BG_VARS = [
  '--bg-canvas',
  '--bg-surface',
  '--bg-surface-elevated',
  '--bg-subtle',
  '--bg-hover',
  '--bg-active',
  '--border-subtle',
  '--border-strong',
  '--scrollbar-track',
  '--scrollbar-thumb',
  '--scrollbar-thumb-hover',
];

export class AppStore {
  private static instance: AppStore;

  public tasks: Task[] = [];
  public projects: Project[] = [];
  public users: User[] = initialUsers;
  public selectedProjectId: string = 'all';
  public activeView: ActiveView = 'dashboard';

  public searchQuery: string = '';
  public filterStatus: string = 'all';
  public filterPriority: string = 'all';
  public filterAssignee: string = 'all';

  public customization: UserCustomization = { ...defaultCustomization };
  public activityLog: ActivityLogItem[] = [];
  public notifications: NotificationItem[] = [];

  public isTaskModalOpen: boolean = false;
  public editingTask: Task | null = null;
  public newTaskDefaultStatus: TaskStatus = 'todo';
  public newTaskDefaultDate: string = '';

  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.loadState();
    this.applyThemeAndCustomization();
  }

  public static getInstance(): AppStore {
    if (!AppStore.instance) {
      AppStore.instance = new AppStore();
    }
    return AppStore.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private loadState(): void {
    try {
      const storedCustom = localStorage.getItem(STORAGE_KEY_CUSTOMIZATION);
      if (storedCustom) {
        this.customization = { ...defaultCustomization, ...JSON.parse(storedCustom) };
        this.activeView = this.customization.defaultView || 'dashboard';
      }

      const storedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
      if (storedTasks) {
        this.tasks = JSON.parse(storedTasks);
      } else {
        this.tasks = [...initialTasks];
      }

      const storedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (storedProjects) {
        this.projects = JSON.parse(storedProjects);
      } else {
        this.projects = [...initialProjects];
      }

      const storedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
      if (storedLogs) {
        this.activityLog = JSON.parse(storedLogs);
      } else {
        this.activityLog = [
          {
            id: 'log-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            userId: 'user-2',
            userName: 'Елена Смирнова',
            action: 'status_change',
            targetType: 'task',
            targetTitle: 'Оптимизация бандла Web-компонентов Lit',
            details: 'Переведено в статус Review',
          },
          {
            id: 'log-2',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            userId: 'user-1',
            userName: 'Александр Морозов',
            action: 'create',
            targetType: 'task',
            targetTitle: 'Архитектура распределенного кэширования L2',
            details: 'Создана задача с приоритетом Urgent',
          },
        ];
      }
    } catch (e) {
      console.warn('Error loading state from localStorage:', e);
      this.tasks = [...initialTasks];
      this.projects = [...initialProjects];
    }
  }

  private saveTasks(): void {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(this.tasks));
    } catch (e) {
      console.error(e);
    }
  }

  private saveCustomization(): void {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOMIZATION, JSON.stringify(this.customization));
    } catch (e) {
      console.error(e);
    }
  }

  private saveLogs(): void {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(this.activityLog.slice(0, 50)));
    } catch (e) {
      console.error(e);
    }
  }

  public applyThemeAndCustomization(): void {
    const root = document.documentElement;
    const body = document.body;
    const isDark = this.customization.theme === 'dark';

    // Keep theme attributes strictly on <html> so <body> never shadows :root presets or inline custom vars
    if (body) {
      body.classList.remove('dark');
      body.removeAttribute('data-theme');
      body.removeAttribute('data-bg');
      body.removeAttribute('data-accent');
      body.removeAttribute('data-density');
    }

    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }

    root.setAttribute('data-density', this.customization.density);
    root.setAttribute('data-accent', this.customization.accentColor);
    root.setAttribute('data-bg', this.customization.backgroundPreset || 'default');
    root.setAttribute('lang', this.customization.language);

    if (this.customization.backgroundPreset === 'custom' && this.customization.customBgColor) {
      const base = this.customization.customBgColor;
      const rgb = hexToRgb(base);
      const luminance = rgb ? (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 : 0.1;
      const isDarkBg = luminance < 0.5;
      const step = isDarkBg ? 10 : -8;

      root.style.setProperty('--bg-canvas', base);
      root.style.setProperty('--bg-surface', adjustHex(base, isDarkBg ? 10 : 12));
      root.style.setProperty('--bg-surface-elevated', adjustHex(base, isDarkBg ? 18 : 18));
      root.style.setProperty('--bg-subtle', adjustHex(base, step * 2));
      root.style.setProperty('--bg-hover', adjustHex(base, step * 3));
      root.style.setProperty('--bg-active', adjustHex(base, step * 4));
      root.style.setProperty('--border-subtle', adjustHex(base, step * 2.4));
      root.style.setProperty('--border-strong', adjustHex(base, step * 4.2));
      root.style.setProperty('--scrollbar-track', adjustHex(base, isDarkBg ? 5 : -6));
      root.style.setProperty('--scrollbar-thumb', adjustHex(base, step * 3));
      root.style.setProperty('--scrollbar-thumb-hover', adjustHex(base, step * 4.5));
    } else {
      for (const v of CUSTOM_BG_VARS) {
        root.style.removeProperty(v);
      }
    }
  }

  public setTheme(theme: 'dark' | 'light'): void {
    this.customization.theme = theme;
    if (this.customization.backgroundPreset === 'custom' && this.customization.customBgColor) {
      const rgb = hexToRgb(this.customization.customBgColor);
      const lum = rgb ? (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 : 0.1;
      const customIsDark = lum < 0.5;
      if ((theme === 'dark' && !customIsDark) || (theme === 'light' && customIsDark)) {
        this.customization.backgroundPreset = 'default';
      }
    }
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.logActivity('update', 'settings', 'Тема интерфейса', `Переключено на ${theme === 'dark' ? 'тёмную' : 'светлую'} тему`);
    this.notify();
  }

  public toggleTheme(): void {
    this.setTheme(this.customization.theme === 'dark' ? 'light' : 'dark');
  }

  public setBackgroundPreset(preset: BackgroundPreset, customColor?: string): void {
    this.customization.backgroundPreset = preset;
    if (customColor) {
      this.customization.customBgColor = customColor;
    }
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.logActivity('update', 'settings', 'Фон интерфейса', `Установлен фон: ${preset}`);
    this.notify();
  }

  public setCustomBackgroundColor(hex: string): void {
    this.customization.backgroundPreset = 'custom';
    this.customization.customBgColor = hex;
    // Automatically align theme polarity if user picks a very light or dark custom color
    const rgb = hexToRgb(hex);
    if (rgb) {
      const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      this.customization.theme = lum < 0.5 ? 'dark' : 'light';
    }
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.notify();
  }

  public setLanguage(lang: 'ru' | 'en'): void {
    this.customization.language = lang;
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.logActivity('update', 'settings', 'Язык интерфейса', `Установлен язык: ${lang.toUpperCase()}`);
    this.notify();
  }

  public setDensity(density: 'comfortable' | 'compact'): void {
    this.customization.density = density;
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.notify();
  }

  public setAccentColor(accent: 'indigo' | 'emerald' | 'cyan' | 'violet' | 'amber'): void {
    this.customization.accentColor = accent;
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.notify();
  }

  public toggleSidebar(): void {
    this.customization.sidebarCollapsed = !this.customization.sidebarCollapsed;
    this.saveCustomization();
    this.notify();
  }

  public toggleActivityPanel(): void {
    this.customization.showActivityPanel = !this.customization.showActivityPanel;
    this.notify();
  }

  public setActiveView(view: ActiveView): void {
    this.activeView = view;
    this.notify();
  }

  public selectProject(projectId: string): void {
    this.selectedProjectId = projectId;
    this.notify();
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.notify();
  }

  public setFilterStatus(status: string): void {
    this.filterStatus = status;
    this.notify();
  }

  public setFilterPriority(priority: string): void {
    this.filterPriority = priority;
    this.notify();
  }

  public setFilterAssignee(assigneeId: string): void {
    this.filterAssignee = assigneeId;
    this.notify();
  }

  public resetFilters(): void {
    this.searchQuery = '';
    this.filterStatus = 'all';
    this.filterPriority = 'all';
    this.filterAssignee = 'all';
    this.notify();
  }

  public updateCustomization(partial: Partial<UserCustomization>): void {
    this.customization = { ...this.customization, ...partial };
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.notify();
  }

  public resetCustomization(): void {
    this.customization = { ...defaultCustomization };
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.addNotification('info', 'Настройки', 'Сброшены параметры интерфейса');
    this.notify();
  }

  // --- Task CRUD ---
  public addTask(taskData: Omit<Task, 'id' | 'order' | 'createdAt' | 'updatedAt'>): Task {
    const project = this.projects.find((p) => p.id === taskData.projectId) || this.projects[0];
    const prefix = project ? project.key : 'TASK';
    const nextNum = Math.floor(100 + Math.random() * 900);
    const id = `${prefix}-${nextNum}`;

    const newTask: Task = {
      ...taskData,
      id,
      order: this.tasks.filter((t) => t.status === taskData.status).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks = [newTask, ...this.tasks];
    this.saveTasks();
    this.logActivity('create', 'task', newTask.title, `Создана в проекте ${project?.name || ''}`);
    this.addNotification('success', 'Успешно', `Задача "${newTask.title}" создана`);
    this.notify();
    return newTask;
  }

  public updateTask(updated: Task): void {
    const old = this.tasks.find((t) => t.id === updated.id);
    this.tasks = this.tasks.map((t) => (t.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : t));
    this.saveTasks();

    if (old && old.status !== updated.status) {
      this.logActivity('status_change', 'task', updated.title, `Статус изменен с ${old.status} на ${updated.status}`);
    } else {
      this.logActivity('update', 'task', updated.title, 'Обновлены данные задачи');
    }

    this.addNotification('info', 'Обновлено', `Задача "${updated.title}" сохранена`);
    this.notify();
  }

  public deleteTask(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.tasks = this.tasks.filter((t) => t.id !== taskId);
    this.saveTasks();
    this.logActivity('delete', 'task', task.title, 'Удалена пользователем');
    this.addNotification('warning', 'Удалено', `Задача "${task.title}" удалена`);
    this.notify();
  }

  public moveTaskStatus(taskId: string, newStatus: TaskStatus): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const oldStatus = task.status;
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();
    this.saveTasks();

    this.logActivity('status_change', 'task', task.title, `Перемещено: ${oldStatus} → ${newStatus}`);
    this.notify();
  }

  public bulkUpdateStatus(taskIds: string[], newStatus: TaskStatus): void {
    this.tasks = this.tasks.map((t) => (taskIds.includes(t.id) ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t));
    this.saveTasks();
    this.logActivity('status_change', 'task', `${taskIds.length} задач`, `Массовый перенос в статус ${newStatus}`);
    this.addNotification('success', 'Успешно', `Обновлен статус для ${taskIds.length} задач`);
    this.notify();
  }

  public bulkDeleteTasks(taskIds: string[]): void {
    this.tasks = this.tasks.filter((t) => !taskIds.includes(t.id));
    this.saveTasks();
    this.logActivity('delete', 'task', `${taskIds.length} задач`, 'Массовое удаление задач');
    this.addNotification('warning', 'Удалено', `Удалено ${taskIds.length} задач`);
    this.notify();
  }

  // --- Modal Helpers ---
  public openCreateTaskModal(defaults?: { status?: TaskStatus; date?: string; projectId?: string }): void {
    this.editingTask = null;
    this.newTaskDefaultStatus = defaults?.status || 'todo';
    this.newTaskDefaultDate = defaults?.date || new Date().toISOString().slice(0, 10);
    this.isTaskModalOpen = true;
    this.notify();
  }

  public openEditTaskModal(task: Task): void {
    this.editingTask = { ...task };
    this.isTaskModalOpen = true;
    this.notify();
  }

  public closeTaskModal(): void {
    this.isTaskModalOpen = false;
    this.editingTask = null;
    this.notify();
  }

  // --- Notifications ---
  public addNotification(type: 'info' | 'success' | 'warning' | 'error', title: string, message: string): void {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const item: NotificationItem = { id, type, title, message, timestamp: Date.now() };
    this.notifications = [item, ...this.notifications.slice(0, 4)];
    this.notify();

    setTimeout(() => {
      this.dismissNotification(id);
    }, 4500);
  }

  public dismissNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notify();
  }

  // --- Activity Log ---
  public logActivity(
    action: 'create' | 'update' | 'delete' | 'status_change' | 'priority_change',
    targetType: 'task' | 'project' | 'settings',
    targetTitle: string,
    details: string
  ): void {
    const currentUserName = 'Текущий пользователь';
    const logItem: ActivityLogItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: 'current-user',
      userName: currentUserName,
      action,
      targetType,
      targetTitle,
      details,
    };
    this.activityLog = [logItem, ...this.activityLog];
    this.saveLogs();
  }

  public clearActivityLog(): void {
    this.activityLog = [];
    this.saveLogs();
    this.notify();
  }

  // --- Filtered tasks getter ---
  public getFilteredTasks(): Task[] {
    return this.tasks.filter((t) => {
      if (this.selectedProjectId !== 'all' && t.projectId !== this.selectedProjectId) {
        return false;
      }
      if (this.filterStatus !== 'all' && t.status !== this.filterStatus) {
        return false;
      }
      if (this.filterPriority !== 'all' && t.priority !== this.filterPriority) {
        return false;
      }
      if (this.filterAssignee !== 'all' && t.assigneeId !== this.filterAssignee) {
        return false;
      }
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description.toLowerCase().includes(query);
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesTag = t.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesId && !matchesTag) {
          return false;
        }
      }
      return true;
    });
  }
}

export const store = AppStore.getInstance();

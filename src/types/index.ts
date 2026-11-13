export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  color: string;
  dueDate: string;
  progress: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  estimatedHours: number;
  loggedHours: number;
  tags: string[];
  subtasks: { id: string; title: string; completed: boolean }[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type ThemeMode = 'dark' | 'light';
export type DensityMode = 'comfortable' | 'compact';
export type AccentColor = 'indigo' | 'emerald' | 'cyan' | 'violet' | 'amber';
export type BackgroundPreset = 'default' | 'midnight' | 'obsidian' | 'nordic' | 'forest' | 'custom';
export type SupportedLang = 'ru' | 'en';

export type ActiveView =
  | 'dashboard'
  | 'kanban'
  | 'gantt'
  | 'grid'
  | 'calendar'
  | 'analytics'
  | 'settings'
  | 'storybook';

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'priority_change';
  targetType: 'task' | 'project' | 'settings';
  targetTitle: string;
  details: string;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

export interface UserCustomization {
  theme: ThemeMode;
  density: DensityMode;
  accentColor: AccentColor;
  backgroundPreset: BackgroundPreset;
  customBgColor: string;
  language: SupportedLang;
  sidebarCollapsed: boolean;
  defaultView: ActiveView;
  showActivityPanel: boolean;
  gridColumns: {
    id: boolean;
    title: boolean;
    status: boolean;
    priority: boolean;
    assignee: boolean;
    dates: boolean;
    progress: boolean;
    tags: boolean;
  };
}

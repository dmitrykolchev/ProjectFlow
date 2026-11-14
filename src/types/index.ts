export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type EmployeeStatus = 'active' | 'remote' | 'vacation' | 'onboarding';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department?: string;
  companyId?: string;
  phone?: string;
  location?: string;
  status?: EmployeeStatus;
  hireDate?: string;
  hourlyRate?: number;
}

export type CompanyStatus = 'active' | 'inactive';

export interface Company {
  id: string;
  name: string;
  legalName: string;
  inn: string;
  kpp?: string;
  industry: string;
  city: string;
  phone: string;
  email: string;
  website?: string;
  directorId?: string;
  status: CompanyStatus;
  description: string;
}

export type CounterpartyType = 'client' | 'vendor' | 'partner' | 'contractor';
export type CounterpartyStatus = 'active' | 'pending' | 'blocked';

export interface Counterparty {
  id: string;
  name: string;
  legalName: string;
  type: CounterpartyType;
  inn: string;
  kpp?: string;
  city: string;
  contactPerson: string;
  phone: string;
  email: string;
  status: CounterpartyStatus;
  rating: number;
  notes: string;
}

export type ContractStatus = 'draft' | 'on_approval' | 'active' | 'completed' | 'terminated';
export type ContractType = 'service' | 'supply' | 'license' | 'nda' | 'sla';

export interface Contract {
  id: string;
  number: string;
  title: string;
  type: ContractType;
  companyId: string;
  counterpartyId: string;
  projectId?: string;
  ownerId?: string;
  amount: number;
  currency: 'RUB' | 'USD' | 'EUR';
  startDate: string;
  endDate: string;
  status: ContractStatus;
  description: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  title: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  sourceType?: 'manual' | 'time_entry' | 'expense';
  sourceId?: string;
}

export interface Invoice {
  id: string;
  number: string;
  contractId: string;
  projectId?: string;
  companyId: string;
  counterpartyId: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  paidDate?: string; // YYYY-MM-DD
  currency: 'RUB' | 'USD' | 'EUR';
  vatRate: 0 | 10 | 20;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  items: InvoiceLineItem[];
  notes: string;
  createdAt: string;
}

export type ProjectRole =
  | 'pm'
  | 'tech_lead'
  | 'architect'
  | 'developer'
  | 'designer'
  | 'qa'
  | 'analyst'
  | 'devops';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  allocation: number;
  joinedAt: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  color: string;
  dueDate: string;
  progress: number;
  status?: ProjectStatus;
  companyId?: string;
  counterpartyId?: string;
  budget?: number;
  members?: ProjectMember[];
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

export type TimeEntryCategory =
  | 'development'
  | 'design'
  | 'testing'
  | 'meeting'
  | 'research'
  | 'devops'
  | 'management';

export type TimeEntryStatus = 'logged' | 'submitted' | 'approved';

export interface TimeEntry {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  hours: number;
  billable: boolean;
  category: TimeEntryCategory;
  status: TimeEntryStatus;
  description: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'infrastructure'
  | 'software'
  | 'contractors'
  | 'travel'
  | 'equipment'
  | 'marketing'
  | 'other';

export type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'reimbursed' | 'rejected';

export interface Expense {
  id: string;
  projectId: string;
  taskId?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: 'RUB' | 'USD' | 'EUR';
  billable: boolean;
  status: ExpenseStatus;
  vendor?: string;
  notes: string;
  createdAt: string;
}

export type ThemeMode = 'dark' | 'light' | 'cyberpunk';
export type DensityMode = 'comfortable' | 'compact';
export type AccentColor = 'indigo' | 'emerald' | 'cyan' | 'violet' | 'amber';
export type BackgroundPreset = 'default' | 'midnight' | 'obsidian' | 'nordic' | 'forest' | 'custom';
export type SupportedLang = 'ru' | 'en';
export type SidebarGroupMode = 'single' | 'multiple';

export interface ThemeBaseColors {
  bgCanvas: string;
  bgSurface: string;
  textPrimary: string;
  accentPrimary: string;
  borderSubtle: string;
}

export type ActiveView =
  | 'dashboard'
  | 'kanban'
  | 'gantt'
  | 'grid'
  | 'calendar'
  | 'analytics'
  | 'companies'
  | 'employees'
  | 'counterparties'
  | 'contracts'
  | 'contract-detail'
  | 'projects'
  | 'project-detail'
  | 'time-tracking'
  | 'expenses'
  | 'settings'
  | 'storybook';

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'priority_change';
  targetType:
    | 'task'
    | 'project'
    | 'company'
    | 'employee'
    | 'counterparty'
    | 'contract'
    | 'invoice'
    | 'time_entry'
    | 'expense'
    | 'settings';
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
  themeOverrides?: Partial<Record<ThemeMode, Partial<ThemeBaseColors>>>;
  language: SupportedLang;
  sidebarCollapsed: boolean;
  sidebarGroupMode: SidebarGroupMode;
  sidebarExpandedGroups: string[];
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

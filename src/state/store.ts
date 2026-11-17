import {
  AccentColor,
  ActiveView,
  ActivityLogItem,
  BackgroundPreset,
  Calculation,
  CalculationStatus,
  Company,
  Contract,
  Counterparty,
  CounterpartyContact,
  DocumentItem,
  DocumentScope,
  Expense,
  Invoice,
  InvoicePayment,
  InvoiceStatus,
  KnowledgeArticle,
  KnowledgeScope,
  NotificationItem,
  Project,
  ProjectChatMessage,
  ProjectMember,
  ProjectRequirement,
  ProjectRole,
  SidebarGroupMode,
  Task,
  TaskStatus,
  ThemeBaseColors,
  ThemeMode,
  TimeEntry,
  User,
  UserCustomization,
} from '../types';
import {
  initialCalculations,
  initialChatMessages,
  initialCompanies,
  initialContracts,
  initialCounterparties,
  initialDocuments,
  initialExpenses,
  initialInvoices,
  initialKnowledgeArticles,
  initialPayments,
  initialProjects,
  initialRequirements,
  initialTasks,
  initialTimeEntries,
  initialUsers,
} from './mock-data';
import { locationToPath, pathToLocation, NavLocation } from '../domain/navigation';
import { getTranslation } from '../i18n';

const STORAGE_KEY_CUSTOMIZATION = 'projectflow_customization_v1';
const STORAGE_KEY_TASKS = 'projectflow_tasks_v2';
const STORAGE_KEY_PROJECTS = 'projectflow_projects_v2';
const STORAGE_KEY_LOGS = 'projectflow_activity_v1';
const STORAGE_KEY_COMPANIES = 'projectflow_companies_v1';
const STORAGE_KEY_EMPLOYEES = 'projectflow_employees_v1';
const STORAGE_KEY_COUNTERPARTIES = 'projectflow_counterparties_v1';
const STORAGE_KEY_CONTRACTS = 'projectflow_contracts_v1';
const STORAGE_KEY_CALCULATIONS = 'projectflow_calculations_v1';
const STORAGE_KEY_INVOICES = 'projectflow_invoices_v1';
const STORAGE_KEY_PAYMENTS = 'projectflow_payments_v1';
const STORAGE_KEY_TIME_ENTRIES = 'projectflow_time_entries_v1';
const STORAGE_KEY_EXPENSES = 'projectflow_expenses_v1';
const STORAGE_KEY_CHAT = 'projectflow_chat_v1';
const STORAGE_KEY_KNOWLEDGE = 'projectflow_knowledge_v1';
const STORAGE_KEY_DOCUMENTS = 'projectflow_documents_v1';
const STORAGE_KEY_REQUIREMENTS = 'projectflow_requirements_v1';

const defaultCustomization: UserCustomization = {
  theme: 'dark',
  density: 'comfortable',
  accentColor: 'indigo',
  backgroundPreset: 'default',
  customBgColor: '#0c101d',
  themeOverrides: {},
  language: 'ru',
  sidebarCollapsed: false,
  sidebarGroupMode: 'multiple',
  sidebarExpandedGroups: ['workspace', 'views', 'directory', 'system'],
  defaultView: 'dashboard',
  showActivityPanel: false,
  tablePageSize: 10,
  cardGridPageSize: 6,
  aiEndpoint: 'http://127.0.0.1:47831/v1',
  aiModel: '',
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

export const THEME_DEFAULT_BASE_COLORS: Record<ThemeMode, ThemeBaseColors> = {
  dark: {
    bgCanvas: '#090d16',
    bgSurface: '#111827',
    textPrimary: '#f8fafc',
    accentPrimary: '#6366f1',
    borderSubtle: '#1e293b',
  },
  light: {
    bgCanvas: '#f8fafc',
    bgSurface: '#ffffff',
    textPrimary: '#0f172a',
    accentPrimary: '#6366f1',
    borderSubtle: '#e2e8f0',
  },
  cyberpunk: {
    bgCanvas: '#06040f',
    bgSurface: '#0d0a1f',
    textPrimary: '#f4f6ff',
    accentPrimary: '#ff2a85',
    borderSubtle: '#1e2d5e',
  },
  matrix: {
    bgCanvas: '#020603',
    bgSurface: '#050e08',
    textPrimary: '#dcfce7',
    accentPrimary: '#00ff41',
    borderSubtle: '#11331d',
  },
  barbie: {
    bgCanvas: '#fff1f7',
    bgSurface: '#ffffff',
    textPrimary: '#4a0729',
    accentPrimary: '#d61f77',
    borderSubtle: '#fbcfe8',
  },
  'high-contrast': {
    bgCanvas: '#000000',
    bgSurface: '#0a0a0a',
    textPrimary: '#ffffff',
    accentPrimary: '#fde047',
    borderSubtle: '#737373',
  },
};

const ACCENT_HEX_MAP: Record<AccentColor, string> = {
  indigo: '#6366f1',
  emerald: '#10b981',
  cyan: '#06b6d4',
  violet: '#8b5cf6',
  amber: '#f59e0b',
};

const BG_PRESET_BASE_MAP: Record<'dark' | 'light', Record<Exclude<BackgroundPreset, 'default' | 'custom'>, Partial<ThemeBaseColors>>> = {
  dark: {
    midnight: { bgCanvas: '#030712', bgSurface: '#0a101f', borderSubtle: '#172136' },
    obsidian: { bgCanvas: '#121110', bgSurface: '#1b1917', borderSubtle: '#2b2724' },
    nordic: { bgCanvas: '#0f172a', bgSurface: '#162033', borderSubtle: '#243247' },
    forest: { bgCanvas: '#071310', bgSurface: '#0d1d19', borderSubtle: '#1a352f' },
  },
  light: {
    midnight: { bgCanvas: '#eef2f9', bgSurface: '#ffffff', borderSubtle: '#d5dfef' },
    obsidian: { bgCanvas: '#f5f4f1', bgSurface: '#fafaf8', borderSubtle: '#e0ddd5' },
    nordic: { bgCanvas: '#edf2f6', bgSurface: '#f8fbfd', borderSubtle: '#d4e0e9' },
    forest: { bgCanvas: '#f0f5f2', bgSurface: '#f8fbf9', borderSubtle: '#d3e2d9' },
  },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.1;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
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

function mixHex(hexA: string, hexB: string, weightB: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return hexA;
  const w = Math.max(0, Math.min(1, weightB));
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(a.r * (1 - w) + b.r * w).toString(16).padStart(2, '0');
  const g = clamp(a.g * (1 - w) + b.g * w).toString(16).padStart(2, '0');
  const bl = clamp(a.b * (1 - w) + b.b * w).toString(16).padStart(2, '0');
  return `#${r}${g}${bl}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

const DYNAMIC_THEME_VARS = [
  '--bg-canvas',
  '--bg-surface',
  '--bg-surface-elevated',
  '--bg-subtle',
  '--bg-hover',
  '--bg-active',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--text-inverse',
  '--text-on-accent',
  '--border-subtle',
  '--border-strong',
  '--border-focus',
  '--accent-primary',
  '--accent-hover',
  '--accent-soft',
  '--accent-border',
  '--accent-gradient',
  '--accent-glow',
  '--accent-glow-hover',
  '--scrollbar-track',
  '--scrollbar-thumb',
  '--scrollbar-thumb-hover',
];

export class AppStore {
  private static instance: AppStore;

  public tasks: Task[] = [];
  public projects: Project[] = [];
  public users: User[] = initialUsers;
  public companies: Company[] = [];
  public counterparties: Counterparty[] = [];
  public contracts: Contract[] = [];
  public calculations: Calculation[] = [];
  public invoices: Invoice[] = [];
  public payments: InvoicePayment[] = [];
  public timeEntries: TimeEntry[] = [];
  public expenses: Expense[] = [];
  public chatMessages: ProjectChatMessage[] = [];
  public knowledgeArticles: KnowledgeArticle[] = [];
  public documents: DocumentItem[] = [];
  public requirements: ProjectRequirement[] = [];
  public selectedProjectId: string = 'all';
  public detailProjectId: string = '';
  public detailCompanyId: string = '';
  public detailContractId: string = '';
  public detailCounterpartyId: string = '';
  public detailEmployeeId: string = '';
  public detailTaskId: string = '';
  public detailKnowledgeId: string = '';
  public detailRequirementId: string = '';
  public detailCalculationId: string = '';
  public requirementFilterProjectId: string = 'all';
  public knowledgeFilterScope: 'all' | KnowledgeScope = 'all';
  public knowledgeFilterProjectId: string = 'all';
  public knowledgeFilterCompanyId: string = 'all';
  public documentFilterScope: 'all' | DocumentScope = 'all';
  public documentFilterCompanyId: string = 'all';
  public documentFilterProjectId: string = 'all';
  public chatProjectId: string = '';
  public currentUserId: string = 'user-1';
  public pendingInvoiceForContractId: string | null = null;
  public pendingCalculationForContractId: string | null = null;
  public activeView: ActiveView = 'dashboard';
  /** current page of the active paginated list view (1 = first page, not in hash) */
  public activePage = 1;
  private historyApplying = false;

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
        if (!Array.isArray(this.customization.sidebarExpandedGroups)) {
          this.customization.sidebarExpandedGroups = [...defaultCustomization.sidebarExpandedGroups];
        }
        if (this.customization.sidebarGroupMode !== 'single' && this.customization.sidebarGroupMode !== 'multiple') {
          this.customization.sidebarGroupMode = 'multiple';
        }
        if (typeof this.customization.tablePageSize !== 'number' || this.customization.tablePageSize < 1) {
          this.customization.tablePageSize = defaultCustomization.tablePageSize;
        }
        if (typeof this.customization.cardGridPageSize !== 'number' || this.customization.cardGridPageSize < 1) {
          this.customization.cardGridPageSize = defaultCustomization.cardGridPageSize;
        }
        if (typeof this.customization.aiEndpoint !== 'string' || !this.customization.aiEndpoint.trim()) {
          this.customization.aiEndpoint = defaultCustomization.aiEndpoint;
        }
        if (typeof this.customization.aiModel !== 'string') {
          this.customization.aiModel = defaultCustomization.aiModel;
        }
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
        const parsed: Project[] = JSON.parse(storedProjects);
        this.projects = parsed.map((proj) => {
          const fallback = initialProjects.find((p) => p.id === proj.id);
          return {
            status: fallback?.status || 'active',
            companyId: fallback?.companyId,
            counterpartyId: fallback?.counterpartyId,
            budget: fallback?.budget,
            members: fallback?.members ? [...fallback.members] : [],
            ...proj,
          };
        });
      } else {
        this.projects = initialProjects.map((p) => ({
          ...p,
          members: p.members ? [...p.members] : [],
        }));
      }

      const storedCompanies = localStorage.getItem(STORAGE_KEY_COMPANIES);
      if (storedCompanies) {
        const parsedCompanies: Company[] = JSON.parse(storedCompanies);
        this.companies = parsedCompanies.map((c) => {
          const fallback = initialCompanies.find((ic) => ic.id === c.id);
          return {
            ...c,
            bankAccounts: Array.isArray(c.bankAccounts)
              ? c.bankAccounts
              : fallback?.bankAccounts
                ? fallback.bankAccounts.map((b) => ({ ...b }))
                : [],
          };
        });
      } else {
        this.companies = initialCompanies.map((c) => ({
          ...c,
          bankAccounts: c.bankAccounts ? c.bankAccounts.map((b) => ({ ...b })) : [],
        }));
      }

      const storedEmployees = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
      if (storedEmployees) {
        const parsedUsers: User[] = JSON.parse(storedEmployees);
        this.users = parsedUsers.map((u) => {
          const fallback = initialUsers.find((iu) => iu.id === u.id);
          return { ...(fallback || {}), ...u };
        });
      } else {
        this.users = [...initialUsers];
      }

      const storedCounterparties = localStorage.getItem(STORAGE_KEY_COUNTERPARTIES);
      if (storedCounterparties) {
        const parsedCounterparties: Counterparty[] = JSON.parse(storedCounterparties);
        this.counterparties = parsedCounterparties.map((cp) => {
          const fallback = initialCounterparties.find((icp) => icp.id === cp.id);
          let contacts: CounterpartyContact[];
          if (Array.isArray(cp.contacts)) {
            contacts = cp.contacts.map((c) => ({ ...c }));
          } else if (fallback?.contacts) {
            contacts = fallback.contacts.map((c) => ({ ...c }));
          } else if (cp.contactPerson && cp.contactPerson !== '—') {
            contacts = [
              {
                id: `cnt-${cp.id}-1`,
                fullName: cp.contactPerson,
                phone: cp.phone && cp.phone !== '—' ? cp.phone : undefined,
                email: cp.email && cp.email !== '—' ? cp.email : undefined,
                isPrimary: true,
              },
            ];
          } else {
            contacts = [];
          }
          return {
            ...cp,
            contacts,
            bankAccounts: Array.isArray(cp.bankAccounts)
              ? cp.bankAccounts
              : fallback?.bankAccounts
                ? fallback.bankAccounts.map((b) => ({ ...b }))
                : [],
          };
        });
      } else {
        this.counterparties = initialCounterparties.map((cp) => ({
          ...cp,
          contacts: cp.contacts ? cp.contacts.map((c) => ({ ...c })) : [],
          bankAccounts: cp.bankAccounts ? cp.bankAccounts.map((b) => ({ ...b })) : [],
        }));
      }

      const storedContracts = localStorage.getItem(STORAGE_KEY_CONTRACTS);
      this.contracts = storedContracts ? JSON.parse(storedContracts) : [...initialContracts];

      const storedCalculations = localStorage.getItem(STORAGE_KEY_CALCULATIONS);
      this.calculations = storedCalculations ? JSON.parse(storedCalculations) : [...initialCalculations];

      const storedInvoices = localStorage.getItem(STORAGE_KEY_INVOICES);
      this.invoices = storedInvoices ? JSON.parse(storedInvoices) : [...initialInvoices];

      const storedPayments = localStorage.getItem(STORAGE_KEY_PAYMENTS);
      this.payments = storedPayments ? JSON.parse(storedPayments) : [...initialPayments];

      this.syncOverdueInvoices(false);

      const storedTimeEntries = localStorage.getItem(STORAGE_KEY_TIME_ENTRIES);
      this.timeEntries = storedTimeEntries ? JSON.parse(storedTimeEntries) : [...initialTimeEntries];

      const storedExpenses = localStorage.getItem(STORAGE_KEY_EXPENSES);
      this.expenses = storedExpenses ? JSON.parse(storedExpenses) : [...initialExpenses];

      const storedChat = localStorage.getItem(STORAGE_KEY_CHAT);
      this.chatMessages = storedChat ? JSON.parse(storedChat) : [...initialChatMessages];

      const storedKnowledge = localStorage.getItem(STORAGE_KEY_KNOWLEDGE);
      this.knowledgeArticles = storedKnowledge
        ? JSON.parse(storedKnowledge)
        : [...initialKnowledgeArticles];

      const storedDocuments = localStorage.getItem(STORAGE_KEY_DOCUMENTS);
      if (storedDocuments) {
        const parsedDocs: DocumentItem[] = JSON.parse(storedDocuments);
        this.documents = parsedDocs.map((doc) => {
          if (doc.dataUrl) return doc;
          const seed = initialDocuments.find((d) => d.id === doc.id);
          return seed?.dataUrl ? { ...doc, dataUrl: seed.dataUrl } : doc;
        });
      } else {
        this.documents = [...initialDocuments];
      }

      const storedRequirements = localStorage.getItem(STORAGE_KEY_REQUIREMENTS);
      this.requirements = storedRequirements
        ? JSON.parse(storedRequirements)
        : [...initialRequirements];

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
            targetId: 'CORE-102',
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
            targetId: 'CORE-101',
            targetTitle: 'Архитектура распределенного кэширования L2',
            details: 'Создана задача с приоритетом Urgent',
          },
        ];
      }
    } catch (e) {
      console.warn('Error loading state from localStorage:', e);
      this.tasks = [...initialTasks];
      this.projects = initialProjects.map((p) => ({
        ...p,
        members: p.members ? [...p.members] : [],
      }));
      this.companies = [...initialCompanies];
      this.users = [...initialUsers];
      this.counterparties = [...initialCounterparties];
      this.contracts = [...initialContracts];
      this.calculations = [...initialCalculations];
      this.invoices = [...initialInvoices];
      this.payments = [...initialPayments];
      this.timeEntries = [...initialTimeEntries];
      this.expenses = [...initialExpenses];
      this.chatMessages = [...initialChatMessages];
      this.knowledgeArticles = [...initialKnowledgeArticles];
      this.documents = [...initialDocuments];
    }
  }

  private saveTasks(): void {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(this.tasks));
    } catch (e) {
      console.error(e);
    }
  }

  private saveProjects(): void {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(this.projects));
    } catch (e) {
      console.error(e);
    }
  }

  private saveCompanies(): void {
    try {
      localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(this.companies));
    } catch (e) {
      console.error(e);
    }
  }

  private saveEmployees(): void {
    try {
      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(this.users));
    } catch (e) {
      console.error(e);
    }
  }

  private saveCounterparties(): void {
    try {
      localStorage.setItem(STORAGE_KEY_COUNTERPARTIES, JSON.stringify(this.counterparties));
    } catch (e) {
      console.error(e);
    }
  }

  private saveContracts(): void {
    try {
      localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(this.contracts));
    } catch (e) {
      console.error(e);
    }
  }

  private saveCalculations(): void {
    try {
      localStorage.setItem(STORAGE_KEY_CALCULATIONS, JSON.stringify(this.calculations));
    } catch (e) {
      console.error(e);
    }
  }

  private saveInvoices(): void {
    try {
      localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(this.invoices));
    } catch (e) {
      console.error(e);
    }
  }

  private savePayments(): void {
    try {
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(this.payments));
    } catch (e) {
      console.error(e);
    }
  }

  private saveTimeEntries(): void {
    try {
      localStorage.setItem(STORAGE_KEY_TIME_ENTRIES, JSON.stringify(this.timeEntries));
    } catch (e) {
      console.error(e);
    }
  }

  private saveExpenses(): void {
    try {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(this.expenses));
    } catch (e) {
      console.error(e);
    }
  }

  private saveChatMessages(): void {
    try {
      localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(this.chatMessages));
    } catch (e) {
      console.error(e);
    }
  }

  private saveKnowledgeArticles(): void {
    try {
      localStorage.setItem(STORAGE_KEY_KNOWLEDGE, JSON.stringify(this.knowledgeArticles));
    } catch (e) {
      console.error(e);
    }
  }

  private saveDocuments(): void {
    try {
      localStorage.setItem(STORAGE_KEY_DOCUMENTS, JSON.stringify(this.documents));
    } catch (e) {
      console.warn('localStorage quota exceeded while saving documents, stripping large binary payloads:', e);
      try {
        const compacted = this.documents.map((doc) =>
          doc.dataUrl && doc.dataUrl.length > 60_000
            ? { ...doc, dataUrl: undefined }
            : doc
        );
        localStorage.setItem(STORAGE_KEY_DOCUMENTS, JSON.stringify(compacted));
      } catch (err) {
        console.error(err);
      }
    }
  }

  private saveRequirements(): void {
    try {
      localStorage.setItem(STORAGE_KEY_REQUIREMENTS, JSON.stringify(this.requirements));
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

  public getEffectiveBaseColors(theme: ThemeMode = this.customization.theme): ThemeBaseColors {
    const base = { ...THEME_DEFAULT_BASE_COLORS[theme] };

    if (theme === 'dark' || theme === 'light') {
      const preset = this.customization.backgroundPreset;
      if (preset && preset !== 'default') {
        if (preset === 'custom' && this.customization.customBgColor) {
          const customBase = this.customization.customBgColor;
          const isDarkBg = getLuminance(customBase) < 0.5;
          base.bgCanvas = customBase;
          base.bgSurface = adjustHex(customBase, isDarkBg ? 10 : 12);
          base.borderSubtle = adjustHex(customBase, isDarkBg ? 24 : -18);
        } else if (preset !== 'custom') {
          const presetColors = BG_PRESET_BASE_MAP[theme][preset];
          if (presetColors) {
            Object.assign(base, presetColors);
          }
        }
      }
      base.accentPrimary = ACCENT_HEX_MAP[this.customization.accentColor] || base.accentPrimary;
    }

    const overrides = this.customization.themeOverrides?.[theme];
    if (overrides) {
      if (overrides.bgCanvas) base.bgCanvas = overrides.bgCanvas;
      if (overrides.bgSurface) base.bgSurface = overrides.bgSurface;
      if (overrides.textPrimary) base.textPrimary = overrides.textPrimary;
      if (overrides.accentPrimary) base.accentPrimary = overrides.accentPrimary;
      if (overrides.borderSubtle) base.borderSubtle = overrides.borderSubtle;
    }

    return base;
  }

  public hasThemeOverrides(theme: ThemeMode = this.customization.theme): boolean {
    const overrides = this.customization.themeOverrides?.[theme];
    return Boolean(overrides && Object.values(overrides).some(Boolean));
  }

  public applyThemeAndCustomization(): void {
    const root = document.documentElement;
    const body = document.body;
    const theme = this.customization.theme;
    const effectiveForFamily = this.getEffectiveBaseColors(theme);
    const isDarkFamily =
      theme === 'dark' ||
      theme === 'cyberpunk' ||
      theme === 'matrix' ||
      (theme === 'high-contrast' && getLuminance(effectiveForFamily.bgCanvas) < 0.5);

    // Keep theme attributes strictly on <html> so <body> never shadows :root presets or inline custom vars
    if (body) {
      body.classList.remove('dark');
      body.removeAttribute('data-theme');
      body.removeAttribute('data-bg');
      body.removeAttribute('data-accent');
      body.removeAttribute('data-density');
    }

    if (isDarkFamily) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-density', this.customization.density);
    root.setAttribute('data-accent', this.customization.accentColor);
    root.setAttribute('data-bg', this.customization.backgroundPreset || 'default');
    root.setAttribute('lang', this.customization.language);

    // Clear previously injected dynamic theme vars cleanly
    for (const v of DYNAMIC_THEME_VARS) {
      root.style.removeProperty(v);
    }

    const overrides = this.customization.themeOverrides?.[theme] || {};
    const hasCustomBase = Object.values(overrides).some(Boolean);

    if (hasCustomBase) {
      const effective = this.getEffectiveBaseColors(theme);
      const isDarkSurface = getLuminance(effective.bgSurface) < 0.5;
      const step = isDarkSurface ? 10 : -9;

      if (overrides.bgCanvas || overrides.bgSurface || overrides.borderSubtle) {
        const bgCanvas = effective.bgCanvas;
        const bgSurface = effective.bgSurface;
        const borderSubtle = effective.borderSubtle;

        root.style.setProperty('--bg-canvas', bgCanvas);
        root.style.setProperty('--bg-surface', bgSurface);
        root.style.setProperty(
          '--bg-surface-elevated',
          theme === 'high-contrast'
            ? adjustHex(bgSurface, isDarkSurface ? 10 : -6)
            : mixHex(bgSurface, '#ffffff', isDarkSurface ? 0.05 : 0.65)
        );
        root.style.setProperty(
          '--bg-subtle',
          theme === 'high-contrast'
            ? adjustHex(bgSurface, isDarkSurface ? 14 : -10)
            : mixHex(bgSurface, bgCanvas, isDarkSurface ? 0.35 : 0.6)
        );
        root.style.setProperty('--bg-hover', adjustHex(bgSurface, step * 2));
        root.style.setProperty('--bg-active', adjustHex(bgSurface, step * 3));
        root.style.setProperty('--border-subtle', borderSubtle);
        root.style.setProperty('--border-strong', adjustHex(borderSubtle, isDarkSurface ? 28 : -24));
        root.style.setProperty('--scrollbar-track', mixHex(bgCanvas, bgSurface, 0.35));
        root.style.setProperty(
          '--scrollbar-thumb',
          theme === 'high-contrast'
            ? mixHex(borderSubtle, effective.textPrimary, 0.7)
            : mixHex(borderSubtle, effective.textPrimary, 0.25)
        );
        root.style.setProperty(
          '--scrollbar-thumb-hover',
          theme === 'high-contrast'
            ? effective.accentPrimary
            : mixHex(borderSubtle, effective.accentPrimary, 0.55)
        );
      }

      if (overrides.textPrimary || overrides.bgSurface) {
        const textPrimary = effective.textPrimary;
        const bgSurface = effective.bgSurface;
        root.style.setProperty('--text-primary', textPrimary);
        root.style.setProperty(
          '--text-secondary',
          mixHex(textPrimary, bgSurface, theme === 'high-contrast' ? 0.12 : 0.35)
        );
        root.style.setProperty(
          '--text-muted',
          mixHex(textPrimary, bgSurface, theme === 'high-contrast' ? 0.25 : 0.58)
        );
        root.style.setProperty('--text-inverse', isDarkSurface ? '#000000' : '#ffffff');
      }

      if (overrides.accentPrimary) {
        const accent = effective.accentPrimary;
        const hover = adjustHex(accent, isDarkSurface ? 18 : -18);
        const onAccent = getLuminance(accent) > 0.5 ? '#020603' : '#ffffff';
        root.style.setProperty('--accent-primary', accent);
        root.style.setProperty('--accent-hover', hover);
        root.style.setProperty('--accent-soft', hexToRgba(accent, theme === 'high-contrast' ? 0.2 : 0.16));
        root.style.setProperty('--accent-border', theme === 'high-contrast' ? accent : hexToRgba(accent, 0.38));
        root.style.setProperty(
          '--accent-gradient',
          theme === 'cyberpunk'
            ? `linear-gradient(135deg, ${accent} 0%, ${mixHex(accent, '#00e5ff', 0.45)} 52%, #00e5ff 100%)`
            : theme === 'matrix'
            ? `linear-gradient(135deg, ${accent} 0%, ${mixHex(accent, '#059669', 0.55)} 100%)`
            : theme === 'barbie'
            ? `linear-gradient(135deg, ${adjustHex(accent, 18)} 0%, ${accent} 58%, ${mixHex(accent, '#c026d3', 0.45)} 100%)`
            : theme === 'high-contrast'
            ? `linear-gradient(135deg, ${accent} 0%, ${accent} 100%)`
            : `linear-gradient(135deg, ${accent} 0%, ${adjustHex(accent, -24)} 100%)`
        );
        root.style.setProperty('--border-focus', accent);
        root.style.setProperty('--text-on-accent', onAccent);

        if (theme === 'cyberpunk') {
          root.style.setProperty(
            '--accent-glow',
            `0 0 14px ${hexToRgba(accent, 0.5)}, 0 0 26px rgba(0, 240, 255, 0.22)`
          );
          root.style.setProperty(
            '--accent-glow-hover',
            `0 0 22px rgba(0, 240, 255, 0.65), 0 0 36px ${hexToRgba(accent, 0.42)}`
          );
        } else if (theme === 'matrix') {
          root.style.setProperty(
            '--accent-glow',
            `0 0 14px ${hexToRgba(accent, 0.45)}, 0 0 26px ${hexToRgba(accent, 0.2)}`
          );
          root.style.setProperty(
            '--accent-glow-hover',
            `0 0 22px ${hexToRgba(accent, 0.68)}, 0 0 36px ${hexToRgba(accent, 0.3)}`
          );
        } else if (theme === 'barbie') {
          root.style.setProperty('--accent-glow', `0 4px 14px ${hexToRgba(accent, 0.32)}`);
          root.style.setProperty('--accent-glow-hover', `0 6px 20px ${hexToRgba(accent, 0.45)}`);
        }
      }
    } else if ((theme === 'dark' || theme === 'light') && this.customization.backgroundPreset === 'custom' && this.customization.customBgColor) {
      const base = this.customization.customBgColor;
      const isDarkBg = getLuminance(base) < 0.5;
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
    }

    // canonical control size scale (docs/ComponentApiSpecs.md, Priority E) —
    // shared by all form controls; values equal the historical fallbacks, so md visuals are unchanged
    root.style.setProperty('--control-height-sm', '30px');
    root.style.setProperty('--control-height-md', '38px');
    root.style.setProperty('--control-height-lg', '44px');
    root.style.setProperty('--control-font-sm', '0.8125rem');
    root.style.setProperty('--control-font-md', '0.875rem');
    root.style.setProperty('--control-font-lg', '1rem');
    root.style.setProperty('--control-padding-x-sm', '0.65rem');
    root.style.setProperty('--control-padding-x-md', '0.875rem');
    root.style.setProperty('--control-padding-x-lg', '1.15rem');
    root.style.setProperty('--control-icon-sm', '16px');
    root.style.setProperty('--control-icon-md', '20px');
    root.style.setProperty('--control-icon-lg', '24px');
  }

  public setTheme(theme: ThemeMode): void {
    this.customization.theme = theme;
    if ((theme === 'dark' || theme === 'light') && this.customization.backgroundPreset === 'custom' && this.customization.customBgColor) {
      const customIsDark = getLuminance(this.customization.customBgColor) < 0.5;
      if ((theme === 'dark' && !customIsDark) || (theme === 'light' && customIsDark)) {
        this.customization.backgroundPreset = 'default';
      }
    }
    this.applyThemeAndCustomization();
    this.saveCustomization();
    const themeLabel =
      theme === 'high-contrast'
        ? 'тему высокой контрастности'
        : theme === 'barbie'
        ? 'тему Барби'
        : theme === 'matrix'
        ? 'тему Матрица'
        : theme === 'cyberpunk'
        ? 'тему Киберпанк'
        : theme === 'dark'
        ? 'тёмную тему'
        : 'светлую тему';
    this.logActivity('update', 'settings', 'Тема интерфейса', `Переключено на ${themeLabel}`);
    this.notify();
  }

  public toggleTheme(): void {
    const order: ThemeMode[] = ['dark', 'light', 'cyberpunk', 'matrix', 'barbie', 'high-contrast'];
    const idx = order.indexOf(this.customization.theme);
    const next = order[(idx + 1) % order.length];
    this.setTheme(next);
  }

  public setThemeBaseColor(key: keyof ThemeBaseColors, hex: string): void {
    const theme = this.customization.theme;
    const prevAll = this.customization.themeOverrides || {};
    const prevTheme = prevAll[theme] || {};
    this.customization.themeOverrides = {
      ...prevAll,
      [theme]: {
        ...prevTheme,
        [key]: hex,
      },
    };
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.notify();
  }

  public applyThemeBasePreset(colors: Partial<ThemeBaseColors>): void {
    const theme = this.customization.theme;
    const prevAll = this.customization.themeOverrides || {};
    this.customization.themeOverrides = {
      ...prevAll,
      [theme]: {
        ...(prevAll[theme] || {}),
        ...colors,
      },
    };
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.logActivity('update', 'settings', 'Цвета темы', `Применена базовая палитра для темы ${theme}`);
    this.notify();
  }

  public resetThemeBaseColors(theme: ThemeMode = this.customization.theme): void {
    const prevAll = { ...(this.customization.themeOverrides || {}) };
    delete prevAll[theme];
    this.customization.themeOverrides = prevAll;
    if (this.customization.backgroundPreset === 'custom') {
      this.customization.backgroundPreset = 'default';
    }
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.logActivity('update', 'settings', 'Цвета темы', `Сброшены базовые цвета для темы ${theme}`);
    this.notify();
  }

  public setBackgroundPreset(preset: BackgroundPreset, customColor?: string): void {
    this.customization.backgroundPreset = preset;
    if (customColor) {
      this.customization.customBgColor = customColor;
    }
    const theme = this.customization.theme;
    if (this.customization.themeOverrides?.[theme]) {
      const nextTheme = { ...this.customization.themeOverrides[theme] };
      delete nextTheme.bgCanvas;
      delete nextTheme.bgSurface;
      delete nextTheme.borderSubtle;
      this.customization.themeOverrides = {
        ...this.customization.themeOverrides,
        [theme]: nextTheme,
      };
    }
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.logActivity('update', 'settings', 'Фон интерфейса', `Установлен фон: ${preset}`);
    this.notify();
  }

  public setCustomBackgroundColor(hex: string): void {
    this.customization.backgroundPreset = 'custom';
    this.customization.customBgColor = hex;
    if (this.customization.theme === 'dark' || this.customization.theme === 'light') {
      this.customization.theme = getLuminance(hex) < 0.5 ? 'dark' : 'light';
    }
    const theme = this.customization.theme;
    if (this.customization.themeOverrides?.[theme]) {
      const nextTheme = { ...this.customization.themeOverrides[theme] };
      delete nextTheme.bgCanvas;
      delete nextTheme.bgSurface;
      delete nextTheme.borderSubtle;
      this.customization.themeOverrides = {
        ...this.customization.themeOverrides,
        [theme]: nextTheme,
      };
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

  public setTablePageSize(size: number): void {
    const next = Math.max(1, Math.min(200, Math.floor(Number(size) || 10)));
    if (this.customization.tablePageSize === next) return;
    this.customization.tablePageSize = next;
    this.saveCustomization();
    this.notify();
  }

  public setCardGridPageSize(size: number): void {
    const next = Math.max(1, Math.min(100, Math.floor(Number(size) || 6)));
    if (this.customization.cardGridPageSize === next) return;
    this.customization.cardGridPageSize = next;
    this.saveCustomization();
    this.notify();
  }

  public setAccentColor(accent: AccentColor): void {
    this.customization.accentColor = accent;
    const theme = this.customization.theme;
    if (this.customization.themeOverrides?.[theme]?.accentPrimary) {
      const nextTheme = { ...this.customization.themeOverrides[theme] };
      delete nextTheme.accentPrimary;
      this.customization.themeOverrides = {
        ...this.customization.themeOverrides,
        [theme]: nextTheme,
      };
    }
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.notify();
  }

  public toggleSidebar(): void {
    this.customization.sidebarCollapsed = !this.customization.sidebarCollapsed;
    this.saveCustomization();
    this.notify();
  }

  private getGroupForView(view: ActiveView): string {
    if (
      view === 'dashboard' ||
      view === 'projects' ||
      view === 'project-detail' ||
      view === 'requirements' ||
      view === 'requirement-detail' ||
      view === 'project-chat' ||
      view === 'knowledge-base' ||
      view === 'documents' ||
      view === 'task-detail' ||
      view === 'kanban' ||
      view === 'gantt' ||
      view === 'time-tracking' ||
      view === 'expenses'
    ) {
      return 'workspace';
    }
    if (view === 'grid' || view === 'calendar' || view === 'analytics') return 'views';
    if (
      view === 'companies' ||
      view === 'company-detail' ||
      view === 'employees' ||
      view === 'employee-detail' ||
      view === 'counterparties' ||
      view === 'counterparty-detail' ||
      view === 'contracts' ||
      view === 'contract-detail' ||
      view === 'calculations' ||
      view === 'calculation-detail' ||
      view === 'payments'
    ) {
      return 'directory';
    }
    return 'system';
  }

  public setSidebarGroupMode(mode: SidebarGroupMode): void {
    this.customization.sidebarGroupMode = mode;
    if (mode === 'single') {
      const currentExpanded = this.customization.sidebarExpandedGroups || [];
      const activeGroup = this.getGroupForView(this.activeView);
      if (currentExpanded.includes(activeGroup)) {
        this.customization.sidebarExpandedGroups = [activeGroup];
      } else if (currentExpanded.length > 0) {
        this.customization.sidebarExpandedGroups = [currentExpanded[0]];
      } else {
        this.customization.sidebarExpandedGroups = [activeGroup];
      }
    }
    this.saveCustomization();
    this.notify();
  }

  public toggleSidebarGroup(groupId: string, expanded?: boolean): void {
    const current = this.customization.sidebarExpandedGroups || [];
    const nextExpanded = expanded !== undefined ? expanded : !current.includes(groupId);

    if (this.customization.sidebarGroupMode === 'single') {
      this.customization.sidebarExpandedGroups = nextExpanded ? [groupId] : [];
    } else {
      const set = new Set(current);
      if (nextExpanded) {
        set.add(groupId);
      } else {
        set.delete(groupId);
      }
      this.customization.sidebarExpandedGroups = Array.from(set);
    }

    this.saveCustomization();
    this.notify();
  }

  public toggleActivityPanel(): void {
    this.customization.showActivityPanel = !this.customization.showActivityPanel;
    this.notify();
  }

  public setActiveView(view: ActiveView): void {
    this.activeView = view;
    this.activePage = 1;
    this.expandSidebarGroupFor(view);
    this.notify();
    this.syncHistory(false);
  }

  /** Paginated list views report page changes; push adds a history entry so
   * browser back restores the previous page, replace updates the current entry. */
  public setActivePage(page: number, push: boolean = true): void {
    if (page < 1) return;
    if (this.activePage === page) return;
    this.activePage = page;
    this.notify();
    this.syncHistory(!push);
  }

  private expandSidebarGroupFor(view: ActiveView): void {
    const targetGroup = this.getGroupForView(view);
    const expanded = this.customization.sidebarExpandedGroups || [];
    if (!expanded.includes(targetGroup)) {
      if (this.customization.sidebarGroupMode === 'single') {
        this.customization.sidebarExpandedGroups = [targetGroup];
      } else {
        this.customization.sidebarExpandedGroups = [...expanded, targetGroup];
      }
      this.saveCustomization();
    }
  }

  private currentDetailId(): string | undefined {
    switch (this.activeView) {
      case 'project-detail':
        return this.detailProjectId || undefined;
      case 'company-detail':
        return this.detailCompanyId || undefined;
      case 'contract-detail':
        return this.detailContractId || undefined;
      case 'counterparty-detail':
        return this.detailCounterpartyId || undefined;
      case 'employee-detail':
        return this.detailEmployeeId || undefined;
      case 'task-detail':
        return this.detailTaskId || undefined;
      case 'requirement-detail':
        return this.detailRequirementId || undefined;
      case 'calculation-detail':
        return this.detailCalculationId || undefined;
      case 'project-chat':
        return this.chatProjectId || undefined;
      default:
        return undefined;
    }
  }

  private syncHistory(replace: boolean): void {
    if (this.historyApplying) return;
    const id = this.currentDetailId();
    const page = this.activePage > 1 ? this.activePage : undefined;
    const path = locationToPath(this.activeView, id, page);
    const state = { view: this.activeView, id, page };
    if (location.hash === path) {
      history.replaceState(state, '', path);
      return;
    }
    if (replace) {
      history.replaceState(state, '', path);
    } else {
      history.pushState(state, '', path);
    }
  }

  public applyHistoryLocation(loc: NavLocation): void {
    this.historyApplying = true;
    let view = loc.view;
    const id = loc.id;
    if (view === 'project-detail') {
      if (id && this.projects.some((p) => p.id === id)) this.detailProjectId = id;
      else view = 'projects';
    } else if (view === 'company-detail') {
      if (id && this.companies.some((c) => c.id === id)) this.detailCompanyId = id;
      else view = 'companies';
    } else if (view === 'contract-detail') {
      if (id && this.contracts.some((c) => c.id === id)) this.detailContractId = id;
      else view = 'contracts';
    } else if (view === 'counterparty-detail') {
      if (id && this.counterparties.some((c) => c.id === id)) this.detailCounterpartyId = id;
      else view = 'counterparties';
    } else if (view === 'employee-detail') {
      if (id && this.users.some((u) => u.id === id)) this.detailEmployeeId = id;
      else view = 'employees';
    } else if (view === 'task-detail') {
      if (id && this.tasks.some((t) => t.id === id)) this.detailTaskId = id;
      else view = 'grid';
    } else if (view === 'requirement-detail') {
      if (id && this.requirements.some((r) => r.id === id)) this.detailRequirementId = id;
      else view = 'requirements';
    } else if (view === 'calculation-detail') {
      if (id && this.calculations.some((c) => c.id === id)) this.detailCalculationId = id;
      else view = 'calculations';
    } else if (view === 'project-chat') {
      if (id && this.projects.some((p) => p.id === id)) this.chatProjectId = id;
      else if (!this.chatProjectId) this.chatProjectId = this.projects[0]?.id || '';
    }
    this.activeView = view;
    this.activePage = loc.page ?? 1;
    this.expandSidebarGroupFor(view);
    this.notify();
    this.historyApplying = false;
  }

  public initHistory(): void {
    window.addEventListener('popstate', (e: PopStateEvent) => {
      const st = e.state as { view: ActiveView; id?: string; page?: number } | null;
      const loc = st?.view ? { view: st.view, id: st.id, page: st.page } : pathToLocation(location.hash);
      if (loc) this.applyHistoryLocation(loc);
    });
    const loc = pathToLocation(location.hash);
    if (loc) {
      this.applyHistoryLocation(loc);
    }
    const initId = this.currentDetailId();
    const initPage = this.activePage > 1 ? this.activePage : undefined;
    history.replaceState(
      { view: this.activeView, id: initId, page: initPage },
      '',
      locationToPath(this.activeView, initId, initPage)
    );
  }

  public selectProject(projectId: string): void {
    this.selectedProjectId = projectId;
    this.notify();
  }

  public openProjectDetail(projectId: string): void {
    this.detailProjectId = projectId;
    this.setActiveView('project-detail');
  }

  public openCompanyDetail(companyId: string): void {
    this.detailCompanyId = companyId;
    this.setActiveView('company-detail');
  }

  public openCounterpartyDetail(counterpartyId: string): void {
    this.detailCounterpartyId = counterpartyId;
    this.setActiveView('counterparty-detail');
  }

  public openEmployeeDetail(employeeId: string): void {
    this.detailEmployeeId = employeeId;
    this.setActiveView('employee-detail');
  }

  public openTaskDetail(taskId: string): void {
    this.detailTaskId = taskId;
    this.setActiveView('task-detail');
  }

  public openRequirements(projectId?: string): void {
    if (projectId !== undefined) {
      this.requirementFilterProjectId = projectId || 'all';
    }
    this.setActiveView('requirements');
  }

  public openRequirementDetail(requirementId: string): void {
    this.detailRequirementId = requirementId;
    this.setActiveView('requirement-detail');
  }

  public openProjectChat(projectId?: string): void {
    if (projectId) {
      this.chatProjectId = projectId;
    } else if (!this.chatProjectId) {
      this.chatProjectId =
        this.selectedProjectId !== 'all'
          ? this.selectedProjectId
          : this.projects[0]?.id || '';
    }
    this.setActiveView('project-chat');
  }

  public openDocuments(options?: {
    scope?: 'all' | DocumentScope;
    companyId?: string;
    projectId?: string;
  }): void {
    if (options) {
      this.documentFilterScope =
        options.scope ?? (options.projectId ? 'project' : options.companyId ? 'company' : 'all');
      this.documentFilterCompanyId = options.companyId || 'all';
      this.documentFilterProjectId = options.projectId || 'all';
    }
    this.setActiveView('documents');
  }

  public openKnowledgeBase(options?: {
    scope?: 'all' | KnowledgeScope;
    projectId?: string;
    companyId?: string;
    articleId?: string;
  }): void {
    if (options) {
      this.knowledgeFilterScope = options.scope ?? (options.projectId ? 'project' : options.companyId ? 'company' : 'all');
      this.knowledgeFilterProjectId = options.projectId || 'all';
      this.knowledgeFilterCompanyId = options.companyId || 'all';
      if (options.articleId) {
        this.detailKnowledgeId = options.articleId;
      } else {
        const match = this.knowledgeArticles.find((a) => {
          if (this.knowledgeFilterProjectId !== 'all' && a.projectId !== this.knowledgeFilterProjectId) return false;
          if (this.knowledgeFilterCompanyId !== 'all' && a.companyId !== this.knowledgeFilterCompanyId) return false;
          if (this.knowledgeFilterScope !== 'all' && a.scope !== this.knowledgeFilterScope) return false;
          return true;
        });
        if (match) this.detailKnowledgeId = match.id;
      }
    }
    this.setActiveView('knowledge-base');
  }

  public setCurrentUser(userId: string): void {
    if (!this.users.some((u) => u.id === userId)) return;
    this.currentUserId = userId;
    this.notify();
  }

  public openContractDetail(
    contractId: string,
    initialModal: boolean | 'invoice' | 'calculation' = false
  ): void {
    this.detailContractId = contractId;
    this.pendingInvoiceForContractId =
      initialModal === true || initialModal === 'invoice' ? contractId : null;
    this.pendingCalculationForContractId = initialModal === 'calculation' ? contractId : null;
    this.setActiveView('contract-detail');
  }

  public openCalculationDetail(calculationId: string): void {
    this.detailCalculationId = calculationId;
    this.setActiveView('calculation-detail');
  }

  public consumePendingInvoiceModal(contractId: string): boolean {
    if (this.pendingInvoiceForContractId === contractId) {
      this.pendingInvoiceForContractId = null;
      return true;
    }
    return false;
  }

  public consumePendingCalculationModal(contractId: string): boolean {
    if (this.pendingCalculationForContractId === contractId) {
      this.pendingCalculationForContractId = null;
      return true;
    }
    return false;
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
    if (newTask.knowledgeArticleIds?.length) {
      this.syncKnowledgeLinkedTasks(newTask.id, newTask.knowledgeArticleIds);
    }
    this.logActivity('create', 'task', newTask.title, `Создана в проекте ${project?.name || ''}`, newTask.id);
    this.addNotification('success', 'Успешно', `Задача "${newTask.title}" создана`);
    this.notify();
    return newTask;
  }

  public updateTask(updated: Task): void {
    const old = this.tasks.find((t) => t.id === updated.id);
    this.tasks = this.tasks.map((t) => (t.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : t));
    this.saveTasks();
    if (updated.knowledgeArticleIds?.length) {
      this.syncKnowledgeLinkedTasks(updated.id, updated.knowledgeArticleIds);
    }

    if (old && old.status !== updated.status) {
      this.logActivity('status_change', 'task', updated.title, `Статус изменен с ${old.status} на ${updated.status}`, updated.id);
    } else if (old && old.priority !== updated.priority) {
      this.logActivity('priority_change', 'task', updated.title, `Приоритет изменен с ${old.priority} на ${updated.priority}`, updated.id);
    } else {
      this.logActivity('update', 'task', updated.title, 'Обновлены данные задачи', updated.id);
    }

    this.addNotification('info', 'Обновлено', `Задача "${updated.title}" сохранена`);
    this.notify();
  }

  public deleteTask(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.tasks = this.tasks.filter((t) => t.id !== taskId);
    this.saveTasks();
    this.logActivity('delete', 'task', task.title, 'Удалена пользователем', task.id);
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

    this.logActivity('status_change', 'task', task.title, `Перемещено: ${oldStatus} → ${newStatus}`, task.id);
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

  // --- Company CRUD ---
  public addCompany(data: Omit<Company, 'id'>): Company {
    const company: Company = {
      ...data,
      id: `comp-${Date.now()}`,
    };
    this.companies = [company, ...this.companies];
    this.saveCompanies();
    this.logActivity('create', 'company', company.name, 'Добавлена компания');
    this.addNotification('success', 'Компания добавлена', company.name);
    this.notify();
    return company;
  }

  public updateCompany(updated: Company): void {
    this.companies = this.companies.map((c) => (c.id === updated.id ? { ...updated } : c));
    this.saveCompanies();
    this.logActivity('update', 'company', updated.name, 'Обновлены реквизиты компании');
    this.addNotification('info', 'Компания обновлена', updated.name);
    this.notify();
  }

  public deleteCompany(id: string): void {
    const target = this.companies.find((c) => c.id === id);
    if (!target) return;
    this.companies = this.companies.filter((c) => c.id !== id);
    if (this.detailCompanyId === id) {
      this.detailCompanyId = this.companies[0]?.id || '';
      if (this.activeView === 'company-detail') {
        this.activeView = 'companies';
        this.syncHistory(true);
      }
    }
    this.saveCompanies();
    this.logActivity('delete', 'company', target.name, 'Компания удалена');
    this.addNotification('warning', 'Удалено', `Компания "${target.name}" удалена`);
    this.notify();
  }

  // --- Employee CRUD ---
  public addEmployee(data: Omit<User, 'id' | 'avatar'> & { avatar?: string }): User {
    const initials = data.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'EM';
    const employee: User = {
      ...data,
      id: `user-${Date.now()}`,
      avatar: data.avatar || initials,
    };
    this.users = [employee, ...this.users];
    this.saveEmployees();
    this.logActivity('create', 'employee', employee.name, `Должность: ${employee.role}`);
    this.addNotification('success', 'Сотрудник добавлен', employee.name);
    this.notify();
    return employee;
  }

  public updateEmployee(updated: User): void {
    const initials = updated.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || updated.avatar;
    this.users = this.users.map((u) =>
      u.id === updated.id ? { ...updated, avatar: updated.avatar || initials } : u
    );
    this.saveEmployees();
    this.logActivity('update', 'employee', updated.name, 'Обновлён профиль сотрудника');
    this.addNotification('info', 'Сотрудник обновлён', updated.name);
    this.notify();
  }

  public deleteEmployee(id: string): void {
    const target = this.users.find((u) => u.id === id);
    if (!target) return;
    this.users = this.users.filter((u) => u.id !== id);
    this.projects = this.projects.map((p) => ({
      ...p,
      members: (p.members || []).filter((m) => m.userId !== id),
    }));
    if (this.detailEmployeeId === id) {
      this.detailEmployeeId = this.users[0]?.id || '';
      if (this.activeView === 'employee-detail') {
        this.activeView = 'employees';
        this.syncHistory(true);
      }
    }
    if (this.currentUserId === id) {
      this.currentUserId = this.users[0]?.id || '';
    }
    this.saveEmployees();
    this.saveProjects();
    this.logActivity('delete', 'employee', target.name, 'Сотрудник удалён');
    this.addNotification('warning', 'Удалено', `Сотрудник "${target.name}" удалён`);
    this.notify();
  }

  // --- Counterparty CRUD ---
  private syncPrimaryContactFields<T extends Omit<Counterparty, 'id'>>(data: T): T {
    const contacts = Array.isArray(data.contacts) ? data.contacts.map((c) => ({ ...c })) : [];
    if (contacts.length > 0 && !contacts.some((c) => c.isPrimary)) {
      contacts[0] = { ...contacts[0], isPrimary: true };
    }
    const primary = contacts.find((c) => c.isPrimary) || contacts[0];
    if (!primary) {
      return {
        ...data,
        contacts,
        contactPerson: data.contactPerson || '—',
        phone: data.phone || '—',
        email: data.email || '—',
      };
    }
    return {
      ...data,
      contacts,
      contactPerson: primary.fullName || data.contactPerson || '—',
      phone: primary.phone || primary.additionalPhone || (data.phone && data.phone !== '—' ? data.phone : '—'),
      email: primary.email || (data.email && data.email !== '—' ? data.email : '—'),
    };
  }

  public addCounterparty(data: Omit<Counterparty, 'id'>): Counterparty {
    const normalized = this.syncPrimaryContactFields(data);
    const cp: Counterparty = {
      ...normalized,
      id: `cp-${Date.now()}`,
    };
    this.counterparties = [cp, ...this.counterparties];
    this.saveCounterparties();
    this.logActivity('create', 'counterparty', cp.name, 'Добавлен контрагент');
    this.addNotification('success', 'Контрагент добавлен', cp.name);
    this.notify();
    return cp;
  }

  public updateCounterparty(updated: Counterparty): void {
    const normalized = this.syncPrimaryContactFields(updated);
    this.counterparties = this.counterparties.map((c) =>
      c.id === updated.id ? { ...normalized, id: updated.id } : c
    );
    this.saveCounterparties();
    this.logActivity('update', 'counterparty', updated.name, 'Обновлена карточка контрагента');
    this.addNotification('info', 'Контрагент обновлён', updated.name);
    this.notify();
  }

  public deleteCounterparty(id: string): void {
    const target = this.counterparties.find((c) => c.id === id);
    if (!target) return;
    this.counterparties = this.counterparties.filter((c) => c.id !== id);
    if (this.detailCounterpartyId === id) {
      this.detailCounterpartyId = this.counterparties[0]?.id || '';
      if (this.activeView === 'counterparty-detail') {
        this.activeView = 'counterparties';
        this.syncHistory(true);
      }
    }
    this.saveCounterparties();
    this.logActivity('delete', 'counterparty', target.name, 'Контрагент удалён');
    this.addNotification('warning', 'Удалено', `Контрагент "${target.name}" удалён`);
    this.notify();
  }

  // --- Contract CRUD ---
  public addContract(data: Omit<Contract, 'id'>): Contract {
    const contract: Contract = {
      ...data,
      id: `ctr-${Date.now()}`,
    };
    this.contracts = [contract, ...this.contracts];
    this.saveContracts();
    this.logActivity('create', 'contract', `${contract.number} — ${contract.title}`, 'Создан договор');
    this.addNotification('success', 'Договор создан', contract.number);
    this.notify();
    return contract;
  }

  public updateContract(updated: Contract): void {
    this.contracts = this.contracts.map((c) => (c.id === updated.id ? { ...updated } : c));
    this.saveContracts();
    this.logActivity('update', 'contract', `${updated.number} — ${updated.title}`, 'Обновлён договор');
    this.addNotification('info', 'Договор обновлён', updated.number);
    this.notify();
  }

  public deleteContract(id: string): void {
    const target = this.contracts.find((c) => c.id === id);
    if (!target) return;
    this.contracts = this.contracts.filter((c) => c.id !== id);
    if (this.detailContractId === id) {
      this.detailContractId = this.contracts[0]?.id || '';
      if (this.activeView === 'contract-detail') {
        this.activeView = 'contracts';
        this.syncHistory(true);
      }
    }
    this.saveContracts();
    this.logActivity('delete', 'contract', `${target.number} — ${target.title}`, 'Договор удалён');
    this.addNotification('warning', 'Удалено', `Договор ${target.number} удалён`);
    this.notify();
  }

  // --- Calculation CRUD ---
  public addCalculation(data: Omit<Calculation, 'id' | 'createdAt'>): Calculation {
    const calc: Calculation = {
      ...data,
      id: `calc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    this.calculations = [calc, ...this.calculations];
    this.saveCalculations();
    const sym = calc.currency === 'USD' ? '$' : calc.currency === 'EUR' ? '€' : '₽';
    this.logActivity(
      'create',
      'calculation',
      calc.number,
      `Сформирована калькуляция (${calc.periodStart} → ${calc.periodEnd}, ${calc.billableAmount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym})`
    );
    this.addNotification('success', 'Калькуляция сформирована', calc.number);
    this.notify();
    return calc;
  }

  public updateCalculation(updated: Calculation): void {
    this.calculations = this.calculations.map((c) => (c.id === updated.id ? { ...updated } : c));
    this.saveCalculations();
    const sym = updated.currency === 'USD' ? '$' : updated.currency === 'EUR' ? '€' : '₽';
    this.logActivity(
      'update',
      'calculation',
      updated.number,
      `Обновлена калькуляция (${updated.status}, ${updated.billableAmount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym})`
    );
    this.addNotification('info', 'Калькуляция обновлена', updated.number);
    this.notify();
  }

  public updateCalculationStatus(id: string, status: CalculationStatus): void {
    const existing = this.calculations.find((c) => c.id === id);
    if (!existing) return;
    const approvedDate =
      status === 'approved'
        ? existing.approvedDate || new Date().toISOString().slice(0, 10)
        : status === 'draft' || status === 'rejected'
        ? undefined
        : existing.approvedDate;
    const updated: Calculation = { ...existing, status, approvedDate };
    this.calculations = this.calculations.map((c) => (c.id === id ? updated : c));
    this.saveCalculations();
    this.logActivity(
      'status_change',
      'calculation',
      updated.number,
      `Статус калькуляции изменён на ${status}`
    );
    this.addNotification(
      status === 'approved' ? 'success' : status === 'rejected' ? 'warning' : 'info',
      'Статус калькуляции обновлён',
      `${updated.number} → ${status}`
    );
    this.notify();
  }

  public deleteCalculation(id: string): void {
    const target = this.calculations.find((c) => c.id === id);
    if (!target) return;
    this.calculations = this.calculations.filter((c) => c.id !== id);
    this.saveCalculations();
    this.logActivity('delete', 'calculation', target.number, 'Калькуляция удалена');
    this.addNotification('warning', 'Калькуляция удалена', target.number);
    this.notify();
  }

  // --- Invoice CRUD ---
  public addInvoice(data: Omit<Invoice, 'id' | 'createdAt'>): Invoice {
    const invoice: Invoice = {
      ...data,
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    this.invoices = [invoice, ...this.invoices];
    this.saveInvoices();

    if (invoice.calculationId) {
      let linkedChanged = false;
      this.calculations = this.calculations.map((c) => {
        if (c.id !== invoice.calculationId) return c;
        linkedChanged = true;
        return {
          ...c,
          status: 'invoiced',
          invoiceId: invoice.id,
          approvedDate: c.approvedDate || new Date().toISOString().slice(0, 10),
        };
      });
      if (linkedChanged) {
        this.saveCalculations();
      }
    }

    const sym = invoice.currency === 'USD' ? '$' : invoice.currency === 'EUR' ? '€' : '₽';
    this.logActivity(
      'create',
      'invoice',
      `${invoice.number}`,
      `Выставлен счёт на сумму ${invoice.totalAmount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`
    );
    this.addNotification(
      'success',
      'Счёт создан',
      `${invoice.number} на ${invoice.totalAmount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`
    );
    this.notify();
    return invoice;
  }

  public updateInvoice(updated: Invoice): void {
    this.invoices = this.invoices.map((inv) => (inv.id === updated.id ? { ...updated } : inv));
    this.saveInvoices();
    if (updated.calculationId) {
      let linkedChanged = false;
      this.calculations = this.calculations.map((c) => {
        if (c.id !== updated.calculationId) return c;
        linkedChanged = true;
        return { ...c, status: 'invoiced', invoiceId: updated.id };
      });
      if (linkedChanged) {
        this.saveCalculations();
      }
    }
    const sym = updated.currency === 'USD' ? '$' : updated.currency === 'EUR' ? '€' : '₽';
    this.logActivity(
      'update',
      'invoice',
      updated.number,
      `Обновлён счёт (${updated.status}, ${updated.totalAmount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym})`
    );
    this.addNotification('info', 'Счёт обновлён', updated.number);
    this.notify();
  }

  public updateInvoiceStatus(id: string, status: InvoiceStatus): void {
    const existing = this.invoices.find((inv) => inv.id === id);
    if (!existing) return;
    const today = new Date().toISOString().slice(0, 10);

    if (status === 'paid') {
      const remaining = this.getInvoiceRemainingAmount(existing);
      if (remaining > 0) {
        this.addInvoicePayment({
          invoiceId: existing.id,
          contractId: existing.contractId,
          companyId: existing.companyId,
          counterpartyId: existing.counterpartyId,
          amount: remaining,
          currency: existing.currency,
          paymentDate: today,
          method: 'bank_transfer',
          documentNumber: `ПП-${today.slice(0, 4)}/AUTO-${existing.number.slice(-3)}`,
          notes: `Полная оплата счёта ${existing.number}`,
        });
        return;
      }
    }

    const paidDate =
      status === 'paid'
        ? existing.paidDate || today
        : status === 'cancelled' || status === 'draft'
        ? undefined
        : existing.paidDate;
    const updated: Invoice = { ...existing, status, paidDate };
    this.invoices = this.invoices.map((inv) => (inv.id === id ? updated : inv));
    this.saveInvoices();
    this.logActivity('status_change', 'invoice', updated.number, `Статус счёта изменён на ${status}`);
    this.addNotification(
      status === 'paid' ? 'success' : 'info',
      'Статус счёта обновлён',
      `${updated.number} → ${status}`
    );
    this.notify();
  }

  public deleteInvoice(id: string): void {
    const target = this.invoices.find((inv) => inv.id === id);
    if (!target) return;
    this.invoices = this.invoices.filter((inv) => inv.id !== id);
    this.saveInvoices();

    const hadPayments = this.payments.some((p) => p.invoiceId === id);
    if (hadPayments) {
      this.payments = this.payments.filter((p) => p.invoiceId !== id);
      this.savePayments();
    }

    if (target.calculationId) {
      let linkedChanged = false;
      this.calculations = this.calculations.map((c) => {
        if (c.id !== target.calculationId) return c;
        linkedChanged = true;
        return {
          ...c,
          invoiceId: undefined,
          status: c.status === 'invoiced' ? 'approved' : c.status,
        };
      });
      if (linkedChanged) {
        this.saveCalculations();
      }
    }

    this.logActivity('delete', 'invoice', target.number, 'Счёт удалён');
    this.addNotification('warning', 'Счёт удалён', target.number);
    this.notify();
  }

  // --- Invoice Payments & Due-Date Control ---
  public getInvoicePayments(invoiceId: string): InvoicePayment[] {
    return this.payments
      .filter((p) => p.invoiceId === invoiceId)
      .sort((a, b) => (b.paymentDate + b.createdAt).localeCompare(a.paymentDate + a.createdAt));
  }

  public getInvoicePaidAmount(invoiceId: string): number {
    const sum = this.payments
      .filter((p) => p.invoiceId === invoiceId)
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    return Math.round(sum * 100) / 100;
  }

  public getInvoiceRemainingAmount(invoice: Invoice): number {
    if (invoice.status === 'cancelled') return 0;
    const paid = this.getInvoicePaidAmount(invoice.id);
    return Math.max(0, Math.round((invoice.totalAmount - paid) * 100) / 100);
  }

  public getInvoiceDueControl(invoice: Invoice): {
    state: 'paid' | 'overdue' | 'due_soon' | 'on_track' | 'draft' | 'cancelled';
    daysDelta: number;
  } {
    if (invoice.status === 'cancelled') return { state: 'cancelled', daysDelta: 0 };
    if (invoice.status === 'draft') return { state: 'draft', daysDelta: 0 };

    const toDayMs = (iso: string): number | null => {
      if (!iso) return null;
      const parts = iso.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return null;
      return Date.UTC(parts[0], parts[1] - 1, parts[2]);
    };

    const dueMs = toDayMs(invoice.dueDate);
    const paid = this.getInvoicePaidAmount(invoice.id);
    if (invoice.status === 'paid' || (invoice.totalAmount > 0 && paid >= invoice.totalAmount)) {
      const paidMs = toDayMs(invoice.paidDate || '');
      const delta = dueMs !== null && paidMs !== null ? Math.round((dueMs - paidMs) / 86400000) : 0;
      return { state: 'paid', daysDelta: delta };
    }

    const now = new Date();
    const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    if (dueMs === null) return { state: 'on_track', daysDelta: 0 };

    const daysLeft = Math.round((dueMs - todayMs) / 86400000);
    if (daysLeft < 0) return { state: 'overdue', daysDelta: Math.abs(daysLeft) };
    if (daysLeft <= 5) return { state: 'due_soon', daysDelta: daysLeft };
    return { state: 'on_track', daysDelta: daysLeft };
  }

  public syncOverdueInvoices(shouldNotify = true): number {
    const today = new Date().toISOString().slice(0, 10);
    let count = 0;
    this.invoices = this.invoices.map((inv) => {
      if (inv.status !== 'issued' && inv.status !== 'sent') return inv;
      const remaining = this.getInvoiceRemainingAmount(inv);
      if (inv.dueDate && inv.dueDate < today && remaining > 0) {
        count += 1;
        return { ...inv, status: 'overdue' as InvoiceStatus };
      }
      return inv;
    });
    if (count > 0) {
      this.saveInvoices();
      if (shouldNotify) {
        this.notify();
      }
    }
    return count;
  }

  private reconcileInvoiceAfterPayments(
    invoiceId: string,
    preferredStatusOnZero: InvoiceStatus = 'sent'
  ): void {
    const inv = this.invoices.find((i) => i.id === invoiceId);
    if (!inv || inv.status === 'cancelled') return;

    const invPayments = this.getInvoicePayments(invoiceId);
    const paid = this.getInvoicePaidAmount(invoiceId);
    const today = new Date().toISOString().slice(0, 10);

    let nextStatus: InvoiceStatus = inv.status;
    let nextPaidDate: string | undefined = inv.paidDate;

    if (inv.totalAmount > 0 && paid >= inv.totalAmount) {
      nextStatus = 'paid';
      nextPaidDate = invPayments[0]?.paymentDate || inv.paidDate || today;
    } else if (paid > 0) {
      nextStatus = 'partially_paid';
      nextPaidDate = undefined;
    } else {
      nextPaidDate = undefined;
      if (inv.status === 'paid' || inv.status === 'partially_paid') {
        nextStatus = inv.dueDate && inv.dueDate < today ? 'overdue' : preferredStatusOnZero;
      }
    }

    if (nextStatus !== inv.status || nextPaidDate !== inv.paidDate) {
      this.invoices = this.invoices.map((i) =>
        i.id === invoiceId ? { ...i, status: nextStatus, paidDate: nextPaidDate } : i
      );
      this.saveInvoices();
    }
  }

  public addInvoicePayment(data: Omit<InvoicePayment, 'id' | 'createdAt'>): InvoicePayment {
    const amount = Math.max(0.01, Math.round((Number(data.amount) || 0) * 100) / 100);
    const payment: InvoicePayment = {
      ...data,
      amount,
      documentNumber: data.documentNumber.trim(),
      notes: data.notes.trim(),
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    this.payments = [payment, ...this.payments];
    this.savePayments();
    this.reconcileInvoiceAfterPayments(payment.invoiceId);

    const inv = this.invoices.find((i) => i.id === payment.invoiceId);
    const sym = payment.currency === 'USD' ? '$' : payment.currency === 'EUR' ? '€' : '₽';
    const isFull = inv ? inv.status === 'paid' : false;
    this.logActivity(
      'create',
      'payment',
      inv ? `${inv.number}${payment.documentNumber ? ` · ${payment.documentNumber}` : ''}` : payment.invoiceId,
      `${isFull ? 'Полная оплата' : 'Частичный платёж'}: ${payment.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`
    );
    this.addNotification(
      'success',
      isFull ? 'Счёт полностью оплачен' : 'Платёж зафиксирован',
      `${inv?.number || ''} — ${payment.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`
    );
    this.notify();
    return payment;
  }

  public deleteInvoicePayment(paymentId: string): void {
    const target = this.payments.find((p) => p.id === paymentId);
    if (!target) return;
    this.payments = this.payments.filter((p) => p.id !== paymentId);
    this.savePayments();
    this.reconcileInvoiceAfterPayments(target.invoiceId, 'sent');

    const inv = this.invoices.find((i) => i.id === target.invoiceId);
    const sym = target.currency === 'USD' ? '$' : target.currency === 'EUR' ? '€' : '₽';
    this.logActivity(
      'delete',
      'payment',
      inv ? `${inv.number}${target.documentNumber ? ` · ${target.documentNumber}` : ''}` : target.invoiceId,
      `Удалён платёж на ${target.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`
    );
    this.addNotification('warning', 'Платёж удалён', `${target.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`);
    this.notify();
  }

  // --- Project & Project Members CRUD ---
  public addProject(data: Omit<Project, 'id'>): Project {
    const project: Project = {
      ...data,
      id: `proj-${Date.now()}`,
      members: data.members ? [...data.members] : [],
    };
    this.projects = [project, ...this.projects];
    this.saveProjects();
    this.logActivity('create', 'project', project.name, `Ключ: ${project.key}`);
    this.addNotification('success', 'Проект создан', project.name);
    this.notify();
    return project;
  }

  public updateProject(updated: Project): void {
    this.projects = this.projects.map((p) => (p.id === updated.id ? { ...updated } : p));
    this.saveProjects();
    this.logActivity('update', 'project', updated.name, 'Обновлены параметры проекта');
    this.addNotification('info', 'Проект обновлён', updated.name);
    this.notify();
  }

  public deleteProject(id: string): void {
    const target = this.projects.find((p) => p.id === id);
    if (!target) return;
    this.projects = this.projects.filter((p) => p.id !== id);
    if (this.selectedProjectId === id) {
      this.selectedProjectId = 'all';
    }
    if (this.detailProjectId === id) {
      this.detailProjectId = this.projects[0]?.id || '';
      if (this.activeView === 'project-detail') {
        this.activeView = 'projects';
        this.syncHistory(true);
      }
    }
    const prevReqLen = this.requirements.length;
    this.requirements = this.requirements.filter((r) => r.projectId !== id);
    if (this.requirements.length !== prevReqLen) {
      this.saveRequirements();
    }
    this.saveProjects();
    this.logActivity('delete', 'project', target.name, 'Проект удалён');
    this.addNotification('warning', 'Удалено', `Проект "${target.name}" удалён`);
    this.notify();
  }

  public addProjectMember(projectId: string, member: ProjectMember): void {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;
    const existing = project.members || [];
    const filtered = existing.filter((m) => !(m.userId === member.userId && m.role === member.role));
    const nextMembers = [...filtered, member];
    this.projects = this.projects.map((p) =>
      p.id === projectId ? { ...p, members: nextMembers } : p
    );
    this.saveProjects();
    const user = this.users.find((u) => u.id === member.userId);
    this.logActivity(
      'update',
      'project',
      project.name,
      `Назначен участник ${user?.name || member.userId} (${member.role})`
    );
    this.addNotification('success', 'Участник добавлен', `${user?.name || ''} добавлен в проект`);
    this.notify();
  }

  public updateProjectMemberRole(
    projectId: string,
    userId: string,
    oldRole: ProjectRole,
    newRole: ProjectRole,
    allocation?: number
  ): void {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;
    const nextMembers = (project.members || []).map((m) =>
      m.userId === userId && m.role === oldRole
        ? { ...m, role: newRole, allocation: allocation ?? m.allocation }
        : m
    );
    this.projects = this.projects.map((p) =>
      p.id === projectId ? { ...p, members: nextMembers } : p
    );
    this.saveProjects();
    this.logActivity('update', 'project', project.name, `Изменена роль участника на ${newRole}`);
    this.notify();
  }

  public removeProjectMember(projectId: string, userId: string, role: ProjectRole): void {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;
    const nextMembers = (project.members || []).filter(
      (m) => !(m.userId === userId && m.role === role)
    );
    this.projects = this.projects.map((p) =>
      p.id === projectId ? { ...p, members: nextMembers } : p
    );
    this.saveProjects();
    const user = this.users.find((u) => u.id === userId);
    this.logActivity('update', 'project', project.name, `Удалён участник ${user?.name || userId}`);
    this.notify();
  }

  // --- Time Entries CRUD ---
  private adjustTaskLoggedHours(taskId: string, deltaHours: number): void {
    if (!taskId || !deltaHours) return;
    let changed = false;
    this.tasks = this.tasks.map((t) => {
      if (t.id !== taskId) return t;
      changed = true;
      const nextHours = Math.max(0, Math.round(((t.loggedHours || 0) + deltaHours) * 100) / 100);
      return {
        ...t,
        loggedHours: nextHours,
        updatedAt: new Date().toISOString(),
      };
    });
    if (changed) {
      this.saveTasks();
    }
  }

  public addTimeEntry(data: Omit<TimeEntry, 'id' | 'createdAt'>): TimeEntry {
    const hours = Math.max(0.25, Math.round((Number(data.hours) || 0) * 100) / 100);
    const entry: TimeEntry = {
      ...data,
      hours,
      id: `te-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    this.timeEntries = [entry, ...this.timeEntries];
    this.saveTimeEntries();
    this.adjustTaskLoggedHours(entry.taskId, entry.hours);

    const task = this.tasks.find((t) => t.id === entry.taskId);
    const user = this.users.find((u) => u.id === entry.userId);
    const targetTitle = task ? `${task.id} · ${task.title}` : entry.taskId;
    this.logActivity(
      'create',
      'time_entry',
      targetTitle,
      `Списано ${entry.hours} ч (${user?.name || entry.userId})`,
      entry.taskId
    );
    this.addNotification('success', 'Время списано', `${entry.hours} ч по задаче ${entry.taskId}`);
    this.notify();
    return entry;
  }

  public updateTimeEntry(updated: TimeEntry): void {
    const old = this.timeEntries.find((e) => e.id === updated.id);
    const nextHours = Math.max(0.25, Math.round((Number(updated.hours) || 0) * 100) / 100);
    const normalized: TimeEntry = { ...updated, hours: nextHours };

    this.timeEntries = this.timeEntries.map((e) => (e.id === normalized.id ? normalized : e));
    this.saveTimeEntries();

    if (old) {
      if (old.taskId === normalized.taskId) {
        const delta = normalized.hours - old.hours;
        if (delta !== 0) {
          this.adjustTaskLoggedHours(normalized.taskId, delta);
        }
      } else {
        this.adjustTaskLoggedHours(old.taskId, -old.hours);
        this.adjustTaskLoggedHours(normalized.taskId, normalized.hours);
      }
    }

    const task = this.tasks.find((t) => t.id === normalized.taskId);
    this.logActivity(
      'update',
      'time_entry',
      task ? `${task.id} · ${task.title}` : normalized.taskId,
      `Обновлена запись: ${normalized.hours} ч (${normalized.status})`,
      normalized.taskId
    );
    this.addNotification('info', 'Запись обновлена', `${normalized.hours} ч по ${normalized.taskId}`);
    this.notify();
  }

  public deleteTimeEntry(id: string): void {
    const target = this.timeEntries.find((e) => e.id === id);
    if (!target) return;
    this.timeEntries = this.timeEntries.filter((e) => e.id !== id);
    this.saveTimeEntries();
    this.adjustTaskLoggedHours(target.taskId, -target.hours);

    const task = this.tasks.find((t) => t.id === target.taskId);
    this.logActivity(
      'delete',
      'time_entry',
      task ? `${task.id} · ${task.title}` : target.taskId,
      `Удалена запись о времени (${target.hours} ч)`,
      target.taskId
    );
    this.addNotification('warning', 'Запись удалена', `Удалено ${target.hours} ч по ${target.taskId}`);
    this.notify();
  }

  // --- Expenses CRUD ---
  public addExpense(data: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const amount = Math.max(0, Math.round((Number(data.amount) || 0) * 100) / 100);
    const expense: Expense = {
      ...data,
      amount,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    this.expenses = [expense, ...this.expenses];
    this.saveExpenses();

    const proj = this.projects.find((p) => p.id === expense.projectId);
    const symbol = expense.currency === 'USD' ? '$' : expense.currency === 'EUR' ? '€' : '₽';
    this.logActivity(
      'create',
      'expense',
      expense.title,
      `${expense.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${symbol} · ${proj?.key || expense.projectId}${
        expense.taskId ? ` (${expense.taskId})` : ''
      }`,
      expense.taskId
    );
    this.addNotification('success', 'Расход добавлен', `${expense.title} — ${expense.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${symbol}`);
    this.notify();
    return expense;
  }

  public updateExpense(updated: Expense): void {
    const amount = Math.max(0, Math.round((Number(updated.amount) || 0) * 100) / 100);
    const normalized: Expense = { ...updated, amount };
    this.expenses = this.expenses.map((e) => (e.id === normalized.id ? normalized : e));
    this.saveExpenses();

    const symbol = normalized.currency === 'USD' ? '$' : normalized.currency === 'EUR' ? '€' : '₽';
    this.logActivity(
      'update',
      'expense',
      normalized.title,
      `Статус: ${normalized.status}, сумма: ${normalized.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${symbol}`,
      normalized.taskId
    );
    this.addNotification('info', 'Расход обновлён', normalized.title);
    this.notify();
  }

  public deleteExpense(id: string): void {
    const target = this.expenses.find((e) => e.id === id);
    if (!target) return;
    this.expenses = this.expenses.filter((e) => e.id !== id);
    this.saveExpenses();
    this.logActivity('delete', 'expense', target.title, 'Запись о расходе удалена', target.taskId);
    this.addNotification('warning', 'Расход удалён', target.title);
    this.notify();
  }

  // --- Project Chat CRUD ---
  public addChatMessage(data: {
    projectId: string;
    senderId?: string;
    text: string;
    replyToId?: string;
    taskRefId?: string;
  }): ProjectChatMessage {
    const senderId = data.senderId || this.currentUserId || this.users[0]?.id || '';
    const latestChannelMs = this.chatMessages
      .filter((m) => m.projectId === data.projectId)
      .reduce((max, m) => Math.max(max, Date.parse(m.createdAt) || 0), 0);
    const createdMs = Math.max(Date.now(), latestChannelMs + 1000);
    const msg: ProjectChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      projectId: data.projectId,
      senderId,
      text: data.text.trim(),
      replyToId: data.replyToId || undefined,
      taskRefId: data.taskRefId || undefined,
      pinned: false,
      reactions: [],
      createdAt: new Date(createdMs).toISOString(),
    };
    this.chatMessages = [...this.chatMessages, msg];
    this.saveChatMessages();

    const proj = this.projects.find((p) => p.id === msg.projectId);
    const sender = this.users.find((u) => u.id === senderId);
    this.logActivity(
      'create',
      'chat',
      proj ? `[${proj.key}] ${proj.name}` : msg.projectId,
      `${sender?.name || senderId}: ${msg.text.slice(0, 60)}`,
      msg.taskRefId
    );
    this.notify();
    return msg;
  }

  public updateChatMessage(id: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.chatMessages = this.chatMessages.map((m) =>
      m.id === id ? { ...m, text: trimmed, editedAt: new Date().toISOString() } : m
    );
    this.saveChatMessages();
    this.notify();
  }

  public togglePinChatMessage(id: string): void {
    this.chatMessages = this.chatMessages.map((m) =>
      m.id === id ? { ...m, pinned: !m.pinned } : m
    );
    this.saveChatMessages();
    this.notify();
  }

  public toggleChatReaction(messageId: string, emoji: string, userId?: string): void {
    const uid = userId || this.currentUserId || this.users[0]?.id || '';
    if (!uid) return;
    this.chatMessages = this.chatMessages.map((m) => {
      if (m.id !== messageId) return m;
      const list = [...(m.reactions || [])];
      const idx = list.findIndex((r) => r.emoji === emoji);
      if (idx === -1) {
        list.push({ emoji, userIds: [uid] });
      } else {
        const entry = list[idx];
        const has = entry.userIds.includes(uid);
        const nextUserIds = has ? entry.userIds.filter((u) => u !== uid) : [...entry.userIds, uid];
        if (nextUserIds.length === 0) {
          list.splice(idx, 1);
        } else {
          list[idx] = { ...entry, userIds: nextUserIds };
        }
      }
      return { ...m, reactions: list };
    });
    this.saveChatMessages();
    this.notify();
  }

  public deleteChatMessage(id: string): void {
    const target = this.chatMessages.find((m) => m.id === id);
    if (!target) return;
    this.chatMessages = this.chatMessages.filter((m) => m.id !== id);
    this.saveChatMessages();
    this.notify();
  }

  // --- Knowledge Base CRUD ---
  public setKnowledgeFilters(filters: {
    scope?: 'all' | KnowledgeScope;
    projectId?: string;
    companyId?: string;
  }): void {
    if (filters.scope !== undefined) this.knowledgeFilterScope = filters.scope;
    if (filters.projectId !== undefined) this.knowledgeFilterProjectId = filters.projectId;
    if (filters.companyId !== undefined) this.knowledgeFilterCompanyId = filters.companyId;
    this.notify();
  }

  public selectKnowledgeArticle(id: string): void {
    if (this.detailKnowledgeId === id) return;
    this.detailKnowledgeId = id;
    this.knowledgeArticles = this.knowledgeArticles.map((a) =>
      a.id === id ? { ...a, viewsCount: (a.viewsCount || 0) + 1 } : a
    );
    this.saveKnowledgeArticles();
    this.notify();
  }

  public addKnowledgeArticle(
    data: Omit<KnowledgeArticle, 'id' | 'viewsCount' | 'helpfulUserIds' | 'revisions' | 'createdAt' | 'updatedAt'> & {
      revisionSummary?: string;
    }
  ): KnowledgeArticle {
    const now = new Date().toISOString();
    const { revisionSummary, ...rest } = data;
    const article: KnowledgeArticle = {
      ...rest,
      id: `kb-${Date.now().toString().slice(-6)}`,
      helpfulUserIds: [],
      viewsCount: 1,
      revisions: [
        {
          id: `rev-${Date.now()}`,
          editedById: data.authorId || this.currentUserId || 'user-1',
          editedAt: now,
          summary: revisionSummary?.trim() || 'Создание документа в базе знаний',
        },
      ],
      createdAt: now,
      updatedAt: now,
      verifiedAt: data.status === 'verified' ? now : undefined,
    };
    this.knowledgeArticles = [article, ...this.knowledgeArticles];
    this.detailKnowledgeId = article.id;
    this.saveKnowledgeArticles();
    this.logActivity('create', 'knowledge', article.title, `Добавлен материал (${article.category})`, article.id);
    this.addNotification('success', 'База знаний', `Статья "${article.title}" опубликована`);
    this.notify();
    return article;
  }

  public updateKnowledgeArticle(updated: KnowledgeArticle, revisionSummary?: string): void {
    const now = new Date().toISOString();
    const editorId = this.currentUserId || updated.authorId || 'user-1';
    const nextRevision = {
      id: `rev-${Date.now()}`,
      editedById: editorId,
      editedAt: now,
      summary: revisionSummary?.trim() || 'Обновление документации и выводов',
    };
    const next: KnowledgeArticle = {
      ...updated,
      updatedAt: now,
      verifiedAt:
        updated.status === 'verified' ? updated.verifiedAt || now : undefined,
      revisions: [nextRevision, ...(updated.revisions || [])].slice(0, 25),
    };
    this.knowledgeArticles = this.knowledgeArticles.map((a) => (a.id === next.id ? next : a));
    this.saveKnowledgeArticles();
    this.logActivity('update', 'knowledge', next.title, nextRevision.summary, next.id);
    this.addNotification('info', 'База знаний', `Статья "${next.title}" обновлена`);
    this.notify();
  }

  public togglePinKnowledgeArticle(id: string): void {
    this.knowledgeArticles = this.knowledgeArticles.map((a) =>
      a.id === id ? { ...a, pinned: !a.pinned } : a
    );
    this.saveKnowledgeArticles();
    this.notify();
  }

  public toggleVerifyKnowledgeArticle(id: string): void {
    const now = new Date().toISOString();
    const target = this.knowledgeArticles.find((a) => a.id === id);
    if (!target) return;
    const isVerified = target.status === 'verified';
    const nextStatus = isVerified ? 'published' : 'verified';
    this.knowledgeArticles = this.knowledgeArticles.map((a) =>
      a.id === id
        ? {
            ...a,
            status: nextStatus,
            reviewerId: a.reviewerId || this.currentUserId || 'user-1',
            verifiedAt: isVerified ? undefined : now,
            updatedAt: now,
          }
        : a
    );
    this.saveKnowledgeArticles();
    this.logActivity(
      'status_change',
      'knowledge',
      target.title,
      isVerified ? 'Снята отметка верификации' : 'Подтверждена актуальность документа',
      target.id
    );
    this.notify();
  }

  public toggleHelpfulKnowledgeArticle(id: string, userId?: string): void {
    const uid = userId || this.currentUserId || this.users[0]?.id || 'user-1';
    this.knowledgeArticles = this.knowledgeArticles.map((a) => {
      if (a.id !== id) return a;
      const exists = a.helpfulUserIds.includes(uid);
      return {
        ...a,
        helpfulUserIds: exists
          ? a.helpfulUserIds.filter((u) => u !== uid)
          : [...a.helpfulUserIds, uid],
      };
    });
    this.saveKnowledgeArticles();
    this.notify();
  }

  public deleteKnowledgeArticle(id: string): void {
    const target = this.knowledgeArticles.find((a) => a.id === id);
    if (!target) return;
    this.knowledgeArticles = this.knowledgeArticles.filter((a) => a.id !== id);
    if (this.detailKnowledgeId === id) {
      this.detailKnowledgeId = this.knowledgeArticles[0]?.id || '';
    }
    this.saveKnowledgeArticles();
    this.logActivity('delete', 'knowledge', target.title, 'Материал удалён из базы знаний', target.id);
    this.addNotification('warning', 'Удалено', `Статья "${target.title}" удалена`);
    this.notify();
  }

  // --- Documents Library CRUD ---
  public setDocumentFilters(filters: {
    scope?: 'all' | DocumentScope;
    companyId?: string;
    projectId?: string;
  }): void {
    if (filters.scope !== undefined) this.documentFilterScope = filters.scope;
    if (filters.companyId !== undefined) this.documentFilterCompanyId = filters.companyId;
    if (filters.projectId !== undefined) this.documentFilterProjectId = filters.projectId;
    this.notify();
  }

  public addDocument(
    data: Omit<DocumentItem, 'id' | 'version' | 'versions' | 'createdAt' | 'updatedAt'> & {
      versionNote?: string;
    }
  ): DocumentItem {
    const now = new Date().toISOString();
    const { versionNote, ...rest } = data;
    const uploaderId = data.uploadedById || this.currentUserId || this.users[0]?.id || 'user-1';
    const doc: DocumentItem = {
      ...rest,
      uploadedById: uploaderId,
      id: `doc-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 4)}`,
      version: 1,
      versions: [
        {
          version: 1,
          fileName: data.fileName,
          sizeBytes: data.sizeBytes,
          mimeType: data.mimeType,
          uploadedById: uploaderId,
          uploadedAt: now,
          notes: versionNote?.trim() || 'Первичная загрузка файла',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    this.documents = [doc, ...this.documents];
    this.saveDocuments();
    this.logActivity('create', 'document', doc.title, `${doc.fileName} (${doc.category})`, doc.id);
    this.addNotification('success', 'Документ загружен', doc.title);
    this.notify();
    return doc;
  }

  public updateDocument(updated: DocumentItem): void {
    const now = new Date().toISOString();
    const next: DocumentItem = { ...updated, updatedAt: now };
    this.documents = this.documents.map((d) => (d.id === next.id ? next : d));
    this.saveDocuments();
    this.logActivity('update', 'document', next.title, `Обновлены метаданные (${next.status})`, next.id);
    this.addNotification('info', 'Документ обновлён', next.title);
    this.notify();
  }

  public uploadDocumentVersion(
    id: string,
    payload: {
      fileName: string;
      extension: string;
      mimeType: string;
      sizeBytes: number;
      dataUrl?: string;
      textContent?: string;
      notes: string;
      uploadedById?: string;
    }
  ): void {
    const existing = this.documents.find((d) => d.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const nextVersion = (existing.version || 1) + 1;
    const uploaderId = payload.uploadedById || this.currentUserId || existing.uploadedById || 'user-1';
    const nextDoc: DocumentItem = {
      ...existing,
      fileName: payload.fileName,
      extension: payload.extension,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      dataUrl: payload.dataUrl,
      textContent: payload.textContent,
      uploadedById: uploaderId,
      version: nextVersion,
      updatedAt: now,
      versions: [
        {
          version: nextVersion,
          fileName: payload.fileName,
          sizeBytes: payload.sizeBytes,
          mimeType: payload.mimeType,
          uploadedById: uploaderId,
          uploadedAt: now,
          notes: payload.notes.trim() || `Версия ${nextVersion}`,
        },
        ...(existing.versions || []),
      ].slice(0, 20),
    };
    this.documents = this.documents.map((d) => (d.id === id ? nextDoc : d));
    this.saveDocuments();
    this.logActivity('update', 'document', nextDoc.title, `Загружена v${nextVersion}: ${nextDoc.fileName}`, nextDoc.id);
    this.addNotification('success', `Версия v${nextVersion}`, nextDoc.title);
    this.notify();
  }

  public deleteDocument(id: string): void {
    const target = this.documents.find((d) => d.id === id);
    if (!target) return;
    this.documents = this.documents.filter((d) => d.id !== id);
    this.saveDocuments();
    this.logActivity('delete', 'document', target.title, `Удалён файл ${target.fileName}`, target.id);
    this.addNotification('warning', 'Документ удалён', target.title);
    this.notify();
  }

  // --- Project Requirements & Knowledge Traceability ---
  private syncKnowledgeLinkedTasks(taskId: string, knowledgeIds: string[]): void {
    const idSet = new Set(knowledgeIds);
    let changed = false;
    this.knowledgeArticles = this.knowledgeArticles.map((art) => {
      if (!idSet.has(art.id)) return art;
      const existing = art.linkedTaskIds || [];
      if (existing.includes(taskId)) return art;
      changed = true;
      return { ...art, linkedTaskIds: [...existing, taskId] };
    });
    if (changed) {
      this.saveKnowledgeArticles();
    }
  }

  public addKnowledgeArticlesBulk(
    items: Array<
      Omit<
        KnowledgeArticle,
        'id' | 'helpfulUserIds' | 'viewsCount' | 'revisions' | 'createdAt' | 'updatedAt' | 'verifiedAt'
      >
    >
  ): KnowledgeArticle[] {
    if (items.length === 0) return [];
    const now = new Date().toISOString();
    const authorFallback = this.currentUserId || this.users[0]?.id || 'user-1';
    const created: KnowledgeArticle[] = items.map((data, idx) => ({
      ...data,
      authorId: data.authorId || authorFallback,
      id: `kb-${Date.now().toString().slice(-6)}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      helpfulUserIds: [],
      viewsCount: 1,
      revisions: [
        {
          id: `rev-${Date.now()}-${idx}`,
          editedById: data.authorId || authorFallback,
          editedAt: now,
          summary: 'Автогенерация из спецификации проекта',
        },
      ],
      createdAt: now,
      updatedAt: now,
      verifiedAt: data.status === 'verified' ? now : undefined,
    }));
    this.knowledgeArticles = [...created, ...this.knowledgeArticles];
    if (created[0]) this.detailKnowledgeId = created[0].id;
    this.saveKnowledgeArticles();
    this.logActivity(
      'create',
      'knowledge',
      `${created.length} статей`,
      'Сформирована база знаний из спецификации проекта'
    );
    this.notify();
    return created;
  }

  public addRequirement(
    data: Omit<ProjectRequirement, 'id' | 'createdAt' | 'updatedAt'>
  ): ProjectRequirement {
    const now = new Date().toISOString();
    const req: ProjectRequirement = {
      ...data,
      id: `req-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.requirements = [req, ...this.requirements];
    this.saveRequirements();
    this.logActivity('create', 'requirement', `${req.code} — ${req.title}`, req.type, req.id);
    this.addNotification('success', `${req.code}`, req.title);
    this.notify();
    return req;
  }

  public addRequirementsBulk(
    items: Array<Omit<ProjectRequirement, 'id' | 'createdAt' | 'updatedAt'>>
  ): ProjectRequirement[] {
    if (items.length === 0) return [];
    const now = new Date().toISOString();
    const created: ProjectRequirement[] = items.map((data, idx) => ({
      ...data,
      id: `req-${Date.now().toString().slice(-6)}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    }));
    this.requirements = [...created, ...this.requirements];
    this.saveRequirements();
    this.logActivity(
      'create',
      'requirement',
      `${created.length} требований`,
      'Импортировано из спецификации проекта'
    );
    this.notify();
    return created;
  }

  public updateRequirement(updated: ProjectRequirement): void {
    const next: ProjectRequirement = { ...updated, updatedAt: new Date().toISOString() };
    this.requirements = this.requirements.map((r) => (r.id === next.id ? next : r));
    this.saveRequirements();
    this.logActivity('update', 'requirement', `${next.code} — ${next.title}`, next.status, next.id);
    this.notify();
  }

  public deleteRequirement(id: string): void {
    const target = this.requirements.find((r) => r.id === id);
    if (!target) return;
    this.requirements = this.requirements.filter((r) => r.id !== id);
    this.tasks = this.tasks.map((tk) =>
      tk.requirementIds?.includes(id)
        ? { ...tk, requirementIds: tk.requirementIds.filter((rid) => rid !== id) }
        : tk
    );
    this.saveRequirements();
    this.saveTasks();
    this.logActivity('delete', 'requirement', `${target.code} — ${target.title}`, 'Удалено требование', target.id);
    this.notify();
  }

  // --- Activity Log ---
  public logActivity(
    action: 'create' | 'update' | 'delete' | 'status_change' | 'priority_change',
    targetType: ActivityLogItem['targetType'],
    targetTitle: string,
    details: string,
    targetId?: string
  ): void {
    const currentUser = this.users.find((u) => u.id === this.currentUserId);
    const currentUserName = currentUser?.name || 'Текущий пользователь';
    const logItem: ActivityLogItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'current-user',
      userName: currentUserName,
      action,
      targetType,
      targetId,
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

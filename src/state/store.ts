import {
  AccentColor,
  ActiveView,
  ActivityLogItem,
  AiUsageDay,
  AuthAccountCredential,
  AuthProviderId,
  AuthSession,
  BackgroundPreset,
  BankRequisite,
  Calculation,
  CalculationStatus,
  Company,
  Contract,
  Counterparty,
  CounterpartyContact,
  DirectoryDefinition,
  DirectoryFieldDef,
  DirectoryGroupKey,
  DirectoryRecord,
  DocumentItem,
  DocumentScope,
  Expense,
  Invoice,
  InvoicePayment,
  InvoiceStatus,
  KnowledgeArticle,
  KnowledgeScope,
  NotificationItem,
  PaymentDirection,
  PresenceStatus,
  Project,
  ProjectChatChannel,
  ProjectChatMessage,
  ProjectMember,
  ProjectRequirement,
  ProjectRole,
  Reminder,
  ReminderEntityType,
  ReminderRecurrence,
  ReminderNotificationRule,
  SidebarGroupMode,
  Task,
  TaskAiAnalysis,
  TaskStatus,
  ThemeBaseColors,
  ThemeMode,
  TimeEntry,
  User,
  UserCustomization,
} from '../types';
import {
  formatLocalDateTime as formatRfcLocalDateTime,
  getNextRRuleOccurrence,
  getUpcomingRRuleOccurrences,
  normalizeReminderRecurrence,
  parseLocalDateTime as parseRfcLocalDateTime,
} from '../domain/rfc5545';
import {
  initialCalculations,
  initialChatChannels,
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
  initialReminders,
  initialRequirements,
  initialTasks,
  initialTimeEntries,
  initialUsers,
} from './mock-data';
import { createInitialDirectories } from './directories-data';
import { locationToPath, pathToLocation, NavLocation } from '../domain/navigation';
import { getTranslation } from '../i18n';

const STORAGE_KEY_CUSTOMIZATION = 'projectflow_customization_v1';
const STORAGE_KEY_USAGE = 'projectflow_ai_usage_v1';
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
const STORAGE_KEY_CHAT_CHANNELS = 'projectflow_chat_channels_v1';
const STORAGE_KEY_KNOWLEDGE = 'projectflow_knowledge_v1';
const STORAGE_KEY_DOCUMENTS = 'projectflow_documents_v1';
const STORAGE_KEY_REQUIREMENTS = 'projectflow_requirements_v1';
const STORAGE_KEY_DIRECTORIES = 'projectflow_directories_v1';
const STORAGE_KEY_REMINDERS = 'projectflow_reminders_v1';
const STORAGE_KEY_AUTH_SESSION = 'projectflow_auth_session_v1';
const STORAGE_KEY_TRUSTED_DEVICES = 'projectflow_trusted_2fa_v1';
const STORAGE_KEY_AUTH_ACCOUNTS = 'projectflow_auth_accounts_v1';

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
  aiEndpoint: 'http://127.0.0.1:3000/v1',
  aiModel: '',
  aiBudget: { dailyRequests: 0, dailyTokens: 0 },
  timezone: 'Europe/Moscow',
  defaultProjectId: '',
  viewModes: {},
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

export interface NotificationOptions {
  targetType?: ActivityLogItem['targetType'];
  targetId?: string;
  actionLabel?: string;
  durationMs?: number;
}

export interface ReminderRelatedObject {
  type: ReminderEntityType;
  id: string;
  typeLabel: string;
  label: string;
  subtitle?: string;
  isPrimary: boolean;
  navigable: boolean;
}

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
  public chatChannels: ProjectChatChannel[] = [];
  public knowledgeArticles: KnowledgeArticle[] = [];
  public documents: DocumentItem[] = [];
  public requirements: ProjectRequirement[] = [];
  public directories: DirectoryDefinition[] = [];
  public reminders: Reminder[] = [];
  public activeDirectoryId: string = 'activity_types';
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
  public detailTimeEntryId: string = '';
  public detailExpenseId: string = '';
  public detailPaymentId: string = '';
  public detailReminderId: string = '';
  public requirementFilterProjectId: string = 'all';
  public knowledgeFilterScope: 'all' | KnowledgeScope = 'all';
  public knowledgeFilterProjectId: string = 'all';
  public knowledgeFilterCompanyId: string = 'all';
  public documentFilterScope: 'all' | DocumentScope = 'all';
  public documentFilterCompanyId: string = 'all';
  public documentFilterProjectId: string = 'all';
  public chatProjectId: string = '';
  public chatChannelId: string = '';
  public currentUserId: string = 'user-1';
  public authSession: AuthSession | null = null;
  public isAuthenticated: boolean = false;
  public authAccounts: AuthAccountCredential[] = [];
  public trusted2faEmails: string[] = [];
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
  public aiUsage: AiUsageDay[] = [];
  public aiBusyCount: number = 0;

  public isTaskModalOpen: boolean = false;
  public editingTask: Task | null = null;
  public newTaskDefaultStatus: TaskStatus = 'todo';
  public newTaskDefaultDate: string = '';

  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.loadState();
    this.applyThemeAndCustomization();
    this.startReminderScheduler();
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
        const budget = this.customization.aiBudget;
        if (
          !budget ||
          typeof budget.dailyRequests !== 'number' ||
          budget.dailyRequests < 0 ||
          typeof budget.dailyTokens !== 'number' ||
          budget.dailyTokens < 0
        ) {
          this.customization.aiBudget = { ...defaultCustomization.aiBudget };
        }
        if (typeof this.customization.timezone !== 'string' || !this.customization.timezone.trim()) {
          this.customization.timezone = defaultCustomization.timezone;
        }
        if (typeof this.customization.defaultProjectId !== 'string') {
          this.customization.defaultProjectId = defaultCustomization.defaultProjectId;
        }
        this.activeView = this.customization.defaultView || 'dashboard';
      }

      const storedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
      if (storedTasks) {
        const parsedTasks: Task[] = JSON.parse(storedTasks);
        // legacy single aiAnalysis object migrates into the first array entry
        this.tasks = parsedTasks.map((tk) => {
          const legacy = (tk as Task & { aiAnalysis?: TaskAiAnalysis }).aiAnalysis;
          delete (tk as Task & { aiAnalysis?: TaskAiAnalysis }).aiAnalysis;
          if (!legacy) return tk;
          return {
            ...tk,
            aiAnalyses: [
              ...(tk.aiAnalyses || []),
              {
                id: `analysis-${tk.id}-${legacy.updatedAt}`,
                kind: 'task',
                authorId: this.currentUserId || this.users[0]?.id || 'user-1',
                model: legacy.model || '',
                createdAt: legacy.updatedAt,
                overview: legacy.overview,
                effortAssessment: legacy.effortAssessment,
                risks: legacy.risks,
                recommendations: legacy.recommendations,
                suggestedSubtasks: legacy.suggestedSubtasks,
                contextSources: legacy.contextSources,
              },
            ],
          };
        });
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
      if (storedPayments) {
        const parsedPayments: Partial<InvoicePayment>[] = JSON.parse(storedPayments);
        this.payments = parsedPayments.map((raw) => {
          const fallback = initialPayments.find((p) => p.id === raw.id);
          const direction: PaymentDirection =
            raw.direction === 'incoming' || raw.direction === 'outgoing'
              ? raw.direction
              : fallback?.direction || this.inferPaymentDirection(raw.counterpartyId);
          const companyId = raw.companyId || fallback?.companyId || this.companies[0]?.id || '';
          const counterpartyId = raw.counterpartyId || fallback?.counterpartyId || '';
          const currency = raw.currency || fallback?.currency || 'RUB';
          const company = this.companies.find((c) => c.id === companyId);
          const cp = this.counterparties.find((c) => c.id === counterpartyId);
          const companyBankAccountId = this.resolveBankAccountId(
            company?.bankAccounts,
            raw.companyBankAccountId || fallback?.companyBankAccountId,
            currency
          );
          const counterpartyBankAccountId = this.resolveBankAccountId(
            cp?.bankAccounts,
            raw.counterpartyBankAccountId || fallback?.counterpartyBankAccountId,
            currency
          );
          return {
            ...(raw as InvoicePayment),
            direction,
            invoiceId: raw.invoiceId ?? fallback?.invoiceId ?? '',
            contractId: raw.contractId ?? fallback?.contractId ?? '',
            companyId,
            counterpartyId,
            companyBankAccountId,
            counterpartyBankAccountId,
            currency,
          };
        });
      } else {
        this.payments = initialPayments.map((p) => ({ ...p }));
      }

      this.syncOverdueInvoices(false);

      const storedTimeEntries = localStorage.getItem(STORAGE_KEY_TIME_ENTRIES);
      const parsedTimeEntries: TimeEntry[] | null = storedTimeEntries
        ? JSON.parse(storedTimeEntries)
        : null;
      const hadAnyTimeEntryAttachments = Boolean(
        parsedTimeEntries?.some((te) => Array.isArray(te.documentIds))
      );

      const storedExpenses = localStorage.getItem(STORAGE_KEY_EXPENSES);
      const parsedExpenses: Expense[] | null = storedExpenses ? JSON.parse(storedExpenses) : null;
      const hadAnyExpenseAttachments = Boolean(
        parsedExpenses?.some((ex) => Array.isArray(ex.documentIds))
      );

      const storedChatChannels = localStorage.getItem(STORAGE_KEY_CHAT_CHANNELS);
      if (storedChatChannels) {
        this.chatChannels = JSON.parse(storedChatChannels);
      } else {
        const seeded = initialChatChannels.map((c) => ({ ...c }));
        for (const proj of this.projects) {
          if (!seeded.some((c) => c.projectId === proj.id)) {
            seeded.push({
              id: `ch-${proj.id}-general`,
              projectId: proj.id,
              slug: 'general',
              name: this.texts().generalChannel,
              description: proj.description || undefined,
              isDefault: true,
              createdById: proj.members?.[0]?.userId || this.users[0]?.id || 'user-1',
              createdAt: new Date().toISOString(),
            });
          }
        }
        this.chatChannels = seeded;
      }

      const storedChat = localStorage.getItem(STORAGE_KEY_CHAT);
      const rawChatMessages: ProjectChatMessage[] = storedChat
        ? JSON.parse(storedChat)
        : initialChatMessages.map((m) => ({ ...m }));
      this.chatMessages = rawChatMessages.map((m) => {
        if (m.channelId && this.chatChannels.some((c) => c.id === m.channelId)) {
          return m;
        }
        const seedMatch = initialChatMessages.find((im) => im.id === m.id);
        const fallbackChannel =
          (seedMatch?.channelId &&
          this.chatChannels.some((c) => c.id === seedMatch.channelId)
            ? seedMatch.channelId
            : undefined) ||
          this.chatChannels.find((c) => c.projectId === m.projectId && c.isDefault)?.id ||
          this.chatChannels.find((c) => c.projectId === m.projectId)?.id ||
          '';
        return {
          ...m,
          channelId: fallbackChannel,
        };
      });

      const storedKnowledge = localStorage.getItem(STORAGE_KEY_KNOWLEDGE);
      this.knowledgeArticles = storedKnowledge
        ? JSON.parse(storedKnowledge)
        : [...initialKnowledgeArticles];

      const storedDocuments = localStorage.getItem(STORAGE_KEY_DOCUMENTS);
      if (storedDocuments) {
        const parsedDocs: DocumentItem[] = JSON.parse(storedDocuments);
        const docsList: DocumentItem[] = parsedDocs.map((doc) => {
          const seed = initialDocuments.find((d) => d.id === doc.id);
          return {
            ...doc,
            dataUrl: doc.dataUrl || seed?.dataUrl,
            timeEntryId: doc.timeEntryId ?? seed?.timeEntryId,
            expenseId: doc.expenseId ?? seed?.expenseId,
          };
        });
        if (!hadAnyTimeEntryAttachments && !hadAnyExpenseAttachments) {
          const existingDocIds = new Set(docsList.map((d) => d.id));
          for (const seedDoc of initialDocuments) {
            if ((seedDoc.timeEntryId || seedDoc.expenseId) && !existingDocIds.has(seedDoc.id)) {
              docsList.push({ ...seedDoc });
            }
          }
        }
        this.documents = docsList;
      } else {
        this.documents = [...initialDocuments];
      }

      const existingDocIdSet = new Set(this.documents.map((d) => d.id));
      this.timeEntries = parsedTimeEntries
        ? parsedTimeEntries.map((te) => {
            const fallback = initialTimeEntries.find((ite) => ite.id === te.id);
            const rawIds = Array.isArray(te.documentIds)
              ? te.documentIds
              : fallback?.documentIds || [];
            return {
              ...te,
              documentIds: rawIds.filter((id) => existingDocIdSet.has(id)),
            };
          })
        : [...initialTimeEntries];

      this.expenses = parsedExpenses
        ? parsedExpenses.map((ex) => {
            const fallback = initialExpenses.find((iex) => iex.id === ex.id);
            const rawIds = Array.isArray(ex.documentIds)
              ? ex.documentIds
              : fallback?.documentIds || [];
            return {
              ...ex,
              documentIds: rawIds.filter((id) => existingDocIdSet.has(id)),
            };
          })
        : [...initialExpenses];

      const storedRequirements = localStorage.getItem(STORAGE_KEY_REQUIREMENTS);
      this.requirements = storedRequirements
        ? JSON.parse(storedRequirements)
        : [...initialRequirements];

      const storedDirectories = localStorage.getItem(STORAGE_KEY_DIRECTORIES);
      const seedDirs = createInitialDirectories();
      if (storedDirectories) {
        const parsedDirs: DirectoryDefinition[] = JSON.parse(storedDirectories);
        const existingMap = new Map(parsedDirs.map((d) => [d.id, d]));
        const merged: DirectoryDefinition[] = parsedDirs.map((d) => {
          const seed = seedDirs.find((s) => s.id === d.id);
          if (!seed) return d;

          let records = d.records;
          if (d.id === 'recurrence_templates') {
            const seedByCode = new Map(seed.records.map((sr) => [sr.code, sr]));
            const existingCodes = new Set(records.map((r) => r.code));
            records = records.map((recItem) => {
              const seedRec = seedByCode.get(recItem.code);
              if (recItem.extra?.rrule === undefined && seedRec) {
                return {
                  ...recItem,
                  description: recItem.description || seedRec.description,
                  extra: { ...(seedRec.extra || {}) },
                };
              }
              return recItem;
            });
            for (const sr of seed.records) {
              if (!existingCodes.has(sr.code)) {
                records.push({
                  ...sr,
                  extra: sr.extra ? { ...sr.extra } : undefined,
                });
              }
            }
          }

          return {
            ...seed,
            ...d,
            records,
            fields: seed.fields,
            catalogKey: seed.catalogKey,
            usedInKeys: seed.usedInKeys,
          };
        });
        for (const seed of seedDirs) {
          if (!existingMap.has(seed.id)) {
            merged.push(seed);
          }
        }
        this.directories = merged;
      } else {
        this.directories = seedDirs;
      }
      if (!this.directories.some((d) => d.id === this.activeDirectoryId)) {
        this.activeDirectoryId = this.directories[0]?.id || 'activity_types';
      }

      const storedReminders = localStorage.getItem(STORAGE_KEY_REMINDERS);
      if (storedReminders) {
        const parsedRems: Reminder[] = JSON.parse(storedReminders);
        this.reminders = parsedRems.map((r) => {
          const fallback = initialReminders.find((ir) => ir.id === r.id);
          return {
            ...r,
            entityId: r.id === 'rem-2' && r.entityId === 'cont-1' ? 'ctr-1' : r.entityId,
            attachmentIds: Array.isArray(r.attachmentIds)
              ? [...r.attachmentIds]
              : fallback?.attachmentIds
              ? [...fallback.attachmentIds]
              : [],
            recurrence: normalizeReminderRecurrence(r.recurrence),
          };
        });
      } else {
        this.reminders = initialReminders.map((r) => ({
          ...r,
          recurrence: normalizeReminderRecurrence(r.recurrence),
          notifications: {
            ...r.notifications,
            rules: r.notifications.rules.map((rule) => ({ ...rule })),
          },
          assigneeIds: [...r.assigneeIds],
          tags: [...r.tags],
          attachmentIds: r.attachmentIds ? [...r.attachmentIds] : [],
        }));
      }

      const storedUsage = localStorage.getItem(STORAGE_KEY_USAGE);
      if (storedUsage) {
        const parsed: AiUsageDay[] = JSON.parse(storedUsage);
        this.aiUsage = parsed.filter(
          (d) =>
            d &&
            typeof d.date === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
            typeof d.requests === 'number' &&
            typeof d.tokens === 'number'
        );
      }

      const storedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
      if (storedLogs) {
        this.activityLog = JSON.parse(storedLogs);
      } else {
        this.activityLog = [
          {
            id: 'log-3',
            timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
            userId: 'user-3',
            userName: 'Дмитрий Волков',
            action: 'create',
            targetType: 'reminder',
            targetId: 'rem-13',
            targetTitle: 'Внеочередной аудит резервных копий и DR-учений (Пятница 13-е)',
            details: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=13;BYDAY=FR',
          },
          {
            id: 'log-1',
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            userId: 'user-2',
            userName: 'Елена Смирнова',
            action: 'status_change',
            targetType: 'task',
            targetId: 'CORE-102',
            targetTitle: 'Оптимизация бандла Web-компонентов Lit',
            details: this.texts().tasks.seedMovedTo('Review'),
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
            details: this.texts().tasks.seedCreatedWithPriority('Urgent'),
          },
        ];
      }

      this.initAuthState();
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
      this.chatChannels = initialChatChannels.map((c) => ({ ...c }));
      this.chatMessages = initialChatMessages.map((m) => ({ ...m }));
      this.knowledgeArticles = [...initialKnowledgeArticles];
      this.documents = [...initialDocuments];
      this.directories = createInitialDirectories();
      this.reminders = [...initialReminders];
      this.initAuthState();
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

  private saveChatChannels(): void {
    try {
      localStorage.setItem(STORAGE_KEY_CHAT_CHANNELS, JSON.stringify(this.chatChannels));
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

  private saveDirectories(): void {
    try {
      localStorage.setItem(STORAGE_KEY_DIRECTORIES, JSON.stringify(this.directories));
    } catch (e) {
      console.error(e);
    }
  }

  private saveReminders(): void {
    try {
      localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(this.reminders));
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
        ? this.texts().settings.themeLabels.highContrast
        : theme === 'barbie'
        ? this.texts().settings.themeLabels.barbie
        : theme === 'matrix'
        ? this.texts().settings.themeLabels.matrix
        : theme === 'cyberpunk'
        ? this.texts().settings.themeLabels.cyberpunk
        : theme === 'dark'
        ? this.texts().settings.themeLabels.dark
        : this.texts().settings.themeLabels.light;
    this.logActivity('update', 'settings', this.texts().settings.targetTheme, this.texts().settings.themeSwitched(themeLabel));
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
    this.logActivity('update', 'settings', this.texts().settings.themeColors, this.texts().settings.paletteApplied(theme));
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
    this.logActivity('update', 'settings', this.texts().settings.themeColors, this.texts().settings.paletteReset(theme));
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
    this.logActivity('update', 'settings', this.texts().settings.targetBackground, this.texts().settings.backgroundSet(preset));
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
    this.logActivity('update', 'settings', this.texts().settings.targetLanguage, this.texts().settings.languageSet(lang.toUpperCase()));
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
      view === 'reminders' ||
      view === 'reminder-detail' ||
      view === 'task-detail' ||
      view === 'kanban' ||
      view === 'gantt' ||
      view === 'time-tracking' ||
      view === 'timeentry-detail' ||
      view === 'expenses' ||
      view === 'expense-detail'
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
      view === 'payments' ||
      view === 'payment-detail' ||
      view === 'directories'
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

  /** Display mode of a view (cards/table/grid, tabs, density). Views read it from the store and
   * report changes here; push adds a history entry so browser back restores the previous mode. */
  public viewModeFor(view: ActiveView): string | undefined {
    return this.customization.viewModes[view];
  }

  public setViewMode(view: ActiveView, mode: string, push: boolean = true): void {
    if (this.customization.viewModes[view] === mode) return;
    this.customization.viewModes = { ...this.customization.viewModes, [view]: mode };
    this.saveCustomization();
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
      case 'timeentry-detail':
        return this.detailTimeEntryId || undefined;
      case 'expense-detail':
        return this.detailExpenseId || undefined;
      case 'payment-detail':
        return this.detailPaymentId || undefined;
      case 'reminder-detail':
        return this.detailReminderId || undefined;
      case 'project-chat':
        return this.chatProjectId || undefined;
      case 'directories':
        return this.activeDirectoryId || undefined;
      default:
        return undefined;
    }
  }

  private syncHistory(replace: boolean): void {
    if (this.historyApplying) return;
    const id = this.currentDetailId();
    const page = this.activePage > 1 ? this.activePage : undefined;
    const mode = this.customization.viewModes[this.activeView];
    const path = locationToPath(this.activeView, id, page, mode);
    const state = { view: this.activeView, id, page, mode };
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
    } else if (view === 'timeentry-detail') {
      if (id && this.timeEntries.some((t) => t.id === id)) this.detailTimeEntryId = id;
      else view = 'time-tracking';
    } else if (view === 'expense-detail') {
      if (id && this.expenses.some((e) => e.id === id)) this.detailExpenseId = id;
      else view = 'expenses';
    } else if (view === 'payment-detail') {
      if (id && this.payments.some((p) => p.id === id)) this.detailPaymentId = id;
      else view = 'payments';
    } else if (view === 'reminder-detail') {
      if (id && this.reminders.some((r) => r.id === id)) this.detailReminderId = id;
      else view = 'reminders';
    } else if (view === 'project-chat') {
      if (id && this.projects.some((p) => p.id === id)) this.chatProjectId = id;
      else if (!this.chatProjectId) this.chatProjectId = this.projects[0]?.id || '';
      if (this.chatProjectId) {
        this.resolveActiveChannelForProject(this.chatProjectId);
      }
    } else if (view === 'directories') {
      if (id && this.directories.some((d) => d.id === id)) this.activeDirectoryId = id;
      else if (!this.activeDirectoryId) this.activeDirectoryId = this.directories[0]?.id || '';
    }
    this.activeView = view;
    this.activePage = loc.page ?? 1;
    // restoring a location without a mode segment means the view's default mode
    const modes = { ...this.customization.viewModes };
    if (loc.mode) modes[view] = loc.mode;
    else delete modes[view];
    this.customization.viewModes = modes;
    this.saveCustomization();
    this.expandSidebarGroupFor(view);
    this.notify();
    this.historyApplying = false;
  }

  public initHistory(): void {
    window.addEventListener('popstate', (e: PopStateEvent) => {
      const st = e.state as { view: ActiveView; id?: string; page?: number; mode?: string } | null;
      const loc = st?.view
        ? { view: st.view, id: st.id, page: st.page, mode: st.mode }
        : pathToLocation(location.hash);
      if (loc) this.applyHistoryLocation(loc);
    });
    const loc = pathToLocation(location.hash);
    if (loc) {
      this.applyHistoryLocation(loc);
    }
    const initId = this.currentDetailId();
    const initPage = this.activePage > 1 ? this.activePage : undefined;
    const initMode = this.customization.viewModes[this.activeView];
    history.replaceState(
      { view: this.activeView, id: initId, page: initPage, mode: initMode },
      '',
      locationToPath(this.activeView, initId, initPage, initMode)
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

  private resolveActiveChannelForProject(projectId: string, preferredChannelId?: string): string {
    const projectChannels = this.chatChannels.filter((c) => c.projectId === projectId);
    if (preferredChannelId && projectChannels.some((c) => c.id === preferredChannelId)) {
      this.chatChannelId = preferredChannelId;
      return preferredChannelId;
    }
    if (this.chatChannelId && projectChannels.some((c) => c.id === this.chatChannelId)) {
      return this.chatChannelId;
    }
    const nextChannel =
      projectChannels.find((c) => !c.archived && c.isDefault) ||
      projectChannels.find((c) => !c.archived) ||
      projectChannels[0];
    this.chatChannelId = nextChannel?.id || '';
    return this.chatChannelId;
  }

  public openProjectChat(projectId?: string, channelId?: string): void {
    if (projectId) {
      this.chatProjectId = projectId;
    } else if (!this.chatProjectId) {
      this.chatProjectId =
        this.selectedProjectId !== 'all'
          ? this.selectedProjectId
          : this.projects[0]?.id || '';
    }
    if (this.chatProjectId) {
      this.resolveActiveChannelForProject(this.chatProjectId, channelId);
    }
    this.setActiveView('project-chat');
  }

  public selectChatChannel(channelId: string): void {
    const ch = this.chatChannels.find((c) => c.id === channelId);
    if (!ch) return;
    this.chatProjectId = ch.projectId;
    this.chatChannelId = ch.id;
    this.notify();
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

  public openTimeEntryDetail(timeEntryId: string): void {
    this.detailTimeEntryId = timeEntryId;
    this.setActiveView('timeentry-detail');
  }

  public openExpenseDetail(expenseId: string): void {
    this.detailExpenseId = expenseId;
    this.setActiveView('expense-detail');
  }

  public openPaymentDetail(paymentId: string): void {
    this.detailPaymentId = paymentId;
    this.setActiveView('payment-detail');
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

  // --- AI usage & budget ---

  private todayKey(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  private saveUsage(): void {
    try {
      localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(this.aiUsage));
    } catch (e) {
      console.error(e);
    }
  }

  public todayUsage(): AiUsageDay {
    const key = this.todayKey();
    const day = this.aiUsage.find((d) => d.date === key);
    return day || { date: key, requests: 0, tokens: 0 };
  }

  /** true when the daily budget is exhausted and a new AI request must be refused */
  public aiBudgetExhausted(): boolean {
    const budget = this.customization.aiBudget;
    const usage = this.todayUsage();
    if (budget.dailyRequests > 0 && usage.requests >= budget.dailyRequests) return true;
    if (budget.dailyTokens > 0 && usage.tokens >= budget.dailyTokens) return true;
    return false;
  }

  public recordAiUsage(tokens: number): void {
    const key = this.todayKey();
    let day = this.aiUsage.find((d) => d.date === key);
    if (!day) {
      day = { date: key, requests: 0, tokens: 0 };
      this.aiUsage = [...this.aiUsage, day];
    }
    const updated: AiUsageDay = {
      date: key,
      requests: day.requests + 1,
      tokens: day.tokens + Math.max(0, Math.round(tokens || 0)),
    };
    this.aiUsage = this.aiUsage.map((d) => (d.date === key ? updated : d));
    this.saveUsage();
    this.notify();
  }

  public setAiBusy(active: boolean): void {
    const next = Math.max(0, this.aiBusyCount + (active ? 1 : -1));
    if (next === this.aiBusyCount) return;
    this.aiBusyCount = next;
    this.notify();
  }

  public resetCustomization(): void {
    this.customization = { ...defaultCustomization };
    this.applyThemeAndCustomization();
    this.saveCustomization();
    this.addNotification('info', this.texts().settings.title, this.texts().settings.resetMessage);
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
    this.logActivity('create', 'task', newTask.title, this.texts().tasks.createdInProject(project?.name || ''), newTask.id);
    this.addNotification('success', this.texts().titleSuccess, this.texts().tasks.taskCreatedMessage(newTask.title));
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
      this.logActivity('status_change', 'task', updated.title, this.texts().tasks.statusFromTo(old.status, updated.status), updated.id);
    } else if (old && old.priority !== updated.priority) {
      this.logActivity('priority_change', 'task', updated.title, this.texts().tasks.priorityFromTo(old.priority, updated.priority), updated.id);
    } else {
      this.logActivity('update', 'task', updated.title, this.texts().tasks.dataUpdated, updated.id);
    }

    this.addNotification('info', this.texts().titleUpdated, this.texts().tasks.taskSavedMessage(updated.title));
    this.notify();
  }

  public deleteTask(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    this.tasks = this.tasks.filter((t) => t.id !== taskId);
    this.saveTasks();
    this.logActivity('delete', 'task', task.title, this.texts().tasks.deletedByUser, task.id);
    this.addNotification('warning', this.texts().titleDeleted, this.texts().tasks.taskDeletedMessage(task.title));
    this.notify();
  }

  public moveTaskStatus(taskId: string, newStatus: TaskStatus): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const oldStatus = task.status;
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();
    this.saveTasks();

    this.logActivity('status_change', 'task', task.title, this.texts().tasks.movedTo(oldStatus, newStatus), task.id);
    this.notify();
  }

  public bulkUpdateStatus(taskIds: string[], newStatus: TaskStatus): void {
    this.tasks = this.tasks.map((t) => (taskIds.includes(t.id) ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t));
    this.saveTasks();
    this.logActivity('status_change', 'task', this.texts().tasks.tasksCount(taskIds.length), this.texts().tasks.bulkMovedTo(newStatus));
    this.addNotification('success', this.texts().titleSuccess, this.texts().tasks.bulkStatusMessage(taskIds.length));
    this.notify();
  }

  public bulkDeleteTasks(taskIds: string[]): void {
    this.tasks = this.tasks.filter((t) => !taskIds.includes(t.id));
    this.saveTasks();
    this.logActivity('delete', 'task', this.texts().tasks.tasksCount(taskIds.length), this.texts().tasks.bulkDeleteActivity);
    this.addNotification('warning', this.texts().titleDeleted, this.texts().tasks.bulkDeletedMessage(taskIds.length));
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
  public addNotification(
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    options?: NotificationOptions
  ): void {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const item: NotificationItem = {
      id,
      type,
      title,
      message,
      timestamp: Date.now(),
      actionLabel: options?.actionLabel,
      targetType: options?.targetType,
      targetId: options?.targetId,
    };
    this.notifications = [item, ...this.notifications.slice(0, 4)];
    this.notify();

    const durationMs =
      options?.durationMs ?? (options?.targetType === 'reminder' ? 8000 : 4500);
    setTimeout(() => {
      this.dismissNotification(id);
    }, durationMs);
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
    this.logActivity('create', 'company', company.name, this.texts().companies.addedActivity);
    this.addNotification('success', this.texts().companies.addedTitle, company.name);
    this.notify();
    return company;
  }

  public updateCompany(updated: Company): void {
    this.companies = this.companies.map((c) => (c.id === updated.id ? { ...updated } : c));
    this.saveCompanies();
    this.logActivity('update', 'company', updated.name, this.texts().companies.requisitesUpdated);
    this.addNotification('info', this.texts().companies.updatedTitle, updated.name);
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
    this.logActivity('delete', 'company', target.name, this.texts().companies.deletedActivity);
    this.addNotification('warning', this.texts().titleDeleted, this.texts().companies.deletedMessage(target.name));
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
    this.logActivity('create', 'employee', employee.name, this.texts().employees.roleLine(employee.role));
    this.addNotification('success', this.texts().employees.addedTitle, employee.name);
    this.notify();
    return employee;
  }

  /** Manual presence choice (the sidebar footer menu): writes the PresenceStatus
     directly on the user; EmployeeStatus is untouched. Every persona in the app shows
     the chosen presence — for the surroundings the user is exactly in that status. */
  public setUserPresence(userId: string, presence: PresenceStatus): void {
    const target = this.users.find((u) => u.id === userId);
    if (!target || target.presence === presence) return;
    this.users = this.users.map((u) => (u.id === userId ? { ...u, presence } : u));
    this.saveEmployees();
    this.logActivity('update', 'employee', target.name, this.texts().employees.presenceUpdated);
    this.notify();
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
    this.logActivity('update', 'employee', updated.name, this.texts().employees.profileUpdated);
    this.addNotification('info', this.texts().employees.updatedTitle, updated.name);
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
    this.logActivity('delete', 'employee', target.name, this.texts().employees.deletedActivity);
    this.addNotification('warning', this.texts().titleDeleted, this.texts().employees.deletedMessage(target.name));
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
    this.logActivity('create', 'counterparty', cp.name, this.texts().counterparties.addedActivity);
    this.addNotification('success', this.texts().counterparties.addedTitle, cp.name);
    this.notify();
    return cp;
  }

  public updateCounterparty(updated: Counterparty): void {
    const normalized = this.syncPrimaryContactFields(updated);
    this.counterparties = this.counterparties.map((c) =>
      c.id === updated.id ? { ...normalized, id: updated.id } : c
    );
    this.saveCounterparties();
    this.logActivity('update', 'counterparty', updated.name, this.texts().counterparties.cardUpdated);
    this.addNotification('info', this.texts().counterparties.updatedTitle, updated.name);
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
    this.logActivity('delete', 'counterparty', target.name, this.texts().counterparties.deletedActivity);
    this.addNotification('warning', this.texts().titleDeleted, this.texts().counterparties.deletedMessage(target.name));
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
    this.logActivity('create', 'contract', `${contract.number} — ${contract.title}`, this.texts().contracts.createdActivity);
    this.addNotification('success', this.texts().contracts.createdTitle, contract.number);
    this.notify();
    return contract;
  }

  public updateContract(updated: Contract): void {
    this.contracts = this.contracts.map((c) => (c.id === updated.id ? { ...updated } : c));
    this.saveContracts();
    this.logActivity('update', 'contract', `${updated.number} — ${updated.title}`, this.texts().contracts.updatedActivity);
    this.addNotification('info', this.texts().contracts.updatedTitle, updated.number);
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
    this.logActivity('delete', 'contract', `${target.number} — ${target.title}`, this.texts().contracts.deletedActivity);
    this.addNotification('warning', this.texts().titleDeleted, this.texts().contracts.deletedMessage(target.number));
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
      this.texts().calculations.createdActivity(calc.periodStart, calc.periodEnd, `${calc.billableAmount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`)
    );
    this.addNotification('success', this.texts().calculations.createdTitle, calc.number);
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
      this.texts().calculations.updatedActivity(updated.status, `${updated.billableAmount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`)
    );
    this.addNotification('info', this.texts().calculations.updatedTitle, updated.number);
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
      this.texts().calculations.statusTo(status)
    );
    this.addNotification(
      status === 'approved' ? 'success' : status === 'rejected' ? 'warning' : 'info',
      this.texts().calculations.statusUpdatedTitle,
      `${updated.number} → ${status}`
    );
    this.notify();
  }

  public deleteCalculation(id: string): void {
    const target = this.calculations.find((c) => c.id === id);
    if (!target) return;
    this.calculations = this.calculations.filter((c) => c.id !== id);
    this.saveCalculations();
    this.logActivity('delete', 'calculation', target.number, this.texts().calculations.deletedText);
    this.addNotification('warning', this.texts().calculations.deletedText, target.number);
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
      this.texts().invoices.issuedActivity(`${invoice.totalAmount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`)
    );
    this.addNotification(
      'success',
      this.texts().invoices.createdTitle,
      this.texts().invoices.onAmount(invoice.number, `${invoice.totalAmount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`)
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
      this.texts().invoices.updatedActivity(updated.status, `${updated.totalAmount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`)
    );
    this.addNotification('info', this.texts().invoices.updatedTitle, updated.number);
    this.notify();
  }

  public updateInvoiceStatus(id: string, status: InvoiceStatus): void {
    const existing = this.invoices.find((inv) => inv.id === id);
    if (!existing) return;
    const today = new Date().toISOString().slice(0, 10);

    if (status === 'paid') {
      const remaining = this.getInvoiceRemainingAmount(existing);
      if (remaining > 0) {
        const direction = this.inferPaymentDirection(existing.counterpartyId);
        const company = this.companies.find((c) => c.id === existing.companyId);
        const cp = this.counterparties.find((c) => c.id === existing.counterpartyId);
        this.addInvoicePayment({
          direction,
          invoiceId: existing.id,
          contractId: existing.contractId,
          companyId: existing.companyId,
          counterpartyId: existing.counterpartyId,
          companyBankAccountId: this.resolveBankAccountId(
            company?.bankAccounts,
            undefined,
            existing.currency
          ),
          counterpartyBankAccountId: this.resolveBankAccountId(
            cp?.bankAccounts,
            undefined,
            existing.currency
          ),
          amount: remaining,
          currency: existing.currency,
          paymentDate: today,
          method: 'bank_transfer',
          documentNumber: `${this.texts().payments.docCodeOutgoing}-${today.slice(0, 4)}/AUTO-${existing.number.slice(-3)}`,
          notes: this.texts().payments.fullInvoicePaymentNote(existing.number),
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
    this.logActivity('status_change', 'invoice', updated.number, this.texts().invoices.statusTo(status));
    this.addNotification(
      status === 'paid' ? 'success' : 'info',
      this.texts().invoices.statusUpdatedTitle,
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

    this.logActivity('delete', 'invoice', target.number, this.texts().invoices.deletedText);
    this.addNotification('warning', this.texts().invoices.deletedText, target.number);
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

  public inferPaymentDirection(counterpartyId?: string): PaymentDirection {
    if (!counterpartyId) return 'incoming';
    const cp = this.counterparties.find((c) => c.id === counterpartyId);
    if (cp && (cp.type === 'vendor' || cp.type === 'contractor')) {
      return 'outgoing';
    }
    return 'incoming';
  }

  public resolveBankAccountId(
    accounts: BankRequisite[] | undefined,
    preferredId?: string,
    currency?: string
  ): string | undefined {
    if (!accounts || accounts.length === 0) return undefined;
    if (preferredId && accounts.some((a) => a.id === preferredId)) {
      return preferredId;
    }
    if (currency) {
      const defaultMatching = accounts.find((a) => a.isDefault && a.currency === currency);
      if (defaultMatching) return defaultMatching.id;
      const anyMatching = accounts.find((a) => a.currency === currency);
      if (anyMatching) return anyMatching.id;
    }
    return accounts.find((a) => a.isDefault)?.id || accounts[0].id;
  }

  public formatBankRequisiteShort(acc: BankRequisite): string {
    const clean = acc.accountNumber.replace(/\s+/g, '');
    const tail = clean.length >= 4 ? `•••• ${clean.slice(-4)}` : clean;
    return `${acc.bankName} · ${acc.currency} · ${tail}`;
  }

  public getPaymentCompanyAccount(payment: InvoicePayment): BankRequisite | undefined {
    const company = this.companies.find((c) => c.id === payment.companyId);
    if (!company?.bankAccounts || company.bankAccounts.length === 0) return undefined;
    if (payment.companyBankAccountId) {
      const exact = company.bankAccounts.find((a) => a.id === payment.companyBankAccountId);
      if (exact) return exact;
    }
    return undefined;
  }

  public getPaymentCounterpartyAccount(payment: InvoicePayment): BankRequisite | undefined {
    const cp = this.counterparties.find((c) => c.id === payment.counterpartyId);
    if (!cp?.bankAccounts || cp.bankAccounts.length === 0) return undefined;
    if (payment.counterpartyBankAccountId) {
      const exact = cp.bankAccounts.find((a) => a.id === payment.counterpartyBankAccountId);
      if (exact) return exact;
    }
    return undefined;
  }

  public getPaymentCompanyRequisitesLabel(payment: InvoicePayment): string {
    const acc = this.getPaymentCompanyAccount(payment);
    if (acc) return this.formatBankRequisiteShort(acc);
    return payment.companyBankSnapshot || '';
  }

  public getPaymentCounterpartyRequisitesLabel(payment: InvoicePayment): string {
    const acc = this.getPaymentCounterpartyAccount(payment);
    if (acc) return this.formatBankRequisiteShort(acc);
    return payment.counterpartyBankSnapshot || '';
  }

  public addInvoicePayment(
    data: Omit<InvoicePayment, 'id' | 'createdAt' | 'direction'> & { direction?: PaymentDirection }
  ): InvoicePayment {
    const amount = Math.max(0.01, Math.round((Number(data.amount) || 0) * 100) / 100);
    const direction: PaymentDirection =
      data.direction || this.inferPaymentDirection(data.counterpartyId);
    const company = this.companies.find((c) => c.id === data.companyId);
    const cp = this.counterparties.find((c) => c.id === data.counterpartyId);
    const companyBankAccountId = this.resolveBankAccountId(
      company?.bankAccounts,
      data.companyBankAccountId,
      data.currency
    );
    const counterpartyBankAccountId = this.resolveBankAccountId(
      cp?.bankAccounts,
      data.counterpartyBankAccountId,
      data.currency
    );
    const compAcc = company?.bankAccounts?.find((a) => a.id === companyBankAccountId);
    const cpAcc = cp?.bankAccounts?.find((a) => a.id === counterpartyBankAccountId);

    const payment: InvoicePayment = {
      ...data,
      direction,
      companyBankAccountId,
      counterpartyBankAccountId,
      companyBankSnapshot:
        data.companyBankSnapshot || (compAcc ? this.formatBankRequisiteShort(compAcc) : undefined),
      counterpartyBankSnapshot:
        data.counterpartyBankSnapshot || (cpAcc ? this.formatBankRequisiteShort(cpAcc) : undefined),
      amount,
      documentNumber: data.documentNumber.trim(),
      notes: data.notes.trim(),
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    this.payments = [payment, ...this.payments];
    this.savePayments();
    if (payment.invoiceId) {
      this.reconcileInvoiceAfterPayments(payment.invoiceId);
    }

    const inv = payment.invoiceId ? this.invoices.find((i) => i.id === payment.invoiceId) : undefined;
    const sym =
      payment.currency === 'USD'
        ? '$'
        : payment.currency === 'EUR'
        ? '€'
        : payment.currency === 'CNY'
        ? '¥'
        : payment.currency === 'GBP'
        ? '£'
        : payment.currency === 'KZT'
        ? '₸'
        : payment.currency === 'AED'
        ? 'AED'
        : '₽';
    const isFull = inv ? inv.status === 'paid' : false;
    const dirPrefix = direction === 'outgoing' ? this.texts().payments.outgoingPrefix : this.texts().payments.incomingPrefix;
    const targetName = inv
      ? `${inv.number}${payment.documentNumber ? ` · ${payment.documentNumber}` : ''}`
      : payment.documentNumber || company?.name || payment.id;
    this.logActivity(
      'create',
      'payment',
      targetName,
      this.texts().payments.paidLine(dirPrefix, compAcc ? ` (${compAcc.bankName})` : '', `${payment.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`),
      payment.id
    );
    this.addNotification(
      'success',
      isFull ? this.texts().payments.invoicePaidFull : this.texts().payments.recorded(dirPrefix),
      this.texts().payments.paymentLine(inv?.number || company?.name || '', `${payment.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`),
      { targetType: 'payment', targetId: payment.id }
    );
    this.notify();
    return payment;
  }

  public updateInvoicePayment(updated: InvoicePayment): void {
    const prev = this.payments.find((p) => p.id === updated.id);
    if (!prev) return;
    const amount = Math.max(0.01, Math.round((Number(updated.amount) || 0) * 100) / 100);
    const company = this.companies.find((c) => c.id === updated.companyId);
    const cp = this.counterparties.find((c) => c.id === updated.counterpartyId);
    const companyBankAccountId = this.resolveBankAccountId(
      company?.bankAccounts,
      updated.companyBankAccountId,
      updated.currency
    );
    const counterpartyBankAccountId = this.resolveBankAccountId(
      cp?.bankAccounts,
      updated.counterpartyBankAccountId,
      updated.currency
    );
    const compAcc = company?.bankAccounts?.find((a) => a.id === companyBankAccountId);
    const cpAcc = cp?.bankAccounts?.find((a) => a.id === counterpartyBankAccountId);

    const nextPayment: InvoicePayment = {
      ...prev,
      ...updated,
      amount,
      companyBankAccountId,
      counterpartyBankAccountId,
      companyBankSnapshot: compAcc
        ? this.formatBankRequisiteShort(compAcc)
        : updated.companyBankSnapshot,
      counterpartyBankSnapshot: cpAcc
        ? this.formatBankRequisiteShort(cpAcc)
        : updated.counterpartyBankSnapshot,
      documentNumber: updated.documentNumber.trim(),
      notes: updated.notes.trim(),
    };

    this.payments = this.payments.map((p) => (p.id === nextPayment.id ? nextPayment : p));
    this.savePayments();

    if (prev.invoiceId && prev.invoiceId !== nextPayment.invoiceId) {
      this.reconcileInvoiceAfterPayments(prev.invoiceId, 'sent');
    }
    if (nextPayment.invoiceId) {
      this.reconcileInvoiceAfterPayments(nextPayment.invoiceId, 'sent');
    }

    const inv = nextPayment.invoiceId
      ? this.invoices.find((i) => i.id === nextPayment.invoiceId)
      : undefined;
    const targetName = inv
      ? `${inv.number}${nextPayment.documentNumber ? ` · ${nextPayment.documentNumber}` : ''}`
      : nextPayment.documentNumber || company?.name || nextPayment.id;
    const sym =
      nextPayment.currency === 'USD'
        ? '$'
        : nextPayment.currency === 'EUR'
        ? '€'
        : nextPayment.currency === 'CNY'
        ? '¥'
        : nextPayment.currency === 'GBP'
        ? '£'
        : nextPayment.currency === 'KZT'
        ? '₸'
        : nextPayment.currency === 'AED'
        ? 'AED'
        : '₽';
    this.logActivity(
      'update',
      'payment',
      targetName,
      `${nextPayment.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`,
      nextPayment.id
    );
    this.addNotification(
      'info',
      targetName,
      `${nextPayment.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`,
      { targetType: 'payment', targetId: nextPayment.id }
    );
    this.notify();
  }

  public deleteInvoicePayment(paymentId: string): void {
    const target = this.payments.find((p) => p.id === paymentId);
    if (!target) return;
    this.payments = this.payments.filter((p) => p.id !== paymentId);
    if (this.detailPaymentId === paymentId) {
      this.detailPaymentId = this.payments[0]?.id || '';
      if (this.activeView === 'payment-detail') {
        this.activeView = 'payments';
        this.syncHistory(true);
      }
    }
    this.savePayments();
    if (target.invoiceId) {
      this.reconcileInvoiceAfterPayments(target.invoiceId, 'sent');
    }

    const inv = target.invoiceId ? this.invoices.find((i) => i.id === target.invoiceId) : undefined;
    const sym =
      target.currency === 'USD'
        ? '$'
        : target.currency === 'EUR'
        ? '€'
        : target.currency === 'CNY'
        ? '¥'
        : target.currency === 'GBP'
        ? '£'
        : target.currency === 'KZT'
        ? '₸'
        : target.currency === 'AED'
        ? 'AED'
        : '₽';
    this.logActivity(
      'delete',
      'payment',
      inv
        ? `${inv.number}${target.documentNumber ? ` · ${target.documentNumber}` : ''}`
        : target.documentNumber || target.id,
      this.texts().payments.deletedMessage(`${target.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`),
      target.id
    );
    this.addNotification('warning', this.texts().payments.deletedTitle, `${target.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${sym}`);
    this.notify();
  }

  // --- Project & Project Members CRUD ---
  public addProject(data: Omit<Project, 'id'>): Project {
    const members = data.members ? [...data.members] : [];
    // Membership is now enforced by the chat gates, so the creator of a new
    // project has to be in the roster: otherwise they cannot post in the
    // default channel of the project they just created.
    if (members.length === 0 && this.users.some((u) => u.id === this.currentUserId)) {
      members.push({
        userId: this.currentUserId,
        role: 'pm',
        allocation: 100,
        joinedAt: new Date().toISOString().slice(0, 10),
      });
    }
    const project: Project = {
      ...data,
      id: `proj-${Date.now()}`,
      members,
    };
    this.projects = [project, ...this.projects];
    this.saveProjects();

    const defaultChannel: ProjectChatChannel = {
      id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      projectId: project.id,
      slug: 'general',
      name: this.texts().generalChannel,
      description: project.description || undefined,
      isDefault: true,
      createdById: this.currentUserId || project.members?.[0]?.userId || this.users[0]?.id || 'user-1',
      createdAt: new Date().toISOString(),
    };
    this.chatChannels = [...this.chatChannels, defaultChannel];
    this.saveChatChannels();

    this.logActivity('create', 'project', project.name, this.texts().projects.keyLine(project.key));
    this.addNotification('success', this.texts().projects.createdTitle, project.name);
    this.notify();
    return project;
  }

  public updateProject(updated: Project): void {
    this.projects = this.projects.map((p) => (p.id === updated.id ? { ...updated } : p));
    this.saveProjects();
    this.logActivity('update', 'project', updated.name, this.texts().projects.paramsUpdated);
    this.addNotification('info', this.texts().projects.updatedTitle, updated.name);
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
    if (this.chatProjectId === id) {
      this.chatProjectId = this.projects[0]?.id || '';
      this.resolveActiveChannelForProject(this.chatProjectId);
    }
    const prevChannelLen = this.chatChannels.length;
    this.chatChannels = this.chatChannels.filter((c) => c.projectId !== id);
    if (this.chatChannels.length !== prevChannelLen) {
      this.saveChatChannels();
    }
    const prevMsgLen = this.chatMessages.length;
    this.chatMessages = this.chatMessages.filter((m) => m.projectId !== id);
    if (this.chatMessages.length !== prevMsgLen) {
      this.saveChatMessages();
    }
    const prevReqLen = this.requirements.length;
    this.requirements = this.requirements.filter((r) => r.projectId !== id);
    if (this.requirements.length !== prevReqLen) {
      this.saveRequirements();
    }
    this.saveProjects();
    this.logActivity('delete', 'project', target.name, this.texts().projects.deletedActivity);
    this.addNotification('warning', this.texts().titleDeleted, this.texts().projects.deletedMessage(target.name));
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
      this.texts().projects.memberAssigned(user?.name || member.userId, member.role)
    );
    this.addNotification('success', this.texts().projects.memberAddedTitle, this.texts().projects.memberAddedMessage(user?.name || ''));
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
    this.logActivity('update', 'project', project.name, this.texts().projects.memberRoleTo(newRole));
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
    this.logActivity('update', 'project', project.name, this.texts().projects.memberRemoved(user?.name || userId));
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

  private syncEntryDocuments(opts: {
    projectId: string;
    taskId?: string;
    timeEntryId?: string;
    expenseId?: string;
    documentIds?: string[];
  }): string[] {
    const cleanIds = Array.from(new Set((opts.documentIds || []).filter(Boolean)));
    const idSet = new Set(cleanIds);
    const proj = this.projects.find((p) => p.id === opts.projectId);
    let docsChanged = false;

    this.documents = this.documents.map((doc) => {
      const isAttached = idSet.has(doc.id);
      if (isAttached) {
        const nextProjectId = doc.projectId || opts.projectId;
        const nextCompanyId = doc.companyId || proj?.companyId;
        const nextTaskId = doc.taskId || opts.taskId || undefined;
        const nextTimeEntryId = opts.timeEntryId ? doc.timeEntryId || opts.timeEntryId : doc.timeEntryId;
        const nextExpenseId = opts.expenseId ? doc.expenseId || opts.expenseId : doc.expenseId;
        if (
          nextProjectId !== doc.projectId ||
          nextCompanyId !== doc.companyId ||
          nextTaskId !== doc.taskId ||
          nextTimeEntryId !== doc.timeEntryId ||
          nextExpenseId !== doc.expenseId
        ) {
          docsChanged = true;
          return {
            ...doc,
            projectId: nextProjectId,
            companyId: nextCompanyId,
            taskId: nextTaskId,
            timeEntryId: nextTimeEntryId,
            expenseId: nextExpenseId,
          };
        }
        return doc;
      }

      if (
        (opts.timeEntryId && doc.timeEntryId === opts.timeEntryId) ||
        (opts.expenseId && doc.expenseId === opts.expenseId)
      ) {
        docsChanged = true;
        return {
          ...doc,
          timeEntryId: opts.timeEntryId && doc.timeEntryId === opts.timeEntryId ? undefined : doc.timeEntryId,
          expenseId: opts.expenseId && doc.expenseId === opts.expenseId ? undefined : doc.expenseId,
        };
      }
      return doc;
    });

    if (docsChanged) {
      this.saveDocuments();
    }
    return cleanIds;
  }

  public addTimeEntry(data: Omit<TimeEntry, 'id' | 'createdAt'>): TimeEntry {
    const hours = Math.max(0.25, Math.round((Number(data.hours) || 0) * 100) / 100);
    const id = `te-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const documentIds = this.syncEntryDocuments({
      projectId: data.projectId,
      taskId: data.taskId,
      timeEntryId: id,
      documentIds: data.documentIds,
    });
    const entry: TimeEntry = {
      ...data,
      documentIds,
      hours,
      id,
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
      this.texts().timeEntries.writtenActivity(entry.hours, user?.name || entry.userId),
      entry.id
    );
    this.addNotification('success', this.texts().timeEntries.writtenTitle, this.texts().timeEntries.writtenMessage(entry.hours, entry.taskId), {
      targetType: 'time_entry',
      targetId: entry.id,
    });
    this.notify();
    return entry;
  }

  public updateTimeEntry(updated: TimeEntry): void {
    const old = this.timeEntries.find((e) => e.id === updated.id);
    const nextHours = Math.max(0.25, Math.round((Number(updated.hours) || 0) * 100) / 100);
    const documentIds = this.syncEntryDocuments({
      projectId: updated.projectId,
      taskId: updated.taskId,
      timeEntryId: updated.id,
      documentIds: updated.documentIds,
    });
    const normalized: TimeEntry = { ...updated, hours: nextHours, documentIds };

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
      this.texts().timeEntries.updatedActivity(normalized.hours, normalized.status),
      normalized.id
    );
    this.addNotification('info', this.texts().timeEntries.updatedTitle, this.texts().timeEntries.updatedMessage(normalized.hours, normalized.taskId), {
      targetType: 'time_entry',
      targetId: normalized.id,
    });
    this.notify();
  }

  public deleteTimeEntry(id: string): void {
    const target = this.timeEntries.find((e) => e.id === id);
    if (!target) return;
    this.syncEntryDocuments({
      projectId: target.projectId,
      timeEntryId: id,
      documentIds: [],
    });
    this.timeEntries = this.timeEntries.filter((e) => e.id !== id);
    if (this.detailTimeEntryId === id) {
      this.detailTimeEntryId = this.timeEntries[0]?.id || '';
      if (this.activeView === 'timeentry-detail') {
        this.activeView = 'time-tracking';
        this.syncHistory(true);
      }
    }
    this.saveTimeEntries();
    this.adjustTaskLoggedHours(target.taskId, -target.hours);

    const task = this.tasks.find((t) => t.id === target.taskId);
    this.logActivity(
      'delete',
      'time_entry',
      task ? `${task.id} · ${task.title}` : target.taskId,
      this.texts().timeEntries.deletedActivity(target.hours),
      target.id
    );
    this.addNotification('warning', this.texts().timeEntries.deletedTitle, this.texts().timeEntries.deletedMessage(target.hours, target.taskId));
    this.notify();
  }

  // --- Expenses CRUD ---
  public addExpense(data: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const amount = Math.max(0, Math.round((Number(data.amount) || 0) * 100) / 100);
    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const documentIds = this.syncEntryDocuments({
      projectId: data.projectId,
      taskId: data.taskId,
      expenseId: id,
      documentIds: data.documentIds,
    });
    const expense: Expense = {
      ...data,
      documentIds,
      amount,
      id,
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
      expense.id
    );
    this.addNotification('success', this.texts().expenses.addedTitle, this.texts().expenses.lineWithAmount(expense.title, `${expense.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${symbol}`), {
      targetType: 'expense',
      targetId: expense.id,
    });
    this.notify();
    return expense;
  }

  public updateExpense(updated: Expense): void {
    const amount = Math.max(0, Math.round((Number(updated.amount) || 0) * 100) / 100);
    const documentIds = this.syncEntryDocuments({
      projectId: updated.projectId,
      taskId: updated.taskId,
      expenseId: updated.id,
      documentIds: updated.documentIds,
    });
    const normalized: Expense = { ...updated, amount, documentIds };
    this.expenses = this.expenses.map((e) => (e.id === normalized.id ? normalized : e));
    this.saveExpenses();

    const symbol = normalized.currency === 'USD' ? '$' : normalized.currency === 'EUR' ? '€' : '₽';
    this.logActivity(
      'update',
      'expense',
      normalized.title,
      this.texts().expenses.statusAmount(normalized.status, `${normalized.amount.toLocaleString(getTranslation(this.customization.language).common.locale)} ${symbol}`),
      normalized.id
    );
    this.addNotification('info', this.texts().expenses.updatedTitle, normalized.title, {
      targetType: 'expense',
      targetId: normalized.id,
    });
    this.notify();
  }

  public deleteExpense(id: string): void {
    const target = this.expenses.find((e) => e.id === id);
    if (!target) return;
    this.syncEntryDocuments({
      projectId: target.projectId,
      expenseId: id,
      documentIds: [],
    });
    this.expenses = this.expenses.filter((e) => e.id !== id);
    if (this.detailExpenseId === id) {
      this.detailExpenseId = this.expenses[0]?.id || '';
      if (this.activeView === 'expense-detail') {
        this.activeView = 'expenses';
        this.syncHistory(true);
      }
    }
    this.saveExpenses();
    this.logActivity('delete', 'expense', target.title, this.texts().expenses.deletedActivity, target.id);
    this.addNotification('warning', this.texts().expenses.deletedTitle, target.title);
    this.notify();
  }

  // --- Project Chat Channels & Messages CRUD ---
  public isUserProjectMember(projectId: string, userId = this.currentUserId): boolean {
    const proj = this.projects.find((p) => p.id === projectId);
    if (!proj) return false;
    // A project with no members has no members: an empty roster must not make
    // everyone a member (it used to pass the chat CRUD gates for such projects).
    const members = proj.members || [];
    return members.some((m) => m.userId === userId);
  }

  public getProjectChatChannels(projectId: string, includeArchived = true): ProjectChatChannel[] {
    return this.chatChannels
      .filter((c) => c.projectId === projectId && (includeArchived || !c.archived))
      .sort((a, b) => {
        if (Boolean(a.archived) !== Boolean(b.archived)) return a.archived ? 1 : -1;
        if (Boolean(a.isDefault) !== Boolean(b.isDefault)) return a.isDefault ? -1 : 1;
        return (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0);
      });
  }

  public getDefaultChatChannel(projectId: string): ProjectChatChannel | undefined {
    const list = this.getProjectChatChannels(projectId, true);
    return (
      list.find((c) => !c.archived && c.isDefault) ||
      list.find((c) => !c.archived) ||
      list[0]
    );
  }

  public slugifyChannelName(raw: string): string {
    const map: Record<string, string> = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
      и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
      с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
      ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    };
    const lowered = raw.trim().toLowerCase();
    let out = '';
    for (const ch of lowered) {
      out += map[ch] !== undefined ? map[ch] : ch;
    }
    const slug = out
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 36);
    return slug || 'channel';
  }

  private ensureUniqueChannelSlug(projectId: string, desiredSlug: string, excludeId?: string): string {
    const base = this.slugifyChannelName(desiredSlug);
    const existing = new Set(
      this.chatChannels
        .filter((c) => c.projectId === projectId && c.id !== excludeId)
        .map((c) => c.slug.toLowerCase())
    );
    if (!existing.has(base)) return base;
    let idx = 2;
    while (existing.has(`${base}-${idx}`)) idx++;
    return `${base}-${idx}`;
  }

  public addChatChannel(data: {
    projectId: string;
    name: string;
    slug?: string;
    description?: string;
    createdById?: string;
    isDefault?: boolean;
  }): ProjectChatChannel | null {
    const actorId = data.createdById || this.currentUserId || this.users[0]?.id || '';
    if (!this.isUserProjectMember(data.projectId, actorId)) {
      return null;
    }
    const name = data.name.trim();
    if (!name) return null;
    const slug = this.ensureUniqueChannelSlug(
      data.projectId,
      data.slug?.trim() ? data.slug : name
    );
    const channel: ProjectChatChannel = {
      id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: data.projectId,
      slug,
      name,
      description: data.description?.trim() || undefined,
      isDefault: data.isDefault || false,
      archived: false,
      createdById: actorId,
      createdAt: new Date().toISOString(),
    };
    this.chatChannels = [...this.chatChannels, channel];
    this.saveChatChannels();
    this.chatProjectId = data.projectId;
    this.chatChannelId = channel.id;

    const proj = this.projects.find((p) => p.id === data.projectId);
    const prefix = proj ? `[${proj.key}] ` : '';
    this.logActivity(
      'create',
      'chat',
      `${prefix}#${channel.name}`,
      channel.description || channel.slug,
      channel.id
    );
    this.addNotification('success', `#${channel.name}`, proj?.name || '', {
      targetType: 'chat',
      targetId: channel.id,
    });
    this.notify();
    return channel;
  }

  public updateChatChannel(
    id: string,
    patch: { name?: string; slug?: string; description?: string },
    actorId = this.currentUserId
  ): boolean {
    const target = this.chatChannels.find((c) => c.id === id);
    if (!target || !this.isUserProjectMember(target.projectId, actorId)) return false;

    const nextName = patch.name !== undefined ? patch.name.trim() : target.name;
    if (!nextName) return false;
    const nextSlug =
      patch.slug !== undefined && patch.slug.trim()
        ? this.ensureUniqueChannelSlug(target.projectId, patch.slug, target.id)
        : target.slug;

    this.chatChannels = this.chatChannels.map((c) =>
      c.id === id
        ? {
            ...c,
            name: nextName,
            slug: nextSlug,
            description:
              patch.description !== undefined
                ? patch.description.trim() || undefined
                : c.description,
          }
        : c
    );
    this.saveChatChannels();

    const proj = this.projects.find((p) => p.id === target.projectId);
    this.logActivity(
      'update',
      'chat',
      `${proj ? `[${proj.key}] ` : ''}#${nextName}`,
      nextSlug,
      id
    );
    this.addNotification('info', `#${nextName}`, proj?.name || '', {
      targetType: 'chat',
      targetId: id,
    });
    this.notify();
    return true;
  }

  public archiveChatChannel(
    id: string,
    archived = true,
    actorId = this.currentUserId
  ): boolean {
    const target = this.chatChannels.find((c) => c.id === id);
    if (!target || !this.isUserProjectMember(target.projectId, actorId)) return false;

    const nowIso = new Date().toISOString();
    this.chatChannels = this.chatChannels.map((c) =>
      c.id === id
        ? {
            ...c,
            archived,
            archivedAt: archived ? nowIso : undefined,
            archivedById: archived ? actorId : undefined,
          }
        : c
    );
    this.saveChatChannels();

    const proj = this.projects.find((p) => p.id === target.projectId);
    this.logActivity(
      'status_change',
      'chat',
      `${proj ? `[${proj.key}] ` : ''}#${target.name}`,
      archived ? this.texts().chat.channelArchived : this.texts().chat.channelUnarchived,
      id
    );
    this.addNotification(
      archived ? 'warning' : 'success',
      `#${target.name}`,
      proj?.name || '',
      { targetType: 'chat', targetId: id }
    );
    this.notify();
    return true;
  }

  public deleteChatChannel(id: string, actorId = this.currentUserId): boolean {
    const target = this.chatChannels.find((c) => c.id === id);
    if (!target || !this.isUserProjectMember(target.projectId, actorId)) return false;

    this.chatChannels = this.chatChannels.filter((c) => c.id !== id);
    this.saveChatChannels();

    const prevMsgLen = this.chatMessages.length;
    this.chatMessages = this.chatMessages.filter((m) => m.channelId !== id);
    if (this.chatMessages.length !== prevMsgLen) {
      this.saveChatMessages();
    }

    if (this.chatChannelId === id) {
      this.resolveActiveChannelForProject(target.projectId);
    }

    const proj = this.projects.find((p) => p.id === target.projectId);
    this.logActivity(
      'delete',
      'chat',
      `${proj ? `[${proj.key}] ` : ''}#${target.name}`,
      this.texts().chat.projectChannelDeleted
    );
    this.addNotification('warning', `#${target.name}`, proj?.name || '');
    this.notify();
    return true;
  }

  public addChatMessage(data: {
    projectId: string;
    channelId?: string;
    senderId?: string;
    text: string;
    replyToId?: string;
    taskRefId?: string;
  }): ProjectChatMessage | null {
    const senderId = data.senderId || this.currentUserId || this.users[0]?.id || '';
    // Chat writes are gated by project membership, as channel CRUD is: a user
    // outside the roster must not be able to post into a project channel.
    if (!this.isUserProjectMember(data.projectId, senderId)) return null;
    let resolvedChannel = data.channelId
      ? this.chatChannels.find((c) => c.id === data.channelId && c.projectId === data.projectId)
      : undefined;
    if (resolvedChannel?.archived) {
      return null;
    }
    if (!resolvedChannel) {
      const candidate = this.getDefaultChatChannel(data.projectId);
      resolvedChannel = candidate && !candidate.archived ? candidate : undefined;
    }
    if (!resolvedChannel) {
      const proj = this.projects.find((p) => p.id === data.projectId);
      const fallbackChannel: ProjectChatChannel = {
        id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: data.projectId,
        slug: 'general',
        name: this.texts().generalChannel,
        description: proj?.description || undefined,
        isDefault: true,
        createdById: senderId || 'user-1',
        createdAt: new Date().toISOString(),
      };
      this.chatChannels = [...this.chatChannels, fallbackChannel];
      this.saveChatChannels();
      resolvedChannel = fallbackChannel;
    }

    const latestChannelMs = this.chatMessages
      .filter((m) => m.channelId === resolvedChannel!.id)
      .reduce((max, m) => Math.max(max, Date.parse(m.createdAt) || 0), 0);
    const createdMs = Math.max(Date.now(), latestChannelMs + 1000);
    const msg: ProjectChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      projectId: data.projectId,
      channelId: resolvedChannel.id,
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
      `${proj ? `[${proj.key}] ` : ''}#${resolvedChannel.name}`,
      `${sender?.name || senderId}: ${msg.text.slice(0, 60)}`,
      msg.taskRefId || resolvedChannel.id
    );
    this.notify();
    return msg;
  }

  public updateChatMessage(id: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg = this.chatMessages.find((m) => m.id === id);
    if (!msg) return;
    const ch = this.chatChannels.find((c) => c.id === msg.channelId);
    if (ch?.archived) return;
    this.chatMessages = this.chatMessages.map((m) =>
      m.id === id ? { ...m, text: trimmed, editedAt: new Date().toISOString() } : m
    );
    this.saveChatMessages();
    this.notify();
  }

  public togglePinChatMessage(id: string): void {
    const msg = this.chatMessages.find((m) => m.id === id);
    if (!msg) return;
    const ch = this.chatChannels.find((c) => c.id === msg.channelId);
    if (ch?.archived) return;
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
          summary: revisionSummary?.trim() || this.texts().knowledge.createSummary,
        },
      ],
      createdAt: now,
      updatedAt: now,
      verifiedAt: data.status === 'verified' ? now : undefined,
    };
    this.knowledgeArticles = [article, ...this.knowledgeArticles];
    this.detailKnowledgeId = article.id;
    this.saveKnowledgeArticles();
    this.logActivity('create', 'knowledge', article.title, this.texts().knowledge.addedActivity(article.category), article.id);
    this.addNotification('success', this.texts().knowledge.title, this.texts().knowledge.publishedMessage(article.title));
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
      summary: revisionSummary?.trim() || this.texts().knowledge.updateSummary,
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
    this.addNotification('info', this.texts().knowledge.title, this.texts().knowledge.updatedMessage(next.title));
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
      isVerified ? this.texts().knowledge.verificationRemoved : this.texts().knowledge.verificationConfirmed,
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
    this.logActivity('delete', 'knowledge', target.title, this.texts().knowledge.deletedActivity, target.id);
    this.addNotification('warning', this.texts().titleDeleted, this.texts().knowledge.deletedMessage(target.title));
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
          notes: versionNote?.trim() || this.texts().documents.initialUploadNote,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    this.documents = [doc, ...this.documents];
    this.saveDocuments();
    this.logActivity('create', 'document', doc.title, `${doc.fileName} (${doc.category})`, doc.id);
    this.addNotification('success', this.texts().documents.uploadedTitle, doc.title);
    this.notify();
    return doc;
  }

  public updateDocument(updated: DocumentItem): void {
    const now = new Date().toISOString();
    const next: DocumentItem = { ...updated, updatedAt: now };
    this.documents = this.documents.map((d) => (d.id === next.id ? next : d));
    this.saveDocuments();
    this.logActivity('update', 'document', next.title, this.texts().documents.metaUpdated(next.status), next.id);
    this.addNotification('info', this.texts().documents.updatedTitle, next.title);
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
          notes: payload.notes.trim() || this.texts().documents.versionNote(nextVersion),
        },
        ...(existing.versions || []),
      ].slice(0, 20),
    };
    this.documents = this.documents.map((d) => (d.id === id ? nextDoc : d));
    this.saveDocuments();
    this.logActivity('update', 'document', nextDoc.title, this.texts().documents.versionActivity(nextVersion, nextDoc.fileName), nextDoc.id);
    this.addNotification('success', this.texts().documents.versionTitle(nextVersion), nextDoc.title);
    this.notify();
  }

  public deleteDocument(id: string): void {
    const target = this.documents.find((d) => d.id === id);
    if (!target) return;
    this.documents = this.documents.filter((d) => d.id !== id);
    this.saveDocuments();

    let timeChanged = false;
    this.timeEntries = this.timeEntries.map((te) => {
      if (!te.documentIds?.includes(id)) return te;
      timeChanged = true;
      return { ...te, documentIds: te.documentIds.filter((docId) => docId !== id) };
    });
    if (timeChanged) this.saveTimeEntries();

    let expenseChanged = false;
    this.expenses = this.expenses.map((ex) => {
      if (!ex.documentIds?.includes(id)) return ex;
      expenseChanged = true;
      return { ...ex, documentIds: ex.documentIds.filter((docId) => docId !== id) };
    });
    if (expenseChanged) this.saveExpenses();

    this.logActivity('delete', 'document', target.title, this.texts().documents.fileDeleted(target.fileName), target.id);
    this.addNotification('warning', this.texts().documents.deletedTitle, target.title);
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
          summary: this.texts().knowledge.autoSummary,
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
      this.texts().knowledge.articlesCount(created.length),
      this.texts().knowledge.generatedTitle
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
      this.texts().requirements.count(created.length),
      this.texts().requirements.importedFromSpec
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
    this.logActivity('delete', 'requirement', `${target.code} — ${target.title}`, this.texts().requirements.deletedActivity, target.id);
    this.notify();
  }

  // --- Reference Directories & Classifiers ---
  public setActiveDirectory(directoryId: string): void {
    if (!this.directories.some((d) => d.id === directoryId)) return;
    this.activeDirectoryId = directoryId;
    this.notify();
    if (this.activeView === 'directories') {
      this.syncHistory(true);
    }
  }

  public openDirectory(directoryId?: string): void {
    if (directoryId && this.directories.some((d) => d.id === directoryId)) {
      this.activeDirectoryId = directoryId;
    }
    this.setActiveView('directories');
  }

  public addDirectoryDefinition(payload: {
    code: string;
    name: string;
    description?: string;
    group?: DirectoryGroupKey;
    fields?: DirectoryFieldDef[];
  }): DirectoryDefinition {
    const now = new Date().toISOString();
    const cleanCode = payload.code.trim().toUpperCase().replace(/\s+/g, '_');
    const id = `dir_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const fields = payload.fields || [];
    const created: DirectoryDefinition = {
      id,
      code: cleanCode || `DICT_${Date.now().toString().slice(-4)}`,
      group: payload.group || 'custom',
      schemaType: fields.length > 0 ? 'extended' : 'simple',
      customName: payload.name.trim(),
      customDescription: payload.description?.trim() || '',
      fields,
      isSystem: false,
      records: [],
      updatedAt: now,
    };
    this.directories = [...this.directories, created];
    this.activeDirectoryId = created.id;
    this.saveDirectories();
    this.logActivity('create', 'directory', created.customName || created.code, created.code, created.id);
    this.notify();
    if (this.activeView === 'directories') {
      this.syncHistory(true);
    }
    return created;
  }

  public deleteDirectoryDefinition(directoryId: string): void {
    const target = this.directories.find((d) => d.id === directoryId);
    if (!target || target.isSystem) return;
    this.directories = this.directories.filter((d) => d.id !== directoryId);
    if (this.activeDirectoryId === directoryId) {
      this.activeDirectoryId = this.directories[0]?.id || '';
    }
    this.saveDirectories();
    this.logActivity('delete', 'directory', target.customName || target.code, target.code, target.id);
    this.notify();
  }

  public addDirectoryRecord(
    directoryId: string,
    data: Omit<DirectoryRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): DirectoryRecord | null {
    const dir = this.directories.find((d) => d.id === directoryId);
    if (!dir) return null;
    const now = new Date().toISOString();
    const record: DirectoryRecord = {
      ...data,
      id: `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };
    const nextDir: DirectoryDefinition = {
      ...dir,
      updatedAt: now,
      records: [...dir.records, record],
    };
    this.directories = this.directories.map((d) => (d.id === directoryId ? nextDir : d));
    this.saveDirectories();
    this.logActivity('create', 'directory', `${record.code} — ${record.name}`, dir.code, record.id);
    this.notify();
    return record;
  }

  public updateDirectoryRecord(directoryId: string, updated: DirectoryRecord): void {
    const dir = this.directories.find((d) => d.id === directoryId);
    if (!dir) return;
    const now = new Date().toISOString();
    const nextRecord: DirectoryRecord = { ...updated, updatedAt: now };
    const nextDir: DirectoryDefinition = {
      ...dir,
      updatedAt: now,
      records: dir.records.map((r) => (r.id === nextRecord.id ? nextRecord : r)),
    };
    this.directories = this.directories.map((d) => (d.id === directoryId ? nextDir : d));
    this.saveDirectories();
    this.logActivity('update', 'directory', `${nextRecord.code} — ${nextRecord.name}`, dir.code, nextRecord.id);
    this.notify();
  }

  public toggleDirectoryRecordActive(directoryId: string, recordId: string): void {
    const dir = this.directories.find((d) => d.id === directoryId);
    const rec = dir?.records.find((r) => r.id === recordId);
    if (!dir || !rec) return;
    this.updateDirectoryRecord(directoryId, { ...rec, isActive: !rec.isActive });
  }

  public duplicateDirectoryRecord(directoryId: string, recordId: string): DirectoryRecord | null {
    const dir = this.directories.find((d) => d.id === directoryId);
    const source = dir?.records.find((r) => r.id === recordId);
    if (!dir || !source) return null;
    let suffix = 1;
    const existingCodes = new Set(dir.records.map((r) => r.code.toLowerCase()));
    let candidateCode = `${source.code}_COPY`;
    while (existingCodes.has(candidateCode.toLowerCase())) {
      suffix += 1;
      candidateCode = `${source.code}_COPY_${suffix}`;
    }
    const maxSort = dir.records.reduce((m, r) => Math.max(m, r.sortOrder), 0);
    return this.addDirectoryRecord(directoryId, {
      code: candidateCode,
      name: this.texts().copyOf(source.name),
      nameEn: source.nameEn ? `${source.nameEn} (copy)` : '',
      description: source.description || '',
      sortOrder: maxSort + 10,
      isActive: source.isActive,
      extra: source.extra ? { ...source.extra } : undefined,
    });
  }

  public deleteDirectoryRecord(directoryId: string, recordId: string): void {
    const dir = this.directories.find((d) => d.id === directoryId);
    const target = dir?.records.find((r) => r.id === recordId);
    if (!dir || !target) return;
    const now = new Date().toISOString();
    const nextDir: DirectoryDefinition = {
      ...dir,
      updatedAt: now,
      records: dir.records.filter((r) => r.id !== recordId),
    };
    this.directories = this.directories.map((d) => (d.id === directoryId ? nextDir : d));
    this.saveDirectories();
    this.logActivity('delete', 'directory', `${target.code} — ${target.name}`, dir.code, target.id);
    this.notify();
  }

  public resetDirectoryToDefaults(directoryId: string): void {
    const seed = createInitialDirectories().find((d) => d.id === directoryId);
    if (!seed) return;
    this.directories = this.directories.map((d) =>
      d.id === directoryId ? { ...seed, updatedAt: new Date().toISOString() } : d
    );
    this.saveDirectories();
    this.logActivity('update', 'directory', seed.code, this.texts().directories.resetActivity, seed.id);
    this.notify();
  }

  // --- Activity Log ---
  private texts(): ReturnType<typeof getTranslation>['storeTexts'] {
    return getTranslation(this.customization.language).storeTexts;
  }

  public logActivity(
    action: 'create' | 'update' | 'delete' | 'status_change' | 'priority_change',
    targetType: ActivityLogItem['targetType'],
    targetTitle: string,
    details: string,
    targetId?: string
  ): void {
    const currentUser = this.users.find((u) => u.id === this.currentUserId);
    const currentUserName = currentUser?.name || this.texts().currentUserFallback;
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

  // --- Hybrid Authentication, OIDC & TOTP 2FA ---
  private buildDefaultAuthAccounts(): AuthAccountCredential[] {
    return this.users.map((u, idx) => ({
      userId: u.id,
      email: u.email.toLowerCase(),
      password: idx === 0 ? 'ProjectFlow!2026' : 'demo1234',
      twoFactorEnabled: idx === 0 || idx === 2 || idx === 4,
      totpSecret: `PF_SECRET_${u.id.toUpperCase()}`,
      recoveryCodes: ['PF-9421-88K2', 'PF-3107-M4Q9'],
    }));
  }

  private initAuthState(): void {
    try {
      const storedAccounts = localStorage.getItem(STORAGE_KEY_AUTH_ACCOUNTS);
      const base = this.buildDefaultAuthAccounts();
      if (storedAccounts) {
        const parsed: AuthAccountCredential[] = JSON.parse(storedAccounts);
        const existingEmails = new Set(parsed.map((a) => a.email.toLowerCase()));
        this.authAccounts = [...parsed, ...base.filter((b) => !existingEmails.has(b.email))];
      } else {
        this.authAccounts = base;
      }

      const storedTrusted = localStorage.getItem(STORAGE_KEY_TRUSTED_DEVICES);
      this.trusted2faEmails = storedTrusted ? JSON.parse(storedTrusted) : [];

      const rawSession =
        localStorage.getItem(STORAGE_KEY_AUTH_SESSION) ||
        sessionStorage.getItem(STORAGE_KEY_AUTH_SESSION);
      if (rawSession) {
        const parsedSession: AuthSession = JSON.parse(rawSession);
        if (
          parsedSession &&
          parsedSession.userId &&
          this.users.some((u) => u.id === parsedSession.userId)
        ) {
          this.authSession = parsedSession;
          this.currentUserId = parsedSession.userId;
          this.isAuthenticated = true;
          return;
        }
      }
    } catch {
      this.authAccounts = this.buildDefaultAuthAccounts();
    }
    this.authSession = null;
    this.isAuthenticated = false;
  }

  private saveAuthAccounts(): void {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH_ACCOUNTS, JSON.stringify(this.authAccounts));
    } catch (e) {
      console.warn('Could not save auth accounts:', e);
    }
  }

  private saveAuthSession(session: AuthSession | null): void {
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
      sessionStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
      if (!session) return;
      const serialized = JSON.stringify(session);
      if (session.rememberMe) {
        localStorage.setItem(STORAGE_KEY_AUTH_SESSION, serialized);
      } else {
        sessionStorage.setItem(STORAGE_KEY_AUTH_SESSION, serialized);
      }
    } catch (e) {
      console.warn('Could not save auth session:', e);
    }
  }

  public maskEmailAddress(email: string): string {
    const clean = email.trim();
    const at = clean.indexOf('@');
    if (at <= 1) return clean;
    const local = clean.slice(0, at);
    const domain = clean.slice(at);
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***${domain}`;
  }

  public isTwoFactorEnabledForUser(userId: string): boolean {
    const acc = this.authAccounts.find((a) => a.userId === userId);
    return acc ? acc.twoFactorEnabled : false;
  }

  public toggleCurrentUserTwoFactor(enabled: boolean): void {
    const acc = this.authAccounts.find((a) => a.userId === this.currentUserId);
    if (!acc) return;
    acc.twoFactorEnabled = enabled;
    this.authAccounts = [...this.authAccounts];
    this.saveAuthAccounts();
    this.notify();
  }

  public resetTrustedDevicesForCurrentUser(): void {
    const user = this.users.find((u) => u.id === this.currentUserId);
    if (!user) return;
    const email = user.email.toLowerCase();
    this.trusted2faEmails = this.trusted2faEmails.filter((e) => e !== email);
    try {
      localStorage.setItem(STORAGE_KEY_TRUSTED_DEVICES, JSON.stringify(this.trusted2faEmails));
    } catch {
      // ignore
    }
    this.notify();
  }

  public async getTotpCodeForEmail(email: string): Promise<string> {
    const clean = email.trim().toLowerCase();
    const acc = this.authAccounts.find((a) => a.email === clean);
    const seed = acc?.totpSecret || `PF_SECRET_${clean}`;
    const step = Math.floor(Date.now() / 30000);
    const input = `${seed}:${step}`;

    try {
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoded = new TextEncoder().encode(input);
        const digest = await crypto.subtle.digest('SHA-256', encoded);
        const view = new DataView(digest);
        const num = view.getUint32(0, false) % 1000000;
        return String(num).padStart(6, '0');
      }
    } catch {
      // fallback deterministic 6-digit hash
    }

    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return String(Math.abs(hash) % 1000000).padStart(6, '0');
  }

  public async verifyPrimaryCredentials(
    identifier: string,
    password: string
  ): Promise<
    | { ok: true; user: User; requires2FA: boolean; maskedEmail: string }
    | { ok: false; errorCode: 'empty_fields' | 'invalid_credentials' }
  > {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password;
    if (!cleanId || !cleanPass) {
      return { ok: false, errorCode: 'empty_fields' };
    }

    const account = this.authAccounts.find(
      (a) => a.email === cleanId || a.email.split('@')[0] === cleanId
    );
    if (!account || account.password !== cleanPass) {
      return { ok: false, errorCode: 'invalid_credentials' };
    }

    const user = this.users.find((u) => u.id === account.userId);
    if (!user) {
      return { ok: false, errorCode: 'invalid_credentials' };
    }

    const isTrustedDevice = this.trusted2faEmails.includes(account.email);
    const requires2FA = account.twoFactorEnabled && !isTrustedDevice;

    return {
      ok: true,
      user,
      requires2FA,
      maskedEmail: this.maskEmailAddress(user.email),
    };
  }

  public resolveOidcLogin(
    provider: Exclude<AuthProviderId, 'local'>,
    tenantOrEmail?: string
  ):
    | {
        ok: true;
        user: User;
        requires2FA: boolean;
        maskedEmail: string;
        tenantId?: string;
      }
    | { ok: false; errorCode: 'missing_tenant' | 'unknown_tenant' } {
    if (provider === 'oidc_sso') {
      const cleanTenant = (tenantOrEmail || '').trim().toLowerCase();
      if (!cleanTenant || cleanTenant.length < 3) {
        return { ok: false, errorCode: 'missing_tenant' };
      }
      if (cleanTenant.includes('invalid') || cleanTenant.includes('error')) {
        return { ok: false, errorCode: 'unknown_tenant' };
      }
      const matchedUser =
        this.users.find((u) => u.email.toLowerCase() === cleanTenant) ||
        this.users.find(
          (u) => cleanTenant.includes('flowcloud') && u.email.includes('flowcloud')
        ) ||
        this.users[0];
      const account = this.authAccounts.find((a) => a.userId === matchedUser.id);
      const isTrusted = this.trusted2faEmails.includes(matchedUser.email.toLowerCase());
      const requires2FA = (account?.twoFactorEnabled ?? true) && !isTrusted;
      return {
        ok: true,
        user: matchedUser,
        requires2FA,
        maskedEmail: this.maskEmailAddress(matchedUser.email),
        tenantId: cleanTenant,
      };
    }

    const providerUserIdx = provider === 'google' ? 0 : provider === 'microsoft' ? 2 : 1;
    const user = this.users[providerUserIdx] || this.users[0];
    const account = this.authAccounts.find((a) => a.userId === user.id);
    const isTrusted = this.trusted2faEmails.includes(user.email.toLowerCase());
    const requires2FA = (account?.twoFactorEnabled ?? false) && !isTrusted;

    return {
      ok: true,
      user,
      requires2FA,
      maskedEmail: this.maskEmailAddress(user.email),
    };
  }

  public async verifyTwoFactorCode(
    email: string,
    code: string,
    isRecovery: boolean,
    trustDevice: boolean
  ): Promise<{ ok: true } | { ok: false; errorCode: 'invalid_otp' | 'invalid_recovery' }> {
    const cleanEmail = email.trim().toLowerCase();
    const account = this.authAccounts.find((a) => a.email === cleanEmail);
    const cleanCode = code.trim().toUpperCase();

    if (isRecovery) {
      const validCodes = account?.recoveryCodes || ['PF-9421-88K2', 'PF-3107-M4Q9'];
      if (!validCodes.includes(cleanCode)) {
        return { ok: false, errorCode: 'invalid_recovery' };
      }
    } else {
      const expectedTotp = await this.getTotpCodeForEmail(cleanEmail);
      const digitsOnly = cleanCode.replace(/\D/g, '');
      const isDemoValid = digitsOnly === expectedTotp || digitsOnly === '123456';
      if (digitsOnly.length !== 6 || !isDemoValid) {
        return { ok: false, errorCode: 'invalid_otp' };
      }
    }

    if (trustDevice) {
      if (!this.trusted2faEmails.includes(cleanEmail)) {
        this.trusted2faEmails = [...this.trusted2faEmails, cleanEmail];
        try {
          localStorage.setItem(STORAGE_KEY_TRUSTED_DEVICES, JSON.stringify(this.trusted2faEmails));
        } catch {
          // ignore
        }
      }
    }

    return { ok: true };
  }

  public registerLocalAccount(payload: {
    name: string;
    email: string;
    password: string;
    enable2FA: boolean;
  }):
    | { ok: true; user: User; requires2FA: boolean; maskedEmail: string }
    | { ok: false; errorCode: 'duplicate_email' | 'invalid_input' } {
    const cleanName = payload.name.trim();
    const cleanEmail = payload.email.trim().toLowerCase();
    if (!cleanName || !cleanEmail.includes('@') || payload.password.length < 6) {
      return { ok: false, errorCode: 'invalid_input' };
    }
    if (this.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { ok: false, errorCode: 'duplicate_email' };
    }

    const parts = cleanName.split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
        : cleanName.slice(0, 2).toUpperCase();

    const newUser: User = {
      id: `user-${Date.now().toString(36)}`,
      name: cleanName,
      email: cleanEmail,
      avatar: initials || 'PF',
      role: 'Member',
      status: 'active',
      hireDate: new Date().toISOString().slice(0, 10),
    };

    const newAccount: AuthAccountCredential = {
      userId: newUser.id,
      email: cleanEmail,
      password: payload.password,
      twoFactorEnabled: payload.enable2FA,
      totpSecret: `PF_SECRET_${newUser.id.toUpperCase()}`,
      recoveryCodes: ['PF-9421-88K2', 'PF-3107-M4Q9'],
    };

    this.users = [...this.users, newUser];
    this.authAccounts = [...this.authAccounts, newAccount];
    this.saveEmployees();
    this.saveAuthAccounts();

    return {
      ok: true,
      user: newUser,
      requires2FA: payload.enable2FA,
      maskedEmail: this.maskEmailAddress(cleanEmail),
    };
  }

  public completeAuthentication(payload: {
    userId: string;
    email: string;
    provider: AuthProviderId;
    tenantId?: string;
    twoFactorVerified: boolean;
    trustedDevice: boolean;
    rememberMe: boolean;
  }): void {
    const session: AuthSession = {
      ...payload,
      authenticatedAt: new Date().toISOString(),
    };
    this.authSession = session;
    this.currentUserId = payload.userId;
    this.isAuthenticated = true;
    this.saveAuthSession(session);
    this.notify();
  }

  public logout(): void {
    this.authSession = null;
    this.isAuthenticated = false;
    this.saveAuthSession(null);
    this.notify();
  }

  // --- Universal Entity-Linked Reminders, Recurrence & Notification Rules ---

  public formatLocalDateTime(date: Date): string {
    return formatRfcLocalDateTime(date);
  }

  public parseLocalDateTime(value: string): Date {
    return parseRfcLocalDateTime(value);
  }

  public getEffectiveReminderDueAt(rem: Reminder): string {
    return rem.status === 'snoozed' && rem.snoozedUntil ? rem.snoozedUntil : rem.dueAt;
  }

  public isReminderOverdue(rem: Reminder): boolean {
    if (rem.status !== 'active' && rem.status !== 'snoozed') return false;
    const dueMs = this.parseLocalDateTime(this.getEffectiveReminderDueAt(rem)).getTime();
    return dueMs < Date.now();
  }

  public isReminderDueToday(rem: Reminder): boolean {
    if (rem.status !== 'active' && rem.status !== 'snoozed') return false;
    const targetDay = this.getEffectiveReminderDueAt(rem).slice(0, 10);
    return targetDay === this.todayKey();
  }

  public getDueRemindersCount(): number {
    const endOfToday = `${this.todayKey()}T23:59`;
    return this.reminders.filter((r) => {
      if (r.status !== 'active' && r.status !== 'snoozed') return false;
      return this.getEffectiveReminderDueAt(r) <= endOfToday;
    }).length;
  }

  public getRecurrenceTemplates(): DirectoryRecord[] {
    const dir = this.directories.find((d) => d.id === 'recurrence_templates');
    if (!dir) return [];
    return [...dir.records]
      .filter((r) => r.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public calculateNextReminderDueAt(
    baseDueAt: string,
    rec: ReminderRecurrence
  ): string | null {
    return getNextRRuleOccurrence(baseDueAt, rec);
  }

  public getUpcomingReminderOccurrences(
    dueAt: string,
    rec: ReminderRecurrence,
    limit: number = 3
  ): string[] {
    return getUpcomingRRuleOccurrences(dueAt, rec, limit);
  }

  public getReminderEntityOptions(
    type: ReminderEntityType
  ): Array<{ value: string; label: string; subtitle?: string }> {
    switch (type) {
      case 'company':
        return this.companies.map((c) => ({
          value: c.id,
          label: c.name,
          subtitle: c.legalName || c.inn,
        }));
      case 'counterparty':
        return this.counterparties.map((cp) => ({
          value: cp.id,
          label: cp.name,
          subtitle: cp.legalName || cp.inn,
        }));
      case 'contact':
        return this.counterparties.flatMap((cp) =>
          (cp.contacts || []).map((cnt) => ({
            value: cnt.id,
            label: `${cnt.fullName} (${cp.name})`,
            subtitle: [cnt.position, cnt.email || cnt.phone].filter(Boolean).join(' · '),
          }))
        );
      case 'contract':
        return this.contracts.map((c) => ({
          value: c.id,
          label: `${c.number} — ${c.title}`,
          subtitle: `${c.amount.toLocaleString()} ${c.currency}`,
        }));
      case 'employee':
        return this.users.map((u) => ({
          value: u.id,
          label: u.name,
          subtitle: `${u.role} · ${u.email}`,
        }));
      case 'invoice':
        return this.invoices.map((i) => {
          const cp = this.counterparties.find((c) => c.id === i.counterpartyId);
          return {
            value: i.id,
            label: `${i.number} · ${i.totalAmount.toLocaleString()} ${i.currency}`,
            subtitle: cp ? `${cp.name} (${i.dueDate})` : i.dueDate,
          };
        });
      case 'calculation':
        return this.calculations.map((calc) => {
          const cp = this.counterparties.find((c) => c.id === calc.counterpartyId);
          return {
            value: calc.id,
            label: `${calc.number} · ${calc.billableAmount.toLocaleString()} ${calc.currency}`,
            subtitle: cp ? `${cp.name} (${calc.periodStart}..${calc.periodEnd})` : `${calc.periodStart}..${calc.periodEnd}`,
          };
        });
      case 'payment':
        return this.payments.map((p) => {
          const cp = this.counterparties.find((c) => c.id === p.counterpartyId);
          return {
            value: p.id,
            label: `${p.documentNumber || p.id} · ${p.amount.toLocaleString()} ${p.currency}`,
            subtitle: cp ? `${cp.name} (${p.paymentDate})` : p.paymentDate,
          };
        });
      case 'project':
        return this.projects.map((p) => ({
          value: p.id,
          label: `${p.key} · ${p.name}`,
          subtitle: p.status,
        }));
      case 'task':
        return this.tasks.map((tk) => ({
          value: tk.id,
          label: `${tk.id} · ${tk.title}`,
          subtitle: tk.dueDate,
        }));
      case 'document':
        return this.documents.map((doc) => ({
          value: doc.id,
          label: doc.title,
          subtitle: doc.fileName,
        }));
      case 'requirement':
        return this.requirements.map((req) => ({
          value: req.id,
          label: `${req.code} · ${req.title}`,
          subtitle: req.category,
        }));
      case 'expense':
        return this.expenses.map((ex) => ({
          value: ex.id,
          label: `${ex.title} (${ex.amount.toLocaleString()} ${ex.currency})`,
          subtitle: `${ex.vendor || ''} ${ex.date}`.trim(),
        }));
      case 'none':
      default:
        return [];
    }
  }

  public getReminderEntityInfo(
    type: ReminderEntityType,
    id?: string
  ): { typeLabel: string; label: string; subtitle?: string; navigable: boolean } {
    const t = getTranslation(this.customization.language);
    const typeLabel = t.entityTypes[type] || type;
    if (type === 'none' || !id) {
      return { typeLabel, label: t.entityTypes.none, navigable: false };
    }

    switch (type) {
      case 'company': {
        const c = this.companies.find((x) => x.id === id);
        return {
          typeLabel,
          label: c?.name || id,
          subtitle: c?.legalName,
          navigable: Boolean(c),
        };
      }
      case 'counterparty': {
        const cp = this.counterparties.find((x) => x.id === id);
        return {
          typeLabel,
          label: cp?.name || id,
          subtitle: cp?.legalName,
          navigable: Boolean(cp),
        };
      }
      case 'contact': {
        for (const cp of this.counterparties) {
          const cnt = (cp.contacts || []).find((x) => x.id === id);
          if (cnt) {
            return {
              typeLabel,
              label: cnt.fullName,
              subtitle: `${cp.name}${cnt.position ? ` · ${cnt.position}` : ''}`,
              navigable: true,
            };
          }
        }
        return { typeLabel, label: id, navigable: false };
      }
      case 'contract': {
        const c = this.contracts.find((x) => x.id === id);
        return {
          typeLabel,
          label: c ? `${c.number} · ${c.title}` : id,
          subtitle: c ? `${c.amount.toLocaleString(t.common.locale)} ${c.currency}` : undefined,
          navigable: Boolean(c),
        };
      }
      case 'employee': {
        const u = this.users.find((x) => x.id === id);
        return {
          typeLabel,
          label: u?.name || id,
          subtitle: u?.role,
          navigable: Boolean(u),
        };
      }
      case 'invoice': {
        const inv = this.invoices.find((x) => x.id === id);
        const cp = inv ? this.counterparties.find((c) => c.id === inv.counterpartyId) : undefined;
        return {
          typeLabel,
          label: inv ? `${inv.number} · ${inv.totalAmount.toLocaleString(t.common.locale)} ${inv.currency}` : id,
          subtitle: inv ? `${cp ? `${cp.name} · ` : ''}${inv.dueDate}` : undefined,
          navigable: Boolean(inv),
        };
      }
      case 'calculation': {
        const calc = this.calculations.find((x) => x.id === id);
        return {
          typeLabel,
          label: calc ? `${calc.number} · ${calc.billableAmount.toLocaleString(t.common.locale)} ${calc.currency}` : id,
          subtitle: calc ? `${calc.periodStart} — ${calc.periodEnd}` : undefined,
          navigable: Boolean(calc),
        };
      }
      case 'payment': {
        const p = this.payments.find((x) => x.id === id);
        const cp = p ? this.counterparties.find((c) => c.id === p.counterpartyId) : undefined;
        return {
          typeLabel,
          label: p ? `${p.documentNumber || p.id} · ${p.amount.toLocaleString(t.common.locale)} ${p.currency}` : id,
          subtitle: cp?.name || p?.paymentDate,
          navigable: Boolean(p),
        };
      }
      case 'project': {
        const p = this.projects.find((x) => x.id === id);
        return {
          typeLabel,
          label: p ? `${p.key} · ${p.name}` : id,
          navigable: Boolean(p),
        };
      }
      case 'task': {
        const tk = this.tasks.find((x) => x.id === id);
        return {
          typeLabel,
          label: tk ? `${tk.id} · ${tk.title}` : id,
          navigable: Boolean(tk),
        };
      }
      case 'document': {
        const d = this.documents.find((x) => x.id === id);
        return {
          typeLabel,
          label: d?.title || id,
          subtitle: d?.fileName,
          navigable: Boolean(d),
        };
      }
      case 'requirement': {
        const r = this.requirements.find((x) => x.id === id);
        return {
          typeLabel,
          label: r ? `${r.code} · ${r.title}` : id,
          subtitle: r?.category,
          navigable: Boolean(r),
        };
      }
      case 'expense': {
        const e = this.expenses.find((x) => x.id === id);
        return {
          typeLabel,
          label: e ? `${e.title} (${e.amount.toLocaleString(t.common.locale)} ${e.currency})` : id,
          subtitle: e?.vendor,
          navigable: Boolean(e),
        };
      }
    }
  }

  public openReminderDetail(reminderId: string, navigateToView: boolean = true): void {
    const exists = this.reminders.some((r) => r.id === reminderId);
    if (!exists) return;
    if (this.customization.showActivityPanel) {
      this.customization = { ...this.customization, showActivityPanel: false };
      this.saveCustomization();
    }
    this.detailReminderId = reminderId;
    if (navigateToView) {
      this.setActiveView('reminder-detail');
    } else {
      this.setActiveView('reminder-detail');
    }
  }

  public canOpenActivityTarget(
    targetType?: ActivityLogItem['targetType'],
    targetId?: string
  ): boolean {
    if (!targetType || !targetId) return false;
    switch (targetType) {
      case 'reminder':
        return this.reminders.some((r) => r.id === targetId);
      case 'task':
        return this.tasks.some((tk) => tk.id === targetId);
      case 'project':
        return this.projects.some((p) => p.id === targetId);
      case 'company':
        return this.companies.some((c) => c.id === targetId);
      case 'counterparty':
        return this.counterparties.some((cp) => cp.id === targetId);
      case 'contract':
        return this.contracts.some((c) => c.id === targetId);
      case 'calculation':
        return this.calculations.some((c) => c.id === targetId);
      case 'employee':
        return this.users.some((u) => u.id === targetId);
      case 'requirement':
        return this.requirements.some((r) => r.id === targetId);
      case 'knowledge':
        return this.knowledgeArticles.some((k) => k.id === targetId);
      case 'document':
        return this.documents.some((d) => d.id === targetId);
      case 'invoice':
        return this.invoices.some((i) => i.id === targetId);
      case 'payment':
        return this.payments.some((p) => p.id === targetId);
      case 'time_entry':
        return (
          this.timeEntries.some((te) => te.id === targetId) ||
          this.tasks.some((tk) => tk.id === targetId)
        );
      case 'expense':
        return (
          this.expenses.some((e) => e.id === targetId) ||
          this.tasks.some((tk) => tk.id === targetId)
        );
      case 'directory':
        return this.directories.some((d) => d.id === targetId);
      case 'chat':
        return (
          this.chatChannels.some((c) => c.id === targetId) ||
          this.projects.some((p) => p.id === targetId) ||
          this.tasks.some((tk) => tk.id === targetId)
        );
      default:
        return false;
    }
  }

  public openActivityTarget(
    targetType?: ActivityLogItem['targetType'],
    targetId?: string
  ): void {
    if (!targetType || !targetId || !this.canOpenActivityTarget(targetType, targetId)) {
      return;
    }
    if (this.customization.showActivityPanel) {
      this.customization = { ...this.customization, showActivityPanel: false };
      this.saveCustomization();
    }
    switch (targetType) {
      case 'reminder':
        this.openReminderDetail(targetId);
        break;
      case 'task':
        this.openTaskDetail(targetId);
        break;
      case 'project':
        this.openProjectDetail(targetId);
        break;
      case 'company':
        this.openCompanyDetail(targetId);
        break;
      case 'counterparty':
        this.openCounterpartyDetail(targetId);
        break;
      case 'contract':
        this.openContractDetail(targetId);
        break;
      case 'calculation':
        this.openCalculationDetail(targetId);
        break;
      case 'employee':
        this.openEmployeeDetail(targetId);
        break;
      case 'requirement':
        this.openRequirementDetail(targetId);
        break;
      case 'knowledge':
        this.openKnowledgeBase({ articleId: targetId });
        break;
      case 'document':
        this.openDocuments();
        break;
      case 'invoice': {
        const inv = this.invoices.find((i) => i.id === targetId);
        if (inv) this.openContractDetail(inv.contractId);
        else this.setActiveView('payments');
        break;
      }
      case 'payment':
        this.openPaymentDetail(targetId);
        break;
      case 'time_entry':
        if (this.timeEntries.some((te) => te.id === targetId)) {
          this.openTimeEntryDetail(targetId);
        } else {
          this.openTaskDetail(targetId);
        }
        break;
      case 'expense':
        if (this.expenses.some((e) => e.id === targetId)) {
          this.openExpenseDetail(targetId);
        } else {
          this.openTaskDetail(targetId);
        }
        break;
      case 'directory':
        this.openDirectory(targetId);
        break;
      case 'chat': {
        const ch = this.chatChannels.find((c) => c.id === targetId);
        if (ch) {
          this.openProjectChat(ch.projectId, ch.id);
        } else {
          const tk = this.tasks.find((t) => t.id === targetId);
          if (tk) {
            this.openProjectChat(tk.projectId);
          } else {
            this.openProjectChat(targetId);
          }
        }
        break;
      }
      default:
        break;
    }
    this.notify();
  }

  public getReminderRelatedObjects(rem: Reminder): ReminderRelatedObject[] {
    const result: ReminderRelatedObject[] = [];
    const seen = new Set<string>();

    const pushEntity = (type: ReminderEntityType, id: string | undefined, isPrimary: boolean) => {
      if (!id || type === 'none') return;
      const key = `${type}:${id}`;
      if (seen.has(key)) return;
      const info = this.getReminderEntityInfo(type, id);
      if (!isPrimary && !info.navigable) return;
      seen.add(key);
      result.push({
        type,
        id,
        typeLabel: info.typeLabel,
        label: info.label,
        subtitle: info.subtitle,
        isPrimary,
        navigable: info.navigable,
      });
    };

    const type = rem.entityType;
    const id = rem.entityId;
    if (type !== 'none' && id) {
      pushEntity(type, id, true);

      switch (type) {
        case 'contract': {
          const c = this.contracts.find((x) => x.id === id);
          if (c) {
            pushEntity('project', c.projectId, false);
            pushEntity('company', c.companyId, false);
            pushEntity('counterparty', c.counterpartyId, false);
          }
          break;
        }
        case 'invoice': {
          const inv = this.invoices.find((x) => x.id === id);
          if (inv) {
            pushEntity('contract', inv.contractId, false);
            pushEntity('calculation', inv.calculationId, false);
            pushEntity('company', inv.companyId, false);
            pushEntity('counterparty', inv.counterpartyId, false);
          }
          break;
        }
        case 'calculation': {
          const calc = this.calculations.find((x) => x.id === id);
          if (calc) {
            pushEntity('contract', calc.contractId, false);
            pushEntity('project', calc.projectId, false);
            pushEntity('company', calc.companyId, false);
            pushEntity('counterparty', calc.counterpartyId, false);
            pushEntity('invoice', calc.invoiceId, false);
          }
          break;
        }
        case 'payment': {
          const pay = this.payments.find((x) => x.id === id);
          if (pay) {
            pushEntity('invoice', pay.invoiceId, false);
            pushEntity('contract', pay.contractId, false);
            pushEntity('company', pay.companyId, false);
            pushEntity('counterparty', pay.counterpartyId, false);
          }
          break;
        }
        case 'project': {
          const proj = this.projects.find((x) => x.id === id);
          if (proj) {
            pushEntity('company', proj.companyId, false);
            pushEntity('counterparty', proj.counterpartyId, false);
          }
          break;
        }
        case 'task': {
          const tk = this.tasks.find((x) => x.id === id);
          if (tk) {
            pushEntity('project', tk.projectId, false);
            const proj = this.projects.find((p) => p.id === tk.projectId);
            if (proj) pushEntity('company', proj.companyId, false);
          }
          break;
        }
        case 'requirement': {
          const req = this.requirements.find((x) => x.id === id);
          if (req) {
            pushEntity('project', req.projectId, false);
          }
          break;
        }
        case 'contact': {
          const cp = this.counterparties.find((c) =>
            (c.contacts || []).some((ct) => ct.id === id)
          );
          if (cp) pushEntity('counterparty', cp.id, false);
          break;
        }
        case 'expense': {
          const exp = this.expenses.find((x) => x.id === id);
          if (exp) {
            pushEntity('project', exp.projectId, false);
            pushEntity('task', exp.taskId, false);
          }
          break;
        }
        case 'document': {
          const doc = this.documents.find((x) => x.id === id);
          if (doc) {
            pushEntity('project', doc.projectId, false);
            pushEntity('contract', doc.contractId, false);
            pushEntity('company', doc.companyId, false);
            pushEntity('counterparty', doc.counterpartyId, false);
            pushEntity('task', doc.taskId, false);
          }
          break;
        }
        default:
          break;
      }
    }

    return result;
  }

  public navigateToReminderEntity(type: ReminderEntityType, id?: string): void {
    if (!id || type === 'none') return;
    switch (type) {
      case 'company':
        this.openCompanyDetail(id);
        break;
      case 'counterparty':
        this.openCounterpartyDetail(id);
        break;
      case 'contact': {
        const cp = this.counterparties.find((c) => (c.contacts || []).some((ct) => ct.id === id));
        if (cp) this.openCounterpartyDetail(cp.id);
        break;
      }
      case 'contract':
        this.openContractDetail(id);
        break;
      case 'employee':
        this.openEmployeeDetail(id);
        break;
      case 'invoice': {
        const inv = this.invoices.find((i) => i.id === id);
        if (inv) this.openContractDetail(inv.contractId);
        else this.setActiveView('payments');
        break;
      }
      case 'calculation':
        this.openCalculationDetail(id);
        break;
      case 'payment':
        this.openPaymentDetail(id);
        break;
      case 'project':
        this.openProjectDetail(id);
        break;
      case 'task':
        this.openTaskDetail(id);
        break;
      case 'document':
        this.setActiveView('documents');
        break;
      case 'requirement':
        this.openRequirementDetail(id);
        break;
      case 'expense':
        this.openExpenseDetail(id);
        break;
    }
  }

  public getRemindersForEntity(type: ReminderEntityType, entityId: string): Reminder[] {
    return this.reminders
      .filter((r) => r.entityType === type && r.entityId === entityId)
      .sort((a, b) => this.getEffectiveReminderDueAt(a).localeCompare(this.getEffectiveReminderDueAt(b)));
  }

  public addReminder(
    data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>
  ): Reminder {
    const now = new Date().toISOString();
    const created: Reminder = {
      ...data,
      id: `rem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.reminders = [created, ...this.reminders];
    this.saveReminders();
    const t = getTranslation(this.customization.language);
    const info = this.getReminderEntityInfo(created.entityType, created.entityId);
    this.logActivity('create', 'reminder', created.title, `${info.typeLabel}: ${info.label}`, created.id);
    this.addNotification('success', t.reminders.toastCreated, created.title, {
      targetType: 'reminder',
      targetId: created.id,
      actionLabel: t.reminders.openReminderAction,
    });
    this.notify();
    return created;
  }

  public updateReminder(updated: Reminder): void {
    const next: Reminder = {
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    this.reminders = this.reminders.map((r) => (r.id === next.id ? next : r));
    this.saveReminders();
    const t = getTranslation(this.customization.language);
    this.logActivity('update', 'reminder', next.title, next.dueAt, next.id);
    this.addNotification('info', t.reminders.toastUpdated, next.title, {
      targetType: 'reminder',
      targetId: next.id,
      actionLabel: t.reminders.openReminderAction,
    });
    this.notify();
  }

  public deleteReminder(id: string): void {
    const target = this.reminders.find((r) => r.id === id);
    if (!target) return;
    this.reminders = this.reminders.filter((r) => r.id !== id);
    if (this.detailReminderId === id) {
      this.detailReminderId = this.reminders[0]?.id || '';
      if (this.activeView === 'reminder-detail') {
        this.activeView = 'reminders';
        this.syncHistory(true);
      }
    }
    this.saveReminders();
    const t = getTranslation(this.customization.language);
    this.logActivity('delete', 'reminder', target.title, target.dueAt, target.id);
    this.addNotification('warning', t.reminders.toastDeleted, target.title);
    this.notify();
  }

  public completeReminder(id: string): { advanced: boolean; nextDueAt?: string } {
    const rem = this.reminders.find((r) => r.id === id);
    if (!rem) return { advanced: false };
    const t = getTranslation(this.customization.language);
    const now = new Date().toISOString();

    const nextCount = (rem.recurrence.occurrenceCount || 0) + 1;
    const hitMaxOccurrences =
      rem.recurrence.endType === 'max_occurrences' &&
      Boolean(rem.recurrence.maxOccurrences) &&
      nextCount >= (rem.recurrence.maxOccurrences || 1);

    const nextDue =
      rem.recurrence.enabled && !hitMaxOccurrences
        ? this.calculateNextReminderDueAt(this.getEffectiveReminderDueAt(rem), rem.recurrence)
        : null;

    if (nextDue) {
      const updated: Reminder = {
        ...rem,
        dueAt: nextDue,
        snoozedUntil: undefined,
        status: 'active',
        recurrence: {
          ...rem.recurrence,
          occurrenceCount: nextCount,
        },
        updatedAt: now,
      };
      this.reminders = this.reminders.map((r) => (r.id === rem.id ? updated : r));
      this.saveReminders();
      const formattedNext = this.parseLocalDateTime(nextDue).toLocaleString(t.common.locale, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      this.logActivity('status_change', 'reminder', rem.title, t.reminders.toastAdvanced(formattedNext), rem.id);
      this.addNotification('success', t.reminders.toastAdvanced(formattedNext), rem.title, {
        targetType: 'reminder',
        targetId: rem.id,
        actionLabel: t.reminders.openReminderAction,
      });
      this.notify();
      return { advanced: true, nextDueAt: nextDue };
    }

    const completed: Reminder = {
      ...rem,
      status: 'completed',
      snoozedUntil: undefined,
      completedAt: now,
      recurrence: {
        ...rem.recurrence,
        occurrenceCount: nextCount,
      },
      updatedAt: now,
    };
    this.reminders = this.reminders.map((r) => (r.id === rem.id ? completed : r));
    this.saveReminders();
    this.logActivity('status_change', 'reminder', rem.title, t.reminders.toastCompleted, rem.id);
    this.addNotification('success', t.reminders.toastCompleted, rem.title, {
      targetType: 'reminder',
      targetId: rem.id,
      actionLabel: t.reminders.openReminderAction,
    });
    this.notify();
    return { advanced: false };
  }

  public snoozeReminder(id: string, snoozedUntil: string): void {
    const rem = this.reminders.find((r) => r.id === id);
    if (!rem) return;
    const t = getTranslation(this.customization.language);
    const updated: Reminder = {
      ...rem,
      status: 'snoozed',
      snoozedUntil,
      updatedAt: new Date().toISOString(),
    };
    this.reminders = this.reminders.map((r) => (r.id === rem.id ? updated : r));
    this.saveReminders();
    const formatted = this.parseLocalDateTime(snoozedUntil).toLocaleString(t.common.locale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    this.logActivity('status_change', 'reminder', rem.title, t.reminders.toastSnoozed(formatted), rem.id);
    this.addNotification('info', t.reminders.toastSnoozed(formatted), rem.title, {
      targetType: 'reminder',
      targetId: rem.id,
      actionLabel: t.reminders.openReminderAction,
    });
    this.notify();
  }

  public toggleReminderPause(id: string): void {
    const rem = this.reminders.find((r) => r.id === id);
    if (!rem) return;
    const t = getTranslation(this.customization.language);
    const nextStatus = rem.status === 'paused' ? 'active' : 'paused';
    const updated: Reminder = {
      ...rem,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    this.reminders = this.reminders.map((r) => (r.id === rem.id ? updated : r));
    this.saveReminders();
    const msg = nextStatus === 'paused' ? t.reminders.toastPaused : t.reminders.toastResumed;
    this.logActivity('status_change', 'reminder', rem.title, msg, rem.id);
    this.addNotification('info', msg, rem.title, {
      targetType: 'reminder',
      targetId: rem.id,
      actionLabel: t.reminders.openReminderAction,
    });
    this.notify();
  }

  // --- Notification scheduler: lead offsets, quiet hours, repeat nag, escalation ---

  private reminderSchedulerId?: number;

  public startReminderScheduler(): void {
    if (this.reminderSchedulerId !== undefined) return;
    this.reminderSchedulerId = window.setInterval(
      () => this.runReminderSchedulerTick(),
      30000
    );
    this.runReminderSchedulerTick();
  }

  private leadOffsetMs(rule: ReminderNotificationRule): number {
    if (rule.offsetUnit === 'at_time' || rule.offsetValue === 0) return 0;
    const unitMs =
      rule.offsetUnit === 'minutes'
        ? 60000
        : rule.offsetUnit === 'hours'
        ? 3600000
        : rule.offsetUnit === 'days'
        ? 86400000
        : 604800000;
    return rule.offsetValue * unitMs;
  }

  private isQuietHour(): boolean {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 8;
  }

  public runReminderSchedulerTick(): void {
    const t = getTranslation(this.customization.language);
    const nowMs = Date.now();
    const quiet = this.isQuietHour();
    let changed = false;

    for (const original of [...this.reminders]) {
      if (original.status !== 'active' && original.status !== 'snoozed') continue;

      let rem = original;
      // snooze window elapsed → reactivate before checking deliveries
      if (
        rem.status === 'snoozed' &&
        rem.snoozedUntil &&
        nowMs >= this.parseLocalDateTime(rem.snoozedUntil).getTime()
      ) {
        rem = { ...rem, status: 'active', snoozedUntil: undefined };
        changed = true;
      }

      const effectiveDue = this.getEffectiveReminderDueAt(rem);
      const dueMs = this.parseLocalDateTime(effectiveDue).getTime();
      const enabledRules = rem.notifications.rules.filter((r) => r.enabled);
      const keys = rem.triggeredKeys ? [...rem.triggeredKeys] : [];
      const firedChannels: string[] = [];
      let nagFired = false;

      for (const rule of enabledRules) {
        if (nowMs < dueMs - this.leadOffsetMs(rule)) continue;
        const key = `${rule.id}|${effectiveDue}`;
        if (keys.includes(key)) continue;
        if (rem.notifications.quietHoursRespect && quiet) continue;
        keys.push(key);
        firedChannels.push(t.reminders.channels[rule.channel]);
      }

      // repeat nag: overdue, unacknowledged, at least nagMinutes since the last delivery
      const nagMinutes = rem.notifications.repeatNagMinutes || 0;
      const overdueNow = nowMs >= dueMs;
      if (nagMinutes > 0 && overdueNow && !quiet && firedChannels.length === 0) {
        const nagDone = keys.filter((k) => k.startsWith(`nag|${effectiveDue}|`)).length;
        const lastMs = rem.lastTriggeredAt ? new Date(rem.lastTriggeredAt).getTime() : dueMs;
        if (nagDone < 3 && nowMs - lastMs >= nagMinutes * 60000) {
          keys.push(`nag|${effectiveDue}|${nagDone}`);
          firedChannels.push(...enabledRules.map((r) => t.reminders.channels[r.channel]));
          nagFired = true;
        }
      }

      // escalation of an unacknowledged overdue reminder to the designated user
      const escId = rem.notifications.escalationUserId;
      const escalate = Boolean(escId) && rem.notifications.requireAck && overdueNow && !quiet
        && !keys.includes(`esc|${effectiveDue}`);
      if (escalate) keys.push(`esc|${effectiveDue}`);

      if (firedChannels.length === 0 && !escalate) {
        if (rem !== original) {
          this.reminders = this.reminders.map((r) => (r.id === rem.id ? rem : r));
        }
        continue;
      }

      const nowIso = new Date().toISOString();
      const updated: Reminder = {
        ...rem,
        triggeredKeys: keys,
        lastTriggeredAt: firedChannels.length > 0 ? nowIso : rem.lastTriggeredAt,
        updatedAt: nowIso,
      };
      this.reminders = this.reminders.map((r) => (r.id === rem.id ? updated : r));
      changed = true;

      const entityLabel = this.getReminderEntityInfo(rem.entityType, rem.entityId).label;

      if (firedChannels.length > 0) {
        const channels = Array.from(new Set(firedChannels)).join(', ');
        const title = nagFired ? t.reminders.deliveryNagTitle : t.reminders.deliveryTitle;
        const custom = enabledRules.find((r) => r.customMessage)?.customMessage;
        const body = custom || `${rem.title} (${entityLabel})`;
        this.addNotification(
          rem.priority === 'urgent' || rem.priority === 'high' ? 'warning' : 'info',
          title,
          body,
          {
            targetType: 'reminder',
            targetId: rem.id,
            actionLabel: t.reminders.openReminderAction,
          }
        );
        this.logActivity('update', 'reminder', rem.title, t.reminders.activityDelivered(channels), rem.id);
      }

      if (escalate) {
        const escUser = this.users.find((u) => u.id === escId);
        if (escUser) {
          this.addNotification(
            'warning',
            t.reminders.escalationTitle(escUser.name),
            `${rem.title} (${entityLabel})`,
            {
              targetType: 'reminder',
              targetId: rem.id,
              actionLabel: t.reminders.openReminderAction,
            }
          );
          this.logActivity('update', 'reminder', rem.title, t.reminders.activityEscalated(escUser.name), rem.id);
        }
      }
    }

    if (changed) this.notify();
  }

  public triggerReminderNotification(id: string): void {
    const rem = this.reminders.find((r) => r.id === id);
    if (!rem) return;
    const t = getTranslation(this.customization.language);
    const enabledRules = rem.notifications.rules.filter((r) => r.enabled);
    const channelNames = enabledRules.length > 0
      ? enabledRules.map((r) => t.reminders.channels[r.channel]).join(', ')
      : t.reminders.channels.in_app;
    const now = new Date().toISOString();
    const updated: Reminder = {
      ...rem,
      lastTriggeredAt: now,
      updatedAt: now,
    };
    this.reminders = this.reminders.map((r) => (r.id === rem.id ? updated : r));
    this.saveReminders();
    const entityInfo = this.getReminderEntityInfo(rem.entityType, rem.entityId);
    this.logActivity('update', 'reminder', rem.title, t.reminders.toastTestSent(channelNames), rem.id);
    this.addNotification(
      rem.priority === 'urgent' ? 'warning' : 'info',
      t.reminders.toastTestSent(channelNames),
      `${rem.title} (${entityInfo.label})`,
      {
        targetType: 'reminder',
        targetId: rem.id,
        actionLabel: t.reminders.openReminderAction,
      }
    );
    this.notify();
  }
}

export const store = AppStore.getInstance();



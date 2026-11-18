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

export type BankCurrency = 'RUB' | 'USD' | 'EUR' | 'CNY' | 'GBP' | 'KZT' | 'AED';

export interface BankRequisite {
  id: string;
  bankName: string;
  currency: BankCurrency;
  accountNumber: string;
  bik?: string;
  corrAccount?: string;
  swift?: string;
  iban?: string;
  bankAddress?: string;
  comment?: string;
  isDefault?: boolean;
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
  bankAccounts?: BankRequisite[];
}

export type CounterpartyType = 'client' | 'vendor' | 'partner' | 'contractor';
export type CounterpartyStatus = 'active' | 'pending' | 'blocked';

export interface CounterpartyContact {
  id: string;
  fullName: string;
  position?: string;
  department?: string;
  phone?: string;
  additionalPhone?: string;
  email?: string;
  messenger?: string;
  birthDate?: string; // YYYY-MM-DD
  comment?: string;
  isPrimary?: boolean;
}

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
  contacts?: CounterpartyContact[];
  status: CounterpartyStatus;
  rating: number;
  notes: string;
  bankAccounts?: BankRequisite[];
}

export type ContractStatus = 'draft' | 'on_approval' | 'active' | 'completed' | 'terminated';
export type ContractType = 'service' | 'supply' | 'license' | 'nda' | 'sla';
export type CalculationFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
export type CalculationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'invoiced';

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
  billingFrequency?: CalculationFrequency;
  description: string;
}

export interface CalculationItem {
  id: string;
  itemType: 'time_entry' | 'expense' | 'manual';
  sourceId?: string;
  date: string; // YYYY-MM-DD
  taskId?: string;
  userId?: string;
  title: string;
  quantity: number;
  unit: string;
  billable: boolean;
  baseRate: number;
  unitPrice: number; // 0 when !billable
  amount: number;    // 0 when !billable
  isPriorPeriod?: boolean;
}

export interface Calculation {
  id: string;
  number: string;
  contractId: string;
  projectId?: string;
  companyId: string;
  counterpartyId: string;
  frequency: CalculationFrequency;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  includePriorUnaccounted: boolean;
  currency: 'RUB' | 'USD' | 'EUR';
  status: CalculationStatus;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableAmount: number;
  items: CalculationItem[];
  notes: string;
  approvedDate?: string;
  invoiceId?: string;
  createdAt: string;
}

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'sent'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type PaymentMethod = 'bank_transfer' | 'card' | 'cash' | 'offset';
export type PaymentDirection = 'incoming' | 'outgoing';

export interface InvoicePayment {
  id: string;
  direction: PaymentDirection;
  invoiceId: string;
  contractId: string;
  companyId: string;
  counterpartyId: string;
  companyBankAccountId?: string;
  counterpartyBankAccountId?: string;
  companyBankSnapshot?: string;
  counterpartyBankSnapshot?: string;
  amount: number;
  currency: BankCurrency;
  paymentDate: string; // YYYY-MM-DD
  method: PaymentMethod;
  documentNumber: string;
  notes: string;
  createdAt: string;
}

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
  calculationId?: string;
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
  specDocumentId?: string;
}

export type RequirementType = 'functional' | 'non_functional';
export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';
export type RequirementStatus = 'draft' | 'approved' | 'in_progress' | 'implemented' | 'verified';

export interface ProjectRequirement {
  id: string;
  projectId: string;
  code: string; // e.g., FR-01, NFR-01
  type: RequirementType;
  title: string;
  description: string;
  category: string;
  priority: RequirementPriority;
  status: RequirementStatus;
  acceptanceCriteria: string[];
  linkedKnowledgeIds: string[];
  linkedTaskIds?: string[];
  sourceDocumentId?: string;
  clarifications?: TaskAiClarificationMessage[];
  aiAnalyses?: AnalysisSummary[];
  createdAt: string;
  updatedAt: string;
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
  requirementIds?: string[];
  knowledgeArticleIds?: string[];
  /** AI-generated task description stored as markdown (applied from the AI panel) */
  aiDescription?: string;
  aiAnalyses?: AnalysisSummary[];
  aiClarifications?: TaskAiClarificationMessage[];
}

export interface TaskAiContextRef {
  kind: 'knowledge' | 'document' | 'requirement';
  id: string;
  title: string;
  reason?: string;
}

export interface AnalysisDecompositionItem {
  title: string;
  estimatedHours?: number;
}

/**
 * One saved AI analysis summary. A task or requirement can accumulate many
 * summaries over time (different context, models, moments); every record keeps
 * its author, model and creation date. Newest entries are stored first.
 */
export interface AnalysisSummary {
  id: string;
  kind: 'task' | 'requirement';
  authorId: string;
  model: string;
  createdAt: string;
  overview: string;
  effortAssessment?: string;
  risks: string[];
  recommendations: string[];
  /** Task analyses: suggested subtask titles */
  suggestedSubtasks?: string[];
  /** Requirement analyses: decomposition into tasks */
  decomposition?: AnalysisDecompositionItem[];
  /** Requirement analyses: refined requirement text */
  clarification?: string;
  contextSources: TaskAiContextRef[];
}

export interface TaskAiClarificationMessage {
  id: string;
  role: 'user' | 'assistant';
  authorId?: string;
  content: string;
  createdAt: string;
  model?: string;
  contextSources?: TaskAiContextRef[];
}

export interface TaskAiAnalysis {
  overview: string;
  risks: string[];
  recommendations: string[];
  effortAssessment: string;
  suggestedSubtasks: string[];
  contextSources: TaskAiContextRef[];
  model?: string;
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
  documentIds?: string[];
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
  documentIds?: string[];
  createdAt: string;
}

export type ThemeMode = 'dark' | 'light' | 'cyberpunk' | 'matrix' | 'barbie' | 'high-contrast';
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

export interface ProjectChatReaction {
  emoji: string;
  userIds: string[];
}

export interface ProjectChatMessage {
  id: string;
  projectId: string;
  senderId: string;
  text: string;
  replyToId?: string;
  taskRefId?: string;
  pinned?: boolean;
  reactions?: ProjectChatReaction[];
  createdAt: string;
  editedAt?: string;
}

export type ActiveView =
  | 'dashboard'
  | 'kanban'
  | 'gantt'
  | 'grid'
  | 'calendar'
  | 'analytics'
  | 'companies'
  | 'company-detail'
  | 'employees'
  | 'employee-detail'
  | 'counterparties'
  | 'counterparty-detail'
  | 'contracts'
  | 'contract-detail'
  | 'calculations'
  | 'calculation-detail'
  | 'payments'
  | 'directories'
  | 'projects'
  | 'project-detail'
  | 'requirements'
  | 'requirement-detail'
  | 'project-chat'
  | 'knowledge-base'
  | 'documents'
  | 'task-detail'
  | 'time-tracking'
  | 'expenses'
  | 'settings'
  | 'profile-settings'
  | 'storybook'
  | 'design-tokens'
  | 'material-icons';

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
    | 'calculation'
    | 'invoice'
    | 'payment'
    | 'directory'
    | 'time_entry'
    | 'expense'
    | 'chat'
    | 'knowledge'
    | 'document'
    | 'requirement'
    | 'settings';
  targetId?: string;
  targetTitle: string;
  details: string;
}

export type KnowledgeScope = 'project' | 'company' | 'general';

export type KnowledgeCategory =
  | 'architecture'
  | 'runbook'
  | 'onboarding'
  | 'postmortem'
  | 'playbook'
  | 'decision'
  | 'client_context';

export type KnowledgeArticleStatus = 'draft' | 'published' | 'verified' | 'archived';

export interface KnowledgeArticleRevision {
  id: string;
  editedById: string;
  editedAt: string;
  summary: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  scope: KnowledgeScope;
  projectId?: string;
  companyId?: string;
  category: KnowledgeCategory;
  status: KnowledgeArticleStatus;
  tags: string[];
  authorId: string;
  reviewerId?: string;
  pinned?: boolean;
  helpfulUserIds: string[];
  linkedTaskIds?: string[];
  viewsCount: number;
  revisions: KnowledgeArticleRevision[];
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
}

export type DocumentScope =
  | 'general'
  | 'company'
  | 'project'
  | 'contract'
  | 'counterparty'
  | 'task';

export type DocumentCategory =
  | 'contract'
  | 'act_invoice'
  | 'spec'
  | 'design'
  | 'legal'
  | 'policy'
  | 'report'
  | 'other';

export type DocumentStatus = 'draft' | 'review' | 'approved' | 'archived';

export interface DocumentVersion {
  version: number;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedById: string;
  uploadedAt: string;
  notes: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  fileName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  category: DocumentCategory;
  status: DocumentStatus;
  scope: DocumentScope;
  companyId?: string;
  projectId?: string;
  contractId?: string;
  counterpartyId?: string;
  taskId?: string;
  timeEntryId?: string;
  expenseId?: string;
  description: string;
  tags: string[];
  version: number;
  uploadedById: string;
  dataUrl?: string;
  textContent?: string;
  versions: DocumentVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

export interface AiUsageDay {
  date: string; // YYYY-MM-DD
  requests: number;
  tokens: number;
}

export interface AiBudgetConfig {
  dailyRequests: number; // 0 = unlimited
  dailyTokens: number; // 0 = unlimited
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
  tablePageSize: number;
  cardGridPageSize: number;
  aiEndpoint: string;
  aiModel: string;
  aiBudget: AiBudgetConfig;
  timezone: string;
  defaultProjectId: string;
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

// --- Master Reference Data & Classifiers ---
export type DirectoryGroupKey =
  | 'organization'
  | 'operations'
  | 'finance'
  | 'measurements'
  | 'contracts_geo'
  | 'custom';

export type DirectoryFieldType = 'text' | 'number' | 'boolean' | 'select';

export interface DirectoryFieldOption {
  value: string;
  labelKey?: string;
  customLabel?: string;
}

export interface DirectoryFieldDef {
  key: string;
  labelKey?: string;
  customLabel?: string;
  type: DirectoryFieldType;
  required?: boolean;
  mono?: boolean;
  align?: 'left' | 'right' | 'center';
  showInTable?: boolean;
  step?: number;
  min?: number;
  max?: number;
  options?: DirectoryFieldOption[];
  defaultValue?: string | number | boolean;
}

export interface DirectoryRecord {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  isSystem?: boolean;
  extra?: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryDefinition {
  id: string;
  code: string;
  group: DirectoryGroupKey;
  schemaType: 'simple' | 'extended';
  catalogKey?: string;
  customName?: string;
  customDescription?: string;
  usedInKeys?: string[];
  fields: DirectoryFieldDef[];
  isSystem?: boolean;
  records: DirectoryRecord[];
  updatedAt: string;
}


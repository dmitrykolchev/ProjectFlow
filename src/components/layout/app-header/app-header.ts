import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import styles from './app-header.css';
import { eventValue } from '../../common/event-value';
import { iconBell, iconPlus, iconSearch, iconSun, iconMoon, iconMenu, iconContrast, iconHeart, iconTerminal, iconZap, iconRefreshCw } from '../../common/icons';
import '../../common/app-button/app-button';
import '../../common/app-split-button/app-split-button';
import '../../common/app-search-input/app-search-input';
import { MenuItem } from '../../common/app-menu/app-menu';
import type { ThemeMode } from '../../../types';
import type { ButtonSize } from '../../common/app-button/app-button';
import '../../common/app-entity-emblem/app-entity-emblem';
import type { EntityEmblemKind } from '../../common/app-entity-emblem/app-entity-emblem';

const THEME_ORDER: ThemeMode[] = ['dark', 'light', 'cyberpunk', 'matrix', 'barbie', 'high-contrast'];

/** The graphic identity of a theme (the same icons the header button uses). */
function themeGlyph(theme: ThemeMode, px: number): TemplateResult {
  switch (theme) {
    case 'dark':
      return iconMoon(px);
    case 'light':
      return iconSun(px);
    case 'cyberpunk':
      return iconZap(px);
    case 'matrix':
      return iconTerminal(px);
    case 'barbie':
      return iconHeart(px);
    default:
      return iconContrast(px);
  }
}

const DETAIL_ENTITY_MAP: Record<string, EntityEmblemKind> = {
  'project-detail': 'project',
  'task-detail': 'task',
  'requirement-detail': 'requirement',
  'company-detail': 'company',
  'counterparty-detail': 'counterparty',
  'contract-detail': 'contract',
  'calculation-detail': 'calculation',
  'employee-detail': 'employee',
  'timeentry-detail': 'timeEntry',
  'expense-detail': 'expense',
  'payment-detail': 'payment',
  'reminder-detail': 'reminder',
};

@customElement('app-header')
export class AppHeader extends LitElement {
  // canonical control scale for every control in the header; md default keeps the
  // historical 38px controls pixel-identical. Reflected so :host.size-* rules apply
  @property({ type: String, reflect: true }) size: ButtonSize = 'md';

  @state() private activeView = store.activeView;
  @state() private selectedProjectId = store.selectedProjectId;
  @state() private detailProjectId = store.detailProjectId;
  @state() private detailContractId = store.detailContractId;
  @state() private detailTaskId = store.detailTaskId;
  @state() private detailRequirementId = store.detailRequirementId;
  @state() private detailCompanyId = store.detailCompanyId;
  @state() private detailCounterpartyId = store.detailCounterpartyId;
  @state() private detailCalculationId = store.detailCalculationId;
  @state() private detailInvoiceId = store.detailInvoiceId;
  @state() private detailEmployeeId = store.detailEmployeeId;
  @state() private detailTimeEntryId = store.detailTimeEntryId;
  @state() private detailExpenseId = store.detailExpenseId;
  @state() private detailPaymentId = store.detailPaymentId;
  @state() private detailReminderId = store.detailReminderId;
  @state() private searchQuery = store.searchQuery;
  @state() private currentLang = store.customization.language;
  @state() private theme = store.customization.theme;
  @state() private activityCount = store.activityLog.length;
  @state() private aiBusyCount = store.aiBusyCount;

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
    this.activeView = store.activeView;
    this.selectedProjectId = store.selectedProjectId;
    this.detailProjectId = store.detailProjectId;
    this.detailContractId = store.detailContractId;
    this.detailTaskId = store.detailTaskId;
    this.detailRequirementId = store.detailRequirementId;
    this.detailCompanyId = store.detailCompanyId;
    this.detailCounterpartyId = store.detailCounterpartyId;
    this.detailCalculationId = store.detailCalculationId;
    this.detailInvoiceId = store.detailInvoiceId;
    this.detailEmployeeId = store.detailEmployeeId;
    this.detailTimeEntryId = store.detailTimeEntryId;
    this.detailExpenseId = store.detailExpenseId;
    this.detailPaymentId = store.detailPaymentId;
    this.detailReminderId = store.detailReminderId;
    this.searchQuery = store.searchQuery;
    this.currentLang = store.customization.language;
    this.theme = store.customization.theme;
    this.activityCount = store.activityLog.length;
    this.aiBusyCount = store.aiBusyCount;
  }

  private handleThemeSelect(e: CustomEvent) {
    e.stopPropagation();
    const id = String((e.detail as { id?: string })?.id || '');
    if (id) store.setTheme(id as ThemeMode);
  }

  private handleLangSelect(e: CustomEvent) {
    e.stopPropagation();
    const id = String((e.detail as { id?: string })?.id || '');
    if (id === 'ru' || id === 'en') store.setLanguage(id);
  }

  render() {
    const t = getTranslation(this.currentLang);
    const activeProject = store.projects.find((p) => p.id === this.selectedProjectId);
    const projectName = activeProject ? activeProject.name : t.common.all;
    const detailProject =
      this.activeView === 'project-detail'
        ? store.projects.find((p) => p.id === this.detailProjectId)
        : undefined;
    const detailContract =
      this.activeView === 'contract-detail'
        ? store.contracts.find((c) => c.id === this.detailContractId)
        : undefined;
    const detailTask =
      this.activeView === 'task-detail'
        ? store.tasks.find((tk) => tk.id === this.detailTaskId)
        : undefined;
    const detailRequirement =
      this.activeView === 'requirement-detail'
        ? store.requirements.find((r) => r.id === this.detailRequirementId)
        : undefined;
    const detailCompany =
      this.activeView === 'company-detail'
        ? store.companies.find((c) => c.id === this.detailCompanyId)
        : undefined;
    const detailCounterparty =
      this.activeView === 'counterparty-detail'
        ? store.counterparties.find((c) => c.id === this.detailCounterpartyId)
        : undefined;
    const detailCalculation =
      this.activeView === 'calculation-detail'
        ? store.calculations.find((c) => c.id === this.detailCalculationId)
        : undefined;
    const detailInvoice =
      this.activeView === 'invoice-detail'
        ? store.invoices.find((i) => i.id === this.detailInvoiceId)
        : undefined;
    const detailEmployee =
      this.activeView === 'employee-detail'
        ? store.users.find((u) => u.id === this.detailEmployeeId)
        : undefined;
    const detailTimeEntry =
      this.activeView === 'timeentry-detail'
        ? store.timeEntries.find((te) => te.id === this.detailTimeEntryId)
        : undefined;
    const detailExpense =
      this.activeView === 'expense-detail'
        ? store.expenses.find((e) => e.id === this.detailExpenseId)
        : undefined;
    const detailPayment =
      this.activeView === 'payment-detail'
        ? store.payments.find((p) => p.id === this.detailPaymentId)
        : undefined;
    const detailReminder =
      this.activeView === 'reminder-detail'
        ? store.reminders.find((r) => r.id === this.detailReminderId)
        : undefined;

    const viewNames: Record<string, string> = {
      dashboard: t.navigation.dashboard,
      projects: t.navigation.projects,
      'project-detail': detailProject ? `${detailProject.key} · ${detailProject.name}` : t.navigation.projects,
      requirements: t.navigation.requirements,
      'requirement-detail': detailRequirement
        ? `${detailRequirement.code} · ${detailRequirement.title}`
        : t.navigation.requirements,
      kanban: t.navigation.kanban,
      'task-detail': detailTask ? `${detailTask.id} · ${detailTask.title}` : t.navigation.kanban,
      'knowledge-base': t.navigation.knowledgeBase,
      blog: t.navigation.blog,
      documents: t.navigation.documents,
      reminders: t.navigation.reminders,
      'reminder-detail': detailReminder ? detailReminder.title : t.navigation.reminders,
      directories: t.navigation.directories,
      'project-chat': t.navigation.projectChat,
      gantt: t.navigation.gantt,
      grid: t.navigation.grid,
      calendar: t.navigation.calendar,
      analytics: t.navigation.analytics,
      companies: t.navigation.companies,
      'company-detail': detailCompany ? detailCompany.name : t.navigation.companies,
      employees: t.navigation.employees,
      'employee-detail': detailEmployee ? detailEmployee.name : t.navigation.employees,
      counterparties: t.navigation.counterparties,
      'counterparty-detail': detailCounterparty
        ? detailCounterparty.name
        : t.navigation.counterparties,
      contacts: t.viewTexts.contacts.pageTitle,
      contracts: t.navigation.contracts,
      'contract-detail': detailContract ? `${detailContract.number} · ${detailContract.title}` : t.navigation.contracts,
      invoices: t.navigation.invoices,
      'invoice-detail': detailInvoice ? detailInvoice.number : t.navigation.invoices,
      calculations: t.navigation.calculations,
      'calculation-detail': detailCalculation
        ? detailCalculation.number
        : t.navigation.calculations,
      payments: t.navigation.payments,
      'payment-detail': detailPayment
        ? detailPayment.documentNumber || detailPayment.id
        : t.navigation.payments,
      'time-tracking': t.navigation.timeTracking,
      'timeentry-detail': detailTimeEntry
        ? `${detailTimeEntry.taskId} · ${detailTimeEntry.date}`
        : t.navigation.timeTracking,
      expenses: t.navigation.expenses,
      'expense-detail': detailExpense ? detailExpense.title : t.navigation.expenses,
      settings: t.navigation.settings,
      'profile-settings': t.profileSettings.crumbLabel,
      storybook: t.navigation.storybook,
      'design-tokens': t.navigation.designTokens,
      'material-icons': t.navigation.materialIcons,
    };

    const detailEntity = DETAIL_ENTITY_MAP[this.activeView];

    const langItems: MenuItem[] = (['ru', 'en'] as const).map((lg) => ({
      id: lg,
      label: t.viewTexts.header.langNames[lg],
      checked: lg === this.currentLang,
    }));

    const themeItems: MenuItem[] = THEME_ORDER.map((th) => ({
      id: th,
      label: t.viewTexts.header.themeNames[th],
      icon: themeGlyph(th, 16),
      checked: th === this.theme,
    }));
    const themeIcon = this.theme === 'high-contrast'
      ? iconContrast(16)
      : this.theme === 'barbie'
      ? iconHeart(16)
      : this.theme === 'matrix'
      ? iconTerminal(16)
      : this.theme === 'cyberpunk'
      ? iconZap(16)
      : this.theme === 'dark'
      ? iconSun(16)
      : iconMoon(16);

    return html`
      <header class="header-container">
        <div class="left-zone">
          <button
            class="mobile-menu-btn"
            @click="${() => store.toggleSidebar()}"
            aria-label="Toggle Navigation"
          >
            ${iconMenu(18)}
          </button>
          <div class="breadcrumbs">
            <span class="crumb-root">${t.navigation.projects}</span>
            <span class="crumb-separator">/</span>
            <span class="crumb-root">${projectName}</span>
            <span class="crumb-separator">/</span>
            <span class="crumb-current">
              ${detailEntity
                ? html`<app-entity-emblem
                    entity="${detailEntity}"
                    size="xs"
                    .color="${detailProject?.color || ''}"
                  ></app-entity-emblem>`
                : ''}
              <span class="crumb-current-text">${viewNames[this.activeView] || this.activeView}</span>
            </span>
          </div>
        </div>

        <div class="right-zone">
          <app-search-input
            size="${this.size}"
            placeholder="${t.common.search}"
            .value="${this.searchQuery}"
            @input="${(e: CustomEvent) => store.setSearchQuery(eventValue(e))}"
          >
            <span slot="icon">${iconSearch(14)}</span>
          </app-search-input>

          ${this.aiBusyCount > 0
            ? html`
                <div class="ai-busy-chip" title="${t.viewTexts.ai.busyLabel(this.aiBusyCount)}">
                  <span class="ai-busy-spin">${iconRefreshCw(14)}</span>
                  <span>${t.viewTexts.ai.busyLabel(this.aiBusyCount)}</span>
                </div>
              `
            : ''}

          <!-- Theme split button: the main button cycles the themes sequentially as
             before (icon only), the chevron menu picks a theme directly — icon plus
             its name, the current one checked. -->
          <app-split-button
            variant="secondary"
            size="${this.size}"
            icon-only
            .label="${''}"
            .items="${themeItems}"
            @primary-click="${() => store.toggleTheme()}"
            @select="${this.handleThemeSelect}"
          >
            <span slot="start">${themeIcon}</span>
          </app-split-button>

          <!-- Language split button: the main button cycles languages sequentially as
             before (the current code), the chevron menu picks a language directly. -->
          <app-split-button
            variant="secondary"
            size="${this.size}"
            .label="${this.currentLang.toUpperCase()}"
            .items="${langItems}"
            @primary-click="${() =>
              store.setLanguage(getTranslation(this.currentLang).common.otherLang as 'en' | 'ru')}"
            @select="${this.handleLangSelect}"
          >
          </app-split-button>

          <!-- Activity log toggle as a canonical icon-only secondary control; the badge
               dot indicator rides in the end slot, positioned off the button host -->
          <app-button
            class="activity-btn"
            variant="secondary"
            size="${this.size}"
            icon-only
            title="${t.activity.title}"
            aria-label="Activity Log"
            @click="${() => store.toggleActivityPanel()}"
          >
            <span slot="start">${iconBell(16)}</span>
            ${this.activityCount > 0 ? html`<span slot="end" class="badge-dot"></span>` : ''}
          </app-button>

          <app-button
            variant="primary"
            size="${this.size}"
            @click="${() => store.openCreateTaskModal()}"
          >
            <span slot="icon-start">${iconPlus(16)}</span>
            <span>${t.common.create}</span>
          </app-button>
        </div>
      </header>
    `;
  }
}

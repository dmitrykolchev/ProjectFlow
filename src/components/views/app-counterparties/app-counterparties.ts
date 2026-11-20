import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Counterparty, CounterpartyStatus, CounterpartyType } from '../../../types';
import { getTranslation } from '../../../i18n';
import { iconChevronRight, iconEdit, iconFilter, iconHandshake, iconPlus, iconTrash } from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-bank-summary/app-bank-summary';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/card-footer/card-footer';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-toggle-button/app-toggle-button';
import '../../common/app-counterparty-form/app-counterparty-form';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-data-table/app-data-table';
import '../../common/app-table-column/app-table-column';
import '../../common/app-cards-table/app-cards-table';
import styles from './app-counterparties.css';
import { eventValue } from '../../common/event-value';

@customElement('app-counterparties')
export class AppCounterparties extends LitElement {
  @state() private counterparties: Counterparty[] = store.counterparties;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private typeFilter: 'all' | CounterpartyType = 'all';
  @state() private statusFilter: 'all' | CounterpartyStatus = 'all';
  @state() private displayMode: 'cards' | 'table' = 'cards';
  @state() private filterVisible: boolean = true;
  @state() private currentPage = 1;
  @state() private cardPageSize = store.customization.cardGridPageSize;
  @state() private tablePageSize = store.customization.tablePageSize;

  @state() private modalOpen = false;
  @state() private editingCounterparty: Counterparty | null = null;

  @state() private deletingItem: Counterparty | null = null;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => this.syncState());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private syncState() {
    this.currentPage = store.activeView === 'counterparties' ? store.activePage : 1;
    this.counterparties = store.counterparties;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.cardPageSize = store.customization.cardGridPageSize;
    this.tablePageSize = store.customization.tablePageSize;
    this.displayMode = (store.viewModeFor('counterparties') as 'cards' | 'table') ?? 'cards';
  }

  private getFiltered(): Counterparty[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return this.counterparties.filter((cp) => {
      if (this.typeFilter !== 'all' && cp.type !== this.typeFilter) return false;
      if (this.statusFilter !== 'all' && cp.status !== this.statusFilter) return false;
      if (!query) return true;
      return (
        cp.name.toLowerCase().includes(query) ||
        cp.legalName.toLowerCase().includes(query) ||
        cp.inn.toLowerCase().includes(query) ||
        cp.city.toLowerCase().includes(query) ||
        cp.contactPerson.toLowerCase().includes(query) ||
        (cp.contacts || []).some(
          (c) =>
            c.fullName.toLowerCase().includes(query) ||
            (c.position || '').toLowerCase().includes(query) ||
            (c.department || '').toLowerCase().includes(query) ||
            (c.phone || '').toLowerCase().includes(query) ||
            (c.additionalPhone || '').toLowerCase().includes(query) ||
            (c.email || '').toLowerCase().includes(query) ||
            (c.messenger || '').toLowerCase().includes(query)
        ) ||
        (cp.bankAccounts || []).some(
          (b) =>
            b.bankName.toLowerCase().includes(query) ||
            b.accountNumber.toLowerCase().includes(query) ||
            b.currency.toLowerCase().includes(query)
        )
      );
    });
  }

  private renderStars(rating: number) {
    const clamped = Math.max(1, Math.min(5, Math.round(rating || 5)));
    return '★'.repeat(clamped) + '☆'.repeat(5 - clamped);
  }

  render() {
    const t = getTranslation(this.currentLang);
    const filtered = this.getFiltered();

    const clientsCount = this.counterparties.filter((c) => c.type === 'client').length;
    const contractorsVendorsCount = this.counterparties.filter(
      (c) => c.type === 'vendor' || c.type === 'contractor' || c.type === 'partner'
    ).length;
    const activePortfolioRub = store.contracts
      .filter((c) => c.status === 'active' && c.currency === 'RUB')
      .reduce((acc, c) => acc + c.amount, 0);

    const typeOptions = [
      { value: 'all', label: t.viewTexts.counterparties.filterAllTypes },
      { value: 'client', label: t.viewTexts.counterparties.typeClient, color: '#6366f1' },
      { value: 'vendor', label: t.viewTexts.counterparties.typeVendor, color: '#0284c7' },
      { value: 'partner', label: t.viewTexts.counterparties.typePartner, color: '#f59e0b' },
      { value: 'contractor', label: t.viewTexts.counterparties.typeContractor, color: '#64748b' },
    ];

    const statusOptions = [
      { value: 'all', label: t.viewTexts.counterparties.filterAllStatuses },
      { value: 'active', label: t.viewTexts.counterparties.statusActive, color: '#10b981' },
      { value: 'pending', label: t.viewTexts.counterparties.statusPending, color: '#f59e0b' },
      { value: 'blocked', label: t.viewTexts.counterparties.statusBlocked, color: '#ef4444' },
    ];

    return html`
      <app-page-header
        title="${t.viewTexts.counterparties.pageTitle}"
        subtitle="${t.viewTexts.pageSubtitles.counterparties}"
      >
        <span slot="icon">${iconHandshake(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${t.viewTexts.counterparties.addCounterpartyButton}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card size="compact" label="${t.viewTexts.counterparties.kpiTotal}" value="${this.counterparties.length}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.counterparties.kpiClients}" value="${clientsCount}" valueColor="var(--accent-primary, #6366f1)"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.counterparties.kpiVendorsPartners}" value="${contractorsVendorsCount}"></app-metric-card>
        <app-metric-card size="compact" label="${t.viewTexts.counterparties.kpiPortfolio}" value="${(activePortfolioRub / 1_000_000).toFixed(1)}${t.viewTexts.counterparties.millionsSuffix}"></app-metric-card>
      </app-kpi-strip>

      <div class="mode-row">
        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: t.viewTexts.counterparties.viewCards },
            { value: 'table', label: t.viewTexts.counterparties.viewTable },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.currentPage = 1; store.setActivePage(1, false);
            store.setViewMode('counterparties', eventValue(e) as 'cards' | 'table');
          }}"
        ></app-segmented-switch>

        <app-toggle-button
          size="sm"
          .pressed="${this.filterVisible}"
          @change="${(e: CustomEvent<{ pressed: boolean }>) => (this.filterVisible = e.detail.pressed)}"
        >
          <span slot="icon-start">${iconFilter(14)}</span>
          <span>${t.common.filterToggle}</span>
        </app-toggle-button>
      </div>

      ${this.filterVisible
        ? html`<app-filter-bar
            style="--filter-search-min: 280px; --filter-search-max: 280px; --filter-select-width: 185px;"
            placeholder="${t.viewTexts.counterparties.searchPlaceholder}"
            .searchValue="${this.localSearch}"
            .filters="${[
              { key: 'type', options: typeOptions },
              { key: 'status', options: statusOptions },
            ]}"
            .values="${{ type: this.typeFilter, status: this.statusFilter }}"
            @search-change="${(e: CustomEvent<{ value: string }>) => {
              this.localSearch = eventValue(e);
              this.currentPage = 1; store.setActivePage(1, false);
            }}"
            @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
              if (e.detail.key === 'type') this.typeFilter = eventValue(e) as 'all' | CounterpartyType;
              if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | CounterpartyStatus;
              this.currentPage = 1; store.setActivePage(1, false);
            }}"
          ></app-filter-bar>`
        : ''}

      ${filtered.length === 0
        ? html`<app-empty-state title="${t.viewTexts.counterparties.emptyNoCounterparties}"></app-empty-state>`
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, t)
        : this.renderTable(filtered, t)}

      <app-counterparty-form
        .open="${this.modalOpen}"
        .counterparty="${this.editingCounterparty}"
        @close="${() => (this.modalOpen = false)}"
        @saved="${() => (this.modalOpen = false)}"
      ></app-counterparty-form>

      <app-confirm-dialog
        .open="${Boolean(this.deletingItem)}"
        size="sm"
        title="${t.viewTexts.confirmDialogs.counterpartyDelete.title}"
        action="${t.viewTexts.confirmDialogs.counterpartyDelete.action(this.deletingItem?.name || '')}"
        result="${t.viewTexts.confirmDialogs.counterpartyDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingItem = null)}"
        @confirm="${() => {
          if (this.deletingItem) {
            store.deleteCounterparty(this.deletingItem.id);
            this.deletingItem = null;
          }
        }}"
      ></app-confirm-dialog>
    `;
  }

  private renderCards(list: Counterparty[], t: ReturnType<typeof getTranslation>) {
    const cpCard = (row: Record<string, unknown>) => {
      const cp = row as unknown as Counterparty;
      const cpContracts = store.contracts.filter((c) => c.counterpartyId === cp.id);
      const cpSum = cpContracts.reduce((acc, c) => acc + c.amount, 0);
      const cpProjects = store.projects.filter((p) => p.counterpartyId === cp.id).length;
      const contacts = cp.contacts || [];
      const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];
      const contactLabel = primaryContact
        ? `${primaryContact.fullName}${contacts.length > 1 ? ` (+${contacts.length - 1})` : ''}`
        : cp.contactPerson;
      const contactPhone = primaryContact?.phone || cp.phone;
      const contactEmail = primaryContact?.email || cp.email;

      return html`
        <div class="card-top">
          <div class="cp-identity">
            <div class="cp-icon">${iconHandshake(20)}</div>
            <div class="cp-names">
              <div class="cp-name">
                <app-link
                  class="cp-link-btn"
                  size="md"
                  variant="primary"
                  @click="${() => store.openCounterpartyDetail(cp.id)}"
                >
                  ${cp.name}
                </app-link>
              </div>
              <div class="cp-legal" title="${cp.legalName}">${cp.legalName}</div>
            </div>
          </div>
          <div class="badges-col">
            <app-status-chip domain="counterpartyType" status="${cp.type}" appearance="soft" size="sm"></app-status-chip>
            <app-status-chip domain="counterparty" status="${cp.status}" appearance="outline" size="sm"></app-status-chip>
          </div>
        </div>

        <p class="cp-notes">${cp.notes || '—'}</p>

        <div class="cp-meta-grid">
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.counterparties.metaInnKpp}</span>
            <span class="cp-meta-value">${cp.inn}${cp.kpp ? ` / ${cp.kpp}` : ''}</span>
          </div>
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.counterparties.labelCity}</span>
            <span class="cp-meta-value">${cp.city}</span>
          </div>
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.counterparties.metaContact}</span>
            <span class="cp-meta-value" title="${contacts.map((c) => c.fullName).join(', ')}">${contactLabel}</span>
          </div>
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.counterparties.metaRating}</span>
            <span class="cp-meta-value rating-stars">${this.renderStars(cp.rating)}</span>
          </div>
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.counterparties.labelPhone}</span>
            <span class="cp-meta-value">${contactPhone}</span>
          </div>
          <div class="cp-meta-item">
            <span class="cp-meta-label">Email</span>
            <span class="cp-meta-value">${contactEmail}</span>
          </div>
        </div>

        <app-bank-summary .accounts="${cp.bankAccounts || []}"></app-bank-summary>

        <card-footer>
          <div slot="start" class="stats-row">
            <span class="stat-pill">
              ${t.viewTexts.counterparties.contractsCountLabel}: <strong>${cpContracts.length}</strong>
            </span>
            <span class="stat-pill">
              ${t.viewTexts.counterparties.projectsCountLabel}: <strong>${cpProjects}</strong>
            </span>
            <span class="stat-pill">
              ${t.viewTexts.counterparties.sumLabel}: <strong>${(cpSum / 1_000_000).toFixed(1)}${t.viewTexts.counterparties.millionsSuffix}</strong>
            </span>
          </div>
          <app-button
            slot="end"
            size="sm"
            variant="icon"
            title="${t.viewTexts.counterparties.openCardButton}"
            @click="${() => store.openCounterpartyDetail(cp.id)}"
          >
            <span slot="start">${iconChevronRight(15)}</span>
          </app-button>
          <app-button
            slot="end"
            size="sm"
            variant="icon"
            title="${t.common.edit}"
            @click="${() => this.openEditModal(cp)}"
          >
            <span slot="start">${iconEdit(14)}</span>
          </app-button>
          <app-button
            slot="end"
            size="sm"
            variant="icon"
            action="delete"
            title="${t.common.delete}"
            @click="${() => (this.deletingItem = cp)}"
          >
            <span slot="start">${iconTrash(14)}</span>
          </app-button>
        </card-footer>
      `;
    };

    return html`
      <app-cards-table
        .rows="${list}"
        .cardRender="${cpCard}"
        page-size="${this.cardPageSize}"
        page="${this.currentPage}"
        locale="${t.common.locale}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1; store.setActivePage(1, false);
          store.setCardGridPageSize(e.detail.pageSize);
        }}"
      ></app-cards-table>
    `;
  }

  private renderTable(list: Counterparty[], t: ReturnType<typeof getTranslation>) {
    const nameCell = (row: Record<string, unknown>) => {
      const cp = row as unknown as Counterparty;
      return html`
        <div style="font-weight: 600;">
          <app-link
            class="cp-link-btn table-link"
            size="md"
            variant="primary"
            @click="${() => store.openCounterpartyDetail(cp.id)}"
          >
            ${cp.name}
          </app-link>
        </div>
        <div style="font-size: 0.74rem; color: var(--text-muted);">${cp.legalName} · ${cp.city}</div>
      `;
    };
    const bankCell = (row: Record<string, unknown>) => {
      const cp = row as unknown as Counterparty;
      const accounts = cp.bankAccounts || [];
      const currencies = Array.from(new Set(accounts.map((a) => a.currency)));
      const primaryAcc = accounts.find((a) => a.isDefault) || accounts[0];
      return html`
        ${accounts.length === 0
          ? html`<span style="font-size: 0.75rem; color: var(--text-muted);">${t.bankAccounts.noAccountsShort}</span>`
          : html`
              <div class="table-bank-cell">
                <span class="table-bank-name">${primaryAcc?.bankName}</span>
                <div class="bank-currencies">
                  ${currencies.map((cur) => html`<span class="currency-chip">${cur}</span>`)}
                  ${accounts.length > 1
                    ? html`<span class="bank-more-count">(${accounts.length})</span>`
                    : ''}
                </div>
              </div>
            `}
      `;
    };
    const contactCell = (row: Record<string, unknown>) => {
      const cp = row as unknown as Counterparty;
      const contacts = cp.contacts || [];
      const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];
      return html`
        <div>
          ${primaryContact?.fullName || cp.contactPerson}
          ${contacts.length > 1
            ? html`<span class="bank-more-count">(+${contacts.length - 1})</span>`
            : ''}
        </div>
        <div style="font-size: 0.74rem; color: var(--text-muted);">
          ${primaryContact?.position ? `${primaryContact.position} · ` : ''}${primaryContact?.email || cp.email}
        </div>
      `;
    };

    return html`
      <div class="table-card">
        <app-data-table
          .rows="${list}"
          page-size="${this.tablePageSize}"
          page="${this.currentPage}"
          locale="${t.common.locale}"
          @page-change="${(e: CustomEvent<{ page: number }>) => {
            this.currentPage = e.detail.page; store.setActivePage(e.detail.page);
            this.scrollTop = 0;
          }}"
          @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
            this.currentPage = 1; store.setActivePage(1, false);
            store.setTablePageSize(e.detail.pageSize);
          }}"
        >
          <app-table-column field="name" label="${t.viewTexts.counterparties.thCounterparty}" .cellRender="${nameCell}"></app-table-column>
          <app-table-column
            field="type"
            label="${t.viewTexts.counterparties.thType}"
            .cellRender="${(row: Record<string, unknown>) => html`
              <app-status-chip
                domain="counterpartyType"
                status="${(row as unknown as Counterparty).type}"
                appearance="soft"
                size="sm"
              ></app-status-chip>
            `}"
          ></app-table-column>
          <app-table-column field="inn" label="${t.viewTexts.counterparties.thInn}" mono></app-table-column>
          <app-table-column field="bankAccounts" label="${t.bankAccounts.thColumn}" .cellRender="${bankCell}"></app-table-column>
          <app-table-column field="contacts" label="${t.viewTexts.counterparties.thContact}" .cellRender="${contactCell}"></app-table-column>
          <app-table-column
            field="rating"
            label="${t.viewTexts.counterparties.metaRating}"
            .cellRender="${(row: Record<string, unknown>) => html`
              <span class="rating-stars">${this.renderStars((row as unknown as Counterparty).rating)}</span>
            `}"
          ></app-table-column>
          <app-table-column
            field="id"
            label="${t.viewTexts.counterparties.thContracts}"
            mono
            .cellRender="${(row: Record<string, unknown>) => {
              const cp = row as unknown as Counterparty;
              const cpContracts = store.contracts.filter((c) => c.counterpartyId === cp.id);
              const cpSum = cpContracts.reduce((acc, c) => acc + c.amount, 0);
              return html`${cpContracts.length} (${(cpSum / 1_000_000).toFixed(1)}${t.viewTexts.counterparties.millionsSuffix})`;
            }}"
          ></app-table-column>
          <app-table-column
            field="status"
            label="${t.viewTexts.counterparties.thStatus}"
            .cellRender="${(row: Record<string, unknown>) => html`
              <app-status-chip
                domain="counterparty"
                status="${(row as unknown as Counterparty).status}"
                appearance="outline"
                size="sm"
              ></app-status-chip>
            `}"
          ></app-table-column>
          <app-table-column
            field=""
            label=""
            .cellRender="${(row: Record<string, unknown>) => {
              const cp = row as unknown as Counterparty;
              return html`
                <div class="cp-actions-row">
                  <app-button
                    size="sm"
                    variant="icon"
                    title="${t.viewTexts.counterparties.openCardButton}"
                    @click="${() => store.openCounterpartyDetail(cp.id)}"
                  >
                    <span slot="start">${iconChevronRight(15)}</span>
                  </app-button>
                  <app-button
                    size="sm"
                    variant="icon"
                    title="${t.common.edit}"
                    @click="${() => this.openEditModal(cp)}"
                  >
                    <span slot="start">${iconEdit(14)}</span>
                  </app-button>
                  <app-button
                    action="delete"
                    size="sm"
                    variant="icon"
                    title="${t.common.delete}"
                    @click="${() => (this.deletingItem = cp)}"
                  >
                    <span slot="start">${iconTrash(14)}</span>
                  </app-button>
                </div>
              `;
            }}"
          ></app-table-column>
        </app-data-table>
      </div>
    `;
  }

  private openCreateModal() {
    this.editingCounterparty = null;
    this.modalOpen = true;
  }

  private openEditModal(cp: Counterparty) {
    this.editingCounterparty = cp;
    this.modalOpen = true;
  }
}

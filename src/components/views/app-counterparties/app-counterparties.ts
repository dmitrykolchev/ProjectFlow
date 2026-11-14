import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Counterparty, CounterpartyStatus, CounterpartyType } from '../../../types';
import { getTranslation } from '../../../i18n';
import { iconChevronRight, iconEdit, iconHandshake, iconPlus, iconTrash } from '../../common/icons';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-number-input/app-number-input';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
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

  @state() private modalOpen = false;
  @state() private editingId: string | null = null;
  @state() private formName = '';
  @state() private formLegalName = '';
  @state() private formType: CounterpartyType = 'client';
  @state() private formInn = '';
  @state() private formKpp = '';
  @state() private formCity = '';
  @state() private formContactPerson = '';
  @state() private formPhone = '';
  @state() private formEmail = '';
  @state() private formStatus: CounterpartyStatus = 'active';
  @state() private formRating = 5;
  @state() private formNotes = '';
  @state() private formError = '';

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
    this.counterparties = store.counterparties;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
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
        cp.contactPerson.toLowerCase().includes(query)
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

      <app-filter-bar
        style="--filter-search-min: 280px; --filter-search-max: 280px; --filter-select-width: 185px;"
        placeholder="${t.viewTexts.counterparties.searchPlaceholder}"
        .searchValue="${this.localSearch}"
        .filters="${[
          { key: 'type', options: typeOptions },
          { key: 'status', options: statusOptions },
        ]}"
        .values="${{ type: this.typeFilter, status: this.statusFilter }}"
        @search-change="${(e: CustomEvent<{ value: string }>) => (this.localSearch = eventValue(e))}"
        @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
          if (e.detail.key === 'type') this.typeFilter = eventValue(e) as 'all' | CounterpartyType;
          if (e.detail.key === 'status') this.statusFilter = eventValue(e) as 'all' | CounterpartyStatus;
        }}"
      >
        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: t.viewTexts.counterparties.viewCards },
            { value: 'table', label: t.viewTexts.counterparties.viewTable },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) =>
            (this.displayMode = eventValue(e) as 'cards' | 'table')}"
        ></app-segmented-switch>
      </app-filter-bar>

      ${filtered.length === 0
        ? html`<app-empty-state title="${t.viewTexts.counterparties.emptyNoCounterparties}"></app-empty-state>`
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, t)
        : this.renderTable(filtered, t)}

      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingId ? t.viewTexts.counterparties.modalTitleEdit : t.viewTexts.counterparties.modalTitleCreate}"
        @close="${() => (this.modalOpen = false)}"
      >
        <app-form-grid>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelShortName}"
              .value="${this.formName}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.formName = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelLegalName}"
              .value="${this.formLegalName}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formLegalName = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.counterparties.labelType}"
              .value="${this.formType}"
              .options="${typeOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formType = eventValue(e) as CounterpartyType)}"
            ></app-select>
          </div>
          <div>
            <app-select
              label="${t.viewTexts.counterparties.labelStatusCheck}"
              .value="${this.formStatus}"
              .options="${statusOptions.filter((o) => o.value !== 'all')}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as CounterpartyStatus)}"
            ></app-select>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelInn}"
              .value="${this.formInn}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formInn = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelKpp}"
              .value="${this.formKpp}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formKpp = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelContactPerson}"
              .value="${this.formContactPerson}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formContactPerson = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelCity}"
              .value="${this.formCity}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formCity = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelPhone}"
              .value="${this.formPhone}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formPhone = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-input
              label="Email"
              type="email"
              .value="${this.formEmail}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formEmail = eventValue(e))}"
            ></app-input>
          </div>
          <div>
            <app-number-input
              label="${t.viewTexts.counterparties.labelRating}"
              .value="${this.formRating}"
              min="1"
              max="5"
              step="1"
              @change="${(e: CustomEvent<{ value: number }>) => (this.formRating = eventValue(e))}"
            ></app-number-input>
          </div>
          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.counterparties.labelNotes}"
              .value="${this.formNotes}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formNotes = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${this.handleSave}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>

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
    return html`
      <div class="cards-grid">
        ${list.map((cp) => {
          const cpContracts = store.contracts.filter((c) => c.counterpartyId === cp.id);
          const cpSum = cpContracts.reduce((acc, c) => acc + c.amount, 0);
          const cpProjects = store.projects.filter((p) => p.counterpartyId === cp.id).length;

          return html`
            <article class="cp-card">
              <div class="card-top">
                <div class="cp-identity">
                  <div class="cp-icon">${iconHandshake(20)}</div>
                  <div class="cp-names">
                    <div class="cp-name">
                      <button
                        type="button"
                        class="cp-link-btn"
                        @click="${() => store.openCounterpartyDetail(cp.id)}"
                      >
                        ${cp.name}
                      </button>
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

              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.counterparties.metaInnKpp}</span>
                  <span class="meta-value mono">${cp.inn}${cp.kpp ? ` / ${cp.kpp}` : ''}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.counterparties.labelCity}</span>
                  <span class="meta-value">${cp.city}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.counterparties.metaContact}</span>
                  <span class="meta-value">${cp.contactPerson}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.counterparties.metaRating}</span>
                  <span class="meta-value rating-stars">${this.renderStars(cp.rating)}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${t.viewTexts.counterparties.labelPhone}</span>
                  <span class="meta-value mono">${cp.phone}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Email</span>
                  <span class="meta-value">${cp.email}</span>
                </div>
              </div>

              <div class="card-footer">
                <div class="stats-row">
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
                <div class="card-actions">
                  <button
                    type="button"
                    class="icon-btn"
                    title="${t.viewTexts.counterparties.openCardButton}"
                    @click="${() => store.openCounterpartyDetail(cp.id)}"
                  >
                    ${iconChevronRight(15)}
                  </button>
                  <button
                    type="button"
                    class="icon-btn"
                    title="${t.common.edit}"
                    @click="${() => this.openEditModal(cp)}"
                  >
                    ${iconEdit(14)}
                  </button>
                  <button
                    type="button"
                    class="icon-btn danger"
                    title="${t.common.delete}"
                    @click="${() => (this.deletingItem = cp)}"
                  >
                    ${iconTrash(14)}
                  </button>
                </div>
              </div>
            </article>
          `;
        })}
      </div>
    `;
  }

  private renderTable(list: Counterparty[], t: ReturnType<typeof getTranslation>) {
    return html`
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>${t.viewTexts.counterparties.thCounterparty}</th>
              <th>${t.viewTexts.counterparties.thType}</th>
              <th>${t.viewTexts.counterparties.thInn}</th>
              <th>${t.viewTexts.counterparties.thContact}</th>
              <th>${t.viewTexts.counterparties.metaRating}</th>
              <th>${t.viewTexts.counterparties.thContracts}</th>
              <th>${t.viewTexts.counterparties.thStatus}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list.map((cp) => {
              const cpContracts = store.contracts.filter((c) => c.counterpartyId === cp.id);
              const cpSum = cpContracts.reduce((acc, c) => acc + c.amount, 0);

              return html`
                <tr>
                  <td>
                    <div style="font-weight: 600;">
                      <button
                        type="button"
                        class="cp-link-btn"
                        @click="${() => store.openCounterpartyDetail(cp.id)}"
                      >
                        ${cp.name}
                      </button>
                    </div>
                    <div style="font-size: 0.74rem; color: var(--text-muted);">${cp.legalName} · ${cp.city}</div>
                  </td>
                  <td>
                    <app-status-chip domain="counterpartyType" status="${cp.type}" appearance="soft" size="sm"></app-status-chip>
                  </td>
                  <td class="mono">${cp.inn}</td>
                  <td>
                    <div>${cp.contactPerson}</div>
                    <div style="font-size: 0.74rem; color: var(--text-muted);">${cp.email}</div>
                  </td>
                  <td><span class="rating-stars">${this.renderStars(cp.rating)}</span></td>
                  <td class="mono">${cpContracts.length} (${(cpSum / 1_000_000).toFixed(1)}${t.viewTexts.counterparties.millionsSuffix})</td>
                  <td>
                    <app-status-chip domain="counterparty" status="${cp.status}" appearance="outline" size="sm"></app-status-chip>
                  </td>
                  <td>
                    <div class="card-actions">
                      <button
                        type="button"
                        class="icon-btn"
                        title="${t.viewTexts.counterparties.openCardButton}"
                        @click="${() => store.openCounterpartyDetail(cp.id)}"
                      >
                        ${iconChevronRight(15)}
                      </button>
                      <button
                        type="button"
                        class="icon-btn"
                        @click="${() => this.openEditModal(cp)}"
                      >
                        ${iconEdit(14)}
                      </button>
                      <button
                        type="button"
                        class="icon-btn danger"
                        @click="${() => (this.deletingItem = cp)}"
                      >
                        ${iconTrash(14)}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
    `;
  }

  private openCreateModal() {
    this.editingId = null;
    this.formName = '';
    this.formLegalName = '';
    this.formType = 'client';
    this.formInn = '';
    this.formKpp = '';
    this.formCity = 'Москва';
    this.formContactPerson = '';
    this.formPhone = '';
    this.formEmail = '';
    this.formStatus = 'active';
    this.formRating = 5;
    this.formNotes = '';
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(cp: Counterparty) {
    this.editingId = cp.id;
    this.formName = cp.name;
    this.formLegalName = cp.legalName;
    this.formType = cp.type;
    this.formInn = cp.inn;
    this.formKpp = cp.kpp || '';
    this.formCity = cp.city;
    this.formContactPerson = cp.contactPerson;
    this.formPhone = cp.phone;
    this.formEmail = cp.email;
    this.formStatus = cp.status;
    this.formRating = cp.rating;
    this.formNotes = cp.notes;
    this.formError = '';
    this.modalOpen = true;
  }

  private handleSave() {
    if (!this.formName.trim()) {
      this.formError = getTranslation(this.currentLang).common.required;
      return;
    }

    const payload = {
      name: this.formName.trim(),
      legalName: this.formLegalName.trim() || this.formName.trim(),
      type: this.formType,
      inn: this.formInn.trim() || '7700000000',
      kpp: this.formKpp.trim(),
      city: this.formCity.trim() || 'Москва',
      contactPerson: this.formContactPerson.trim() || '—',
      phone: this.formPhone.trim() || '—',
      email: this.formEmail.trim() || '—',
      status: this.formStatus,
      rating: Math.max(1, Math.min(5, Number(this.formRating) || 5)),
      notes: this.formNotes.trim(),
    };

    if (this.editingId) {
      store.updateCounterparty({ id: this.editingId, ...payload });
    } else {
      store.addCounterparty(payload);
    }

    this.modalOpen = false;
  }
}
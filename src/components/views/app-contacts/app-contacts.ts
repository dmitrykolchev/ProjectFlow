import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import {
  Counterparty,
  CounterpartyContact,
  CounterpartyStatus,
  CounterpartyType,
} from '../../../types';
import { getTranslation } from '../../../i18n';
import { eventValue } from '../../common/event-value';
import {
  iconCheck,
  iconChevronRight,
  iconCopy,
  iconEdit,
  iconFilter,
  iconHandshake,
  iconPlus,
  iconTrash,
  iconUser,
} from '../../common/icons';
import '../../common/app-avatar/app-avatar';
import '../../common/app-badge/app-badge';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/card-footer/card-footer';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-toggle-button/app-toggle-button';
import '../../common/app-modal/app-modal';
import '../../common/app-input/app-input';
import '../../common/app-date-input/app-date-input';
import '../../common/app-select/app-select';
import '../../common/app-switch/app-switch';
import '../../common/app-textarea/app-textarea';
import '../../common/app-page-header/app-page-header';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-data-table/app-data-table';
import '../../common/app-table-column/app-table-column';
import '../../common/app-cards-table/app-cards-table';
import styles from './app-contacts.css';
import tableContentStyles from './app-contacts.table.content.css';
import cardContentStyles from './app-contacts.content.css';

interface ContactDirectoryRow extends CounterpartyContact {
  counterpartyId: string;
  counterpartyName: string;
  counterpartyLegalName: string;
  counterpartyType: CounterpartyType;
  counterpartyCity: string;
  counterpartyStatus: CounterpartyStatus;
  isLegacyFallback?: boolean;
}

@customElement('app-contacts')
export class AppContacts extends LitElement {
  @state() private counterparties: Counterparty[] = store.counterparties;
  @state() private currentLang = store.customization.language;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private counterpartyFilter = 'all';
  @state() private typeFilter: 'all' | CounterpartyType = 'all';
  @state() private roleFilter: 'all' | 'primary' | 'secondary' = 'all';
  @state() private displayMode: 'cards' | 'table' = 'cards';
  @state() private filterVisible = true;
  @state() private currentPage = 1;
  @state() private cardPageSize = store.customization.cardGridPageSize;
  @state() private tablePageSize = store.customization.tablePageSize;

  @state() private copiedId: string | null = null;
  @state() private modalOpen = false;
  @state() private editingContactId: string | null = null;
  @state() private originalCounterpartyId: string | null = null;
  @state() private deletingRow: ContactDirectoryRow | null = null;

  @state() private fCounterpartyId = '';
  @state() private fFullName = '';
  @state() private fPosition = '';
  @state() private fDepartment = '';
  @state() private fPhone = '';
  @state() private fAdditionalPhone = '';
  @state() private fEmail = '';
  @state() private fMessenger = '';
  @state() private fBirthDate = '';
  @state() private fComment = '';
  @state() private fIsPrimary = false;
  @state() private formError = '';

  private unsubscribe?: () => void;
  private copyTimer?: ReturnType<typeof setTimeout>;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => this.syncState());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
    if (this.copyTimer) clearTimeout(this.copyTimer);
  }

  private syncState() {
    this.currentPage = store.activeView === 'contacts' ? store.activePage : 1;
    this.counterparties = store.counterparties;
    this.currentLang = store.customization.language;
    this.globalSearch = store.searchQuery;
    this.cardPageSize = store.customization.cardGridPageSize;
    this.tablePageSize = store.customization.tablePageSize;
    this.displayMode = (store.viewModeFor('contacts') as 'cards' | 'table') ?? 'cards';
    // strict-mode fallback: a counterparty filter pointing at a record that no longer exists would
    // keep the select on its placeholder and the list empty, so the stale value falls back to "all"
    if (this.counterpartyFilter !== 'all' && !store.counterparties.some((c) => c.id === this.counterpartyFilter)) {
      this.counterpartyFilter = 'all';
    }
  }

  private getInitials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  private getAllContactRows(): ContactDirectoryRow[] {
    const rows: ContactDirectoryRow[] = [];
    for (const cp of this.counterparties) {
      const contacts = cp.contacts || [];
      if (contacts.length > 0) {
        for (const c of contacts) {
          rows.push({
            ...c,
            counterpartyId: cp.id,
            counterpartyName: cp.name,
            counterpartyLegalName: cp.legalName,
            counterpartyType: cp.type,
            counterpartyCity: cp.city,
            counterpartyStatus: cp.status,
          });
        }
      } else if (cp.contactPerson && cp.contactPerson !== '—') {
        rows.push({
          id: `__legacy__${cp.id}`,
          fullName: cp.contactPerson,
          phone: cp.phone && cp.phone !== '—' ? cp.phone : undefined,
          email: cp.email && cp.email !== '—' ? cp.email : undefined,
          isPrimary: true,
          counterpartyId: cp.id,
          counterpartyName: cp.name,
          counterpartyLegalName: cp.legalName,
          counterpartyType: cp.type,
          counterpartyCity: cp.city,
          counterpartyStatus: cp.status,
          isLegacyFallback: true,
        });
      }
    }
    return rows.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      const cpDiff = a.counterpartyName.localeCompare(b.counterpartyName);
      if (cpDiff !== 0) return cpDiff;
      return a.fullName.localeCompare(b.fullName);
    });
  }

  private getFiltered(allRows: ContactDirectoryRow[]): ContactDirectoryRow[] {
    const query = (this.localSearch || this.globalSearch).trim().toLowerCase();
    return allRows.filter((row) => {
      if (this.counterpartyFilter !== 'all' && row.counterpartyId !== this.counterpartyFilter) {
        return false;
      }
      if (this.typeFilter !== 'all' && row.counterpartyType !== this.typeFilter) {
        return false;
      }
      if (this.roleFilter === 'primary' && !row.isPrimary) return false;
      if (this.roleFilter === 'secondary' && row.isPrimary) return false;
      if (!query) return true;
      return (
        row.fullName.toLowerCase().includes(query) ||
        (row.position || '').toLowerCase().includes(query) ||
        (row.department || '').toLowerCase().includes(query) ||
        (row.phone || '').toLowerCase().includes(query) ||
        (row.additionalPhone || '').toLowerCase().includes(query) ||
        (row.email || '').toLowerCase().includes(query) ||
        (row.messenger || '').toLowerCase().includes(query) ||
        (row.comment || '').toLowerCase().includes(query) ||
        row.counterpartyName.toLowerCase().includes(query) ||
        row.counterpartyLegalName.toLowerCase().includes(query) ||
        row.counterpartyCity.toLowerCase().includes(query)
      );
    });
  }

  private async copyContact(row: ContactDirectoryRow) {
    const t = getTranslation(this.currentLang);
    const lines = [
      `${t.contactPersons.fullNameLabel}: ${row.fullName}`,
      `${t.viewTexts.contacts.labelCounterparty}: ${row.counterpartyName}`,
      row.position ? `${t.contactPersons.positionLabel}: ${row.position}` : '',
      row.department ? `${t.contactPersons.departmentLabel}: ${row.department}` : '',
      row.phone ? `${t.contactPersons.phoneLabel}: ${row.phone}` : '',
      row.additionalPhone
        ? `${t.contactPersons.additionalPhoneLabel}: ${row.additionalPhone}`
        : '',
      row.email ? `${t.contactPersons.emailLabel}: ${row.email}` : '',
      row.messenger ? `${t.contactPersons.messengerLabel}: ${row.messenger}` : '',
      row.birthDate ? `${t.contactPersons.birthDateLabel}: ${row.birthDate}` : '',
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      this.copiedId = row.id;
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => {
        this.copiedId = null;
      }, 1800);
    } catch {
      this.copiedId = null;
    }
  }

  private handleSetPrimary(row: ContactDirectoryRow) {
    const cp = this.counterparties.find((c) => c.id === row.counterpartyId);
    if (!cp || row.isLegacyFallback) return;
    const nextContacts = (cp.contacts || []).map((c) => ({
      ...c,
      isPrimary: c.id === row.id,
    }));
    store.updateCounterparty({ ...cp, contacts: nextContacts });
  }

  private handleDeleteConfirmed() {
    const target = this.deletingRow;
    this.deletingRow = null;
    if (!target) return;
    const cp = this.counterparties.find((c) => c.id === target.counterpartyId);
    if (!cp) return;

    if (target.isLegacyFallback) {
      store.updateCounterparty({
        ...cp,
        contactPerson: '—',
        phone: '—',
        email: '—',
        contacts: [],
      });
      return;
    }

    const remaining = (cp.contacts || []).filter((c) => c.id !== target.id);
    if (remaining.length > 0 && !remaining.some((c) => c.isPrimary)) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }
    store.updateCounterparty({ ...cp, contacts: remaining });
  }

  private openCreateModal() {
    const t = getTranslation(this.currentLang);
    if (this.counterparties.length === 0) {
      store.addNotification(
        'warning',
        t.viewTexts.contacts.pageTitle,
        t.viewTexts.contacts.createCounterpartyFirst
      );
      return;
    }
    const defaultCpId =
      this.counterpartyFilter !== 'all'
        ? this.counterpartyFilter
        : this.counterparties[0]?.id || '';
    const targetCp = this.counterparties.find((c) => c.id === defaultCpId);

    this.editingContactId = null;
    this.originalCounterpartyId = null;
    this.fCounterpartyId = defaultCpId;
    this.fFullName = '';
    this.fPosition = '';
    this.fDepartment = '';
    this.fPhone = '';
    this.fAdditionalPhone = '';
    this.fEmail = '';
    this.fMessenger = '';
    this.fBirthDate = '';
    this.fComment = '';
    this.fIsPrimary = (targetCp?.contacts || []).length === 0;
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(row: ContactDirectoryRow) {
    this.editingContactId = row.id;
    this.originalCounterpartyId = row.counterpartyId;
    this.fCounterpartyId = row.counterpartyId;
    this.fFullName = row.fullName;
    this.fPosition = row.position || '';
    this.fDepartment = row.department || '';
    this.fPhone = row.phone || '';
    this.fAdditionalPhone = row.additionalPhone || '';
    this.fEmail = row.email || '';
    this.fMessenger = row.messenger || '';
    this.fBirthDate = row.birthDate || '';
    this.fComment = row.comment || '';
    this.fIsPrimary = Boolean(row.isPrimary);
    this.formError = '';
    this.modalOpen = true;
  }

  private handleSaveContact() {
    const t = getTranslation(this.currentLang);
    const targetCp = this.counterparties.find((c) => c.id === this.fCounterpartyId);
    if (!targetCp) {
      this.formError = t.viewTexts.contacts.selectCounterpartyError;
      return;
    }

    const fullName = this.fFullName.trim();
    if (!fullName) {
      this.formError = t.contactPersons.requiredError;
      return;
    }

    const isLegacy = Boolean(this.editingContactId?.startsWith('__legacy__'));
    const nextId =
      this.editingContactId && !isLegacy
        ? this.editingContactId
        : `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const record: CounterpartyContact = {
      id: nextId,
      fullName,
      position: this.fPosition.trim() || undefined,
      department: this.fDepartment.trim() || undefined,
      phone: this.fPhone.trim() || undefined,
      additionalPhone: this.fAdditionalPhone.trim() || undefined,
      email: this.fEmail.trim() || undefined,
      messenger: this.fMessenger.trim() || undefined,
      birthDate: this.fBirthDate.trim() || undefined,
      comment: this.fComment.trim() || undefined,
      isPrimary: this.fIsPrimary,
    };

    if (
      this.editingContactId &&
      this.originalCounterpartyId &&
      this.originalCounterpartyId !== targetCp.id
    ) {
      const oldCp = this.counterparties.find((c) => c.id === this.originalCounterpartyId);
      if (oldCp) {
        if (isLegacy) {
          store.updateCounterparty({
            ...oldCp,
            contactPerson: '—',
            phone: '—',
            email: '—',
            contacts: [],
          });
        } else {
          const oldRemaining = (oldCp.contacts || []).filter(
            (c) => c.id !== this.editingContactId
          );
          if (oldRemaining.length > 0 && !oldRemaining.some((c) => c.isPrimary)) {
            oldRemaining[0] = { ...oldRemaining[0], isPrimary: true };
          }
          store.updateCounterparty({ ...oldCp, contacts: oldRemaining });
        }
      }
    }

    const existingList = [...(targetCp.contacts || [])];
    const hasInTarget =
      this.editingContactId &&
      !isLegacy &&
      existingList.some((c) => c.id === this.editingContactId);

    let nextContacts: CounterpartyContact[];
    if (hasInTarget) {
      nextContacts = existingList.map((c) => {
        if (c.id === this.editingContactId) return record;
        return record.isPrimary ? { ...c, isPrimary: false } : c;
      });
    } else {
      const normalized = record.isPrimary
        ? existingList.map((c) => ({ ...c, isPrimary: false }))
        : existingList;
      nextContacts = [...normalized, record];
    }

    if (nextContacts.length > 0 && !nextContacts.some((c) => c.isPrimary)) {
      nextContacts[0] = { ...nextContacts[0], isPrimary: true };
    }

    store.updateCounterparty({ ...targetCp, contacts: nextContacts });
    this.modalOpen = false;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const allRows = this.getAllContactRows();
    const filtered = this.getFiltered(allRows);

    const primaryCount = allRows.filter((r) => r.isPrimary).length;
    const coveredCounterpartyIds = new Set(allRows.map((r) => r.counterpartyId));
    const withChannelsCount = allRows.filter((r) => Boolean(r.email || r.messenger)).length;
    const activeOrgContactsCount = allRows.filter(
      (r) => r.counterpartyStatus === 'active'
    ).length;

    const counterpartyOptions = [
      { value: 'all', label: t.viewTexts.contacts.filterAllCounterparties },
      ...this.counterparties.map((c) => ({ value: c.id, label: c.name })),
    ];

    const typeOptions = [
      { value: 'all', label: t.viewTexts.contacts.filterAllTypes },
      { value: 'client', label: t.viewTexts.counterparties.typeClient, color: '#6366f1' },
      { value: 'vendor', label: t.viewTexts.counterparties.typeVendor, color: '#0284c7' },
      { value: 'partner', label: t.viewTexts.counterparties.typePartner, color: '#f59e0b' },
      { value: 'contractor', label: t.viewTexts.counterparties.typeContractor, color: '#64748b' },
    ];

    const roleOptions = [
      { value: 'all', label: t.viewTexts.contacts.filterAllRoles },
      { value: 'primary', label: t.viewTexts.contacts.rolePrimaryOnly, color: '#10b981' },
      { value: 'secondary', label: t.viewTexts.contacts.roleSecondaryOnly, color: '#64748b' },
    ];

    return html`
      <app-page-header
        title="${t.viewTexts.contacts.pageTitle}"
        subtitle="${t.viewTexts.pageSubtitles.contacts}"
      >
        <span slot="icon">${iconUser(28)}</span>
        <app-button
          slot="actions"
          variant="primary"
          size="md"
          @click="${() => this.openCreateModal()}"
        >
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${t.viewTexts.contacts.newContactButton}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card
          size="compact"
          label="${t.viewTexts.contacts.kpiTotal}"
          value="${allRows.length}"
          subtitle="${t.viewTexts.contacts.kpiWithChannels(withChannelsCount)}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.contacts.kpiPrimary}"
          value="${primaryCount}"
          valueColor="var(--accent-primary, #6366f1)"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.contacts.kpiCounterparties}"
          value="${coveredCounterpartyIds.size}"
          subtitle="${t.viewTexts.contacts.kpiCounterpartiesHint(this.counterparties.length)}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${t.viewTexts.contacts.kpiActiveOrgs}"
          value="${activeOrgContactsCount}"
          valueColor="#10b981"
        ></app-metric-card>
      </app-kpi-strip>

      <div class="mode-row">
        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: t.viewTexts.contacts.viewCards },
            { value: 'table', label: t.viewTexts.contacts.viewTable },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.currentPage = 1;
            store.setActivePage(1, false);
            store.setViewMode('contacts', eventValue(e) as 'cards' | 'table');
          }}"
        ></app-segmented-switch>

        <app-toggle-button
          size="sm"
          .pressed="${this.filterVisible}"
          @change="${(e: CustomEvent<{ pressed: boolean }>) =>
            (this.filterVisible = e.detail.pressed)}"
        >
          <span slot="icon-start">${iconFilter(14)}</span>
          <span>${t.common.filterToggle}</span>
        </app-toggle-button>
      </div>

      ${this.filterVisible
        ? html`
            <app-filter-bar
              style="--filter-search-min: 280px; --filter-search-max: 280px; --filter-select-width: 195px;"
              placeholder="${t.viewTexts.contacts.searchPlaceholder}"
              .searchValue="${this.localSearch}"
              show-reset
              .filters="${[
                { key: 'counterparty', options: counterpartyOptions },
                { key: 'type', options: typeOptions },
                { key: 'role', options: roleOptions },
              ]}"
              .values="${{
                counterparty: this.counterpartyFilter,
                type: this.typeFilter,
                role: this.roleFilter,
              }}"
              @search-change="${(e: CustomEvent<{ value: string }>) => {
                this.localSearch = eventValue(e);
                this.currentPage = 1;
                store.setActivePage(1, false);
              }}"
              @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
                if (e.detail.key === 'counterparty') this.counterpartyFilter = eventValue(e);
                if (e.detail.key === 'type')
                  this.typeFilter = eventValue(e) as 'all' | CounterpartyType;
                if (e.detail.key === 'role')
                  this.roleFilter = eventValue(e) as 'all' | 'primary' | 'secondary';
                this.currentPage = 1;
                store.setActivePage(1, false);
              }}"
              @reset="${() => {
                this.localSearch = '';
                this.counterpartyFilter = 'all';
                this.typeFilter = 'all';
                this.roleFilter = 'all';
                this.currentPage = 1;
                store.setActivePage(1, false);
              }}"
            ></app-filter-bar>
          `
        : ''}

      ${filtered.length === 0
        ? html`
            <app-empty-state
              title="${t.viewTexts.contacts.emptyTitle}"
              description="${t.viewTexts.contacts.emptySubtitle}"
            ></app-empty-state>
          `
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, t)
        : this.renderTable(filtered, t)}

      ${this.renderFormModal(t)}
      ${this.renderDeleteModal(t)}
    `;
  }

  private renderCards(list: ContactDirectoryRow[], t: ReturnType<typeof getTranslation>) {
    const contactCard = (rowObj: Record<string, unknown>) => {
      const row = rowObj as unknown as ContactDirectoryRow;
      const isCopied = this.copiedId === row.id;
      const roleLine = [row.position, row.department].filter(Boolean).join(' · ');
      const phoneValue = [row.phone, row.additionalPhone].filter(Boolean).join(' · ') || '—';

      return html`
        <div class="card-top">
          <div class="cp-identity">
            <app-avatar
              size="md"
              initials="${this.getInitials(row.fullName)}"
              title="${row.fullName}"
            ></app-avatar>
            <div class="cp-names">
              <div class="cnt-name-row">
                <span class="cnt-person-name">${row.fullName}</span>
                ${row.isPrimary
                  ? html`
                      <app-badge variant="success" appearance="soft" size="sm">
                        ${t.contactPersons.primaryBadge}
                      </app-badge>
                    `
                  : ''}
              </div>
              <div class="cnt-role" title="${roleLine || '—'}">${roleLine || '—'}</div>
            </div>
          </div>

          <div class="badges-col">
            <app-status-chip
              domain="counterpartyType"
              status="${row.counterpartyType}"
              appearance="soft"
              size="sm"
            ></app-status-chip>
          </div>
        </div>

        <div class="rem-entity-bar">
          <button
            type="button"
            class="rem-entity-btn"
            @click="${() => store.openCounterpartyDetail(row.counterpartyId)}"
          >
            ${iconHandshake(16)}
            <div class="rem-entity-col">
              <span class="rem-entity-type">${t.entityTypes.counterparty}</span>
              <span class="rem-entity-name">
                ${row.counterpartyName}${row.counterpartyCity ? ` · ${row.counterpartyCity}` : ''}
              </span>
            </div>
          </button>
          <app-button
            size="sm"
            variant="icon"
            title="${t.viewTexts.contacts.openCounterparty}"
            @click="${() => store.openCounterpartyDetail(row.counterpartyId)}"
          >
            <span slot="start">${iconChevronRight(14)}</span>
          </app-button>
        </div>

        <div class="cp-meta-grid">
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.contacts.metaPhone}</span>
            <span class="cp-meta-value mono" title="${phoneValue}">${phoneValue}</span>
          </div>
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.contacts.metaEmail}</span>
            ${row.email
              ? html`<a class="cnt-email-link" href="mailto:${row.email}" title="${row.email}"
                  >${row.email}</a
                >`
              : html`<span class="cp-meta-value">—</span>`}
          </div>
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.contacts.metaMessenger}</span>
            <span class="cp-meta-value" title="${row.messenger || ''}">
              ${row.messenger || '—'}
            </span>
          </div>
          <div class="cp-meta-item">
            <span class="cp-meta-label">${t.viewTexts.contacts.metaBirthDate}</span>
            <span class="cp-meta-value mono">${row.birthDate || '—'}</span>
          </div>
        </div>

        ${row.comment ? html`<p class="inv-notes" title="${row.comment}">${row.comment}</p>` : ''}

        <card-footer>
          <div slot="start">
            <app-status-chip
              domain="counterparty"
              status="${row.counterpartyStatus}"
              appearance="outline"
              size="sm"
            ></app-status-chip>
          </div>
          <div slot="end" class="inv-footer-actions">
            <app-button
              size="sm"
              variant="icon"
              class="${isCopied ? 'cnt-copy-ok' : ''}"
              title="${isCopied ? t.contactPersons.copied : t.contactPersons.copyContact}"
              @click="${() => this.copyContact(row)}"
            >
              <span slot="start">${isCopied ? iconCheck(14) : iconCopy(14)}</span>
            </app-button>
            ${!row.isPrimary && !row.isLegacyFallback
              ? html`
                  <app-button
                    size="sm"
                    variant="icon"
                    title="${t.contactPersons.setPrimary}"
                    @click="${() => this.handleSetPrimary(row)}"
                  >
                    <span slot="start">${iconCheck(14)}</span>
                  </app-button>
                `
              : ''}
            <app-button
              size="sm"
              variant="icon"
              title="${t.common.edit}"
              @click="${() => this.openEditModal(row)}"
            >
              <span slot="start">${iconEdit(14)}</span>
            </app-button>
            <app-button
              size="sm"
              variant="icon"
              action="delete"
              title="${t.common.delete}"
              @click="${() => (this.deletingRow = row)}"
            >
              <span slot="start">${iconTrash(14)}</span>
            </app-button>
          </div>
        </card-footer>
      `;
    };

    return html`
      <app-cards-table
        .rows="${list as unknown as Record<string, unknown>[]}"
        .cardRender="${contactCard}"
        .contentStyles="${cardContentStyles}"
        page-size="${this.cardPageSize}"
        page="${this.currentPage}"
        locale="${t.common.locale}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page;
          store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1;
          store.setActivePage(1, false);
          store.setCardGridPageSize(e.detail.pageSize);
        }}"
      ></app-cards-table>
    `;
  }

  private renderTable(list: ContactDirectoryRow[], t: ReturnType<typeof getTranslation>) {
    const contactCell = (rowObj: Record<string, unknown>) => {
      const row = rowObj as unknown as ContactDirectoryRow;
      const roleLine = [row.position, row.department].filter(Boolean).join(' · ');
      return html`
        <div class="cnt-person-cell">
          <app-avatar
            size="sm"
            initials="${this.getInitials(row.fullName)}"
            title="${row.fullName}"
          ></app-avatar>
          <div class="cnt-person-info">
            <div class="cnt-person-head">
              <span class="cnt-person-name">${row.fullName}</span>
              ${row.isPrimary
                ? html`
                    <app-badge variant="success" appearance="soft" size="sm">
                      ${t.contactPersons.primaryBadge}
                    </app-badge>
                  `
                : ''}
            </div>
            ${roleLine
              ? html`<div class="cell-sub" title="${roleLine}">${roleLine}</div>`
              : ''}
          </div>
        </div>
      `;
    };

    const counterpartyCell = (rowObj: Record<string, unknown>) => {
      const row = rowObj as unknown as ContactDirectoryRow;
      return html`
        <app-link
          class="text-link-btn"
          size="md"
          variant="primary"
          @click="${() => store.openCounterpartyDetail(row.counterpartyId)}"
        >
          ${row.counterpartyName}
        </app-link>
        <div class="cell-sub">
          <app-status-chip
            domain="counterpartyType"
            status="${row.counterpartyType}"
            appearance="soft"
            size="sm"
          ></app-status-chip>
          ${row.counterpartyCity ? html`<span>${row.counterpartyCity}</span>` : ''}
        </div>
      `;
    };

    const phonesCell = (rowObj: Record<string, unknown>) => {
      const row = rowObj as unknown as ContactDirectoryRow;
      return html`
        <div class="mono">${row.phone || '—'}</div>
        ${row.additionalPhone
          ? html`<div class="cell-sub mono">${row.additionalPhone}</div>`
          : ''}
      `;
    };

    const channelsCell = (rowObj: Record<string, unknown>) => {
      const row = rowObj as unknown as ContactDirectoryRow;
      return html`
        ${row.email
          ? html`<a class="cnt-email-link" href="mailto:${row.email}">${row.email}</a>`
          : html`<span>—</span>`}
        ${row.messenger ? html`<div class="cell-sub">${row.messenger}</div>` : ''}
      `;
    };

    const notesCell = (rowObj: Record<string, unknown>) => {
      const row = rowObj as unknown as ContactDirectoryRow;
      return html`
        <div class="contract-desc" style="margin-top: 0; max-width: 240px;" title="${row.comment || ''}">
          ${row.comment || '—'}
        </div>
      `;
    };

    const actionsCell = (rowObj: Record<string, unknown>) => {
      const row = rowObj as unknown as ContactDirectoryRow;
      const isCopied = this.copiedId === row.id;
      return html`
        <div class="cp-actions-row">
          <app-button
            size="sm"
            variant="icon"
            class="${isCopied ? 'cnt-copy-ok' : ''}"
            title="${isCopied ? t.contactPersons.copied : t.contactPersons.copyContact}"
            @click="${() => this.copyContact(row)}"
          >
            <span slot="start">${isCopied ? iconCheck(14) : iconCopy(14)}</span>
          </app-button>
          ${!row.isPrimary && !row.isLegacyFallback
            ? html`
                <app-button
                  size="sm"
                  variant="icon"
                  title="${t.contactPersons.setPrimary}"
                  @click="${() => this.handleSetPrimary(row)}"
                >
                  <span slot="start">${iconCheck(14)}</span>
                </app-button>
              `
            : ''}
          <app-button
            size="sm"
            variant="icon"
            title="${t.viewTexts.contacts.openCounterparty}"
            @click="${() => store.openCounterpartyDetail(row.counterpartyId)}"
          >
            <span slot="start">${iconChevronRight(15)}</span>
          </app-button>
          <app-button
            size="sm"
            variant="icon"
            title="${t.common.edit}"
            @click="${() => this.openEditModal(row)}"
          >
            <span slot="start">${iconEdit(14)}</span>
          </app-button>
          <app-button
            action="delete"
            size="sm"
            variant="icon"
            title="${t.common.delete}"
            @click="${() => (this.deletingRow = row)}"
          >
            <span slot="start">${iconTrash(14)}</span>
          </app-button>
        </div>
      `;
    };

    return html`
      <div class="table-card">
        <app-data-table
          .contentStyles="${tableContentStyles}"
          .rows="${list as unknown as Record<string, unknown>[]}"
          page-size="${this.tablePageSize}"
          page="${this.currentPage}"
          locale="${t.common.locale}"
          @page-change="${(e: CustomEvent<{ page: number }>) => {
            this.currentPage = e.detail.page;
            store.setActivePage(e.detail.page);
            this.scrollTop = 0;
          }}"
          @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
            this.currentPage = 1;
            store.setActivePage(1, false);
            store.setTablePageSize(e.detail.pageSize);
          }}"
        >
          <app-table-column
            field="fullName"
            label="${t.viewTexts.contacts.thContact}"
            .cellRender="${contactCell}"
          ></app-table-column>
          <app-table-column
            field="counterpartyName"
            label="${t.viewTexts.contacts.thCounterparty}"
            .cellRender="${counterpartyCell}"
          ></app-table-column>
          <app-table-column
            field="phone"
            label="${t.viewTexts.contacts.thPhones}"
            .cellRender="${phonesCell}"
          ></app-table-column>
          <app-table-column
            field="email"
            label="${t.viewTexts.contacts.thEmailMessenger}"
            .cellRender="${channelsCell}"
          ></app-table-column>
          <app-table-column
            field="birthDate"
            label="${t.viewTexts.contacts.thBirthDate}"
            mono
          ></app-table-column>
          <app-table-column
            field="comment"
            label="${t.viewTexts.contacts.thNotes}"
            .cellRender="${notesCell}"
          ></app-table-column>
          <app-table-column field="" label="" .cellRender="${actionsCell}"></app-table-column>
        </app-data-table>
      </div>
    `;
  }

  private renderFormModal(t: ReturnType<typeof getTranslation>) {
    const cpOptions = this.counterparties.map((cp) => ({
      value: cp.id,
      label: `${cp.name}${cp.city ? ` (${cp.city})` : ''}`,
    }));

    return html`
      <app-modal
        ?open="${this.modalOpen}"
        size="lg"
        title="${this.editingContactId
          ? t.viewTexts.contacts.modalTitleEdit
          : t.viewTexts.contacts.modalTitleCreate}"
        @close="${() => (this.modalOpen = false)}"
      >
        <app-form-grid columns="2">
          <div class="col-span-2">
            <app-select
              label="${t.viewTexts.contacts.labelCounterparty}"
              placeholder="${t.viewTexts.contacts.selectCounterpartyPlaceholder}"
              .value="${this.fCounterpartyId}"
              .options="${cpOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.fCounterpartyId = eventValue(e);
                this.formError = '';
              }}"
            ></app-select>
          </div>

          <div class="col-span-2">
            <app-input
              label="${t.contactPersons.fullNameLabel}"
              placeholder="${t.contactPersons.fullNamePlaceholder}"
              .value="${this.fFullName}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.fFullName = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.positionLabel}"
              placeholder="${t.contactPersons.positionPlaceholder}"
              .value="${this.fPosition}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fPosition = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.departmentLabel}"
              placeholder="${t.contactPersons.departmentPlaceholder}"
              .value="${this.fDepartment}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fDepartment = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.phoneLabel}"
              placeholder="${t.contactPersons.phonePlaceholder}"
              .value="${this.fPhone}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fPhone = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.additionalPhoneLabel}"
              placeholder="${t.contactPersons.additionalPhonePlaceholder}"
              .value="${this.fAdditionalPhone}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.fAdditionalPhone = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              type="email"
              label="${t.contactPersons.emailLabel}"
              placeholder="${t.contactPersons.emailPlaceholder}"
              .value="${this.fEmail}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fEmail = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.messengerLabel}"
              placeholder="${t.contactPersons.messengerPlaceholder}"
              .value="${this.fMessenger}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fMessenger = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-date-input
              label="${t.contactPersons.birthDateLabel}"
              .value="${this.fBirthDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.fBirthDate = eventValue(e))}"
            ></app-date-input>
          </div>

          <app-switch
            class="switch-field"
            size="md"
            frame="normal"
            field-label-style="ghost"
            field-label="${t.contactPersons.isPrimaryLabel}"
            label="${t.contactPersons.isPrimaryLabel}"
            .checked="${this.fIsPrimary}"
            @change="${(e: CustomEvent<{ checked: boolean }>) =>
              (this.fIsPrimary = Boolean(e.detail?.checked))}"
          ></app-switch>

          <div class="col-span-2">
            <app-textarea
              label="${t.contactPersons.commentLabel}"
              placeholder="${t.contactPersons.commentPlaceholder}"
              .value="${this.fComment}"
              rows="2"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fComment = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSaveContact()}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteModal(t: ReturnType<typeof getTranslation>) {
    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingRow)}"
        size="sm"
        title="${t.contactPersons.deleteConfirmTitle}"
        action="${t.contactPersons.deleteConfirmAction(this.deletingRow?.fullName || '')}"
        result="${t.contactPersons.deleteConfirmResult}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .cancelLabel="${t.common.cancel}"
        .confirmLabel="${t.common.delete}"
        @cancel="${() => (this.deletingRow = null)}"
        @confirm="${() => this.handleDeleteConfirmed()}"
      ></app-confirm-dialog>
    `;
  }
}

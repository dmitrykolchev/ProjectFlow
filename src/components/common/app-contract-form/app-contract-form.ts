import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { CalculationFrequency, Contract, ContractStatus, ContractType } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-contract-form.css';
import {
  mapCompanyOptions,
  mapCounterpartyOptions,
  mapProjectOptions,
  mapUserOptions,
} from '../entity-selector-options';
import { eventValue } from '../event-value';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-input/app-input';
import '../app-select/app-select';
import '../app-entity-selector/app-entity-selector';
import '../app-number-input/app-number-input';
import '../app-date-input/app-date-input';
import '../app-textarea/app-textarea';
import '../app-button/app-button';

/**
 * Canonical contract create/edit form. The component owns the whole field set and
 * writes to the store itself; views open it by setting `open` plus the edit target
 * (`contract`) or the creation presets (`presetCounterpartyId`, `presetProjectId`,
 * `presetStatus` for a quick contract that starts active, `contextTitle`). Every
 * opening shows the same fourteen fields. A `saved` event carries the written
 * contract so views can navigate to it.
 */
@customElement('app-contract-form')
export class AppContractForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ type: Object, attribute: false }) contract: Contract | null = null;
  @property({ type: String }) presetCounterpartyId: string = '';
  @property({ type: String }) presetProjectId: string = '';
  /** status a newly created contract starts with, active for quick openings */
  @property({ type: String }) presetStatus: ContractStatus = 'draft';
  /** modal title override for context-bound openings (quick contract of a counterparty) */
  @property({ type: String }) contextTitle: string = '';

  @state() private currentLang = store.customization.language;
  @state() private fNumber = '';
  @state() private fTitle = '';
  @state() private fType: ContractType = 'service';
  @state() private fCompanyId = '';
  @state() private fCounterpartyId = '';
  @state() private fProjectId = '';
  @state() private fOwnerId = '';
  @state() private fAmount = 1500000;
  @state() private fCurrency: 'RUB' | 'USD' | 'EUR' = 'RUB';
  @state() private fStartDate = '';
  @state() private fEndDate = '';
  @state() private fStatus: ContractStatus = 'draft';
  @state() private fFrequency: CalculationFrequency = 'monthly';
  @state() private fDescription = '';
  @state() private formError = '';

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('open') && this.open) this.initFields();
  }

  // the view owns the open flag, so every close of the form must report back to it:
  // closing from inside the component (cancel, save, backdrop) has no view-side reset
  // without this event, and the next open request would be a no-op on an unchanged flag
  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('open') && !this.open) {
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }
  }

  private closeModal() {
    this.open = false;
  }

  private initFields() {
    const t = getTranslation(this.currentLang);
    const today = new Date().toISOString().slice(0, 10);
    const year = new Date().getFullYear();

    if (this.contract) {
      const ctr = this.contract;
      this.fNumber = ctr.number;
      this.fTitle = ctr.title;
      this.fType = ctr.type;
      this.fCompanyId = ctr.companyId;
      this.fCounterpartyId = ctr.counterpartyId;
      this.fProjectId = ctr.projectId || '';
      this.fOwnerId = ctr.ownerId || '';
      this.fAmount = ctr.amount;
      this.fCurrency = ctr.currency;
      this.fStartDate = ctr.startDate;
      this.fEndDate = ctr.endDate;
      this.fStatus = ctr.status;
      this.fFrequency = ctr.billingFrequency || 'monthly';
      this.fDescription = ctr.description;
    } else {
      const linkedProject =
        this.presetProjectId ||
        store.projects.find((p) => p.counterpartyId === this.presetCounterpartyId)?.id ||
        store.projects[0]?.id ||
        '';
      this.fNumber = `${t.viewTexts.counterpartyDetail.ctrNumberPrefix}${year}/${String(
        store.contracts.length + 1
      ).padStart(3, '0')}`;
      this.fTitle = '';
      this.fType = 'service';
      this.fCompanyId = store.companies[0]?.id || '';
      this.fCounterpartyId = this.presetCounterpartyId || store.counterparties[0]?.id || '';
      this.fProjectId = linkedProject;
      this.fOwnerId = store.users[0]?.id || '';
      this.fAmount = 1500000;
      this.fCurrency = 'RUB';
      this.fStartDate = today;
      this.fEndDate = `${year}-12-31`;
      this.fStatus = this.presetStatus;
      this.fFrequency = 'monthly';
      this.fDescription = '';
    }
    this.formError = '';
  }

  private handleSave() {
    if (!this.fNumber.trim()) {
      this.formError = getTranslation(this.currentLang).common.required;
      return;
    }

    const payload = {
      number: this.fNumber.trim(),
      title: this.fTitle.trim() || this.fNumber.trim(),
      type: this.fType,
      companyId: this.fCompanyId || store.companies[0]?.id || '',
      counterpartyId: this.fCounterpartyId || store.counterparties[0]?.id || '',
      projectId: this.fProjectId || undefined,
      ownerId: this.fOwnerId || undefined,
      amount: Math.max(0, Number(this.fAmount) || 0),
      currency: this.fCurrency,
      startDate: this.fStartDate || new Date().toISOString().slice(0, 10),
      endDate: this.fEndDate || new Date().toISOString().slice(0, 10),
      status: this.fStatus,
      billingFrequency: this.fFrequency,
      description: this.fDescription.trim(),
    };

    let saved: Contract;
    if (this.contract) {
      saved = { id: this.contract.id, ...payload };
      store.updateContract(saved);
    } else {
      saved = store.addContract(payload);
    }

    this.open = false;
    this.dispatchEvent(
      new CustomEvent('saved', {
        detail: { contract: saved },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const title = this.contextTitle
      ? this.contextTitle
      : this.contract
        ? t.viewTexts.contracts.modalTitleEdit
        : t.viewTexts.contracts.newContractButton;

    const typeOptions = [
      { value: 'service', label: t.viewTexts.counterpartyDetail.typeService },
      { value: 'supply', label: t.viewTexts.counterpartyDetail.typeSupply },
      { value: 'license', label: t.viewTexts.counterpartyDetail.typeLicense },
      { value: 'sla', label: 'SLA' },
      { value: 'nda', label: 'NDA' },
    ];

    const statusOptions = [
      { value: 'draft', label: t.viewTexts.contracts.statusDraft, color: '#64748b' },
      { value: 'on_approval', label: t.viewTexts.contracts.statusOnApproval, color: '#f59e0b' },
      { value: 'active', label: t.viewTexts.contracts.statusActive, color: '#10b981' },
      { value: 'completed', label: t.viewTexts.contracts.statusCompleted, color: '#0284c7' },
      { value: 'terminated', label: t.viewTexts.contracts.statusTerminated, color: '#ef4444' },
    ];

    const currencyOptions = [
      { value: 'RUB', label: 'RUB (₽)' },
      { value: 'USD', label: 'USD ($)' },
      { value: 'EUR', label: 'EUR (€)' },
    ];

    const frequencyOptions = [
      { value: 'weekly', label: t.calculations.frequencies.weekly },
      { value: 'biweekly', label: t.calculations.frequencies.biweekly },
      { value: 'monthly', label: t.calculations.frequencies.monthly },
      { value: 'quarterly', label: t.calculations.frequencies.quarterly },
      { value: 'custom', label: t.calculations.frequencies.custom },
    ];

    const companyOptions = mapCompanyOptions(store.companies, t);
    const counterpartyOptions = mapCounterpartyOptions(store.counterparties, t);
    const projectOptions = mapProjectOptions(store.projects, t);
    const ownerOptions = mapUserOptions(store.users, t);

   return html`
      <app-modal
        ?open="${this.open}"
        size="lg"
        title="${title}"
        @close="${() => this.closeModal()}"
      >
        <app-form-grid>
          <div>
            <app-input
              label="${t.viewTexts.counterpartyDetail.labelContractNumber}"
              placeholder="${t.viewTexts.contracts.ctrNumberPlaceholder}"
              .value="${this.fNumber}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.fNumber = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.contracts.labelTypeContract}"
              .value="${this.fType}"
              .options="${typeOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fType = eventValue(e) as ContractType)}"
            ></app-select>
          </div>

          <div class="col-span-2">
            <app-input
              label="${t.viewTexts.contracts.labelSubjectModal}"
              .value="${this.fTitle}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fTitle = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-entity-selector
              label="${t.viewTexts.counterpartyDetail.labelOurCompany}"
              .value="${this.fCompanyId}"
              .options="${companyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fCompanyId = eventValue(e))}"
            ></app-entity-selector>
          </div>

          <div>
            <app-entity-selector
              label="${t.viewTexts.payments.thCounterparty}"
              .value="${this.fCounterpartyId}"
              .options="${counterpartyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fCounterpartyId = eventValue(e))}"
            ></app-entity-selector>
          </div>

          <div>
            <app-entity-selector
              label="${t.viewTexts.timeTracking.labelProject}"
              placeholder="${t.viewTexts.contracts.optionNoProject}"
              clearable
              .value="${this.fProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fProjectId = eventValue(e))}"
            ></app-entity-selector>
          </div>

          <div>
            <app-entity-selector
              label="${t.viewTexts.contracts.labelOwner}"
              placeholder="${t.viewTexts.contracts.optionUnassignedOwner}"
              clearable
              .value="${this.fOwnerId}"
              .options="${ownerOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fOwnerId = eventValue(e))}"
            ></app-entity-selector>
          </div>

          <div>
            <app-number-input
              label="${t.viewTexts.contracts.labelContractAmount}"
              .value="${this.fAmount}"
              min="0"
              step="50000"
              @change="${(e: CustomEvent<{ value: number }>) => (this.fAmount = eventValue(e))}"
            ></app-number-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.expenses.labelCurrency}"
              .value="${this.fCurrency}"
              .options="${currencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fCurrency = eventValue(e) as 'RUB' | 'USD' | 'EUR')}"
            ></app-select>
          </div>

          <div>
            <app-date-input
              label="${t.viewTexts.counterpartyDetail.labelStartDate}"
              .value="${this.fStartDate}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fStartDate = eventValue(e))}"
            ></app-date-input>
          </div>

          <div>
            <app-date-input
              label="${t.viewTexts.counterpartyDetail.labelEndDate}"
              .value="${this.fEndDate}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fEndDate = eventValue(e))}"
            ></app-date-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.counterparties.thStatus}"
              .value="${this.fStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fStatus = eventValue(e) as ContractStatus)}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.counterpartyDetail.labelCalcCycle}"
              .value="${this.fFrequency}"
              .options="${frequencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fFrequency = eventValue(e) as CalculationFrequency)}"
            ></app-select>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.contracts.labelConditions}"
              .value="${this.fDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fDescription = eventValue(e))}"
            ></app-textarea>
          </div>
        </app-form-grid>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => this.closeModal()}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSave()}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-contract-form': AppContractForm;
  }
}

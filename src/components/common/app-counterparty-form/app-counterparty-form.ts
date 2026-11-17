import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Counterparty, CounterpartyStatus, CounterpartyType } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-counterparty-form.css';
import { eventValue } from '../event-value';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-input/app-input';
import '../app-select/app-select';
import '../app-number-input/app-number-input';
import '../app-textarea/app-textarea';
import '../app-button/app-button';

/**
 * Canonical counterparty create/edit form. The component owns the whole field set and
 * writes to the store itself; views open it by setting `open` plus the edit target
 * (`counterparty`). A `saved` event carries the written counterparty. The short name is
 * required and copies the historical validation error, rating stays clamped to 1..5.
 */
@customElement('app-counterparty-form')
export class AppCounterpartyForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ attribute: false }) counterparty: Counterparty | null = null;

  @state() private currentLang = store.customization.language;
  @state() private fName = '';
  @state() private fLegalName = '';
  @state() private fType: CounterpartyType = 'client';
  @state() private fInn = '';
  @state() private fKpp = '';
  @state() private fCity = '';
  @state() private fContactPerson = '';
  @state() private fPhone = '';
  @state() private fEmail = '';
  @state() private fStatus: CounterpartyStatus = 'active';
  @state() private fRating = 5;
  @state() private fNotes = '';
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

    if (this.counterparty) {
      const cp = this.counterparty;
      this.fName = cp.name;
      this.fLegalName = cp.legalName;
      this.fType = cp.type;
      this.fInn = cp.inn;
      this.fKpp = cp.kpp || '';
      this.fCity = cp.city;
      this.fContactPerson = cp.contactPerson;
      this.fPhone = cp.phone;
      this.fEmail = cp.email;
      this.fStatus = cp.status;
      this.fRating = cp.rating;
      this.fNotes = cp.notes;
    } else {
      this.fName = '';
      this.fLegalName = '';
      this.fType = 'client';
      this.fInn = '';
      this.fKpp = '';
      this.fCity = t.viewTexts.counterparties.defaultCity;
      this.fContactPerson = '';
      this.fPhone = '';
      this.fEmail = '';
      this.fStatus = 'active';
      this.fRating = 5;
      this.fNotes = '';
    }
    this.formError = '';
  }

  private handleSave() {
    if (!this.fName.trim()) {
      this.formError = getTranslation(this.currentLang).common.required;
      return;
    }

    const payload = {
      name: this.fName.trim(),
      legalName: this.fLegalName.trim() || this.fName.trim(),
      type: this.fType,
      inn: this.fInn.trim() || '7700000000',
      kpp: this.fKpp.trim(),
      city: this.fCity.trim() || getTranslation(this.currentLang).viewTexts.counterparties.defaultCity,
      contactPerson: this.fContactPerson.trim() || '—',
      phone: this.fPhone.trim() || '—',
      email: this.fEmail.trim() || '—',
      status: this.fStatus,
      rating: Math.max(1, Math.min(5, Number(this.fRating) || 5)),
      notes: this.fNotes.trim(),
    };

    let saved: Counterparty;
    if (this.counterparty) {
      saved = { id: this.counterparty.id, ...payload };
      store.updateCounterparty(saved);
    } else {
      saved = store.addCounterparty(payload);
    }

    this.open = false;
    this.dispatchEvent(
      new CustomEvent('saved', {
        detail: { counterparty: saved },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const title = this.counterparty
      ? t.viewTexts.counterparties.modalTitleEdit
      : t.viewTexts.counterparties.modalTitleCreate;

    const typeOptions = [
      { value: 'client', label: t.viewTexts.counterparties.typeClient, color: '#6366f1' },
      { value: 'vendor', label: t.viewTexts.counterparties.typeVendor, color: '#0284c7' },
      { value: 'partner', label: t.viewTexts.counterparties.typePartner, color: '#f59e0b' },
      { value: 'contractor', label: t.viewTexts.counterparties.typeContractor, color: '#64748b' },
    ];

    const statusOptions = [
      { value: 'active', label: t.viewTexts.counterparties.statusActive, color: '#10b981' },
      { value: 'pending', label: t.viewTexts.counterparties.statusPending, color: '#f59e0b' },
      { value: 'blocked', label: t.viewTexts.counterparties.statusBlocked, color: '#ef4444' },
    ];

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
              label="${t.viewTexts.counterparties.labelShortName}"
              .value="${this.fName}"
              required
              error="${this.formError}"
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.fName = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelLegalName}"
              .value="${this.fLegalName}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fLegalName = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.counterparties.labelType}"
              .value="${this.fType}"
              .options="${typeOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fType = eventValue(e) as CounterpartyType)}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.counterparties.labelStatusCheck}"
              .value="${this.fStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fStatus = eventValue(e) as CounterpartyStatus)}"
            ></app-select>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelInn}"
              .value="${this.fInn}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fInn = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelKpp}"
              .value="${this.fKpp}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fKpp = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelContactPerson}"
              .value="${this.fContactPerson}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.fContactPerson = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelCity}"
              .value="${this.fCity}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fCity = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.counterparties.labelPhone}"
              .value="${this.fPhone}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fPhone = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="Email"
              type="email"
              .value="${this.fEmail}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fEmail = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-number-input
              label="${t.viewTexts.counterparties.labelRating}"
              .value="${this.fRating}"
              min="1"
              max="5"
              step="1"
              @change="${(e: CustomEvent<{ value: number }>) => (this.fRating = eventValue(e))}"
            ></app-number-input>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.counterparties.labelNotes}"
              .value="${this.fNotes}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fNotes = eventValue(e))}"
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
    'app-counterparty-form': AppCounterpartyForm;
  }
}

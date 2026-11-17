import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Company, CompanyStatus } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-company-form.css';
import { eventValue } from '../event-value';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-input/app-input';
import '../app-select/app-select';
import '../app-textarea/app-textarea';
import '../app-button/app-button';

/**
 * Canonical company create/edit form. The component owns the whole field set and writes
 * to the store itself; views open it by setting `open` plus the edit target (`company`).
 * A `saved` event carries the written company. The short name is required and copies the
 * historical validation error, empty legal name falls back to the short name.
 */
@customElement('app-company-form')
export class AppCompanyForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ attribute: false }) company: Company | null = null;

  @state() private currentLang = store.customization.language;
  @state() private fName = '';
  @state() private fLegalName = '';
  @state() private fInn = '';
  @state() private fKpp = '';
  @state() private fIndustry = '';
  @state() private fCity = '';
  @state() private fPhone = '';
  @state() private fEmail = '';
  @state() private fWebsite = '';
  @state() private fDirectorId = '';
  @state() private fStatus: CompanyStatus = 'active';
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

    if (this.company) {
      const c = this.company;
      this.fName = c.name;
      this.fLegalName = c.legalName;
      this.fInn = c.inn;
      this.fKpp = c.kpp || '';
      this.fIndustry = c.industry;
      this.fCity = c.city;
      this.fPhone = c.phone;
      this.fEmail = c.email;
      this.fWebsite = c.website || '';
      this.fDirectorId = c.directorId || '';
      this.fStatus = c.status;
      this.fDescription = c.description;
    } else {
      this.fName = '';
      this.fLegalName = '';
      this.fInn = '';
      this.fKpp = '';
      this.fIndustry = '';
      this.fCity = t.viewTexts.companies.defaultCity;
      this.fPhone = '';
      this.fEmail = '';
      this.fWebsite = '';
      this.fDirectorId = store.users[0]?.id || '';
      this.fStatus = 'active';
      this.fDescription = '';
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
      inn: this.fInn.trim() || '7700000000',
      kpp: this.fKpp.trim(),
      industry: this.fIndustry.trim() || 'IT / Software',
      city: this.fCity.trim() || getTranslation(this.currentLang).viewTexts.companies.defaultCity,
      phone: this.fPhone.trim() || '—',
      email: this.fEmail.trim() || '—',
      website: this.fWebsite.trim(),
      directorId: this.fDirectorId || undefined,
      status: this.fStatus,
      description: this.fDescription.trim(),
    };

    let saved: Company;
    if (this.company) {
      saved = { id: this.company.id, ...payload };
      store.updateCompany(saved);
    } else {
      saved = store.addCompany(payload);
    }

    this.open = false;
    this.dispatchEvent(
      new CustomEvent('saved', {
        detail: { company: saved },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const title = this.company
      ? t.viewTexts.companies.modalTitleEdit
      : t.viewTexts.companies.modalTitleCreate;

    const statusOptions = [
      { value: 'active', label: t.viewTexts.companies.filterActive, color: '#10b981' },
      { value: 'inactive', label: t.viewTexts.companies.filterInactive, color: '#64748b' },
    ];

    const directorOptions = [
      { value: '', label: t.viewTexts.companies.optionUnassignedDirector },
      ...store.users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` })),
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
              label="${t.viewTexts.companies.labelShortName}"
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
              label="${t.viewTexts.companies.labelLegalName}"
              .value="${this.fLegalName}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fLegalName = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.companies.labelInn}"
              .value="${this.fInn}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fInn = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.companies.labelKpp}"
              .value="${this.fKpp}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fKpp = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.companies.metaIndustry}"
              .value="${this.fIndustry}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fIndustry = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.companies.metaCity}"
              .value="${this.fCity}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fCity = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.companies.metaPhone}"
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
            <app-select
              label="${t.viewTexts.companies.metaDirector}"
              .value="${this.fDirectorId}"
              .options="${directorOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.fDirectorId = eventValue(e))}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.companies.labelStatus}"
              .value="${this.fStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fStatus = eventValue(e) as CompanyStatus)}"
            ></app-select>
          </div>

          <div class="col-span-2">
            <app-input
              label="${t.viewTexts.companies.labelWebsite}"
              .value="${this.fWebsite}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fWebsite = eventValue(e))}"
            ></app-input>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.companies.labelDescription}"
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
    'app-company-form': AppCompanyForm;
  }
}

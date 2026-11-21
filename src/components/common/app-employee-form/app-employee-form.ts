import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { EmployeeStatus, User } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-employee-form.css';
import { eventValue } from '../event-value';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-input/app-input';
import '../app-select/app-select';
import '../app-number-input/app-number-input';
import '../app-date-input/app-date-input';
import '../app-button/app-button';

/**
 * Canonical employee create/edit form. The component owns the whole field set and
 * writes to the store itself; views open it by setting `open` plus the edit target
 * (`employee`). A `saved` event carries the written employee. The full name is
 * required and copies the historical validation error, editing keeps the avatar of
 * the existing record, hourly rate stays inside the 500..25000 control range.
 */
@customElement('app-employee-form')
export class AppEmployeeForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ type: Object, attribute: false }) employee: User | null = null;

  @state() private currentLang = store.customization.language;
  @state() private fName = '';
  @state() private fRole = '';
  @state() private fDepartment = '';
  @state() private fCompanyId = '';
  @state() private fEmail = '';
  @state() private fPhone = '';
  @state() private fLocation = '';
  @state() private fStatus: EmployeeStatus = 'active';
  @state() private fHireDate = '';
  @state() private fHourlyRate = 3500;
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

    if (this.employee) {
      const emp = this.employee;
      this.fName = emp.name;
      this.fRole = emp.role;
      this.fDepartment = emp.department || '';
      this.fCompanyId = emp.companyId || '';
      this.fEmail = emp.email;
      this.fPhone = emp.phone || '';
      this.fLocation = emp.location || '';
      this.fStatus = emp.status || 'active';
      this.fHireDate = emp.hireDate || '';
      this.fHourlyRate = emp.hourlyRate || 3500;
    } else {
      this.fName = '';
      this.fRole = '';
      this.fDepartment = '';
      this.fCompanyId = store.companies[0]?.id || '';
      this.fEmail = '';
      this.fPhone = '';
      this.fLocation = t.viewTexts.employees.defaultLocation;
      this.fStatus = 'active';
      this.fHireDate = new Date().toISOString().slice(0, 10);
      this.fHourlyRate = 3500;
    }
    this.formError = '';
  }

  private handleSave() {
    if (!this.fName.trim()) {
      this.formError = getTranslation(this.currentLang).common.required;
      return;
    }

    const baseData = {
      name: this.fName.trim(),
      role: this.fRole.trim() || 'Specialist',
      department: this.fDepartment.trim() ||
        getTranslation(this.currentLang).viewTexts.employees.defaultDepartment,
      companyId: this.fCompanyId || undefined,
      email: this.fEmail.trim() || 'team@projectflow.dev',
      phone: this.fPhone.trim() || '—',
      location: this.fLocation.trim() ||
        getTranslation(this.currentLang).viewTexts.employees.defaultLocation,
      status: this.fStatus,
      hireDate: this.fHireDate || undefined,
      hourlyRate: this.fHourlyRate,
    };

    let saved: User;
    if (this.employee) {
      saved = { id: this.employee.id, avatar: this.employee.avatar || '', ...baseData };
      store.updateEmployee(saved);
    } else {
      saved = store.addEmployee(baseData);
    }

    this.open = false;
    this.dispatchEvent(
      new CustomEvent('saved', {
        detail: { employee: saved },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const title = this.employee
      ? t.viewTexts.employees.modalTitleEdit
      : t.viewTexts.employees.modalTitleCreate;

    const statusOptions = [
      { value: 'active', label: t.viewTexts.employees.statusActive, color: '#10b981' },
      { value: 'remote', label: t.viewTexts.employees.statusRemote, color: '#0284c7' },
      { value: 'vacation', label: t.viewTexts.employees.statusVacation, color: '#f59e0b' },
      { value: 'onboarding', label: t.viewTexts.employees.statusOnboarding, color: '#6366f1' },
    ];

    const companyOptions = [
      { value: '', label: t.viewTexts.employees.optionNoCompany },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
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
              label="${t.viewTexts.employees.labelFullName}"
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
              label="${t.viewTexts.employees.labelPosition}"
              .value="${this.fRole}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fRole = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.employees.labelDepartment}"
              .value="${this.fDepartment}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.fDepartment = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.employees.labelCompany}"
              .value="${this.fCompanyId}"
              .options="${companyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.fCompanyId = eventValue(e))}"
            ></app-select>
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
            <app-input
              label="${t.viewTexts.employees.labelPhone}"
              .value="${this.fPhone}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fPhone = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.employees.labelLocation}"
              .value="${this.fLocation}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fLocation = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.employees.labelStatus}"
              .value="${this.fStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fStatus = eventValue(e) as EmployeeStatus)}"
            ></app-select>
          </div>

          <div>
            <app-date-input
              label="${t.viewTexts.employees.labelHireDate}"
              .value="${this.fHireDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.fHireDate = eventValue(e))}"
            ></app-date-input>
          </div>

          <div>
            <app-number-input
              label="${t.viewTexts.employees.labelRate}"
              .value="${this.fHourlyRate}"
              min="500"
              max="25000"
              step="100"
              unit="₽"
              @change="${(e: CustomEvent<{ value: number }>) => (this.fHourlyRate = eventValue(e))}"
            ></app-number-input>
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
    'app-employee-form': AppEmployeeForm;
  }
}

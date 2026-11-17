import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { Project, ProjectStatus } from '../../../types';
import { getTranslation } from '../../../i18n';
import styles from './app-project-form.css';
import { eventValue } from '../event-value';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-input/app-input';
import '../app-select/app-select';
import '../app-number-input/app-number-input';
import '../app-date-input/app-date-input';
import '../app-textarea/app-textarea';
import '../app-button/app-button';
import '../app-color-swatches/app-color-swatches';

const PROJECT_COLOR_SWATCHES = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
  '#ec4899',
  '#8b5cf6',
  '#ef4444',
];

/**
 * Canonical project create/edit form. The component owns the whole field set (name,
 * key, status, due date, company, counterparty, budget, progress, color swatches,
 * description) and writes to the store itself; views open it by setting `open` plus
 * the edit target (`project`) or create presets. A `saved` event carries the written
 * project. The name is required and copies the historical validation error; the key
 * upper-cases while typing and falls back to a name-derived code on save. Presets
 * fill company, counterparty, status, key, budget and the modal title; `saveLabel`
 * replaces the primary button caption, `beforeSave` lets a view run an async hook
 * (AI blueprint pipeline) before the store write, `extra` and `footer-extra` slots
 * host view-owned create-mode sections.
 */
@customElement('app-project-form')
export class AppProjectForm extends LitElement {
  @property({ type: Boolean, reflect: true }) open: boolean = false;
  @property({ attribute: false }) project: Project | null = null;
  @property({ attribute: false }) presetCompanyId: string | null = null;
  @property({ attribute: false }) presetCounterpartyId: string | null = null;
  @property({ attribute: false }) presetStatus: ProjectStatus | null = null;
  @property({ attribute: false }) presetKey: string | null = null;
  @property({ attribute: false }) presetBudget: number | null = null;
  @property({ type: String }) contextTitle: string = '';
  @property({ type: String }) saveLabel: string = '';
  @property({ type: Boolean }) saveDisabled: boolean = false;
  @property({ attribute: false }) beforeSave: ((data: { name: string; key: string }) => Promise<boolean>) | null = null;
  // view-owned create-mode sections rendered inside the modal body and footer;
  // named slots cannot be used here because the modal moves to the portal on open
  // and a slotted node loses its assignment when the slot element leaves the shadow tree
  @property({ attribute: false }) extraContent: TemplateResult | null = null;
  @property({ attribute: false }) footerExtra: TemplateResult | null = null;

  @state() private currentLang = store.customization.language;
  @state() private fName = '';
  @state() private fKey = '';
  @state() private fDescription = '';
  @state() private fColor = '#6366f1';
  @state() private fStatus: ProjectStatus = 'planning';
  @state() private fDueDate = '';
  @state() private fCompanyId = '';
  @state() private fCounterpartyId = '';
  @state() private fBudget = 5000000;
  @state() private fProgress = 0;
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
    if (this.project) {
      const proj = this.project;
      this.fName = proj.name;
      this.fKey = proj.key;
      this.fDescription = proj.description;
      this.fColor = proj.color;
      this.fStatus = proj.status || 'active';
      this.fDueDate = proj.dueDate;
      this.fCompanyId = proj.companyId || '';
      this.fCounterpartyId = proj.counterpartyId || '';
      this.fBudget = proj.budget || 0;
      this.fProgress = proj.progress;
    } else {
      this.fName = '';
      this.fKey = this.presetKey ?? '';
      this.fDescription = '';
      this.fColor = '#6366f1';
      this.fStatus = this.presetStatus ?? 'planning';
      this.fDueDate = `${new Date().getFullYear()}-12-31`;
      this.fCompanyId = this.presetCompanyId ?? (store.companies[0]?.id || '');
      this.fCounterpartyId = this.presetCounterpartyId ?? (store.counterparties[0]?.id || '');
      this.fBudget = this.presetBudget ?? 5000000;
      this.fProgress = 0;
    }
    this.formError = '';
  }

  /** Public entry for view footer-extra buttons that need to trigger the save. */
  public save() {
    void this.handleSave();
  }

  /** Public reads for view-owned create-mode sections (spec bootstrap). */
  public fieldData(): { name: string; key: string } {
    return { name: this.fName, key: this.fKey };
  }

  public setDescriptionIfEmpty(text: string) {
    if (!this.fDescription.trim()) this.fDescription = text;
  }

  public ensureName(text: string) {
    if (!this.fName.trim()) this.fName = text;
  }

  private async handleSave() {
    const t = getTranslation(this.currentLang);
    if (!this.fName.trim()) {
      this.formError = t.common.required;
      return;
    }

    const derivedKey =
      this.fKey.trim().toUpperCase() ||
      this.fName
        .trim()
        .replace(/[^A-Za-zА-Яа-я0-9]/g, '')
        .slice(0, 4)
        .toUpperCase() ||
      'PROJ';

    if (this.beforeSave) {
      const ok = await this.beforeSave({ name: this.fName.trim(), key: derivedKey });
      if (!ok) return;
    }

    const baseData = {
      name: this.fName.trim(),
      key: derivedKey,
      description: this.fDescription.trim(),
      color: this.fColor,
      status: this.fStatus,
      dueDate: this.fDueDate || new Date().toISOString().slice(0, 10),
      companyId: this.fCompanyId || undefined,
      counterpartyId: this.fCounterpartyId || undefined,
      budget: Math.max(0, Number(this.fBudget) || 0),
      progress: Math.max(0, Math.min(100, Number(this.fProgress) || 0)),
    };

    let saved: Project;
    if (this.project) {
      const existing = store.projects.find((p) => p.id === this.project!.id);
      saved = { ...baseData, id: this.project.id, members: existing?.members || [], specDocumentId: existing?.specDocumentId };
      store.updateProject(saved);
    } else {
      saved = store.addProject({ ...baseData, members: [] });
    }

    this.open = false;
    this.dispatchEvent(
      new CustomEvent('saved', {
        detail: { project: saved },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const title = this.project
      ? t.viewTexts.projects.modalTitleEdit
      : this.contextTitle || t.viewTexts.projects.modalTitleCreate;

    const statusOptions = [
      { value: 'planning', label: t.projectStatuses.planning, color: '#0284c7' },
      { value: 'active', label: t.projectStatuses.active, color: '#10b981' },
      { value: 'on_hold', label: t.projectStatuses.on_hold, color: '#f59e0b' },
      { value: 'completed', label: t.projectStatuses.completed, color: '#6366f1' },
    ];

    const companyOptions = [
      { value: '', label: t.viewTexts.projects.optionNoCompany },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];

    const counterpartyOptions = [
      { value: '', label: t.viewTexts.projects.optionInternalProject },
      ...store.counterparties.map((c) => ({ value: c.id, label: c.name })),
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
              label="${t.viewTexts.projects.labelProjectName}"
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
              label="${t.viewTexts.projects.labelProjectKey}"
              placeholder="CORE"
              .value="${this.fKey}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.fKey = eventValue(e).toUpperCase())}"
            ></app-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.projects.labelStatus}"
              .value="${this.fStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fStatus = eventValue(e) as ProjectStatus)}"
            ></app-select>
          </div>

          <div>
            <app-date-input
              label="${t.viewTexts.projects.labelDueDate}"
              .value="${this.fDueDate}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.fDueDate = eventValue(e))}"
            ></app-date-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.projects.labelCompany}"
              .value="${this.fCompanyId}"
              .options="${companyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.fCompanyId = eventValue(e))}"
            ></app-select>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.projects.labelCounterparty}"
              .value="${this.fCounterpartyId}"
              .options="${counterpartyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fCounterpartyId = eventValue(e))}"
            ></app-select>
          </div>

          <div>
            <app-number-input
              label="${t.viewTexts.projects.labelBudgetRub}"
              .value="${this.fBudget}"
              min="0"
              step="100000"
              unit="₽"
              @change="${(e: CustomEvent<{ value: number }>) => (this.fBudget = eventValue(e))}"
            ></app-number-input>
          </div>

          <div>
            <app-number-input
              label="${t.viewTexts.projects.labelProgressPct}"
              .value="${this.fProgress}"
              min="0"
              max="100"
              step="5"
              unit="%"
              @change="${(e: CustomEvent<{ value: number }>) => (this.fProgress = eventValue(e))}"
            ></app-number-input>
          </div>

          <div class="col-span-2">
            <span class="meta-label">${t.viewTexts.projects.projectColorLabel}</span>
            <app-color-swatches
              .colors="${PROJECT_COLOR_SWATCHES}"
              .value="${this.fColor}"
              @change="${(e: CustomEvent) => (this.fColor = e.detail.value)}"
            ></app-color-swatches>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.projects.labelDescription}"
              .value="${this.fDescription}"
              rows="3"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fDescription = eventValue(e))}"
            ></app-textarea>
          </div>

        </app-form-grid>

        ${!this.project && this.extraContent ? html`<div class="extra-section">${this.extraContent}</div>` : ''}

        <div slot="footer">
          ${this.footerExtra}
          <app-button
            variant="ghost"
            ?disabled="${this.saveDisabled}"
            @click="${() => this.closeModal()}"
          >
            ${t.common.cancel}
          </app-button>
          <app-button
            variant="primary"
            ?disabled="${this.saveDisabled}"
            @click="${() => this.save()}"
          >
            ${this.saveLabel || t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-project-form': AppProjectForm;
  }
}

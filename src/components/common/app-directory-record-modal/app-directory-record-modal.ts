import { LitElement, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  DirectoryDefinition,
  DirectoryFieldDef,
  DirectoryRecord,
  Rfc5545Freq,
  SupportedLang,
} from '../../../types';
import { store } from '../../../state/store';
import { parseRRule, RFC5545_FREQS, serializeRRule } from '../../../domain/rfc5545';
import { getTranslation, TranslationType } from '../../../i18n';
import { eventValue } from '../event-value';
import '../app-modal/app-modal';
import '../app-form-grid/app-form-grid';
import '../app-input/app-input';
import '../app-textarea/app-textarea';
import '../app-select/app-select';
import '../app-switch/app-switch';
import '../app-button/app-button';
import '../app-recurrence-editor/app-recurrence-editor';
import type { RecurrenceEditorChangeDetail } from '../app-recurrence-editor/app-recurrence-editor';
import styles from './app-directory-record-modal.css';

@customElement('app-directory-record-modal')
export class AppDirectoryRecordModal extends LitElement {
  @property({ type: Boolean }) open: boolean = false;
  @property({ attribute: false }) directory: DirectoryDefinition | null = null;
  @property({ attribute: false }) record: DirectoryRecord | null = null;

  @state() private currentLang: SupportedLang = store.customization.language;
  @state() private formCode: string = '';
  @state() private formName: string = '';
  @state() private formNameEn: string = '';
  @state() private formSortOrder: number = 10;
  @state() private formDescription: string = '';
  @state() private formIsActive: boolean = true;
  @state() private formExtra: Record<string, string | number | boolean> = {};
  @state() private codeError: string = '';
  @state() private nameError: string = '';
  @state() private formError: string = '';
  @state() private recurrenceDialogOpen: boolean = false;

  private recurrenceDraft: RecurrenceEditorChangeDetail | null = null;

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
    this.unsubscribe?.();
  }

  protected updated(changed: PropertyValues) {
    if (
      changed.has('open') ||
      changed.has('record') ||
      changed.has('directory')
    ) {
      if (this.open) {
        this.resetFromProps();
      }
    }
  }

  private resetFromProps() {
    this.codeError = '';
    this.nameError = '';
    this.formError = '';

    const dir = this.directory;
    const rec = this.record;

    if (rec) {
      this.formCode = rec.code;
      this.formName = rec.name;
      this.formNameEn = rec.nameEn || '';
      this.formSortOrder = rec.sortOrder ?? 10;
      this.formDescription = rec.description || '';
      this.formIsActive = rec.isActive;
      const nextExtra: Record<string, string | number | boolean> = {};
      for (const f of dir?.fields || []) {
        const val = rec.extra?.[f.key];
        if (val !== undefined) {
          nextExtra[f.key] = val;
        } else if (f.defaultValue !== undefined) {
          nextExtra[f.key] = f.defaultValue;
        } else {
          nextExtra[f.key] = f.type === 'boolean' ? false : f.type === 'number' ? 0 : '';
        }
      }
      this.formExtra = nextExtra;
      return;
    }

    const maxSort = (dir?.records || []).reduce((acc, item) => Math.max(acc, item.sortOrder || 0), 0);
    this.formCode = '';
    this.formName = '';
    this.formNameEn = '';
    this.formSortOrder = maxSort + 10;
    this.formDescription = '';
    this.formIsActive = true;

    const defaults: Record<string, string | number | boolean> = {};
    for (const f of dir?.fields || []) {
      if (f.defaultValue !== undefined) {
        defaults[f.key] = f.defaultValue;
      } else {
        defaults[f.key] =
          f.type === 'boolean'
            ? false
            : f.type === 'number'
            ? f.min ?? 0
            : f.options?.[0]?.value ?? '';
      }
    }
    this.formExtra = defaults;
  }

  private getDirectoryDisplayName(t: TranslationType): string {
    const dir = this.directory;
    if (!dir) return '';
    if (dir.catalogKey) {
      const entry = (t.viewTexts.directories.catalogs as Record<string, { name: string; description: string }>)[
        dir.catalogKey
      ];
      if (entry) return entry.name;
    }
    return dir.customName || dir.code;
  }

  private getFieldLabel(field: DirectoryFieldDef, t: TranslationType): string {
    if (field.labelKey) {
      const translated = (t.viewTexts.directories.fields as Record<string, string>)[field.labelKey];
      if (translated) return translated;
    }
    return field.customLabel || field.key;
  }

  private getOptionLabel(
    opt: { value: string; labelKey?: string; label?: string },
    t: TranslationType
  ): string {
    if (opt.labelKey) {
      const translated = (t.viewTexts.directories.options as Record<string, string>)[opt.labelKey];
      if (translated) return translated;
    }
    return opt.label || opt.value;
  }

  private handleClose() {
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private updateExtra(key: string, value: string | number | boolean) {
    const nextExtra: Record<string, string | number | boolean> = {
      ...this.formExtra,
      [key]: value,
    };

    if (this.directory?.id === 'recurrence_templates') {
      if (key === 'freq') {
        const freqVal = String(value).toUpperCase();
        if (freqVal === 'NONE') {
          nextExtra.rrule = '';
          nextExtra.interval = 1;
          nextExtra.isRecurring = false;
        } else if (RFC5545_FREQS.includes(freqVal as Rfc5545Freq)) {
          const parsed = parseRRule(String(nextExtra.rrule || ''));
          const baseRule = parsed.ok
            ? { ...parsed.rule, freq: freqVal as Rfc5545Freq }
            : {
                freq: freqVal as Rfc5545Freq,
                interval: Math.max(1, Number(nextExtra.interval || 1)),
                wkst: 'MO' as const,
              };
          nextExtra.rrule = serializeRRule(baseRule, false);
          nextExtra.isRecurring = true;
        }
      } else if (key === 'interval' && typeof value === 'number' && !Number.isNaN(value)) {
        const freqVal = String(nextExtra.freq || 'NONE').toUpperCase();
        if (RFC5545_FREQS.includes(freqVal as Rfc5545Freq)) {
          const parsed = parseRRule(String(nextExtra.rrule || ''));
          const safeInt = Math.max(1, Math.round(value));
          const baseRule = parsed.ok
            ? { ...parsed.rule, interval: safeInt }
            : {
                freq: freqVal as Rfc5545Freq,
                interval: safeInt,
                wkst: 'MO' as const,
              };
          nextExtra.rrule = serializeRRule(baseRule, false);
        }
      }
    }

    this.formExtra = nextExtra;
    this.formError = '';
  }

  private handleRecurrenceTemplateChange(detail: RecurrenceEditorChangeDetail) {
    this.formExtra = {
      ...this.formExtra,
      rrule: detail.rrule,
      freq: detail.rule ? detail.rule.freq : 'NONE',
      interval: detail.rule ? Math.max(1, Math.round(detail.rule.interval || 1)) : 1,
      isRecurring: Boolean(detail.rule),
    };
    this.formError = '';
  }

  private openRecurrenceDialog() {
    this.recurrenceDraft = null;
    this.recurrenceDialogOpen = true;
  }

  private currentRecurrenceDetail(): RecurrenceEditorChangeDetail {
    if (this.recurrenceDraft) return this.recurrenceDraft;
    const rrule = String(this.formExtra.rrule || '');
    const parsed = parseRRule(rrule);
    return {
      value: rrule,
      rrule,
      rule: parsed.ok ? parsed.rule : null,
      isValid: parsed.ok,
      summary: '',
    };
  }

  private applyRecurrenceDialog() {
    const detail = this.currentRecurrenceDetail();
    if (detail.isValid) {
      this.handleRecurrenceTemplateChange(detail);
    }
    this.recurrenceDialogOpen = false;
  }

  private handleSave() {
    const t = getTranslation(this.currentLang);
    const dir = this.directory;
    if (!dir) return;

    this.codeError = '';
    this.nameError = '';
    this.formError = '';

    const cleanCode = this.formCode.trim();
    const cleanName = this.formName.trim();

    if (!cleanCode) {
      this.codeError = t.common.required;
    } else {
      const duplicate = dir.records.some(
        (r) => r.id !== this.record?.id && r.code.toLowerCase() === cleanCode.toLowerCase()
      );
      if (duplicate) {
        this.codeError = t.viewTexts.directories.errorUniqueCode;
      }
    }

    if (!cleanName) {
      this.nameError = t.common.required;
    }

    if (this.codeError || this.nameError) {
      return;
    }

    const sanitizedExtra: Record<string, string | number | boolean> = {};
    for (const field of dir.fields) {
      const raw = this.formExtra[field.key];
      if (field.type === 'number') {
        const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
        if (field.required && Number.isNaN(num)) {
          this.formError = `${this.getFieldLabel(field, t)}: ${t.common.required}`;
          return;
        }
        sanitizedExtra[field.key] = Number.isNaN(num) ? 0 : num;
      } else if (field.type === 'boolean') {
        sanitizedExtra[field.key] = Boolean(raw);
      } else {
        const text = String(raw ?? '').trim();
        if (field.required && !text) {
          this.formError = `${this.getFieldLabel(field, t)}: ${t.common.required}`;
          return;
        }
        sanitizedExtra[field.key] = text;
      }
    }

    const sortNum = Number.isFinite(this.formSortOrder) ? this.formSortOrder : 10;
    const payload = {
      code: cleanCode,
      name: cleanName,
      nameEn: this.formNameEn.trim(),
      description: this.formDescription.trim(),
      sortOrder: sortNum,
      isActive: this.formIsActive,
      extra: dir.fields.length > 0 ? sanitizedExtra : undefined,
    };

    let savedRecord: DirectoryRecord | null = null;
    if (this.record) {
      const updated: DirectoryRecord = {
        ...this.record,
        ...payload,
      };
      store.updateDirectoryRecord(dir.id, updated);
      savedRecord = updated;
    } else {
      savedRecord = store.addDirectoryRecord(dir.id, payload);
    }

    this.open = false;
    this.dispatchEvent(
      new CustomEvent('saved', {
        detail: { directoryId: dir.id, record: savedRecord },
        bubbles: true,
        composed: true,
      })
    );
  }

  // Fields fill the two-column form grid in order; a field that starts a fresh row and is the last
  // child of the grid has no neighbour in its row, so it needs no ghost label row and no frame.
  private fieldGridSpan(field: DirectoryFieldDef): 1 | 2 {
    return this.directory?.id === 'recurrence_templates' && field.key === 'rrule' ? 2 : 1;
  }

  private lastAloneField(fields: DirectoryFieldDef[]): boolean {
    let cursor = 0;
    for (let i = 0; i < fields.length; i++) {
      const span = this.fieldGridSpan(fields[i]);
      const startsRow = cursor === 0;
      if (i === fields.length - 1) return startsRow;
      cursor = startsRow ? span % 2 : (cursor + span) % 2;
    }
    return false;
  }

  private renderExtraField(field: DirectoryFieldDef, t: TranslationType, lastAlone: boolean) {
    const label = this.getFieldLabel(field, t);
    const val = this.formExtra[field.key];

    if (field.type === 'boolean') {
      // a lone switch in the last row carries its own caption: no ghost label row, no frame
      if (lastAlone) {
        return html`
          <app-switch
            size="md"
            frame="none"
            field-label-style="none"
            label="${label}"
            .checked="${Boolean(val)}"
            @change="${(e: CustomEvent<{ checked: boolean }>) =>
              this.updateExtra(field.key, Boolean(e.detail?.checked))}"
          ></app-switch>
        `;
      }
      return html`
        <app-switch
          size="md"
          frame="transparent"
          field-label-style="ghost"
          field-label="${label}"
          label="${label}"
          .checked="${Boolean(val)}"
          @change="${(e: CustomEvent<{ checked: boolean }>) =>
            this.updateExtra(field.key, Boolean(e.detail?.checked))}"
        ></app-switch>
      `;
    }

    if (field.type === 'select') {
      const options = (field.options || []).map((opt) => ({
        value: opt.value,
        label: this.getOptionLabel(opt, t),
      }));
      return html`
        <div>
          <app-select
            label="${label}"
            .value="${String(val ?? '')}"
            .options="${options}"
            @change="${(e: CustomEvent) => this.updateExtra(field.key, eventValue(e))}"
          ></app-select>
        </div>
      `;
    }

    if (field.type === 'number') {
      return html`
        <div>
          <app-input
            type="number"
            label="${label}"
            ?required="${Boolean(field.required)}"
            .value="${val !== undefined && val !== null ? String(val) : '0'}"
            @input="${(e: CustomEvent) => {
              const raw = eventValue(e);
              const parsed = parseFloat(raw);
              this.updateExtra(field.key, Number.isNaN(parsed) ? '' : parsed);
            }}"
          ></app-input>
        </div>
      `;
    }

    if (this.directory?.id === 'recurrence_templates' && field.key === 'rrule') {
      return html`
        <div class="col-span-2 recurrence-field-block">
          <div class="rrule-display-row">
            <app-input
              class="rrule-display"
              label="${label}"
              disabled
              .value="${String(val ?? '')}"
            ></app-input>
            <app-button
              variant="secondary"
              size="md"
              @click="${() => this.openRecurrenceDialog()}"
            >
              ${t.viewTexts.directories.editRecurrenceTemplateBtn}
            </app-button>
          </div>
        </div>
      `;
    }

    return html`
      <div>
        <app-input
          label="${label}"
          ?required="${Boolean(field.required)}"
          .value="${String(val ?? '')}"
          @input="${(e: CustomEvent) => this.updateExtra(field.key, eventValue(e))}"
        ></app-input>
      </div>
    `;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const dir = this.directory;
    const lastAlone = dir ? this.lastAloneField(dir.fields) : false;
    const dirName = this.getDirectoryDisplayName(t);
    const title = this.record
      ? t.viewTexts.directories.recordModalTitleEdit(dirName)
      : t.viewTexts.directories.recordModalTitleCreate(dirName);

    return html`
      <app-modal
        ?open="${this.open}"
        size="lg"
        title="${title}"
        @close="${() => this.handleClose()}"
      >
        <app-form-grid columns="2">
          <div class="col-span-2 modal-section-heading">
            ${t.viewTexts.directories.baseSectionTitle}
          </div>

          <div>
            <app-input
              label="${t.viewTexts.directories.fieldCodeLabel}"
              placeholder="${t.viewTexts.directories.fieldCodePlaceholder}"
              helper="${t.viewTexts.directories.fieldCodeHelper}"
              .value="${this.formCode}"
              required
              error="${this.codeError}"
              @input="${(e: CustomEvent) => {
                this.formCode = eventValue(e);
                this.codeError = '';
              }}"
            ></app-input>
          </div>

          <div>
            <app-input
              type="number"
              label="${t.viewTexts.directories.fieldSortOrderLabel}"
              .value="${String(this.formSortOrder)}"
              @input="${(e: CustomEvent) => {
                const parsed = parseInt(eventValue(e), 10);
                this.formSortOrder = Number.isNaN(parsed) ? 0 : parsed;
              }}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.directories.fieldNameLabel}"
              placeholder="${t.viewTexts.directories.fieldNamePlaceholder}"
              .value="${this.formName}"
              required
              error="${this.nameError}"
              @input="${(e: CustomEvent) => {
                this.formName = eventValue(e);
                this.nameError = '';
              }}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.viewTexts.directories.fieldNameEnLabel}"
              placeholder="${t.viewTexts.directories.fieldNameEnPlaceholder}"
              .value="${this.formNameEn}"
              @input="${(e: CustomEvent) => {
                this.formNameEn = eventValue(e);
              }}"
            ></app-input>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.directories.fieldDescriptionLabel}"
              placeholder="${t.viewTexts.directories.fieldDescriptionPlaceholder}"
              rows="2"
              .value="${this.formDescription}"
              @input="${(e: CustomEvent) => {
                this.formDescription = eventValue(e);
              }}"
            ></app-textarea>
          </div>

          <div class="col-span-2">
            <div class="col-span-2">
              <app-switch
                class="active-switch"
                label="${t.viewTexts.directories.fieldIsActiveLabel}"
                .checked="${this.formIsActive}"
                @change="${(e: CustomEvent<{ checked: boolean }>) => {
                  this.formIsActive = Boolean(e.detail?.checked);
                }}"
              ></app-switch>
            </div>
          </div>

          ${dir && dir.fields.length > 0
            ? html`
                <div class="col-span-2 modal-section-heading">
                  ${t.viewTexts.directories.extendedSectionTitle}
                </div>
                ${dir.fields.map((field, i) =>
                  this.renderExtraField(field, t, lastAlone && i === dir.fields.length - 1)
                )}
              `
            : ''}
          ${this.formError
            ? html`<div class="col-span-2 error-banner">${this.formError}</div>`
            : ''}
        </app-form-grid>

        <div slot="footer" class="footer-actions">
          <app-button variant="ghost" @click="${() => this.handleClose()}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleSave()}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>

      <app-modal
        ?open="${this.recurrenceDialogOpen}"
        size="md"
        title="${t.viewTexts.directories.recurrenceModalTitle}"
        @close="${() => (this.recurrenceDialogOpen = false)}"
      >
        <app-recurrence-editor
          .includePrefix="${false}"
          .value="${String(this.formExtra.rrule || '')}"
          @change="${(e: CustomEvent<RecurrenceEditorChangeDetail>) =>
            (this.recurrenceDraft = e.detail)}"
        ></app-recurrence-editor>
        <div slot="footer" class="footer-actions">
          <app-button variant="ghost" @click="${() => (this.recurrenceDialogOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.applyRecurrenceDialog()}">
            ${t.common.apply}
          </app-button>
        </div>
      </app-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-directory-record-modal': AppDirectoryRecordModal;
  }
}

import { LitElement, html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation, TranslationType } from '../../../i18n';
import {
  ActiveView,
  DirectoryDefinition,
  DirectoryFieldDef,
  DirectoryFieldType,
  DirectoryGroupKey,
  DirectoryRecord,
  SupportedLang,
} from '../../../types';
import { eventValue } from '../../common/event-value';
import {
  paginateItems,
  TABLE_PAGE_SIZE_OPTIONS,
} from '../../common/paginate';
import {
  iconChevronDown,
  iconChevronRight,
  iconCopy,
  iconDatabase,
  iconDownload,
  iconEdit,
  iconPlus,
  iconRefreshCw,
  iconTrash,
} from '../../common/icons';
import '../../common/app-page-header/app-page-header';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../dashboard/app-metric-card/app-metric-card';
import '../../common/app-button/app-button';
import '../../common/app-input/app-input';
import '../../common/app-textarea/app-textarea';
import '../../common/app-select/app-select';
import '../../common/app-switch/app-switch';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-pagination/app-pagination';
import '../../common/app-modal/app-modal';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-directory-record-modal/app-directory-record-modal';
import '../../common/app-table-scroll/app-table-scroll';
import '../../common/app-table-scroll-column/app-table-scroll-column';
import styles from './app-directories.css';

type SchemaFilter = 'all' | 'simple' | 'extended';
type WorkspaceTab = 'records' | 'schema';
type StatusFilter = 'all' | 'active' | 'inactive';
type SortColumn = 'code' | 'name' | 'nameEn' | 'sortOrder' | 'conversionFactor';

interface CustomFieldDraft {
  key: string;
  customLabel: string;
  type: DirectoryFieldType;
  showInTable: boolean;
}

const GROUP_ORDER: DirectoryGroupKey[] = [
  'organization',
  'operations',
  'finance',
  'measurements',
  'contracts_geo',
  'custom',
];

const MODULE_ROUTE_MAP: Record<string, ActiveView> = {
  employees: 'employees',
  counterparties: 'counterparties',
  projects: 'projects',
  timeTracking: 'time-tracking',
  calculations: 'calculations',
  companies: 'companies',
  contracts: 'contracts',
  payments: 'payments',
  expenses: 'expenses',
  documents: 'documents',
  knowledgeBase: 'knowledge-base',
};

@customElement('app-directories')
export class AppDirectories extends LitElement {
  @state() private currentLang: SupportedLang = store.customization.language;
  @state() private directories: DirectoryDefinition[] = store.directories;
  @state() private activeDirectoryId: string = store.activeDirectoryId;

  // Left catalog filters
  @state() private catalogSearch: string = '';
  @state() private schemaFilter: SchemaFilter = 'all';
  @state() private collapsedGroups: Set<DirectoryGroupKey> = new Set();

  // Right workspace filters & pagination
  @state() private workspaceTab: WorkspaceTab = 'records';
  @state() private recordSearch: string = '';
  @state() private statusFilter: StatusFilter = 'all';
  @state() private dimensionFilter: string = 'all';
  @state() private sortBy: SortColumn = 'sortOrder';
  @state() private sortDir: 'asc' | 'desc' = 'asc';
  @state() private currentPage: number = 1;
  @state() private pageSize: number = 20;

  // Live Unit Converter state (only used when units_of_measure is active)
  @state() private convQty: number = 1;
  @state() private convFromCode: string = 'DAY';
  @state() private convToCode: string = 'HUR';

  // Record Create/Edit Modal
  @state() private recordModalOpen: boolean = false;
  @state() private editingRecord: DirectoryRecord | null = null;

  // Custom Directory Modal
  @state() private dirModalOpen: boolean = false;
  @state() private dirCode: string = '';
  @state() private dirName: string = '';
  @state() private dirGroup: DirectoryGroupKey = 'custom';
  @state() private dirDesc: string = '';
  @state() private dirSchemaMode: 'simple' | 'extended' = 'simple';
  @state() private dirCustomFields: CustomFieldDraft[] = [];
  @state() private dirCodeError: string = '';
  @state() private dirNameError: string = '';
  @state() private dirFormError: string = '';

  // Confirm dialogs
  @state() private confirmDeleteRecord: DirectoryRecord | null = null;
  @state() private confirmResetOpen: boolean = false;
  @state() private confirmDeleteDirOpen: boolean = false;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncFromStore();
    this.unsubscribe = store.subscribe(() => {
      this.syncFromStore();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private syncFromStore() {
    this.currentLang = store.customization.language;
    this.directories = store.directories;
    if (this.activeDirectoryId !== store.activeDirectoryId) {
      this.activeDirectoryId = store.activeDirectoryId;
      this.recordSearch = '';
      this.statusFilter = 'all';
      this.dimensionFilter = 'all';
      this.currentPage = 1;
    }
    if (!this.directories.some((d) => d.id === this.activeDirectoryId) && this.directories[0]) {
      this.activeDirectoryId = this.directories[0].id;
    }
  }

  private getDirectoryTitle(dir: DirectoryDefinition, t: TranslationType): string {
    if (dir.catalogKey) {
      const entry = (t.viewTexts.directories.catalogs as Record<string, { name: string; description: string }>)[
        dir.catalogKey
      ];
      if (entry) return entry.name;
    }
    return dir.customName || dir.code;
  }

  private getDirectoryDescription(dir: DirectoryDefinition, t: TranslationType): string {
    if (dir.catalogKey) {
      const entry = (t.viewTexts.directories.catalogs as Record<string, { name: string; description: string }>)[
        dir.catalogKey
      ];
      if (entry) return entry.description;
    }
    return dir.customDescription || '';
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

  private selectDirectory(directoryId: string) {
    if (directoryId === this.activeDirectoryId) return;
    this.activeDirectoryId = directoryId;
    this.recordSearch = '';
    this.statusFilter = 'all';
    this.dimensionFilter = 'all';
    this.currentPage = 1;
    store.setActiveDirectory(directoryId);
  }

  private toggleGroup(group: DirectoryGroupKey) {
    const next = new Set(this.collapsedGroups);
    if (next.has(group)) {
      next.delete(group);
    } else {
      next.add(group);
    }
    this.collapsedGroups = next;
  }

  private getFilteredCatalog(t: TranslationType): DirectoryDefinition[] {
    const q = this.catalogSearch.trim().toLowerCase();
    return this.directories.filter((dir) => {
      if (this.schemaFilter !== 'all' && dir.schemaType !== this.schemaFilter) {
        return false;
      }
      if (!q) return true;

      const title = this.getDirectoryTitle(dir, t).toLowerCase();
      const desc = this.getDirectoryDescription(dir, t).toLowerCase();
      if (title.includes(q) || desc.includes(q) || dir.code.toLowerCase().includes(q)) {
        return true;
      }
      return dir.records.some(
        (rec) =>
          rec.code.toLowerCase().includes(q) ||
          rec.name.toLowerCase().includes(q) ||
          (rec.nameEn && rec.nameEn.toLowerCase().includes(q))
      );
    });
  }

  private unitFactor(rec: DirectoryRecord): number {
    const mult = Number(rec.extra?.multiplier ?? 1);
    const div = Number(rec.extra?.divisor ?? 1);
    return div > 0 ? mult / div : 0;
  }

  private getFilteredRecords(dir: DirectoryDefinition): DirectoryRecord[] {
    const q = this.recordSearch.trim().toLowerCase();
    const list = dir.records.filter((rec) => {
      if (this.statusFilter === 'active' && !rec.isActive) return false;
      if (this.statusFilter === 'inactive' && rec.isActive) return false;

      if (this.dimensionFilter !== 'all' && dir.fields.some((f) => f.key === 'dimension')) {
        if (String(rec.extra?.dimension || '') !== this.dimensionFilter) return false;
      }

      if (!q) return true;
      const extraText = rec.extra
        ? Object.values(rec.extra)
            .map((v) => String(v).toLowerCase())
            .join(' ')
        : '';
      return (
        rec.code.toLowerCase().includes(q) ||
        rec.name.toLowerCase().includes(q) ||
        (rec.nameEn && rec.nameEn.toLowerCase().includes(q)) ||
        (rec.description && rec.description.toLowerCase().includes(q)) ||
        extraText.includes(q)
      );
    });

    const dirSign = this.sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (this.sortBy === 'sortOrder') {
        const diff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        return diff !== 0 ? diff * dirSign : a.code.localeCompare(b.code) * dirSign;
      }
      if (this.sortBy === 'conversionFactor') {
        const diff = this.unitFactor(a) - this.unitFactor(b);
        return diff !== 0 ? diff * dirSign : a.code.localeCompare(b.code) * dirSign;
      }
      const valA = String(a[this.sortBy] ?? '');
      const valB = String(b[this.sortBy] ?? '');
      return valA.localeCompare(valB) * dirSign;
    });
  }

  private exportDirectory(format: 'csv' | 'json', dir: DirectoryDefinition, t: TranslationType) {
    let content = '';
    let mime = 'application/json;charset=utf-8';
    const fileBase = dir.code.toLowerCase();

    if (format === 'json') {
      content = JSON.stringify(
        {
          code: dir.code,
          name: this.getDirectoryTitle(dir, t),
          schemaType: dir.schemaType,
          fields: dir.fields,
          records: dir.records,
        },
        null,
        2
      );
    } else {
      mime = 'text/csv;charset=utf-8';
      const extraKeys = dir.fields.map((f) => f.key);
      const headers = ['code', 'name', 'nameEn', 'sortOrder', 'isActive', 'description', ...extraKeys];
      const escapeCsv = (val: unknown) => {
        const str = String(val ?? '');
        if (str.includes('"') || str.includes(';') || str.includes(',') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const rows = dir.records.map((r) =>
        [
          r.code,
          r.name,
          r.nameEn || '',
          r.sortOrder,
          r.isActive ? '1' : '0',
          r.description || '',
          ...extraKeys.map((k) => r.extra?.[k] ?? ''),
        ]
          .map(escapeCsv)
          .join(',')
      );
      content = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileBase}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
    store.addNotification(
      'success',
      t.navigation.directories,
      t.viewTexts.directories.exportedToast(format.toUpperCase(), dir.code)
    );
  }

  private openCreateRecordModal() {
    this.editingRecord = null;
    this.recordModalOpen = true;
  }

  private openEditRecordModal(rec: DirectoryRecord) {
    this.editingRecord = rec;
    this.recordModalOpen = true;
  }

  private handleDuplicateRecord(dir: DirectoryDefinition, rec: DirectoryRecord, t: TranslationType) {
    store.duplicateDirectoryRecord(dir.id, rec.id);
    store.addNotification(
      'success',
      t.navigation.directories,
      t.viewTexts.directories.recordDuplicatedToast
    );
  }

  private openCreateDirectoryModal() {
    this.dirCode = '';
    this.dirName = '';
    this.dirGroup = 'custom';
    this.dirDesc = '';
    this.dirSchemaMode = 'simple';
    this.dirCustomFields = [
      { key: 'rateFactor', customLabel: '', type: 'number', showInTable: true },
    ];
    this.dirCodeError = '';
    this.dirNameError = '';
    this.dirFormError = '';
    this.dirModalOpen = true;
  }

  private addCustomFieldDraft() {
    this.dirCustomFields = [
      ...this.dirCustomFields,
      { key: '', customLabel: '', type: 'text', showInTable: true },
    ];
  }

  private updateCustomFieldDraft(index: number, patch: Partial<CustomFieldDraft>) {
    this.dirCustomFields = this.dirCustomFields.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    );
    this.dirFormError = '';
  }

  private removeCustomFieldDraft(index: number) {
    this.dirCustomFields = this.dirCustomFields.filter((_, idx) => idx !== index);
  }

  private handleCreateDirectory(t: TranslationType) {
    this.dirCodeError = '';
    this.dirNameError = '';
    this.dirFormError = '';

    const cleanCode = this.dirCode.trim().toUpperCase().replace(/\s+/g, '_');
    const cleanName = this.dirName.trim();

    if (!cleanCode) {
      this.dirCodeError = t.common.required;
    } else if (this.directories.some((d) => d.code.toLowerCase() === cleanCode.toLowerCase())) {
      this.dirCodeError = t.viewTexts.directories.dirModalErrorUniqueCode;
    }

    if (!cleanName) {
      this.dirNameError = t.common.required;
    }

    if (this.dirCodeError || this.dirNameError) return;

    let builtFields: DirectoryFieldDef[] = [];
    if (this.dirSchemaMode === 'extended') {
      for (const draft of this.dirCustomFields) {
        const cleanKey = draft.key.trim().replace(/\s+/g, '_');
        const cleanLabel = draft.customLabel.trim();
        if (!cleanKey || !cleanLabel) {
          this.dirFormError = t.viewTexts.directories.dirModalErrorFieldEmpty;
          return;
        }
        builtFields.push({
          key: cleanKey,
          customLabel: cleanLabel,
          type: draft.type,
          showInTable: draft.showInTable,
          mono: draft.type === 'number',
          align: draft.type === 'number' ? 'right' : draft.type === 'boolean' ? 'center' : 'left',
          defaultValue: draft.type === 'boolean' ? false : draft.type === 'number' ? 0 : '',
        });
      }
    }

    const created = store.addDirectoryDefinition({
      code: cleanCode,
      name: cleanName,
      description: this.dirDesc.trim(),
      group: this.dirGroup,
      fields: builtFields,
    });
    this.activeDirectoryId = created.id;
    this.dirModalOpen = false;
    this.workspaceTab = 'records';
    store.addNotification(
      'success',
      t.navigation.directories,
      t.viewTexts.directories.directoryCreatedToast
    );
  }

  private renderUnitConverter(dir: DirectoryDefinition, t: TranslationType) {
    if (dir.id !== 'units_of_measure') return '';

    const activeUnits = dir.records.filter((r) => r.isActive);
    if (activeUnits.length === 0) return '';

    const fromUnit = activeUnits.find((u) => u.code === this.convFromCode) || activeUnits[0];
    const toUnit = activeUnits.find((u) => u.code === this.convToCode) || activeUnits[0];

    const fromDim = String(fromUnit.extra?.dimension || '');
    const toDim = String(toUnit.extra?.dimension || '');
    const compatible = fromDim === toDim;

    const fromFactor = this.unitFactor(fromUnit);
    const toFactor = this.unitFactor(toUnit);

    const useEnFields = t.common.locale.startsWith('en');
    let convertedText = '';
    if (compatible && fromFactor > 0 && toFactor > 0) {
      const result = (this.convQty * fromFactor) / toFactor;
      const toShort = String(
        useEnFields
          ? toUnit.extra?.shortNameEn || toUnit.code
          : toUnit.extra?.shortName || toUnit.code
      );
      convertedText = `${result.toLocaleString(t.common.locale, { maximumFractionDigits: 6 })} ${toShort}`;
    }

    const unitOptions = activeUnits.map((u) => {
      const dimKey = String(u.extra?.dimension || '');
      const dimField = dir.fields.find((f) => f.key === 'dimension');
      const dimOpt = dimField?.options?.find((o) => o.value === dimKey);
      const dimLabel = dimOpt ? this.getOptionLabel(dimOpt, t) : dimKey;
      const uName = useEnFields ? u.nameEn || u.name : u.name;
      return {
        value: u.code,
        label: `${u.code} — ${uName} (${dimLabel})`,
      };
    });

    return html`
      <div class="converter-strip">
        <div class="converter-head">
          <span class="converter-title">${t.viewTexts.directories.converterTitle}</span>
          <span class="converter-hint">${t.viewTexts.directories.converterHint}</span>
        </div>
        <div class="converter-grid">
          <app-input
            type="number"
            size="sm"
            label="${t.viewTexts.directories.converterQtyLabel}"
            .value="${String(this.convQty)}"
            @input="${(e: CustomEvent) => {
              const v = parseFloat(eventValue(e));
              this.convQty = Number.isNaN(v) ? 0 : v;
            }}"
          ></app-input>

          <app-select
            size="sm"
            label="${t.viewTexts.directories.converterFromLabel}"
            .value="${fromUnit.code}"
            .options="${unitOptions}"
            @change="${(e: CustomEvent) => {
              const nextFrom = eventValue(e);
              this.convFromCode = nextFrom;
              const src = activeUnits.find((u) => u.code === nextFrom);
              const dst = activeUnits.find((u) => u.code === this.convToCode);
              if (src && dst && src.extra?.dimension !== dst.extra?.dimension) {
                const match = activeUnits.find(
                  (u) => u.extra?.dimension === src.extra?.dimension && u.code !== nextFrom
                );
                if (match) this.convToCode = match.code;
              }
            }}"
          ></app-select>

          <div class="converter-swap">
            <app-button
              size="sm"
              variant="secondary"
              @click="${() => {
                const prevFrom = this.convFromCode;
                this.convFromCode = this.convToCode;
                this.convToCode = prevFrom;
              }}"
            >
              ↔
            </app-button>
          </div>

          <app-select
            size="sm"
            label="${t.viewTexts.directories.converterToLabel}"
            .value="${toUnit.code}"
            .options="${unitOptions}"
            @change="${(e: CustomEvent) => {
              this.convToCode = eventValue(e);
            }}"
          ></app-select>

          <div class="converter-result-box">
            <span class="converter-result-label">${t.viewTexts.directories.converterResultLabel}</span>
            ${compatible
              ? html`<span class="converter-result-value">${convertedText}</span>`
              : html`
                  <span class="converter-result-value is-error">
                    ${t.viewTexts.directories.converterIncompatible}
                  </span>
                `}
          </div>
        </div>
      </div>
    `;
  }

  private renderFactorColumn(t: TranslationType) {
    return html`
      <app-table-scroll-column
        field="conversionFactor"
        label="${t.viewTexts.directories.fields.conversionFactor}"
        type="number"
        align="right"
        mono
        sortable
        .valueFn="${(row: Record<string, unknown>) =>
          this.unitFactor(row as unknown as DirectoryRecord)}"
      ></app-table-scroll-column>
    `;
  }

  private renderRecordsWorkspace(dir: DirectoryDefinition, t: TranslationType) {
    const tableFields = dir.fields.filter(
      (f) => f.showInTable !== false && f.key !== 'multiplier' && f.key !== 'divisor'
    );
    const dimensionField = dir.fields.find((f) => f.key === 'dimension');
    const filtered = this.getFilteredRecords(dir);
    const paged = paginateItems(filtered, this.currentPage, this.pageSize);
    const fromIdx = filtered.length === 0 ? 0 : (paged.page - 1) * paged.pageSize + 1;
    const toIdx = Math.min(paged.page * paged.pageSize, filtered.length);

    const statusOptions = [
      { value: 'all', label: t.viewTexts.directories.statusAll },
      { value: 'active', label: t.viewTexts.directories.statusActive },
      { value: 'inactive', label: t.viewTexts.directories.statusInactive },
    ];

    const dimensionOptions = dimensionField
      ? [
          { value: 'all', label: t.viewTexts.directories.dimensionAll },
          ...(dimensionField.options || []).map((o) => ({
            value: o.value,
            label: this.getOptionLabel(o, t),
          })),
        ]
      : [];

    const tableCols: TemplateResult[] = tableFields.map((field) =>
      html`
        <app-table-scroll-column
          field="${field.key}"
          label="${this.getFieldLabel(field, t)}"
          type="${field.type}"
          align="${field.align || 'left'}"
          yes-label="${t.viewTexts.directories.boolYes}"
          no-label="${t.viewTexts.directories.boolNo}"
          ?mono="${Boolean(field.mono)}"
          .options="${(field.options || []).map((o) => ({
            value: o.value,
            label: this.getOptionLabel(o, t),
          }))}"
          .valueFn="${(row: Record<string, unknown>) =>
            (row as unknown as DirectoryRecord).extra?.[field.key]}"
        ></app-table-scroll-column>
      `,
    );
    const factorAnchor = tableFields.findIndex((f) => f.key === 'baseUnitCode');
    if (dir.id === 'units_of_measure' && factorAnchor !== -1) {
      tableCols.splice(factorAnchor + 1, 0, this.renderFactorColumn(t));
    }

    return html`
      ${this.renderUnitConverter(dir, t)}

      <div class="records-toolbar">
        <div class="toolbar-controls">
          <div class="search-box">
            <app-input
              size="sm"
              clearable
              placeholder="${t.viewTexts.directories.recordsSearchPlaceholder}"
              .value="${this.recordSearch}"
              @input="${(e: CustomEvent) => {
                this.recordSearch = eventValue(e);
                this.currentPage = 1;
              }}"
            ></app-input>
          </div>

          <div class="filter-select-box">
            <app-select
              size="sm"
              .value="${this.statusFilter}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent) => {
                this.statusFilter = eventValue(e) as StatusFilter;
                this.currentPage = 1;
              }}"
            ></app-select>
          </div>

          ${dimensionField
            ? html`
                <div class="filter-select-box">
                  <app-select
                    size="sm"
                    .value="${this.dimensionFilter}"
                    .options="${dimensionOptions}"
                    @change="${(e: CustomEvent) => {
                      this.dimensionFilter = eventValue(e);
                      this.currentPage = 1;
                    }}"
                  ></app-select>
                </div>
              `
            : ''}
        </div>

        <span class="toolbar-meta">
          ${t.viewTexts.directories.showingRange(fromIdx, toIdx, filtered.length)}
        </span>
      </div>

      <app-table-scroll
        .rows="${paged.items as unknown as Record<string, unknown>[]}"
        sort-by="${this.sortBy}"
        sort-dir="${this.sortDir}"
        active-key="isActive"
        empty-title="${t.viewTexts.directories.emptyRecords}"
        locale="${t.common.locale}"
        @sort-change="${(e: CustomEvent<{ field: string; dir: 'asc' | 'desc' }>) => {
          this.sortBy = e.detail.field as SortColumn;
          this.sortDir = e.detail.dir;
          this.currentPage = 1;
        }}"
      >
        <app-table-scroll-column
          field="code"
          label="${t.viewTexts.directories.thCode}"
          code
          sortable
        ></app-table-scroll-column>
        <app-table-scroll-column
          field="name"
          label="${t.viewTexts.directories.thName}"
          sortable
          .cellRender="${(row: Record<string, unknown>) => {
            const rec = row as unknown as DirectoryRecord;
            return html`
              <div class="cell-name-main">${rec.name}</div>
              ${rec.description
                ? html`<div class="cell-name-desc">${rec.description}</div>`
                : ''}
            `;
          }}"
        ></app-table-scroll-column>
        <app-table-scroll-column
          field="nameEn"
          label="${t.viewTexts.directories.thNameEn}"
          sortable
        ></app-table-scroll-column>
        ${tableCols}
        <app-table-scroll-column
          field="sortOrder"
          label="${t.viewTexts.directories.thSortOrder}"
          type="number"
          align="right"
          mono
          sortable
        ></app-table-scroll-column>
        <app-table-scroll-column
          field="isActive"
          label="${t.viewTexts.directories.thActive}"
          align="center"
          .cellRender="${(row: Record<string, unknown>) => {
            const rec = row as unknown as DirectoryRecord;
            return html`
              <app-switch
                .checked="${rec.isActive}"
                @change="${() => store.toggleDirectoryRecordActive(dir.id, rec.id)}"
              ></app-switch>
            `;
          }}"
        ></app-table-scroll-column>
        <app-table-scroll-column
          field="actions"
          label="${t.viewTexts.directories.thActions}"
          align="right"
          .cellRender="${(row: Record<string, unknown>) => {
            const rec = row as unknown as DirectoryRecord;
            return html`
              <div class="row-actions">
                <app-button
                  size="sm"
                  variant="icon"
                  action="delete"
                  title="${t.viewTexts.directories.actionDelete}"
                  @click="${() => (this.confirmDeleteRecord = rec)}"
                >
                  <span slot="start">${iconTrash(15)}</span>
                </app-button>
                <app-button
                  size="sm"
                  variant="icon"
                  title="${t.viewTexts.directories.actionDuplicate}"
                  @click="${() => this.handleDuplicateRecord(dir, rec, t)}"
                >
                  <span slot="start">${iconCopy(14)}</span>
                </app-button>
                <app-button
                  size="sm"
                  variant="icon"
                  action="edit"
                  title="${t.viewTexts.directories.actionEdit}"
                  @click="${() => this.openEditRecordModal(rec)}"
                >
                  <span slot="start">${iconEdit(15)}</span>
                </app-button>
              </div>
            `;
          }}"
        ></app-table-scroll-column>
      </app-table-scroll>

      ${filtered.length > 0
        ? html`
            <div class="table-footer">
              <app-pagination
                variant="bare"
                .page="${paged.page}"
                .pageSize="${paged.pageSize}"
                .totalItems="${paged.totalItems}"
                .pageSizeOptions="${TABLE_PAGE_SIZE_OPTIONS}"
                @page-change="${(e: CustomEvent<{ page: number }>) => {
                  this.currentPage = e.detail.page;
                }}"
                @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
                  this.pageSize = e.detail.pageSize;
                  this.currentPage = 1;
                }}"
              ></app-pagination>
            </div>
          `
        : ''}
    `;
  }

  private renderSchemaWorkspace(dir: DirectoryDefinition, t: TranslationType) {
    const coreFields = [
      { key: 'id', label: 'ID', type: 'text' as DirectoryFieldType, required: true, inTable: false, def: 'UUID / auto' },
      { key: 'code', label: t.viewTexts.directories.thCode, type: 'text' as DirectoryFieldType, required: true, inTable: true, def: '—' },
      { key: 'name', label: t.viewTexts.directories.thName, type: 'text' as DirectoryFieldType, required: true, inTable: true, def: '—' },
      { key: 'nameEn', label: t.viewTexts.directories.thNameEn, type: 'text' as DirectoryFieldType, required: false, inTable: true, def: '—' },
      { key: 'sortOrder', label: t.viewTexts.directories.thSortOrder, type: 'number' as DirectoryFieldType, required: false, inTable: true, def: '10' },
      { key: 'isActive', label: t.viewTexts.directories.thActive, type: 'boolean' as DirectoryFieldType, required: true, inTable: true, def: t.viewTexts.directories.boolYes },
      { key: 'description', label: t.viewTexts.directories.fieldDescriptionLabel, type: 'text' as DirectoryFieldType, required: false, inTable: false, def: '—' },
    ];

    return html`
      <div class="schema-panel">
        <div class="schema-block">
          <div class="schema-block-title">${t.viewTexts.directories.schemaSystemFieldsTitle}</div>
          <table class="records-table">
            <thead>
              <tr>
                <th>${t.viewTexts.directories.thFieldKey}</th>
                <th>${t.viewTexts.directories.thFieldLabel}</th>
                <th>${t.viewTexts.directories.thFieldType}</th>
                <th class="align-center">${t.viewTexts.directories.thFieldRequired}</th>
                <th class="align-center">${t.viewTexts.directories.thFieldInTable}</th>
                <th>${t.viewTexts.directories.thFieldDefault}</th>
              </tr>
            </thead>
            <tbody>
              ${coreFields.map(
                (f) => html`
                  <tr>
                    <td class="cell-code">${f.key}</td>
                    <td>${f.label}</td>
                    <td>${t.viewTexts.directories.fieldTypes[f.type]}</td>
                    <td class="align-center">
                      <span class="${f.required ? 'bool-yes' : 'bool-no'}">
                        ${f.required ? t.viewTexts.directories.boolYes : t.viewTexts.directories.boolNo}
                      </span>
                    </td>
                    <td class="align-center">
                      <span class="${f.inTable ? 'bool-yes' : 'bool-no'}">
                        ${f.inTable ? t.viewTexts.directories.boolYes : t.viewTexts.directories.boolNo}
                      </span>
                    </td>
                    <td class="cell-mono">${f.def}</td>
                  </tr>
                `
              )}
            </tbody>
          </table>
        </div>

        <div class="schema-block">
          <div class="schema-block-title">${t.viewTexts.directories.schemaCustomFieldsTitle}</div>
          ${dir.fields.length === 0
            ? html`<div class="schema-empty-note">${t.viewTexts.directories.schemaNoCustomFields}</div>`
            : html`
                <table class="records-table">
                  <thead>
                    <tr>
                      <th>${t.viewTexts.directories.thFieldKey}</th>
                      <th>${t.viewTexts.directories.thFieldLabel}</th>
                      <th>${t.viewTexts.directories.thFieldType}</th>
                      <th class="align-center">${t.viewTexts.directories.thFieldRequired}</th>
                      <th class="align-center">${t.viewTexts.directories.thFieldInTable}</th>
                      <th>${t.viewTexts.directories.thFieldDefault}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${dir.fields.map(
                      (field) => html`
                        <tr>
                          <td class="cell-code">${field.key}</td>
                          <td>${this.getFieldLabel(field, t)}</td>
                          <td>${t.viewTexts.directories.fieldTypes[field.type]}</td>
                          <td class="align-center">
                            <span class="${field.required ? 'bool-yes' : 'bool-no'}">
                              ${field.required ? t.viewTexts.directories.boolYes : t.viewTexts.directories.boolNo}
                            </span>
                          </td>
                          <td class="align-center">
                            <span class="${field.showInTable !== false ? 'bool-yes' : 'bool-no'}">
                              ${field.showInTable !== false ? t.viewTexts.directories.boolYes : t.viewTexts.directories.boolNo}
                            </span>
                          </td>
                          <td class="cell-mono">
                            ${field.defaultValue !== undefined ? String(field.defaultValue) : '—'}
                          </td>
                        </tr>
                      `
                    )}
                  </tbody>
                </table>
              `}
        </div>
      </div>
    `;
  }

  private renderCustomDirectoryModal(t: TranslationType) {
    const groupOptions = GROUP_ORDER.map((g) => ({
      value: g,
      label: t.viewTexts.directories.groups[g],
    }));

    const fieldTypeOptions = [
      { value: 'text', label: t.viewTexts.directories.fieldTypes.text },
      { value: 'number', label: t.viewTexts.directories.fieldTypes.number },
      { value: 'boolean', label: t.viewTexts.directories.fieldTypes.boolean },
    ];

    return html`
      <app-modal
        ?open="${this.dirModalOpen}"
        size="lg"
        title="${t.viewTexts.directories.dirModalTitle}"
        @close="${() => (this.dirModalOpen = false)}"
      >
        <app-form-grid columns="2">
          <div>
            <app-input
              label="${t.viewTexts.directories.dirModalCodeLabel}"
              placeholder="${t.viewTexts.directories.dirModalCodePlaceholder}"
              required
              error="${this.dirCodeError}"
              .value="${this.dirCode}"
              @input="${(e: CustomEvent) => {
                this.dirCode = eventValue(e);
                this.dirCodeError = '';
              }}"
            ></app-input>
          </div>

          <div>
            <app-select
              label="${t.viewTexts.directories.dirModalGroupLabel}"
              .value="${this.dirGroup}"
              .options="${groupOptions}"
              @change="${(e: CustomEvent) => {
                this.dirGroup = eventValue(e) as DirectoryGroupKey;
              }}"
            ></app-select>
          </div>

          <div class="col-span-2">
            <app-input
              label="${t.viewTexts.directories.dirModalNameLabel}"
              placeholder="${t.viewTexts.directories.dirModalNamePlaceholder}"
              required
              error="${this.dirNameError}"
              .value="${this.dirName}"
              @input="${(e: CustomEvent) => {
                this.dirName = eventValue(e);
                this.dirNameError = '';
              }}"
            ></app-input>
          </div>

          <div class="col-span-2">
            <app-textarea
              label="${t.viewTexts.directories.dirModalDescLabel}"
              placeholder="${t.viewTexts.directories.dirModalDescPlaceholder}"
              rows="2"
              .value="${this.dirDesc}"
              @input="${(e: CustomEvent) => {
                this.dirDesc = eventValue(e);
              }}"
            ></app-textarea>
          </div>

          <div class="col-span-2">
            <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">
              ${t.viewTexts.directories.dirModalSchemaLabel}
            </div>
            <app-segmented-switch
              full-width
              size="sm"
              .value="${this.dirSchemaMode}"
              .options="${[
                { value: 'simple', label: t.viewTexts.directories.dirModalSchemaSimple },
                { value: 'extended', label: t.viewTexts.directories.dirModalSchemaExtended },
              ]}"
              @change="${(e: CustomEvent) => {
                this.dirSchemaMode = eventValue(e) as 'simple' | 'extended';
              }}"
            ></app-segmented-switch>
          </div>

          ${this.dirSchemaMode === 'extended'
            ? html`
                <div class="col-span-2 custom-fields-box">
                  <div class="custom-fields-head">
                    <span class="custom-fields-title">
                      ${t.viewTexts.directories.dirModalCustomFieldsTitle}
                    </span>
                    <app-button
                      size="sm"
                      variant="secondary"
                      @click="${() => this.addCustomFieldDraft()}"
                    >
                      <span slot="icon-start">${iconPlus(14)}</span>
                      <span>${t.viewTexts.directories.dirModalAddFieldBtn}</span>
                    </app-button>
                  </div>

                  ${this.dirCustomFields.map(
                    (draft, idx) => html`
                      <div class="custom-field-row">
                        <app-input
                          size="sm"
                          placeholder="${t.viewTexts.directories.dirModalFieldKeyPlaceholder}"
                          .value="${draft.key}"
                          @input="${(e: CustomEvent) =>
                            this.updateCustomFieldDraft(idx, { key: eventValue(e) })}"
                        ></app-input>

                        <app-input
                          size="sm"
                          placeholder="${t.viewTexts.directories.dirModalFieldLabelPlaceholder}"
                          .value="${draft.customLabel}"
                          @input="${(e: CustomEvent) =>
                            this.updateCustomFieldDraft(idx, { customLabel: eventValue(e) })}"
                        ></app-input>

                        <app-select
                          size="sm"
                          .value="${draft.type}"
                          .options="${fieldTypeOptions}"
                          @change="${(e: CustomEvent) =>
                            this.updateCustomFieldDraft(idx, {
                              type: eventValue(e) as DirectoryFieldType,
                            })}"
                        ></app-select>

                        <app-checkbox
                          label="${t.viewTexts.directories.dirModalFieldInTable}"
                          .checked="${draft.showInTable}"
                          @change="${(e: CustomEvent<{ checked: boolean }>) =>
                            this.updateCustomFieldDraft(idx, {
                              showInTable: Boolean(e.detail?.checked),
                            })}"
                        ></app-checkbox>

                        <button
                          type="button"
                          class="icon-action-btn is-danger"
                          ?disabled="${this.dirCustomFields.length <= 1}"
                          @click="${() => this.removeCustomFieldDraft(idx)}"
                        >
                          ${iconTrash(14)}
                        </button>
                      </div>
                    `
                  )}
                </div>
              `
            : ''}
          ${this.dirFormError
            ? html`<div class="col-span-2 error-banner">${this.dirFormError}</div>`
            : ''}
        </app-form-grid>

        <div slot="footer" class="footer-actions">
          <app-button variant="ghost" @click="${() => (this.dirModalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.handleCreateDirectory(t)}">
            ${t.common.save}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const activeDir =
      this.directories.find((d) => d.id === this.activeDirectoryId) || this.directories[0] || null;
    const filteredCatalog = this.getFilteredCatalog(t);

    const totalDirectories = this.directories.length;
    const extendedCount = this.directories.filter((d) => d.schemaType === 'extended').length;
    const totalRecords = this.directories.reduce((acc, d) => acc + d.records.length, 0);
    const activeRecords = this.directories.reduce(
      (acc, d) => acc + d.records.filter((r) => r.isActive).length,
      0
    );
    const customDirectoriesCount = this.directories.filter((d) => !d.isSystem).length;

    return html`
      <app-page-header
        title="${t.navigation.directories}"
        subtitle="${t.viewTexts.pageSubtitles.directories}"
      >
        <span slot="icon">${iconDatabase(28)}</span>
        <div slot="actions" class="header-actions">
          <app-button
            variant="secondary"
            size="md"
            @click="${() => this.openCreateDirectoryModal()}"
          >
            <span slot="icon-start">${iconPlus(16)}</span>
            <span>${t.viewTexts.directories.newDirectoryBtn}</span>
          </app-button>

          ${activeDir
            ? html`
                <app-button
                  variant="primary"
                  size="md"
                  @click="${() => this.openCreateRecordModal()}"
                >
                  <span slot="icon-start">${iconPlus(16)}</span>
                  <span>${t.viewTexts.directories.addRecordBtn}</span>
                </app-button>
              `
            : ''}
        </div>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card
          size="compact"
          label="${t.viewTexts.directories.kpiTotalDirectories}"
          value="${String(totalDirectories)}"
        ></app-metric-card>

        <app-metric-card
          size="compact"
          label="${t.viewTexts.directories.kpiExtendedDirectories}"
          value="${String(extendedCount)}"
        ></app-metric-card>

        <app-metric-card
          size="compact"
          label="${t.viewTexts.directories.kpiActiveRecords}"
          value="${`${activeRecords} / ${totalRecords}`}"
        ></app-metric-card>

        <app-metric-card
          size="compact"
          label="${t.viewTexts.directories.kpiCustomDirectories}"
          value="${String(customDirectoriesCount)}"
        ></app-metric-card>
      </app-kpi-strip>

      <div class="directories-workbench">
        <!-- Left Grouped Catalog -->
        <aside class="catalog-pane">
          <div class="catalog-top">
            <div class="catalog-title-row">
              <span class="catalog-title">${t.viewTexts.directories.catalogTitle}</span>
              <span class="catalog-count">${filteredCatalog.length} / ${totalDirectories}</span>
            </div>

            <app-input
              size="sm"
              clearable
              placeholder="${t.viewTexts.directories.catalogSearchPlaceholder}"
              .value="${this.catalogSearch}"
              @input="${(e: CustomEvent) => {
                this.catalogSearch = eventValue(e);
              }}"
            ></app-input>

            <app-segmented-switch
              full-width
              size="sm"
              .value="${this.schemaFilter}"
              .options="${[
                { value: 'all', label: t.viewTexts.directories.schemaFilterAll },
                { value: 'simple', label: t.viewTexts.directories.schemaFilterSimple },
                { value: 'extended', label: t.viewTexts.directories.schemaFilterExtended },
              ]}"
              @change="${(e: CustomEvent) => {
                this.schemaFilter = eventValue(e) as SchemaFilter;
              }}"
            ></app-segmented-switch>
          </div>

          <div class="catalog-list">
            ${filteredCatalog.length === 0
              ? html`<div class="catalog-empty">${t.viewTexts.directories.emptyCatalog}</div>`
              : GROUP_ORDER.map((groupKey) => {
                  const groupDirs = filteredCatalog.filter((d) => d.group === groupKey);
                  if (groupDirs.length === 0) return '';
                  const isCollapsed = this.collapsedGroups.has(groupKey) && !this.catalogSearch.trim();
                  return html`
                    <div class="catalog-group">
                      <button
                        type="button"
                        class="group-header"
                        @click="${() => this.toggleGroup(groupKey)}"
                      >
                        <span class="group-header-left">
                          ${isCollapsed ? iconChevronRight(14) : iconChevronDown(14)}
                          <span class="group-label">${t.viewTexts.directories.groups[groupKey]}</span>
                        </span>
                        <span class="group-count">${groupDirs.length}</span>
                      </button>

                      ${!isCollapsed
                        ? html`
                            <div class="group-items">
                              ${groupDirs.map((dir) => {
                                const isActive = activeDir?.id === dir.id;
                                return html`
                                  <button
                                    type="button"
                                    class="dir-item ${isActive ? 'is-active' : ''}"
                                    @click="${() => this.selectDirectory(dir.id)}"
                                  >
                                    <div class="dir-item-main">
                                      <div class="dir-item-name">
                                        ${this.getDirectoryTitle(dir, t)}
                                      </div>
                                      <div class="dir-item-meta">
                                        <span class="dir-code-mono">${dir.code}</span>
                                        ${dir.schemaType === 'extended'
                                          ? html`
                                              <span>·</span>
                                              <span class="dir-schema-flag">
                                                +${dir.fields.length}
                                              </span>
                                            `
                                          : ''}
                                      </div>
                                    </div>
                                    <span class="dir-item-count">${dir.records.length}</span>
                                  </button>
                                `;
                              })}
                            </div>
                          `
                        : ''}
                    </div>
                  `;
                })}
          </div>
        </aside>

        <!-- Right Directory Workspace -->
        <section class="detail-pane">
          ${activeDir
            ? html`
                <div class="detail-header">
                  <div class="detail-title-col">
                    <div class="detail-breadcrumb">
                      <span>${t.viewTexts.directories.groups[activeDir.group]}</span>
                      <span>·</span>
                      <span class="mono-code">${activeDir.code}</span>
                      <span>·</span>
                      <span>
                        ${activeDir.isSystem
                          ? t.viewTexts.directories.systemTag
                          : t.viewTexts.directories.customTag}
                      </span>
                      <span>·</span>
                      <span>
                        ${activeDir.schemaType === 'extended'
                          ? t.viewTexts.directories.schemaBadgeExtended(activeDir.fields.length)
                          : t.viewTexts.directories.schemaBadgeSimple}
                      </span>
                    </div>

                    <h2 class="detail-title">${this.getDirectoryTitle(activeDir, t)}</h2>

                    ${this.getDirectoryDescription(activeDir, t)
                      ? html`
                          <p class="detail-description">
                            ${this.getDirectoryDescription(activeDir, t)}
                          </p>
                        `
                      : ''}
                    ${activeDir.usedInKeys && activeDir.usedInKeys.length > 0
                      ? html`
                          <div class="used-in-row">
                            <span class="used-in-label">${t.viewTexts.directories.usedInTitle}</span>
                            ${activeDir.usedInKeys.map((modKey, idx) => {
                              const label =
                                (t.viewTexts.directories.usedIn as Record<string, string>)[modKey] ||
                                modKey;
                              const route = MODULE_ROUTE_MAP[modKey];
                              return html`
                                ${idx > 0 ? html`<span class="used-in-sep">·</span>` : ''}
                                ${route
                                  ? html`
                                      <button
                                        type="button"
                                        class="used-in-link"
                                        @click="${() => store.setActiveView(route)}"
                                      >
                                        ${label}
                                      </button>
                                    `
                                  : html`<span>${label}</span>`}
                              `;
                            })}
                          </div>
                        `
                      : ''}
                  </div>

                  <div class="detail-actions-col">
                    <app-segmented-switch
                      size="sm"
                      .value="${this.workspaceTab}"
                      .options="${[
                        { value: 'records', label: t.viewTexts.directories.tabRecords },
                        { value: 'schema', label: t.viewTexts.directories.tabSchema },
                      ]}"
                      @change="${(e: CustomEvent) => {
                        this.workspaceTab = eventValue(e) as WorkspaceTab;
                      }}"
                    ></app-segmented-switch>

                    <div class="detail-action-buttons">
                      <app-button
                        size="sm"
                        variant="secondary"
                        @click="${() => this.exportDirectory('csv', activeDir, t)}"
                      >
                        <span slot="icon-start">${iconDownload(14)}</span>
                        <span>${t.viewTexts.directories.exportCsvBtn}</span>
                      </app-button>

                      <app-button
                        size="sm"
                        variant="secondary"
                        @click="${() => this.exportDirectory('json', activeDir, t)}"
                      >
                        <span slot="icon-start">${iconDownload(14)}</span>
                        <span>${t.viewTexts.directories.exportJsonBtn}</span>
                      </app-button>

                      ${activeDir.isSystem
                        ? html`
                            <app-button
                              size="sm"
                              variant="ghost"
                              @click="${() => (this.confirmResetOpen = true)}"
                            >
                              <span slot="icon-start">${iconRefreshCw(14)}</span>
                              <span>${t.viewTexts.directories.resetDefaultsBtn}</span>
                            </app-button>
                          `
                        : html`
                            <app-button
                              size="sm"
                              variant="danger"
                              @click="${() => (this.confirmDeleteDirOpen = true)}"
                            >
                              <span slot="icon-start">${iconTrash(14)}</span>
                              <span>${t.viewTexts.directories.deleteDirectoryBtn}</span>
                            </app-button>
                          `}
                    </div>
                  </div>
                </div>

                ${this.workspaceTab === 'records'
                  ? this.renderRecordsWorkspace(activeDir, t)
                  : this.renderSchemaWorkspace(activeDir, t)}
              `
            : html`<app-empty-state title="${t.viewTexts.directories.emptyCatalog}"></app-empty-state>`}
        </section>
      </div>

      <!-- Create/Edit Record Modal -->
      <app-directory-record-modal
        .open="${this.recordModalOpen}"
        .directory="${activeDir}"
        .record="${this.editingRecord}"
        @close="${() => (this.recordModalOpen = false)}"
        @saved="${() => {
          this.recordModalOpen = false;
          store.addNotification(
            'success',
            t.navigation.directories,
            t.viewTexts.directories.recordSavedToast
          );
        }}"
      ></app-directory-record-modal>

      <!-- Custom Directory Modal -->
      ${this.renderCustomDirectoryModal(t)}

      <!-- Delete Record Confirm -->
      <app-confirm-dialog
        .open="${Boolean(this.confirmDeleteRecord)}"
        variant="danger"
        .title="${t.viewTexts.confirmDialogs.directoryRecordDelete.title}"
        .action="${this.confirmDeleteRecord
          ? t.viewTexts.confirmDialogs.directoryRecordDelete.action(
              this.confirmDeleteRecord.code,
              this.confirmDeleteRecord.name
            )
          : ''}"
        .result="${t.viewTexts.confirmDialogs.directoryRecordDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .confirmLabel="${t.common.delete}"
        .cancelLabel="${t.common.cancel}"
        @confirm="${() => {
          if (activeDir && this.confirmDeleteRecord) {
            store.deleteDirectoryRecord(activeDir.id, this.confirmDeleteRecord.id);
            store.addNotification(
              'info',
              t.navigation.directories,
              t.viewTexts.directories.recordDeletedToast
            );
          }
          this.confirmDeleteRecord = null;
        }}"
        @cancel="${() => (this.confirmDeleteRecord = null)}"
      ></app-confirm-dialog>

      <!-- Reset System Directory Confirm -->
      <app-confirm-dialog
        .open="${this.confirmResetOpen}"
        variant="warning"
        .title="${t.viewTexts.confirmDialogs.directoryReset.title}"
        .action="${activeDir
          ? t.viewTexts.confirmDialogs.directoryReset.action(this.getDirectoryTitle(activeDir, t))
          : ''}"
        .result="${t.viewTexts.confirmDialogs.directoryReset.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .confirmLabel="${t.viewTexts.directories.resetDefaultsBtn}"
        .cancelLabel="${t.common.cancel}"
        @confirm="${() => {
          if (activeDir) {
            store.resetDirectoryToDefaults(activeDir.id);
            store.addNotification(
              'success',
              t.navigation.directories,
              t.viewTexts.directories.resetDoneToast
            );
          }
          this.confirmResetOpen = false;
        }}"
        @cancel="${() => (this.confirmResetOpen = false)}"
      ></app-confirm-dialog>

      <!-- Delete Custom Directory Confirm -->
      <app-confirm-dialog
        .open="${this.confirmDeleteDirOpen}"
        variant="danger"
        .title="${t.viewTexts.confirmDialogs.directoryDelete.title}"
        .action="${activeDir
          ? t.viewTexts.confirmDialogs.directoryDelete.action(this.getDirectoryTitle(activeDir, t))
          : ''}"
        .result="${t.viewTexts.confirmDialogs.directoryDelete.result}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        .confirmLabel="${t.common.delete}"
        .cancelLabel="${t.common.cancel}"
        @confirm="${() => {
          if (activeDir && !activeDir.isSystem) {
            store.deleteDirectoryDefinition(activeDir.id);
            store.addNotification(
              'info',
              t.navigation.directories,
              t.viewTexts.directories.directoryDeletedToast
            );
          }
          this.confirmDeleteDirOpen = false;
        }}"
        @cancel="${() => (this.confirmDeleteDirOpen = false)}"
      ></app-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-directories': AppDirectories;
  }
}
